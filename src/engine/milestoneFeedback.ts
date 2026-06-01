/**
 * WorldSim Engine — 里程碑反馈系统
 * 
 * 在关键轮次自动注入结构化反馈，提升用户参与度。
 * 
 * 设计原则：
 * - 培训模式：第3轮和第6轮触发阶段性能力诊断
 * - 仿真模式：第4轮和第8轮触发系统观察摘要
 * - 游戏模式：第5轮和第10轮触发世界观察/探索提示
 * 
 * 反馈不阻断流程，而是作为额外信息卡片展示给用户。
 */

import type { WorldSchema, PlayerState } from './types'
import type { ScenarioMode } from './scenarios'

// ============================================================
// 类型定义
// ============================================================

export interface MilestoneFeedback {
  type: 'coaching' | 'observation' | 'exploration'
  title: string
  content: string
  details: string[]
  stepTriggered: number
  encouragement: string
}

// ============================================================
// 里程碑触发配置
// ============================================================

interface MilestoneConfig {
  triggerSteps: number[]
  feedbackType: MilestoneFeedback['type']
}

const MILESTONE_CONFIGS: Record<ScenarioMode, MilestoneConfig> = {
  training: {
    triggerSteps: [3, 6],
    feedbackType: 'coaching',
  },
  simulation: {
    triggerSteps: [4, 8],
    feedbackType: 'observation',
  },
  game: {
    triggerSteps: [5, 10],
    feedbackType: 'exploration',
  },
}

// ============================================================
// 核心逻辑
// ============================================================

/**
 * 判断当前步数是否应触发里程碑反馈
 */
export function shouldTriggerMilestone(stepCount: number, mode: ScenarioMode): boolean {
  const config = MILESTONE_CONFIGS[mode]
  return config.triggerSteps.includes(stepCount)
}

/**
 * 获取里程碑反馈的 prompt 注入片段
 * 在 buildActionPrompt 中追加，让 LLM 在本轮输出中包含结构化反馈
 */
export function getMilestonePromptInjection(stepCount: number, mode: ScenarioMode): string {
  if (!shouldTriggerMilestone(stepCount, mode)) return ''

  const config = MILESTONE_CONFIGS[mode]
  const milestoneIndex = config.triggerSteps.indexOf(stepCount)
  const isFirst = milestoneIndex === 0

  switch (mode) {
    case 'training':
      return getTrainingMilestonePrompt(stepCount, isFirst)
    case 'simulation':
      return getSimulationMilestonePrompt(stepCount, isFirst)
    case 'game':
      return getGameMilestonePrompt(stepCount, isFirst)
    default:
      return ''
  }
}

/**
 * 从 LLM 响应中解析里程碑反馈数据
 */
export function parseMilestoneFeedback(
  narrative: string,
  stepCount: number,
  mode: ScenarioMode,
  world: WorldSchema,
  player: PlayerState
): MilestoneFeedback | null {
  if (!shouldTriggerMilestone(stepCount, mode)) return null

  switch (mode) {
    case 'training':
      return parseTrainingMilestone(narrative, stepCount, world)
    case 'simulation':
      return parseSimulationMilestone(narrative, stepCount, world)
    case 'game':
      return parseGameMilestone(narrative, stepCount, world, player)
    default:
      return null
  }
}

/**
 * 生成本地里程碑反馈（不依赖 LLM，基于当前状态计算）
 * 作为 LLM 解析失败时的 fallback
 */
export function generateLocalMilestone(
  stepCount: number,
  mode: ScenarioMode,
  world: WorldSchema,
  player: PlayerState,
  narrativeLog: { text: string; type: string }[]
): MilestoneFeedback | null {
  if (!shouldTriggerMilestone(stepCount, mode)) return null

  const config = MILESTONE_CONFIGS[mode]
  const milestoneIndex = config.triggerSteps.indexOf(stepCount)
  const isFirst = milestoneIndex === 0

  switch (mode) {
    case 'training':
      return generateTrainingLocalMilestone(stepCount, isFirst, world, narrativeLog)
    case 'simulation':
      return generateSimulationLocalMilestone(stepCount, isFirst, world)
    case 'game':
      return generateGameLocalMilestone(stepCount, isFirst, world, player)
    default:
      return null
  }
}

