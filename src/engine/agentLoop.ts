/**
 * WorldSim Engine — Agent Autonomous Behavior Loop
 * 
 * Implements the Stanford Generative Agents architecture:
 * 1. Observe: Agent records what happened this turn
 * 2. Reflect: If enough observations accumulate, form higher-level beliefs
 * 3. Plan: Based on reflections + goals, decide next intention
 * 4. Act: Execute a single autonomous action (move, interact, wait)
 * 
 * Key design decisions:
 * - Only ONE agent ticks per player turn (round-robin) to minimize token cost
 * - Reflection triggers every 5 observations (not every turn)
 * - Agent actions are LOCAL — they can only affect their immediate vicinity
 * - Total token cost: ~200-300 tokens per agent tick (very light)
 * - Importance-weighted memory: high-importance observations are never evicted
 */

import type { WorldSchema, PlayerState, Agent, AgentTickResult, DebugLog } from './types'
import { callGemini } from '../api/gemini'

/**
 * Determine which agent should tick this turn (round-robin)
 */
export function getTickingAgent(world: WorldSchema, step: number): Agent | null {
  const agents = world.agents
  if (agents.length === 0) return null
  return agents[step % agents.length]
}

/**
 * Check if an agent should trigger reflection (every 5 new observations)
 */
function shouldReflect(agent: Agent): boolean {
  return agent.memory.observations.length >= 5 && 
    agent.memory.observations.length % 5 === 0 &&
    agent.memory.reflections.length < 5
}

/**
 * Retain observations with importance-weighted eviction.
 * 
 * When observations exceed maxSize:
 * 1. Core memories (importance >= 7) are NEVER evicted
 * 2. Regular memories are ranked by recency score:
 *    score = importance * 0.6 + recencyNorm * 0.4
 * 3. Lowest-scoring regular memories are dropped first
 */
export function retainWithImportance(
  observations: Array<{ step: number; content: string; importance: number }>,
  maxSize: number
): Array<{ step: number; content: string; importance: number }> {
  if (observations.length <= maxSize) return observations

  const coreMemories = observations.filter(o => o.importance >= 7)
  const regularMemories = observations.filter(o => o.importance < 7)

  // If core memories alone exceed maxSize, keep all core + most recent regular
  const regularSlots = Math.max(0, maxSize - coreMemories.length)

  if (regularSlots === 0) {
    // Extremely rare: too many core memories, keep most recent ones
    return coreMemories.slice(-maxSize)
  }

  // Score regular memories: blend importance and recency
  const maxStep = Math.max(...regularMemories.map(o => o.step), 1)
  const scored = regularMemories.map(o => ({
    ...o,
    score: (o.importance / 10) * 0.6 + (o.step / maxStep) * 0.4,
  }))

  // Sort by score descending, keep top N
  scored.sort((a, b) => b.score - a.score)
  const keptRegular = scored.slice(0, regularSlots).map(({ score, ...rest }) => rest)

  // Combine and sort by step for chronological order
  const result = [...coreMemories, ...keptRegular]
  result.sort((a, b) => a.step - b.step)
  return result
}

/**
 * Importance-weighted memory retrieval
 * Returns the most relevant observations for the agent's current context.
 * 
 * Strategy:
 * - Always include observations with importance >= 7 ("core memories")
 * - Fill remaining slots with most recent observations
 * - Cap total at maxSlots to control token budget
 */
export function retrieveRelevantMemory(agent: Agent, maxSlots: number = 5): string {
  const obs = agent.memory.observations
  if (obs.length === 0) return '暂无'

  // Partition: core memories (importance >= 7) vs regular
  const coreMemories = obs.filter(o => o.importance >= 7)
  const regularMemories = obs.filter(o => o.importance < 7)

  // Core memories always included (up to half the slots)
  const coreSlots = Math.min(coreMemories.length, Math.ceil(maxSlots / 2))
  const regularSlots = maxSlots - coreSlots

  // Take most recent core memories and most recent regular memories
  const selected = [
    ...coreMemories.slice(-coreSlots),
    ...regularMemories.slice(-regularSlots),
  ]

  // Sort by step order for coherent context
  selected.sort((a, b) => a.step - b.step)

  return selected.map(o => {
    const marker = o.importance >= 7 ? '★' : '·'
    return `${marker} ${o.content}`
  }).join('; ')
}

/**
 * Build compact prompt for agent autonomous tick
 * Designed to be extremely token-efficient (~150-200 input tokens)
 */
function buildAgentTickPrompt(
  agent: Agent,
  world: WorldSchema,
  player: PlayerState,
  nearbyContext: string
): string {
  const recentObs = retrieveRelevantMemory(agent, 5)
  const reflections = agent.memory.reflections.length > 0 
    ? agent.memory.reflections.slice(-2).join('; ')
    : '暂无'
  
  const triggerReflection = shouldReflect(agent)
  const currentTile = world.map[agent.position[1]]?.[agent.position[0]]
  const tileName = world.tiles[currentTile]?.name || '未知'

  return `你是 ${agent.name}：${agent.persona.slice(0, 80)}
风格: ${agent.decisionStyle} | 目标: ${agent.goals.slice(0, 2).join(', ')}
位置: ${tileName} [${agent.position}]
近期记忆: ${recentObs || '暂无'}
反思: ${reflections}
当前计划: ${agent.memory.currentPlan || '无'}
玩家位置: [${player.position}]，对玩家态度: ${agent.memory.attitude}/100
附近: ${nearbyContext || '无人'}

${triggerReflection ? '反思任务：根据近期观察形成一条更高层级的洞察。\n' : ''}决定你的下一个自主行动。你独立于玩家行动。

输出 JSON（所有文本必须是中文）:
{
  "action": "简述你做了什么（中文）",
  "narrative": "一句氛围感叙述（中文，最多30字）",
  "newPosition": [x,y] or null,
  "newReflection": ${triggerReflection ? '"你的洞察（中文）"' : 'null'},
  "newPlan": "你的新计划（中文）" or null,
  "interactsWithAgent": "agent_id" or null
}

规则:
- 只能移动 1 格（曼哈顿距离）
- 保持在边界内 [0-${world.dimensions[0] - 1}]
- 忠于你的性格和目标
- 如果没有有趣的事，就“等待”或“观察周围”
- 所有文本输出必须是中文`
}

