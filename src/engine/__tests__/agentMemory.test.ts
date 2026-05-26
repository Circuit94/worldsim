/**
 * Agent Memory Tests
 * 
 * Tests the importance-weighted memory retention system using the REAL
 * exported functions from agentLoop.ts — not copies.
 * 
 * Also tests applyAgentTick to verify memory integration behavior.
 */

import { describe, it, expect } from 'vitest'
import { retainWithImportance, retrieveRelevantMemory, applyAgentTick } from '../agentLoop'
import type { Agent, WorldSchema, AgentTickResult } from '../types'

// ============================================================
// retainWithImportance tests
// ============================================================

describe('Agent Memory — retainWithImportance', () => {
  it('returns all observations when under maxSize', () => {
    const obs = [
      { step: 1, content: 'saw cat', importance: 3 },
      { step: 2, content: 'found key', importance: 5 },
    ]

    const result = retainWithImportance(obs, 10)
    expect(result).toHaveLength(2)
    expect(result).toEqual(obs)
  })

  it('never evicts core memories (importance >= 7)', () => {
    const obs = [
      { step: 1, content: 'core event 1', importance: 8 },
      { step: 2, content: 'routine 1', importance: 2 },
      { step: 3, content: 'core event 2', importance: 9 },
      { step: 4, content: 'routine 2', importance: 3 },
      { step: 5, content: 'routine 3', importance: 1 },
      { step: 6, content: 'core event 3', importance: 7 },
    ]

    const result = retainWithImportance(obs, 4)
    // All 3 core memories must be retained
    const coreContents = result.filter(o => o.importance >= 7).map(o => o.content)
    expect(coreContents).toContain('core event 1')
    expect(coreContents).toContain('core event 2')
    expect(coreContents).toContain('core event 3')
    expect(result).toHaveLength(4)
  })

  it('evicts low-importance old observations first', () => {
    const obs = [
      { step: 1, content: 'old boring', importance: 1 },
      { step: 2, content: 'old medium', importance: 4 },
      { step: 10, content: 'recent boring', importance: 2 },
      { step: 11, content: 'recent medium', importance: 5 },
      { step: 12, content: 'recent important', importance: 6 },
    ]

    const result = retainWithImportance(obs, 3)
    expect(result).toHaveLength(3)
    // "old boring" (lowest score) should be evicted
    const contents = result.map(o => o.content)
    expect(contents).not.toContain('old boring')
  })

  it('maintains chronological order in output', () => {
    const obs = [
      { step: 1, content: 'first', importance: 8 },
      { step: 5, content: 'middle', importance: 3 },
      { step: 10, content: 'last', importance: 9 },
    ]

    const result = retainWithImportance(obs, 3)
    expect(result[0].step).toBeLessThanOrEqual(result[1].step)
    expect(result[1].step).toBeLessThanOrEqual(result[2].step)
  })

  it('handles edge case: all observations are core memories', () => {
    const obs = [
      { step: 1, content: 'critical 1', importance: 8 },
      { step: 2, content: 'critical 2', importance: 9 },
      { step: 3, content: 'critical 3', importance: 7 },
      { step: 4, content: 'critical 4', importance: 10 },
    ]

    const result = retainWithImportance(obs, 2)
    // Should keep the most recent 2
    expect(result).toHaveLength(2)
    expect(result[0].step).toBe(3)
    expect(result[1].step).toBe(4)
  })

  it('handles empty observations', () => {
    const result = retainWithImportance([], 10)
    expect(result).toHaveLength(0)
  })

  it('scoring correctly balances importance and recency', () => {
    // High importance old vs low importance new
    const obs = [
      { step: 1, content: 'important old', importance: 6 },   // score = 0.36 + 0.04 = 0.40
      { step: 10, content: 'boring recent', importance: 1 },  // score = 0.06 + 0.40 = 0.46
      { step: 8, content: 'medium recent', importance: 4 },   // score = 0.24 + 0.32 = 0.56
    ]

    const result = retainWithImportance(obs, 2)
    expect(result).toHaveLength(2)
    // medium recent (0.56) and boring recent (0.46) should beat important old (0.40)
    const contents = result.map(o => o.content)
    expect(contents).toContain('medium recent')
    expect(contents).toContain('boring recent')
  })
})

// ============================================================
// retrieveRelevantMemory tests
// ============================================================

