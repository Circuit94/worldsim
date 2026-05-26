/**
 * WorldSim Engine — Agent-to-Agent Micro-Dialogue System
 *
 * Design Rationale:
 * In training scenarios, stakeholders (agents) should influence EACH OTHER,
 * not just react to the player independently. A single brief dialogue exchange
 * between two agents with opposing attitudes makes the world feel alive —
 * the player witnesses NPCs arguing, persuading, or confronting each other,
 * creating emergent social dynamics that mirror real-world stakeholder conflicts.
 *
 * Key Architectural Decisions:
 * - Trigger condition: attitude difference >= 25 ensures only meaningful conflicts spark dialogue
 * - Max 1 dialogue per tick: strict token budget control (~50 output tokens per dialogue)
 * - Dialogue output is injected as high-importance observations into BOTH agents' memory streams
 * - Attitude shifts are bounded [-5, +5] per exchange — gradual influence, not sudden flips
 * - Proximity rules differ by mode: training/simulation = same scene, game = Manhattan distance 2
 *
 * Token Cost: ~100 input + ~50 output per dialogue (negligible vs. agent ticks)
 */

import type { WorldSchema, PlayerState, Agent, Observation } from './types'
import { callGemini } from '../api/gemini'
import { retainWithImportance } from './agentLoop'

// ============================================================
// Types
// ============================================================

/**
 * Result of a micro-dialogue exchange between two agents.
 * Contains the generated dialogue text and attitude shifts for both participants.
 */
export type AgentDialogueResult = {
  /** ID of the first agent (higher attitude) */
  agent1Id: string
  /** ID of the second agent (lower attitude) */
  agent2Id: string
  /** The generated 2-line dialogue exchange */
  dialogue: string
  /** Attitude shift applied to agent1 after the exchange (-5 to 5) */
  agent1AttitudeShift: number
  /** Attitude shift applied to agent2 after the exchange (-5 to 5) */
  agent2AttitudeShift: number
}

// ============================================================
// Core Logic
// ============================================================

/**
 * Determine whether two agents are eligible for dialogue based on proximity.
 *
 * In training/simulation mode, all agents share the same conceptual "scene"
 * so proximity is always satisfied. In game mode, they must be within
 * Manhattan distance 2 (adjacent or one tile gap).
 */
function areAgentsProximate(a1: Agent, a2: Agent, mode: WorldSchema['mode']): boolean {
  if (mode === 'training' || mode === 'simulation') {
    return true
  }
  // Game mode: Manhattan distance <= 2
  const dist = Math.abs(a1.position[0] - a2.position[0]) +
               Math.abs(a1.position[1] - a2.position[1])
  return dist <= 2
}

/**
 * Find all eligible agent pairs for dialogue this tick.
 *
 * Eligibility requires:
 * 1. Attitude difference >= 25 (meaningful conflict)
 * 2. Agents are proximate (same scene or within distance 2)
 *
 * Returns pairs sorted by attitude difference descending (most conflicted first).
 */
function findDialogueCandidates(
  world: WorldSchema
): Array<{ a1: Agent; a2: Agent; attitudeDiff: number }> {
  const candidates: Array<{ a1: Agent; a2: Agent; attitudeDiff: number }> = []

  for (let i = 0; i < world.agents.length; i++) {
    for (let j = i + 1; j < world.agents.length; j++) {
      const a1 = world.agents[i]
      const a2 = world.agents[j]
      const diff = Math.abs(a1.memory.attitude - a2.memory.attitude)

      if (diff >= 25 && areAgentsProximate(a1, a2, world.mode)) {
        candidates.push({ a1, a2, attitudeDiff: diff })
      }
    }
  }

  // Most conflicted pair first — they produce the most interesting dialogue
  candidates.sort((a, b) => b.attitudeDiff - a.attitudeDiff)
  return candidates
}

/**
 * Build an extremely compact prompt for agent micro-dialogue generation.
 *
 * The prompt is ~80-120 tokens of input, requesting ~50 tokens of output.
 * It provides both agents' names, personas (truncated), attitudes, and
 * a few recent observations for context. The LLM generates a single
 * 2-line exchange that reflects their conflicting positions.
 *
 * @param agent1 - First agent in the dialogue
 * @param agent2 - Second agent in the dialogue
 * @param world - Current world state for thematic context
 * @returns Compact Chinese-language prompt string
 */
