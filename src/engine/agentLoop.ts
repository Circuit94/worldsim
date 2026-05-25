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
 * Build compact prompt for agent autonomous tick
 * Designed to be extremely token-efficient (~150-200 input tokens)
 */
function buildAgentTickPrompt(
  agent: Agent,
  world: WorldSchema,
  player: PlayerState,
  nearbyContext: string
): string {
  const recentObs = agent.memory.observations.slice(-3).map(o => o.content).join('; ')
  const reflections = agent.memory.reflections.length > 0 
    ? agent.memory.reflections.slice(-2).join('; ')
    : 'None yet'
  
  const triggerReflection = shouldReflect(agent)
  const currentTile = world.map[agent.position[1]]?.[agent.position[0]]
  const tileName = world.tiles[currentTile]?.name || 'Unknown'

  return `You are ${agent.name}: ${agent.persona.slice(0, 80)}
Style: ${agent.decisionStyle} | Goals: ${agent.goals.slice(0, 2).join(', ')}
Location: ${tileName} [${agent.position}]
Recent memories: ${recentObs || 'Nothing notable'}
Reflections: ${reflections}
Current plan: ${agent.memory.currentPlan || 'None'}
Player is at: [${player.position}], attitude toward player: ${agent.memory.attitude}/100
Nearby: ${nearbyContext || 'nobody'}

${triggerReflection ? 'REFLECT: Form one higher-level insight from your recent observations.\n' : ''}Decide your next autonomous action. You act INDEPENDENTLY of the player.

Output JSON:
{
  "action": "brief description of what you do",
  "narrative": "one atmospheric sentence (max 60 chars)",
  "newPosition": [x,y] or null,
  "newReflection": ${triggerReflection ? '"your insight about the world/player"' : 'null'},
  "newPlan": "your updated intention" or null,
  "interactsWithAgent": "agent_id" or null
}

RULES:
- You can only move 1 tile (Manhattan distance) from current position
- Stay in bounds [0-${world.dimensions[0] - 1}]
- Be true to your personality and goals
- If nothing interesting, just "wait" or "observe surroundings"`
}

/**
 * Get context about what's near the agent
 */
function getAgentNearbyContext(
  agent: Agent,
  world: WorldSchema,
  player: PlayerState
): string {
  const parts: string[] = []
  
  // Check if player is nearby
  const distToPlayer = Math.abs(agent.position[0] - player.position[0]) + 
                       Math.abs(agent.position[1] - player.position[1])
  if (distToPlayer <= 2) {
    parts.push(`Player (dist ${distToPlayer})`)
  }

  // Check for other nearby agents
  for (const other of world.agents) {
    if (other.id === agent.id) continue
    const dist = Math.abs(agent.position[0] - other.position[0]) + 
                 Math.abs(agent.position[1] - other.position[1])
    if (dist <= 2) {
      parts.push(`${other.name} (dist ${dist})`)
    }
  }

  // Check for nearby items
  for (const item of world.items) {
    if (item.collected) continue
    const dist = Math.abs(agent.position[0] - item.position[0]) + 
                 Math.abs(agent.position[1] - item.position[1])
    if (dist <= 1) {
      parts.push(`${item.emoji} ${item.name}`)
    }
  }

  return parts.join(', ')
}

/**
 * Execute one agent's autonomous tick
 * Returns the tick result + debug log, or null if skipped
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
      action: data.action || 'waits quietly',
      narrative: data.narrative || `${agent.name} does nothing.`,
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
  result: AgentTickResult
): WorldSchema {
  const newAgents = world.agents.map(agent => {
    if (agent.id !== result.agentId) return agent

    const newMemory = { ...agent.memory }

    // Add self-observation
    const newObs = {
      step: -1, // Will be set by caller
      content: `I ${result.action}`,
      importance: 3,
    }
    newMemory.observations = [...agent.memory.observations.slice(-9), newObs]

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
