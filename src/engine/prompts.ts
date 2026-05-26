/**
 * WorldSim Engine — 提示词模板
 * 
 * 按模式分叉的提示词架构：
 * - 游戏模式：完整的空间/HP/物品/NPC 游戏 prompt
 * - 培训模式：管理情景评估 prompt（无空间/HP/物品概念）
 * - 仿真模式：多智能体推演 prompt（无玩家/空间概念）
 */

import type { WorldSchema, Agent, PlayerState } from './types'
import type { ScenarioMode } from './scenarios'

// ============================================================
// 提示词 1：世界生成（仅游戏模式使用，培训/仿真通过 modifier 完全覆盖）
// ============================================================

export function buildWorldGenPrompt(theme: string, seed: string): string {
  return `生成一个 5×5 地块世界。主题: "${theme}" | 种子: "${seed}"

严格JSON输出，中文：
{
  "name": "世界名（4字以内）",
  "description": "一句话背景",
  "map": [["tile_id",...],...]  // 5行×5列
  "tiles": { "tile_id": { "name": "地名（2-4字）", "walkable": true, "description": "一句话环境描述" } },
  "agents": [
    { "id": "agent_1", "name": "角色名（2-3字）", "position": [x,y], "persona": "性格+目标+说话风格（50字内）", "goals": ["目标"], "decisionStyle": "rational|emotional|chaotic" }
  ],
  "items": [
    { "id": "item_1", "name": "物品名（2-4字）", "position": [x,y], "description": "一句话" }
  ],
  "rules": [
    { "id": "rule_1", "trigger": "经过N步后...", "effect": "发生什么" }
  ],
  "winCondition": "胜利条件（用地点名称描述，禁止出现坐标数字）",
  "playerStart": [x,y]
}

约束:
- 5×5 紧凑地图，3-4个区域，路径相连
- 2-3个NPC（友好/中立/敌对各一），id用agent_1格式
- 2个物品，2条规则
- 地名、角色名都要短（2-4字），不要长词
- tiles的description要体现环境特征（如"昏暗的金属走廊"/"长满苔藓的石墙"），系统会根据关键词自动匹配视觉样式
- 禁止输出emoji字段，所有视觉由系统自动生成
- 玩家起点可行走
- 所有文本极简，不要文学修辞
- winCondition 必须用地点名称描述目标位置（如"到达逃生舱"），严禁出现坐标如(0,4)`
}

// ============================================================
// 提示词 2：行动响应 — 按模式完全分叉
// ============================================================

export function buildActionPrompt(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  nearbyAgents: Agent[],
  recentEvents: string[],
  stepCount: number,
  actionModifier?: string,
  mode: ScenarioMode = 'game'
): string {
  switch (mode) {
    case 'training':
      return buildTrainingActionPrompt(world, player, action, nearbyAgents, recentEvents, stepCount, actionModifier)
    case 'simulation':
      return buildSimulationActionPrompt(world, player, action, nearbyAgents, recentEvents, stepCount, actionModifier)
    case 'game':
    default:
      return buildGameActionPrompt(world, player, action, nearbyAgents, recentEvents, stepCount, actionModifier)
  }
}

// ============================================================
// 游戏模式 Action Prompt
// ============================================================

function buildGameActionPrompt(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  nearbyAgents: Agent[],
  recentEvents: string[],
  stepCount: number,
  actionModifier?: string
): string {
  const currentTile = world.map[player.position[1]][player.position[0]]
  const tileDef = world.tiles[currentTile]
  
  // 精简 agent context — 只保留最关键信息
  const agentContext = nearbyAgents.map(a => {
    const lastObs = a.memory.observations.slice(-1)[0]?.content || ''
    return `${a.name}(${a.id}): 态度${a.memory.attitude} | ${lastObs || a.persona.slice(0, 30)}`
  }).join('\n')

  // 每3步触发世界事件（而非4步），加快节奏
  const shouldGenerateWorldEvent = stepCount > 0 && stepCount % 3 === 0

  return `「${world.name}」— ${world.description}
位置: ${tileDef.name} [${player.position}] | HP: ${player.hp}/${player.maxHp} | 背包: ${player.inventory.join('、') || '无'} | 步数: ${stepCount}
${agentContext ? `附近:\n${agentContext}` : ''}
${recentEvents.length > 0 ? `最近: ${recentEvents.slice(-2).join(' → ')}` : ''}
${world.rules.filter(r => !r.fired).length > 0 ? `规则: ${world.rules.filter(r => !r.fired).map(r => r.trigger + '→' + r.effect).join('; ')}` : ''}

行动: "${action}"
${shouldGenerateWorldEvent ? '【本轮需附带一个世界自发事件】' : ''}

输出严格JSON:
{
  "narrative": "一句话描述结果（15-30字，写实、不堆砌修辞）",
  "effects": {
    "hpChange": 0,
    "addItem": null,
    "removeItem": null,
    "movePlayer": null,
    "agentReactions": [{"agentId":"agent_1","reaction":"简短反应","attitudeChange":0,"newObservation":"记住什么"}],
    "mapChange": null
  },
  "choices": ["具体动作A", "具体动作B", "具体动作C"],
  "worldEvent": ${shouldGenerateWorldEvent ? '{"description":"简短事件","mapChanges":[],"affectedAgents":[]}' : 'null'},
  "gameOver": false,
  "gameOverReason": null
}

写作规则:
- narrative 必须简短有力。像短信不像散文。错误示例:"你沿着蜿蜒的小路走向村东，艾琳的小屋掩映在枯藤老树间，烟囱飘出缕缕青烟"。正确示例:"艾琳的屋里有动静。木门半开，桌上摊着发光的粉末。"
- 绝对禁止这些词: 蜿蜒、掩映、缕缕、潺潺、斑驳、氤氲、流淌、弥漫、笼罩、徐徐、袅袅。这些是AI套话。
- 要有信息增量：每句话必须推进剧情或揭示新信息，不要纯环境描写。
- choices 必须是玩家可以立即执行的具体动作（"翻开桌上的笔记""质问她那粉末是什么"），不要抽象描述（"探索周围""继续观察"）。
- movePlayer: 如果行动涉及移动，必须返回新坐标 [x,y]，确保与 narrative 描述的地点一致。
- agentReactions 的 agentId 用 id 格式如 "agent_1"
- 每步推进一个有意义的事件节拍（beat）：一个发现、一次交锋、一个选择后果。不要只描写走路。
${actionModifier ? `\n${actionModifier}` : ''}`
}

