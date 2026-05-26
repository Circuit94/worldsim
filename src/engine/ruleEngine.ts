/**
 * WorldSim Engine — 确定性规则引擎
 * 
 * 这一层位于 LLM 响应和状态应用之间。
 * 它强制执行 LLM 不能覆盖的硬约束：
 * 
 * 1. 物理验证：边界检查、可行走性、移动距离
 * 2. 状态一致性：HP 钳制、物品完整性、Agent 唯一性
 * 3. 规则触发：确定性触发条件 → 效果
 * 4. 输出清洗：确保 LLM 输出符合预期 schema
 */

import type { WorldSchema, PlayerState, ActionResponse, Agent, MapChange } from './types'
import type { ScenarioMode } from './scenarios'

// ============================================================
// 验证层 — LLM 不能绕过的硬约束
// ============================================================

export interface ValidationResult {
  valid: boolean
  corrections: string[]      // 修正了什么
  sanitized: ActionResponse  // 修正后的响应
}

/**
 * 主验证管线 — 在应用到状态前对每个 LLM 响应调用
 */
export function validateAndCorrect(
  response: ActionResponse,
  world: WorldSchema,
  player: PlayerState,
  mode: ScenarioMode = 'game'
): ValidationResult {
  const corrections: string[] = []
  let sanitized = { ...response, effects: { ...response.effects } }

  // 1. 验证玩家移动
  sanitized = validateMovement(sanitized, world, player, corrections)

  // 2. 验证 HP 变化范围
  sanitized = validateHp(sanitized, player, corrections)

  // 3. 验证物品操作
  sanitized = validateItems(sanitized, world, player, corrections)

  // 4. 验证 Agent 反应引用的是否是真实 Agent
  sanitized = validateAgentReactions(sanitized, world, corrections)

  // 5. 验证地图变更引用的位置和地块是否有效
  sanitized = validateMapChange(sanitized, world, corrections)

  // 6. 钳制态度变化幅度
  sanitized = validateAttitudeChanges(sanitized, corrections)

  // 7. 确保 choices 存在且合理
  sanitized = validateChoices(sanitized, corrections, mode)

  return {
    valid: corrections.length === 0,
    corrections,
    sanitized,
  }
}

function validateMovement(
  response: ActionResponse,
  world: WorldSchema,
  player: PlayerState,
  corrections: string[]
): ActionResponse {
  const move = response.effects.movePlayer
  if (!move) return response

  const [x, y] = move
  const [px, py] = player.position

  // 边界检查
  if (x < 0 || x >= world.dimensions[0] || y < 0 || y >= world.dimensions[1]) {
    corrections.push(`[引擎] 移动 [${x},${y}] 超出边界 — 已阻止`)
    return { ...response, effects: { ...response.effects, movePlayer: null } }
  }

  // 可行走性检查
  const tileId = world.map[y]?.[x]
  if (!tileId || world.tiles[tileId]?.walkable === false) {
    corrections.push(`[引擎] 目标地块「${tileId}」不可行走 — 已阻止`)
    return { ...response, effects: { ...response.effects, movePlayer: null } }
  }

  // 距离检查（玩家每步最多曼哈顿距离 3）
  const dist = Math.abs(x - px) + Math.abs(y - py)
  if (dist > 3) {
    corrections.push(`[引擎] 移动距离 ${dist} 超过上限 3 — 已缩短`)
    const dx = Math.sign(x - px)
    const dy = Math.sign(y - py)
    const clampedPos: [number, number] = [px + dx, py + dy]
    return { ...response, effects: { ...response.effects, movePlayer: clampedPos } }
  }

  return response
}

function validateHp(
  response: ActionResponse,
  player: PlayerState,
  corrections: string[]
): ActionResponse {
  const { hpChange } = response.effects

  // 防止秒杀（单次最多 -50）和过度治疗
  if (hpChange < -50) {
    corrections.push(`[引擎] HP 变化 ${hpChange} 过大 — 已钳制为 -50`)
    return { ...response, effects: { ...response.effects, hpChange: -50 } }
  }
  if (hpChange > 30) {
    corrections.push(`[引擎] HP 恢复 ${hpChange} 过多 — 已钳制为 +30`)
    return { ...response, effects: { ...response.effects, hpChange: 30 } }
  }

  return response
}