// ============================================================
// 培训模式 — 阶段性能力教练反馈
// ============================================================

function getTrainingMilestonePrompt(stepCount: number, isFirst: boolean): string {
  if (isFirst) {
    return `
【阶段性反馈 — 第${stepCount}轮里程碑】
本轮是阶段性评估节点。在正常输出 JSON 之外，请在 narrative 末尾追加里程碑标记：
|[MILESTONE]阶段诊断：用1-2句话点评决策者前${stepCount}轮的整体表现模式（如"偏保守/信息收集充分但行动迟缓/善于借力但缺乏独立判断"），并给出一个具体的下一步建议。格式：|[MILESTONE]诊断内容::建议内容[/MILESTONE]`
  }
  return `
【阶段性反馈 — 第${stepCount}轮里程碑（终局前诊断）】
本轮是最终阶段评估节点。评估即将结束，请在 narrative 末尾追加里程碑标记：
|[MILESTONE]终局诊断：总结决策者的核心决策风格和最突出的能力/短板，给出收敛建议。格式：|[MILESTONE]诊断内容::建议内容[/MILESTONE]`
}

function getSimulationMilestonePrompt(stepCount: number, isFirst: boolean): string {
  if (isFirst) {
    return `
【系统观察摘要 — 第${stepCount}轮里程碑】
本轮是观察节点。在正常输出之外，请在 narrative 末尾追加：
|[MILESTONE]系统摘要：总结前${stepCount}轮各Agent的行为趋势和关键交互模式（如"Agent A 和 C 形成对抗""系统趋向极化/收敛"），指出最值得关注的涌现现象。格式：|[MILESTONE]摘要内容::关注点[/MILESTONE]`
  }
  return `
【系统观察摘要 — 第${stepCount}轮里程碑（后期观察）】
本轮是后期观察节点。请在 narrative 末尾追加：
|[MILESTONE]后期摘要：对比前期行为模式的变化，判断系统是否趋向稳态/震荡/崩溃，预测剩余轮次的走向。格式：|[MILESTONE]摘要内容::预测[/MILESTONE]`
}

function getGameMilestonePrompt(stepCount: number, isFirst: boolean): string {
  if (isFirst) {
    return `
【世界观察 — 第${stepCount}轮里程碑】
本轮是探索里程碑。在正常输出之外，请在 narrative 末尾追加：
|[MILESTONE]世界观察：揭示一个玩家可能忽略的世界细节或隐藏线索，暗示新的探索方向。格式：|[MILESTONE]观察内容::探索提示[/MILESTONE]`
  }
  return `
【世界观察 — 第${stepCount}轮里程碑（深层线索）】
本轮是深层探索里程碑。请在 narrative 末尾追加：
|[MILESTONE]深层线索：揭示世界的深层机制或NPC之间的隐藏关系，给玩家一个"恍然大悟"的信息。格式：|[MILESTONE]线索内容::行动建议[/MILESTONE]`
}

// ============================================================
// 解析 LLM 输出中的里程碑标记
// ============================================================

function parseMilestoneTag(text: string): { content: string; suggestion: string } | null {
  const match = text.match(/\[MILESTONE\](.*?)::(.*?)\[\/MILESTONE\]/)
  if (!match) return null
  return { content: match[1].trim(), suggestion: match[2].trim() }
}

function parseTrainingMilestone(narrative: string, stepCount: number, world: WorldSchema): MilestoneFeedback | null {
  const parsed = parseMilestoneTag(narrative)
  if (!parsed) return null

  const isFirst = stepCount <= 4
  return {
    type: 'coaching',
    title: isFirst ? '阶段性能力诊断' : '终局前诊断',
    content: parsed.content,
    details: getTrainingDetails(world),
    stepTriggered: stepCount,
    encouragement: parsed.suggestion,
  }
}