// ============================================================
// 培训模式 Action Prompt — 完全独立，无任何游戏概念
// ============================================================

function buildTrainingActionPrompt(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  nearbyAgents: Agent[],
  recentEvents: string[],
  stepCount: number,
  actionModifier?: string
): string {
  // 培训模式：所有 agent 都参与（无空间距离概念）
  const allAgents = world.agents
  const agentContext = allAgents.map(a => {
    const recentObs = a.memory.observations.slice(-3).map(o => o.content).join('；')
    return `- ${a.name}（id: ${a.id}）| 角色: ${a.persona.slice(0, 80)} | 态度: ${a.memory.attitude}/100 | 近期认知: ${recentObs || '初始状态'}`
  }).join('\n')

  const maxSteps = 15

  return `你是一个管理情景模拟评估系统。根据决策者的行动推进情景发展。

情景名称: ${world.name}
情景背景: ${world.description}
评估目标: ${world.winCondition}
当前轮次: ${stepCount}/${maxSteps}

利益相关方：
${agentContext}

近期进展：
${recentEvents.slice(-3).map((e, i) => `${i + 1}. ${e}`).join('\n') || '（情景刚启动）'}

待触发的环境事件：
${world.rules.filter(r => !r.fired).map(r => `- 条件: ${r.trigger} → 效果: ${r.effect}`).join('\n') || '（无待触发事件）'}

决策者的行动: "${action}"

输出（严格 JSON，所有文本为中文）：
{
  "narrative": "情景进展描述（案例复盘风格，100-200字）",
  "effects": {
    "hpChange": 0,
    "addItem": null,
    "removeItem": null,
    "movePlayer": null,
    "agentReactions": [
      { "agentId": "agent_1", "reaction": "该角色的回应和立场变化", "attitudeChange": 0, "newObservation": "该角色对决策者形成的新判断" }
    ],
    "mapChange": null
  },
  "choices": ["[策略名] 具体方案描述（至少20字）", "[策略名] 具体方案描述", "[策略名] 具体方案描述"],
  "worldEvent": null,
  "gameOver": false,
  "gameOverReason": null
}

${actionModifier || ''}`
}

// ============================================================
// 仿真模式 Action Prompt — 完全独立，无玩家/空间概念
// ============================================================

function buildSimulationActionPrompt(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  nearbyAgents: Agent[],
  recentEvents: string[],
  stepCount: number,
  actionModifier?: string
): string {
  const allAgents = world.agents
  const agentContext = allAgents.map(a => {
    const recentObs = a.memory.observations.slice(-3).map(o => o.content).join('；')
    return `- ${a.name}（id: ${a.id}）| 决策模型: ${a.decisionStyle} | 目标: ${a.goals.join('、')} | 态度: ${a.memory.attitude}/100 | 近期状态: ${recentObs || '初始状态'}`
  }).join('\n')

  const maxSteps = 20

  return `你是一个多智能体仿真推演引擎。执行第 ${stepCount + 1}/${maxSteps} 轮自主推演。

仿真名称: ${world.name}
仿真设定: ${world.description}
观测目标: ${world.winCondition}

智能体状态：
${agentContext}

历史摘要（最近3轮）：
${recentEvents.slice(-3).map((e, i) => `${i + 1}. ${e}`).join('\n') || '（第一轮）'}

环境调度器（未触发）：
${world.rules.filter(r => !r.fired).map(r => `- 条件: ${r.trigger} → 效果: ${r.effect}`).join('\n') || '（无待触发事件）'}

输出（严格 JSON，所有文本为中文）：
{
  "narrative": "本轮推演结果（系统观察者视角，描述各Agent决策行为和交互效果）",
  "effects": {
    "hpChange": 0,
    "addItem": null,
    "removeItem": null,
    "movePlayer": null,
    "agentReactions": [
      { "agentId": "agent_1", "reaction": "该Agent本轮的决策行为", "attitudeChange": 0, "newObservation": "该Agent获得的新认知" }
    ],
    "mapChange": null
  },
  "choices": [],
  "worldEvent": null,
  "gameOver": false,
  "gameOverReason": null
}

${actionModifier || ''}`
}
