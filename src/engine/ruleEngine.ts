/**
 * WorldSim Engine — Deterministic Rule Engine
 * 
 * This layer sits BETWEEN the LLM response and state application.
 * It enforces hard constraints that the LLM cannot override:
 * 
 * 1. Physics Validation: bounds checking, walkability, movement distance
 * 2. State Consistency: HP clamping, inventory integrity, agent uniqueness
 * 3. Rule Firing: deterministic trigger conditions → effects
 * 4. Output Sanitization: ensures LLM output matches expected schema
 * 
 * This is what makes WorldSim an "engine" vs. a "prompt wrapper":
 * - LLMs suggest what happens
 * - The rule engine decides what's ALLOWED to happen
 * - Guardrails ensure game state is never corrupted
 */

import type { WorldSchema, PlayerState, ActionResponse, Agent, MapChange } from './types'

// ============================================================
// Validation Layer — Hard constraints the LLM cannot bypass
// ============================================================

export interface ValidationResult {
  valid: boolean
  corrections: string[]      // What was fixed
  sanitized: ActionResponse  // The corrected response
}

/**
 * Main validation pipeline — call this on every LLM response before applying
 */
export function validateAndCorrect(
  response: ActionResponse,
  world: WorldSchema,
  player: PlayerState
): ValidationResult {
  const corrections: string[] = []
  let sanitized = { ...response, effects: { ...response.effects } }

  // 1. Validate player movement
  sanitized = validateMovement(sanitized, world, player, corrections)

  // 2. Validate HP change bounds
  sanitized = validateHp(sanitized, player, corrections)

  // 3. Validate item operations
  sanitized = validateItems(sanitized, world, player, corrections)

  // 4. Validate agent reactions reference real agents
  sanitized = validateAgentReactions(sanitized, world, corrections)

  // 5. Validate map changes reference valid positions and tiles
  sanitized = validateMapChange(sanitized, world, corrections)

  // 6. Clamp attitude changes
  sanitized = validateAttitudeChanges(sanitized, corrections)

  // 7. Ensure choices exist and are reasonable
  sanitized = validateChoices(sanitized, corrections)

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

  // Check bounds
  if (x < 0 || x >= world.dimensions[0] || y < 0 || y >= world.dimensions[1]) {
    corrections.push(`Movement [${x},${y}] out of bounds — blocked`)
    return { ...response, effects: { ...response.effects, movePlayer: null } }
  }

  // Check walkability
  const tileId = world.map[y]?.[x]
  if (!tileId || world.tiles[tileId]?.walkable === false) {
    corrections.push(`Movement to non-walkable tile "${tileId}" — blocked`)
    return { ...response, effects: { ...response.effects, movePlayer: null } }
  }

  // Check distance (max 2 tiles Manhattan per step for player)
  const dist = Math.abs(x - px) + Math.abs(y - py)
  if (dist > 3) {
    corrections.push(`Movement distance ${dist} exceeds max 3 — clamped to nearest`)
    // Clamp to 1 step toward target
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

  // Prevent instant kills (max -50 per action) and overheal
  if (hpChange < -50) {
    corrections.push(`HP change ${hpChange} too severe — clamped to -50`)
    return { ...response, effects: { ...response.effects, hpChange: -50 } }
  }
  if (hpChange > 30) {
    corrections.push(`HP heal ${hpChange} too generous — clamped to +30`)
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

  // Validate addItem exists in world and isn't already collected
  if (addItem) {
    const item = world.items.find(i => i.name === addItem && !i.collected)
    if (!item) {
      corrections.push(`Item "${addItem}" not available — removed from response`)
      return { ...response, effects: { ...response.effects, addItem: null } }
    }
  }

  // Validate removeItem is in player inventory
  if (removeItem) {
    if (!player.inventory.includes(removeItem)) {
      corrections.push(`Player doesn't have "${removeItem}" — removed from response`)
      return { ...response, effects: { ...response.effects, removeItem: null } }
    }
  }

  // Cap inventory at 10 items
  if (addItem && player.inventory.length >= 10) {
    corrections.push(`Inventory full (10 items) — cannot add "${addItem}"`)
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

  const validIds = new Set(world.agents.map(a => a.id))
  const filtered = agentReactions.filter(r => {
    if (!validIds.has(r.agentId)) {
      corrections.push(`Agent reaction references unknown agent "${r.agentId}" — removed`)
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

  // Validate position
  if (!position || position[0] < 0 || position[0] >= world.dimensions[0] ||
      position[1] < 0 || position[1] >= world.dimensions[1]) {
    corrections.push(`Map change position invalid — removed`)
    return { ...response, effects: { ...response.effects, mapChange: null } }
  }

  // Validate tile ID exists
  if (!world.tiles[newTileId]) {
    corrections.push(`Map change tile "${newTileId}" doesn't exist in tile set — removed`)
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
      corrections.push(`Attitude change ${r.attitudeChange} for ${r.agentId} — clamped to ±15`)
      return { ...r, attitudeChange: Math.max(-15, Math.min(15, r.attitudeChange)) }
    }
    return r
  })

  return { ...response, effects: { ...response.effects, agentReactions: clamped } }
}

function validateChoices(
  response: ActionResponse,
  corrections: string[]
): ActionResponse {
  if (!response.choices || response.choices.length === 0) {
    corrections.push('No choices provided — added defaults')
    return { ...response, choices: ['Look around', 'Wait and observe', 'Try something else'] }
  }

  // Cap at 5 choices
  if (response.choices.length > 5) {
    corrections.push(`${response.choices.length} choices — trimmed to 5`)
    return { ...response, choices: response.choices.slice(0, 5) }
  }

  return response
}

// ============================================================
// World Rule Triggering — Deterministic condition matching
// ============================================================

export interface RuleTriggerResult {
  ruleId: string
  fired: boolean
  effect: string
}

/**
 * Check all unfired rules against current world state
 * Returns rules that should fire this turn
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
 * Simple trigger condition evaluator
 * Supports keyword-based matching against game state
 */
function evaluateRuleTrigger(
  trigger: string,
  world: WorldSchema,
  player: PlayerState
): boolean {
  const lowerTrigger = trigger.toLowerCase()

  // Check inventory-based triggers
  if (lowerTrigger.includes('has item') || lowerTrigger.includes('collects')) {
    for (const itemName of player.inventory) {
      if (lowerTrigger.includes(itemName.toLowerCase())) return true
    }
  }

  // Check HP-based triggers
  if (lowerTrigger.includes('hp below') || lowerTrigger.includes('low health')) {
    if (player.hp < player.maxHp * 0.3) return true
  }

  // Check step-based triggers
  if (lowerTrigger.includes('after') && lowerTrigger.includes('steps')) {
    const stepMatch = trigger.match(/after\s+(\d+)\s+steps/i)
    if (stepMatch && player.steps >= parseInt(stepMatch[1])) return true
  }

  // Check position-based triggers
  if (lowerTrigger.includes('reaches') || lowerTrigger.includes('enters')) {
    // Match against tile descriptions
    const currentTile = world.map[player.position[1]]?.[player.position[0]]
    const tileDef = world.tiles[currentTile]
    if (tileDef && lowerTrigger.includes(tileDef.name.toLowerCase())) return true
  }

  // Check agent attitude triggers
  if (lowerTrigger.includes('trust') || lowerTrigger.includes('hostile')) {
    for (const agent of world.agents) {
      if (lowerTrigger.includes('trust') && agent.memory.attitude > 50) return true
      if (lowerTrigger.includes('hostile') && agent.memory.attitude < -50) return true
    }
  }

  // Check all items collected
  if (lowerTrigger.includes('all items') || lowerTrigger.includes('all key')) {
    const uncollected = world.items.filter(i => !i.collected)
    if (uncollected.length === 0 && world.items.length > 0) return true
  }

  return false
}

/**
 * Mark rules as fired in world state (returns new world)
 */
export function markRulesFired(world: WorldSchema, ruleIds: string[]): WorldSchema {
  if (ruleIds.length === 0) return world

  const newRules = world.rules.map(rule => 
    ruleIds.includes(rule.id) ? { ...rule, fired: true } : rule
  )
  return { ...world, rules: newRules }
}