function parseSimulationMilestone(narrative: string, stepCount: number, world: WorldSchema): MilestoneFeedback | null {
  const parsed = parseMilestoneTag(narrative)
  if (!parsed) return null

  return {
    type: 'observation',
    title: stepCount <= 5 ? '系统行为摘要' : '后期态势观察',
    content: parsed.content,
    details: getSimulationDetails(world),
    stepTriggered: stepCount,
    encouragement: parsed.suggestion,
  }
}

function parseGameMilestone(narrative: string, stepCount: number, world: WorldSchema, player: PlayerState): MilestoneFeedback | null {
  const parsed = parseMilestoneTag(narrative)
  if (!parsed) return null

  return {
    type: 'exploration',
    title: stepCount <= 6 ? '世界观察' : '深层线索',
    content: parsed.content,
    details: getGameDetails(world, player),
    stepTriggered: stepCount,
    encouragement: parsed.suggestion,
  }
}

// ============================================================
// 本地 Fallback 生成（不依赖 LLM）
// ============================================================

function generateTrainingLocalMilestone(
  stepCount: number,
  isFirst: boolean,
  world: WorldSchema,
  narrativeLog: { text: string; type: string }[]
): MilestoneFeedback {
  const agents = world.agents
  const supportCount = agents.filter(a => a.memory.attitude > 20).length
  const opposeCount = agents.filter(a => a.memory.attitude < -20).length
  const decisionCount = narrativeLog.filter(l => l.text.startsWith('→')).length

  let content: string
  let encouragement: string

  if (isFirst) {
    if (decisionCount >= 3) {
      content = `前${stepCount}轮决策频率较高，展现了较强的行动力。${supportCount > 0 ? `已获得${supportCount}方初步支持。` : '各方态度仍在观望中。'}`
      encouragement = opposeCount > 0 ? '建议关注反对方的核心诉求，寻找突破口' : '保持节奏，开始推进实质性方案'
    } else {
      content = `前${stepCount}轮以信息收集为主，决策节奏偏缓。${opposeCount > 0 ? `有${opposeCount}方态度偏负面，需注意。` : '各方态度尚可。'}`
      encouragement = '建议加快决策节奏，在下一轮提出明确的方案框架'
    }
  } else {
    const avgAttitude = Math.round(agents.reduce((s, a) => s + a.memory.attitude, 0) / agents.length)
    content = `经过${stepCount}轮互动，整体态势${avgAttitude > 10 ? '偏积极' : avgAttitude < -10 ? '偏紧张' : '较为均衡'}。${supportCount}方支持、${opposeCount}方反对。`
    encouragement = '评估即将结束，建议在最后几轮整合各方意见，推动达成共识'
  }

  return {
    type: 'coaching',
    title: isFirst ? '阶段性能力诊断' : '终局前诊断',
    content,
    details: getTrainingDetails(world),
    stepTriggered: stepCount,
    encouragement,
  }
}

function generateSimulationLocalMilestone(
  stepCount: number,
  isFirst: boolean,
  world: WorldSchema
): MilestoneFeedback {
  const agents = world.agents
  const activeAgents = agents.filter(a => a.memory.observations.length > 0)
  const avgAttitude = Math.round(agents.reduce((s, a) => s + a.memory.attitude, 0) / agents.length)
  const attitudeSpread = Math.round(
    Math.sqrt(agents.reduce((s, a) => s + Math.pow(a.memory.attitude - avgAttitude, 2), 0) / agents.length)
  )

  let content: string
  let encouragement: string

  if (isFirst) {
    content = `前${stepCount}轮推演中，${activeAgents.length}/${agents.length}个Agent已产生交互。态度均值${avgAttitude}，离散度${attitudeSpread}。${attitudeSpread > 30 ? '系统呈现明显分化趋势。' : '系统尚处于初始博弈阶段。'}`
    encouragement = attitudeSpread > 30 ? '关注极化趋势是否会加剧' : '观察后续轮次中Agent间的交互模式变化'
  } else {
    const firedRules = world.rules.filter(r => r.fired).length
    content = `第${stepCount}轮观察：${firedRules}/${world.rules.length}个环境事件已触发。态度离散度${attitudeSpread}，${attitudeSpread > 40 ? '系统极化明显' : attitudeSpread < 15 ? '趋向收敛' : '仍在动态博弈中'}。`
    encouragement = '剩余轮次将决定系统最终稳态，注意观察关键转折点'
  }

  return {
    type: 'observation',
    title: isFirst ? '系统行为摘要' : '后期态势观察',
    content,
    details: getSimulationDetails(world),
    stepTriggered: stepCount,
    encouragement,
  }
}