export function buildAgentDialoguePrompt(
  agent1: Agent,
  agent2: Agent,
  world: WorldSchema
): string {
  // Extract recent observations (last 2 each, for brevity)
  const obs1 = agent1.memory.observations.slice(-2).map(o => o.content).join('；') || '无'
  const obs2 = agent2.memory.observations.slice(-2).map(o => o.content).join('；') || '无'

  return `场景：${world.name}
${agent1.name}：${agent1.persona.slice(0, 60)}｜态度${agent1.memory.attitude}｜近况：${obs1}
${agent2.name}：${agent2.persona.slice(0, 60)}｜态度${agent2.memory.attitude}｜近况：${obs2}

两人态度对立，产生一次简短交锋。每人一句话（≤20字），反映各自立场。
态度偏移：正数=对玩家更友好，负数=更敌对，范围-5~5。

仅输出JSON:
{"dialogue":"${agent1.name}: 一句话\\n${agent2.name}: 一句话","agent1Shift":0,"agent2Shift":0}`
}

/**
 * Trigger agent-to-agent micro-dialogues for the current tick.
 *
 * This is the main entry point called from the game loop. It:
 * 1. Finds eligible pairs (attitude diff >= 25 + proximity)
 * 2. Picks the most conflicted pair (max 1 per tick for token budget)
 * 3. Calls the LLM to generate a brief exchange
 * 4. Returns the result for the caller to apply via applyDialogueResult()
 *
 * Returns an empty array if no pairs qualify or if the LLM call fails.
 * Failures are non-critical — the world continues without dialogue.
 *
 * @param world - Current world state
 * @param player - Current player state (unused directly, reserved for future proximity checks)
 * @returns Array of dialogue results (0 or 1 element due to max-1-per-tick limit)
 */
export async function triggerAgentDialogues(
  world: WorldSchema,
  player: PlayerState
): Promise<AgentDialogueResult[]> {
  const candidates = findDialogueCandidates(world)
  if (candidates.length === 0) return []

  // Max 1 dialogue per tick — pick the most conflicted pair
  const { a1, a2 } = candidates[0]
  const prompt = buildAgentDialoguePrompt(a1, a2, world)

  try {
    const { data } = await callGemini(prompt, 'agent_tick')

    // Parse and validate the response
    const dialogue: string = data.dialogue || `${a1.name}: ...\n${a2.name}: ...`
    const agent1Shift = clampShift(data.agent1Shift)
    const agent2Shift = clampShift(data.agent2Shift)

    const result: AgentDialogueResult = {
      agent1Id: a1.id,
      agent2Id: a2.id,
      dialogue,
      agent1AttitudeShift: agent1Shift,
      agent2AttitudeShift: agent2Shift,
    }

    return [result]
  } catch (error) {
    // Dialogue failures are non-critical — silently skip
    console.warn('[WorldSim] Agent dialogue generation failed:', error)
    return []
  }
}

/**
 * Apply a dialogue result to the world state.
 *
 * This injects the dialogue as a high-importance observation (importance=6)
 * into both participating agents' memory streams, and shifts their attitudes
 * accordingly. The observation is marked slightly below "core memory" threshold (7)
 * so it can eventually be evicted if the agent accumulates many interactions,
 * but will persist longer than routine observations (importance 3).
 *
 * @param world - Current world state
 * @param result - The dialogue result to apply
 * @returns Updated world state with dialogue injected into both agents' memories
 */
export function applyDialogueResult(
  world: WorldSchema,
  result: AgentDialogueResult
): WorldSchema {
  const currentStep = world.agents[0]?.memory.observations.length ?? 0

  const newAgents = world.agents.map(agent => {
    const isAgent1 = agent.id === result.agent1Id
    const isAgent2 = agent.id === result.agent2Id
    if (!isAgent1 && !isAgent2) return agent

    const attitudeShift = isAgent1 ? result.agent1AttitudeShift : result.agent2AttitudeShift

    // Create observation from the dialogue exchange
    const dialogueObs: Observation = {
      step: currentStep,
      content: `[对话] ${result.dialogue.replace('\n', ' | ')}`,
      importance: 6, // High but below core-memory threshold (7)
    }

    const newObservations = retainWithImportance(
      [...agent.memory.observations, dialogueObs],
      15
    )

    // Shift attitude, clamped to [-100, 100]
    const newAttitude = Math.max(-100, Math.min(100,
      agent.memory.attitude + attitudeShift
    ))

    return {
      ...agent,
      memory: {
        ...agent.memory,
        observations: newObservations,
        attitude: newAttitude,
      },
    }
  })

  return { ...world, agents: newAgents }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Clamp attitude shift to the valid range [-5, 5].
 * Invalid or missing values default to 0 (no shift).
 */
function clampShift(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value)) return 0
  return Math.max(-5, Math.min(5, Math.round(value)))
}