describe('Agent Memory — retrieveRelevantMemory', () => {
  function makeAgent(observations: Array<{ step: number; content: string; importance: number }>): Agent {
    return {
      id: 'test_agent',
      name: 'Test',
      position: [0, 0],
      persona: 'test persona',
      goals: ['test'],
      decisionStyle: 'rational',
      memory: {
        observations,
        reflections: [],
        attitude: 0,
        knownFacts: [],
        currentPlan: null,
      },
    }
  }

  it('returns "暂无" for empty observations', () => {
    const agent = makeAgent([])
    const result = retrieveRelevantMemory(agent, 5)
    expect(result).toBe('暂无')
  })

  it('marks core memories with ★ and regular with ·', () => {
    const agent = makeAgent([
      { step: 1, content: 'routine task', importance: 3 },
      { step: 2, content: 'critical discovery', importance: 8 },
    ])

    const result = retrieveRelevantMemory(agent, 5)
    expect(result).toContain('★ critical discovery')
    expect(result).toContain('· routine task')
  })

  it('includes core memories even when there are many recent ones', () => {
    const agent = makeAgent([
      { step: 1, content: 'core event', importance: 9 },
      { step: 2, content: 'r1', importance: 2 },
      { step: 3, content: 'r2', importance: 3 },
      { step: 4, content: 'r3', importance: 2 },
      { step: 5, content: 'r4', importance: 1 },
      { step: 6, content: 'r5', importance: 2 },
      { step: 7, content: 'r6', importance: 3 },
    ])

    const result = retrieveRelevantMemory(agent, 3)
    // Core memory must be included despite being old
    expect(result).toContain('★ core event')
  })

  it('respects maxSlots limit', () => {
    const obs = Array.from({ length: 20 }, (_, i) => ({
      step: i,
      content: `observation ${i}`,
      importance: 3,
    }))
    const agent = makeAgent(obs)

    const result = retrieveRelevantMemory(agent, 3)
    // Should have at most 3 entries (separated by '; ')
    const entries = result.split('; ')
    expect(entries.length).toBeLessThanOrEqual(3)
  })

  it('outputs in chronological order', () => {
    const agent = makeAgent([
      { step: 5, content: 'late', importance: 8 },
      { step: 1, content: 'early', importance: 3 },
      { step: 3, content: 'middle', importance: 4 },
    ])

    const result = retrieveRelevantMemory(agent, 5)
    const earlyIdx = result.indexOf('early')
    const middleIdx = result.indexOf('middle')
    const lateIdx = result.indexOf('late')
    expect(earlyIdx).toBeLessThan(middleIdx)
    expect(middleIdx).toBeLessThan(lateIdx)
  })
})

// ============================================================
// applyAgentTick integration tests — verify memory is actually updated
// ============================================================

describe('Agent Memory — applyAgentTick integration', () => {
  function makeWorld(agents: Agent[]): WorldSchema {
    return {
      id: 'test_world',
      name: 'Test',
      seed: 'test',
      theme: 'test',
      description: 'test',
      dimensions: [5, 5],
      map: [['grass', 'grass', 'grass', 'grass', 'grass']],
      tiles: { grass: { name: '草地', walkable: true } },
      agents,
      items: [],
      rules: [],
      winCondition: 'test',
      mode: 'game',
    }
  }

  it('uses retainWithImportance when adding observations via applyAgentTick', () => {
    // Create agent with 14 existing observations (just under the 15 cap)
    const existingObs = Array.from({ length: 14 }, (_, i) => ({
      step: i,
      content: `obs ${i}`,
      importance: 2,
    }))
    // Add one core memory
    existingObs[5] = { step: 5, content: 'critical event', importance: 9 }

    const agent: Agent = {
      id: 'agent_1',
      name: 'Alice',
      position: [1, 0],
      persona: 'test',
      goals: ['test'],
      decisionStyle: 'rational',
      memory: {
        observations: existingObs,
        reflections: [],
        attitude: 0,
        knownFacts: [],
        currentPlan: null,
      },
    }

    const world = makeWorld([agent])
    const tickResult: AgentTickResult = {
      agentId: 'agent_1',
      action: 'new action from tick',
      narrative: 'something happened',
      newPosition: null,
      newReflection: null,
      newPlan: null,
      interactsWithAgent: null,
    }

    const updatedWorld = applyAgentTick(world, tickResult, 15)
    const updatedAgent = updatedWorld.agents[0]

    // Should be capped at 15 (not 15+1=16)
    expect(updatedAgent.memory.observations.length).toBeLessThanOrEqual(15)
    // Core memory must still be present
    expect(updatedAgent.memory.observations.some(o => o.content === 'critical event')).toBe(true)
    // New observation must be present
    expect(updatedAgent.memory.observations.some(o => o.content === 'new action from tick')).toBe(true)
  })

  it('preserves reflections and plans from tick results', () => {
    const agent: Agent = {
      id: 'agent_1',
      name: 'Bob',
      position: [0, 0],
      persona: 'test',
      goals: ['test'],
      decisionStyle: 'rational',
      memory: {
        observations: [{ step: 0, content: 'initial', importance: 3 }],
        reflections: ['old reflection'],
        attitude: 10,
        knownFacts: [],
        currentPlan: 'old plan',
      },
    }

    const world = makeWorld([agent])
    const tickResult: AgentTickResult = {
      agentId: 'agent_1',
      action: 'did something',
      narrative: 'narrative',
      newPosition: null,
      newReflection: 'new insight about the world',
      newPlan: 'new plan to explore',
      interactsWithAgent: null,
    }

    const updatedWorld = applyAgentTick(world, tickResult, 1)
    const updatedAgent = updatedWorld.agents[0]

    expect(updatedAgent.memory.reflections).toContain('new insight about the world')
    expect(updatedAgent.memory.currentPlan).toBe('new plan to explore')
  })
})