function generateGameLocalMilestone(
  stepCount: number,
  isFirst: boolean,
  world: WorldSchema,
  player: PlayerState
): MilestoneFeedback {
  const unexploredTiles = world.map.flat().filter((tileId, i, arr) => {
    // Simple heuristic: tiles far from player
    return arr.indexOf(tileId) === i
  }).length
  const uncollectedItems = world.items.filter(i => !i.collected).length
  const unfiredRules = world.rules.filter(r => !r.fired).length

  let content: string
  let encouragement: string

  if (isFirst) {
    content = `探索进度：${uncollectedItems}个物品待发现，${unfiredRules}个隐藏事件未触发。${world.agents.some(a => a.memory.attitude < -20) ? '有NPC对你态度不佳，可能隐藏着关键信息。' : 'NPC们对你态度尚可。'}`
    encouragement = uncollectedItems > 0 ? '试试探索还没去过的区域，可能有重要物品' : '和NPC深入对话可能揭示新线索'
  } else {
    const friendlyNPCs = world.agents.filter(a => a.memory.attitude > 30)
    content = `深层观察：${friendlyNPCs.length > 0 ? `${friendlyNPCs.map(a => a.name).join('、')}对你较为信任` : '尚未建立深度信任关系'}。世界中还有${unfiredRules}个未触发的隐藏机制。`
    encouragement = '尝试将已知线索串联起来，真相可能就在眼前'
  }

  return {
    type: 'exploration',
    title: isFirst ? '世界观察' : '深层线索',
    content,
    details: getGameDetails(world, player),
    stepTriggered: stepCount,
    encouragement,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function getTrainingDetails(world: WorldSchema): string[] {
  return world.agents.map(a => {
    const stance = a.memory.attitude > 20 ? '支持' : a.memory.attitude < -20 ? '反对' : '中立'
    return `${a.name}：${stance}（${a.memory.attitude > 0 ? '+' : ''}${a.memory.attitude}）`
  })
}

function getSimulationDetails(world: WorldSchema): string[] {
  return world.agents.map(a => {
    const obsCount = a.memory.observations.length
    return `${a.name}：态度${a.memory.attitude}，交互${obsCount}次`
  })
}

function getGameDetails(world: WorldSchema, player: PlayerState): string[] {
  const details: string[] = []
  details.push(`HP: ${player.hp}/${player.maxHp}`)
  details.push(`背包: ${player.inventory.length}件物品`)
  details.push(`未触发事件: ${world.rules.filter(r => !r.fired).length}个`)
  const nearbyAgents = world.agents.filter(a => {
    const dist = Math.abs(a.position[0] - player.position[0]) + Math.abs(a.position[1] - player.position[1])
    return dist <= 3
  })
  if (nearbyAgents.length > 0) {
    details.push(`附近NPC: ${nearbyAgents.map(a => a.name).join('、')}`)
  }
  return details
}

/**
 * 从 narrative 中移除里程碑标记（用于正常显示）
 */
export function stripMilestoneTag(text: string): string {
  return text.replace(/\|\[MILESTONE\].*?\[\/MILESTONE\]/g, '').trim()
}