/**
 * Get context about what's near the agent.
 * In training/simulation mode, all agents can perceive each other (no spatial limit).
 */
function getAgentNearbyContext(
  agent: Agent,
  world: WorldSchema,
  player: PlayerState
): string {
  const parts: string[] = []
  const isTrainingOrSim = world.mode === 'training' || world.mode === 'simulation'
  
  // Check if player is nearby (always visible in training mode)
  const distToPlayer = Math.abs(agent.position[0] - player.position[0]) + 
                       Math.abs(agent.position[1] - player.position[1])
  if (isTrainingOrSim || distToPlayer <= 2) {
    parts.push(`玩家（距离 ${distToPlayer}）`)
  }

  // Check for other nearby agents (all visible in training mode)
  for (const other of world.agents) {
    if (other.id === agent.id) continue
    const dist = Math.abs(agent.position[0] - other.position[0]) + 
                 Math.abs(agent.position[1] - other.position[1])
    if (isTrainingOrSim || dist <= 2) {
      parts.push(`${other.name}（${isTrainingOrSim ? '同场' : `距离 ${dist}`}）`)
    }
  }

  // Check for nearby items (skip in training mode — no spatial items)
  if (!isTrainingOrSim) {
    for (const item of world.items) {
      if (item.collected) continue
      const dist = Math.abs(agent.position[0] - item.position[0]) + 
                   Math.abs(agent.position[1] - item.position[1])
      if (dist <= 1) {
        parts.push(`[物品:${item.name}]`)
      }
    }
  }

  return parts.join(', ')
}

/**
 * Execute one agent's autonomous tick
 * Returns the tick result + debug log, or null if skipped
 * 
 * In training mode, all agents can perceive each other (no spatial distance limit)
 */
export async function executeAgentTick(
  world: WorldSchema,
  player: PlayerState,
  step: number
): Promise<{ result: AgentTickResult; debug: DebugLog } | null> {
  const agent = getTickingAgent(world, step)
  if (!agent) return null

  const nearbyContext = getAgentNearbyContext(agent, world, player)
  const prompt = buildAgentTickPrompt(agent, world, player, nearbyContext)

  try {
    const { data, debug } = await callGemini(prompt, 'agent_tick')

    const result: AgentTickResult = {
      agentId: agent.id,
      action: data.action || '静静等待',
      narrative: data.narrative || `${agent.name}没有动作。`,
      newPosition: validateAgentMove(agent, data.newPosition, world),
      newReflection: data.newReflection || null,
      newPlan: data.newPlan || null,
      interactsWithAgent: data.interactsWithAgent || null,
    }

    return { result, debug: { ...debug, type: 'agent_tick' } }
  } catch (error) {
    // Agent tick failures are non-critical — just skip
    console.warn(`[WorldSim] Agent tick failed for ${agent.name}:`, error)
    return null
  }
}

/**
 * Validate agent movement — must be 1 step Manhattan, in bounds, walkable
 */
function validateAgentMove(
  agent: Agent,
  newPos: [number, number] | null,
  world: WorldSchema
): [number, number] | null {
  if (!newPos || !Array.isArray(newPos) || newPos.length !== 2) return null

  const [x, y] = newPos
  const [cx, cy] = agent.position

  // Must be within 1 Manhattan distance
  if (Math.abs(x - cx) + Math.abs(y - cy) > 1) return null

  // Must be in bounds
  if (x < 0 || x >= world.dimensions[0] || y < 0 || y >= world.dimensions[1]) return null

  // Must be walkable
  const tileId = world.map[y]?.[x]
  if (!tileId || world.tiles[tileId]?.walkable === false) return null

  return newPos
}

/**
 * Apply agent tick result to world state
 * Returns updated world with agent's new position, memory, and plan
 */
export function applyAgentTick(
  world: WorldSchema,
  result: AgentTickResult,
  currentStep?: number
): WorldSchema {
  const newAgents = world.agents.map(agent => {
    if (agent.id !== result.agentId) return agent

    const newMemory = { ...agent.memory }

    // Add self-observation with importance-weighted retention
    const newObs = {
      step: currentStep ?? agent.memory.observations.length,
      content: result.action,
      importance: 3,
    }
    newMemory.observations = retainWithImportance(
      [...agent.memory.observations, newObs],
      15  // max total observations to keep
    )

    // Add reflection if generated
    if (result.newReflection) {
      newMemory.reflections = [...agent.memory.reflections.slice(-4), result.newReflection]
    }

    // Update plan
    if (result.newPlan) {
      newMemory.currentPlan = result.newPlan
    }

    return {
      ...agent,
      position: result.newPosition || agent.position,
      memory: newMemory,
    }
  })

  return { ...world, agents: newAgents }
}
