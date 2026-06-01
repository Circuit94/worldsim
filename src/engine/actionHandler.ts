/**
 * WorldSim Engine — Action Handler
 * 
 * Processes player actions, updates world state, manages NPC memory streams.
 * Implements lightweight version of Stanford Generative Agents' memory architecture:
 * - Observation: NPCs record what they witness
 * - Reflection: After N observations, NPCs form higher-level beliefs (future enhancement)
 * - Planning: NPCs have goals that influence their reactions
 */

import type { WorldSchema, PlayerState, ActionResponse, Agent, DebugLog, Observation } from './types'
import { buildActionPrompt } from './prompts'
import { callGemini } from '../api/gemini'
import { validateAndCorrect, checkRuleTriggers, markRulesFired } from './ruleEngine'
import { type ScenarioMode, getScenarioConfig } from './scenarios'
import { retainWithImportance } from './agentLoop'
import { getMilestonePromptInjection } from './milestoneFeedback'

/**
 * Get agents within Manhattan distance 2 of a position
 */
function getNearbyAgents(agents: Agent[], position: [number, number], range = 2): Agent[] {
  return agents.filter(a => {
    const dist = Math.abs(a.position[0] - position[0]) + Math.abs(a.position[1] - position[1])
    return dist <= range
  })
}

/**
 * Apply action effects to world state — returns new immutable copies
 */
export function applyEffects(
  world: WorldSchema,
  player: PlayerState,
  response: ActionResponse,
  mode: ScenarioMode = 'game'
): { world: WorldSchema; player: PlayerState } {
  let newPlayer = { ...player }
  let newWorld = { ...world, agents: [...world.agents], items: [...world.items], rules: [...world.rules] }

  const fx = response.effects
  const isGameMode = mode === 'game'

  // HP change — 仅游戏模式
  if (isGameMode) {
    newPlayer.hp = Math.max(0, Math.min(newPlayer.maxHp, newPlayer.hp + fx.hpChange))
  }

  // Item collection — 仅游戏模式
  if (isGameMode && fx.addItem) {
    newPlayer.inventory = [...newPlayer.inventory, fx.addItem]
    newWorld.items = newWorld.items.map(item =>
      item.name === fx.addItem ? { ...item, collected: true } : item
    )
  }

  // Item removal — 仅游戏模式
  if (isGameMode && fx.removeItem) {
    newPlayer.inventory = newPlayer.inventory.filter(i => i !== fx.removeItem)
  }

  // Player movement — 仅游戏模式
  if (isGameMode && fx.movePlayer) {
    const [x, y] = fx.movePlayer
    if (x >= 0 && x < world.dimensions[0] && y >= 0 && y < world.dimensions[1]) {
      const tileId = world.map[y][x]
      if (world.tiles[tileId]?.walkable !== false) {
        newPlayer.position = fx.movePlayer
      }
    }
  }

  // Agent reactions — 所有模式都需要（记忆/态度系统是核心）
  if (fx.agentReactions) {
    newWorld.agents = newWorld.agents.map(agent => {
      const reaction = fx.agentReactions.find(r => r.agentId === agent.id)
      if (!reaction) return agent

      const newObs: Observation = {
        step: player.steps,
        content: reaction.newObservation,
        importance: Math.abs(reaction.attitudeChange) + 3,
      }

      const newMemory = {
        ...agent.memory,
        observations: retainWithImportance(
          [...agent.memory.observations, newObs],
          15  // Same cap as agentLoop — importance-weighted retention
        ),
        attitude: Math.max(-100, Math.min(100, agent.memory.attitude + reaction.attitudeChange)),
        knownFacts: reaction.newObservation
          ? [...new Set([...agent.memory.knownFacts, reaction.newObservation])]
          : agent.memory.knownFacts,
      }

      return { ...agent, memory: newMemory }
    })
  }

  // Map changes
  if (fx.mapChange) {
    const { position, newTileId } = fx.mapChange
    const newMap = newWorld.map.map(row => [...row])
    if (newMap[position[1]] && newMap[position[1]][position[0]]) {
      newMap[position[1]][position[0]] = newTileId
    }
    newWorld.map = newMap
  }

  // World events (emergent)
  if (response.worldEvent) {
    for (const mc of response.worldEvent.mapChanges || []) {
      const newMap = newWorld.map.map(row => [...row])
      if (newMap[mc.position[1]] && newMap[mc.position[1]][mc.position[0]]) {
        newMap[mc.position[1]][mc.position[0]] = mc.newTileId
      }
      newWorld.map = newMap
    }
  }

  // Increment step counter
  newPlayer.steps = player.steps + 1

  return { world: newWorld, player: newPlayer }
}

/**
 * Main action processing pipeline
 * 
 * Pipeline: LLM Response → Schema Normalization → Rule Engine Validation → Rule Trigger Check
 */
export async function processAction(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  recentEvents: string[],
  mode: ScenarioMode = 'game'
): Promise<{ response: ActionResponse; debug: DebugLog; corrections: string[]; firedRules: string[] }> {
  const nearbyAgents = getNearbyAgents(world.agents, player.position)
  const config = getScenarioConfig(mode)

  // 注入里程碑反馈提示词（在关键轮次追加到 actionModifier）
  const milestoneInjection = getMilestonePromptInjection(player.steps + 1, mode)
  const combinedModifier = [config.actionModifier, milestoneInjection].filter(Boolean).join('\n') || undefined

  const prompt = buildActionPrompt(
    world,
    player,
    action,
    nearbyAgents,
    recentEvents,
    player.steps,
    combinedModifier,
    mode
  )

  const { data, debug } = await callGemini(prompt, 'action')

  // Step 1: Normalize raw LLM output into expected schema
  const rawResponse: ActionResponse = {
    narrative: data.narrative || '发生了一些事情...',
    effects: {
      hpChange: data.effects?.hpChange || 0,
      addItem: data.effects?.addItem || null,
      removeItem: data.effects?.removeItem || null,
      movePlayer: data.effects?.movePlayer || null,
      agentReactions: data.effects?.agentReactions || [],
      mapChange: data.effects?.mapChange || null,
    },
    choices: data.choices || getDefaultFallbackChoices(mode),
    worldEvent: data.worldEvent || null,
    gameOver: data.gameOver || false,
    gameOverReason: data.gameOverReason || null,
  }

  // Step 2: Rule Engine Validation — correct impossible/illegal actions
  const { sanitized, corrections } = validateAndCorrect(rawResponse, world, player, mode)

  // Step 3: Check deterministic rule triggers
  const triggers = checkRuleTriggers(world, player)
  const firedRules = triggers.map(t => t.effect)

  return { response: sanitized, debug, corrections, firedRules }
}

/**
 * 根据模式返回合适的默认选项（LLM 未返回 choices 时使用）
 */
function getDefaultFallbackChoices(mode: ScenarioMode): string[] {
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