function validateItems(
  response: ActionResponse,
  world: WorldSchema,
  player: PlayerState,
  corrections: string[]
): ActionResponse {
  const { addItem, removeItem } = response.effects

  // 验证物品是否可获取
  if (addItem) {
    const item = world.items.find(i => i.name === addItem && !i.collected)
    if (!item) {
      corrections.push(`[引擎] 物品「${addItem}」不可获取 — 已移除`)
      return { ...response, effects: { ...response.effects, addItem: null } }
    }
  }

  // 验证物品是否在背包中
  if (removeItem) {
    if (!player.inventory.includes(removeItem)) {
      corrections.push(`[引擎] 玩家没有物品「${removeItem}」— 已移除`)
      return { ...response, effects: { ...response.effects, removeItem: null } }
    }
  }

  // 背包上限 10 个
  if (addItem && player.inventory.length >= 10) {
    corrections.push(`[引擎] 背包已满（10件）— 无法添加「${addItem}」`)
    return { ...response, effects: { ...response.effects, addItem: null } }
  }

  return response
}

function validateAgentReactions(
  response: ActionResponse,
  world: WorldSchema,
  corrections: string[]
): ActionResponse {
  const { agentReactions } = response.effects
  if (!agentReactions || agentReactions.length === 0) return response

  // 支持按 id 或按 name 匹配（LLM 经常返回角色名而非 id）
  const idSet = new Set(world.agents.map(a => a.id))
  const nameToId = new Map(world.agents.map(a => [a.name, a.id]))

  const filtered = agentReactions.map(r => {
    if (idSet.has(r.agentId)) {
      return r // 正常匹配 id
    }
    // 尝试按名称匹配
    const resolvedId = nameToId.get(r.agentId)
    if (resolvedId) {
      return { ...r, agentId: resolvedId }
    }
    return null // 无法匹配
  }).filter((r): r is NonNullable<typeof r> => {
    if (r === null) {
      // 这里不再 push corrections，因为 LLM 用名称是常见行为，静默处理
      return false
    }
    return true
  })

  return { ...response, effects: { ...response.effects, agentReactions: filtered } }
}

function validateMapChange(
  response: ActionResponse,
  world: WorldSchema,
  corrections: string[]
): ActionResponse {
  const { mapChange } = response.effects
  if (!mapChange) return response

  const { position, newTileId } = mapChange

  // 验证位置有效性
  if (!position || position[0] < 0 || position[0] >= world.dimensions[0] ||
      position[1] < 0 || position[1] >= world.dimensions[1]) {
    corrections.push(`[引擎] 地图变更位置无效 — 已移除`)
    return { ...response, effects: { ...response.effects, mapChange: null } }
  }

  // 验证地块 ID 存在
  if (!world.tiles[newTileId]) {
    corrections.push(`[引擎] 地图变更地块「${newTileId}」不存在 — 已移除`)
    return { ...response, effects: { ...response.effects, mapChange: null } }
  }

  return response
}

function validateAttitudeChanges(
  response: ActionResponse,
  corrections: string[]
): ActionResponse {
  const { agentReactions } = response.effects
  if (!agentReactions) return response

  const clamped = agentReactions.map(r => {
    if (r.attitudeChange > 15 || r.attitudeChange < -15) {
      corrections.push(`[引擎] ${r.agentId} 的态度变化 ${r.attitudeChange} 过大 — 已钳制为 ±15`)
      return { ...r, attitudeChange: Math.max(-15, Math.min(15, r.attitudeChange)) }
    }
    return r
  })

  return { ...response, effects: { ...response.effects, agentReactions: clamped } }
}

function validateChoices(
  response: ActionResponse,
  corrections: string[],
  mode: ScenarioMode = 'game'
): ActionResponse {
  if (!response.choices || response.choices.length === 0) {
    corrections.push('[引擎] 未提供选项 — 已添加默认选项')
    const defaults = getDefaultChoices(mode)
    return { ...response, choices: defaults }
  }

  // 最多 5 个选项
  if (response.choices.length > 5) {
    corrections.push(`[引擎] ${response.choices.length} 个选项 — 已裁剪为 5 个`)
    return { ...response, choices: response.choices.slice(0, 5) }
  }

  return response
}

/**
 * 根据模式返回合适的默认选项
 */
