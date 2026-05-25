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
  response: ActionResponse
): { world: WorldSchema; player: PlayerState } {
  let newPlayer = { ...player }
  let newWorld = { ...world, agents: [...world.agents], items: [...world.items], rules: [...world.rules] }

  const fx = response.effects

  // HP change
  newPlayer.hp = Math.max(0, Math.min(newPlayer.maxHp, newPlayer.hp + fx.hpChange))

  // Item collection
  if (fx.addItem) {
    newPlayer.inventory = [...newPlayer.inventory, fx.addItem]
    newWorld.items = newWorld.items.map(item =>
      item.name === fx.addItem ? { ...item, collected: true } : item
    )
  }

  // Item removal
  if (fx.removeItem) {
    newPlayer.inventory = newPlayer.inventory.filter(i => i !== fx.removeItem)
  }

  // Player movement
  if (fx.movePlayer) {
    const [x, y] = fx.movePlayer
    if (x >= 0 && x < world.dimensions[0] && y >= 0 && y < world.dimensions[1]) {
      const tileId = world.map[y][x]
      if (world.tiles[tileId]?.walkable !== false) {
        newPlayer.position = fx.movePlayer
      }
    }
  }

  // Agent reactions — update memory streams
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
        observations: [...agent.memory.observations.slice(-9), newObs], // Cap at 10
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
  recentEvents: string[]
): Promise<{ response: ActionResponse; debug: DebugLog; corrections: string[]; firedRules: string[] }> {
  const nearbyAgents = getNearbyAgents(world.agents, player.position)

  const prompt = buildActionPrompt(
    world,
    player,
    action,
    nearbyAgents,
    recentEvents,
    player.steps
  )

  const { data, debug } = await callGemini(prompt, 'action')

  // Step 1: Normalize raw LLM output into expected schema
  const rawResponse: ActionResponse = {
    narrative: data.narrative || 'Something happens...',
    effects: {
      hpChange: data.effects?.hpChange || 0,
      addItem: data.effects?.addItem || null,
      removeItem: data.effects?.removeItem || null,
      movePlayer: data.effects?.movePlayer || null,
      agentReactions: data.effects?.agentReactions || [],
      mapChange: data.effects?.mapChange || null,
    },
    choices: data.choices || ['Look around', 'Wait', 'Move on'],
    worldEvent: data.worldEvent || null,
    gameOver: data.gameOver || false,
    gameOverReason: data.gameOverReason || null,
  }

  // Step 2: Rule Engine Validation — correct impossible/illegal actions
  const { sanitized, corrections } = validateAndCorrect(rawResponse, world, player)

  // Step 3: Check deterministic rule triggers
  const triggers = checkRuleTriggers(world, player)
  const firedRules = triggers.map(t => t.effect)

  return { response: sanitized, debug, corrections, firedRules }
}