function getDefaultChoices(mode: ScenarioMode): string[] {
  switch (mode) {
    case 'training':
      return [
        '[推进谈判] 基于已有信息向对方提出具体的解决方案框架，争取达成阶段性共识',
        '[策略调整] 重新评估当前各方态势，调整自身的优先级排序和谈判策略',
        '[寻求外部支持] 引入第三方资源或信息来打破当前僵局',
      ]
    case 'simulation':
      return [] // 仿真模式不需要人工选项
    case 'game':
    default:
      return ['仔细搜索这个地方', '找人问问情况', '往别处走走看']
  }
}

// ============================================================
// 世界规则触发 — 确定性条件匹配
// ============================================================

export interface RuleTriggerResult {
  ruleId: string
  fired: boolean
  effect: string
}

/**
 * 检查所有未触发的规则，返回本回合应触发的规则
 */
export function checkRuleTriggers(
  world: WorldSchema,
  player: PlayerState
): RuleTriggerResult[] {
  const results: RuleTriggerResult[] = []

  for (const rule of world.rules) {
    if (rule.fired) continue

    const shouldFire = evaluateRuleTrigger(rule.trigger, world, player)
    if (shouldFire) {
      results.push({
        ruleId: rule.id,
        fired: true,
        effect: rule.effect,
      })
    }
  }

  return results
}

/**
 * 简单触发条件评估器
 * 支持基于关键词的游戏状态匹配
 */
function evaluateRuleTrigger(
  trigger: string,
  world: WorldSchema,
  player: PlayerState
): boolean {
  const lowerTrigger = trigger.toLowerCase()

  // 物品相关触发
  if (lowerTrigger.includes('has item') || lowerTrigger.includes('collects') ||
      lowerTrigger.includes('获得') || lowerTrigger.includes('收集')) {
    for (const itemName of player.inventory) {
      if (lowerTrigger.includes(itemName.toLowerCase())) return true
    }
  }

  // HP 相关触发
  if (lowerTrigger.includes('hp below') || lowerTrigger.includes('low health') ||
      lowerTrigger.includes('生命值低') || lowerTrigger.includes('血量不足')) {
    if (player.hp < player.maxHp * 0.3) return true
  }

  // 步数相关触发
  if (lowerTrigger.includes('after') && lowerTrigger.includes('steps')) {
    const stepMatch = trigger.match(/after\s+(\d+)\s+steps/i)
    if (stepMatch && player.steps >= parseInt(stepMatch[1])) return true
  }
  if (lowerTrigger.includes('经过') && lowerTrigger.includes('步')) {
    const stepMatch = trigger.match(/经过\s*(\d+)\s*步/)
    if (stepMatch && player.steps >= parseInt(stepMatch[1])) return true
  }

  // 位置相关触发
  if (lowerTrigger.includes('reaches') || lowerTrigger.includes('enters') ||
      lowerTrigger.includes('到达') || lowerTrigger.includes('进入')) {
    const currentTile = world.map[player.position[1]]?.[player.position[0]]
    const tileDef = world.tiles[currentTile]
    if (tileDef && lowerTrigger.includes(tileDef.name.toLowerCase())) return true
  }

  // Agent 态度触发
  if (lowerTrigger.includes('trust') || lowerTrigger.includes('hostile') ||
      lowerTrigger.includes('信任') || lowerTrigger.includes('敌对')) {
    for (const agent of world.agents) {
      if ((lowerTrigger.includes('trust') || lowerTrigger.includes('信任')) && agent.memory.attitude > 50) return true
      if ((lowerTrigger.includes('hostile') || lowerTrigger.includes('敌对')) && agent.memory.attitude < -50) return true
    }
  }

  // 全部物品收集触发
  if (lowerTrigger.includes('all items') || lowerTrigger.includes('all key') ||
      lowerTrigger.includes('所有物品') || lowerTrigger.includes('全部收集')) {
    const uncollected = world.items.filter(i => !i.collected)
    if (uncollected.length === 0 && world.items.length > 0) return true
  }

  return false
}

/**
 * 标记规则为已触发（返回新 world）
 */
export function markRulesFired(world: WorldSchema, ruleIds: string[]): WorldSchema {
  if (ruleIds.length === 0) return world

  const newRules = world.rules.map(rule => 
    ruleIds.includes(rule.id) ? { ...rule, fired: true } : rule
  )
  return { ...world, rules: newRules }
}
