/**
 * Chaos & Edge Case Tests
 *
 * Tests edge cases and error conditions that real LLM applications encounter daily:
 * - Malformed outputs (NaN, empty arrays, out-of-bounds)
 * - Missing references (non-existent agentIds, tile positions)
 * - Extreme values (±1000 attitude, 100+ observations)
 * - Empty / degenerate worlds
 */

import { describe, it, expect } from 'vitest'
import { retainWithImportance, applyAgentTick } from '../agentLoop'
import { applyEffects } from '../actionHandler'
import { generateTrainingReport, parseStructuredEvalTags } from '../trainingReport'
import type { WorldSchema, PlayerState, ActionResponse, Agent, AgentTickResult } from '../types'

// ============================================================
// Test Fixtures
// ============================================================

function makeObservation(step: number, importance: number, content?: string) {
  return {
    step,
    content: content || `observation at step ${step}`,
    importance,
  }
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent_1',
    name: '测试角色',
    position: [2, 2] as [number, number],
    persona: '一个用于测试的NPC',
    goals: ['完成测试'],
    decisionStyle: 'rational',
    memory: {
      observations: [],
      reflections: [],
      attitude: 0,
      knownFacts: [],
      currentPlan: null,
    },
    ...overrides,
  }
}

function makeWorld(overrides: Partial<WorldSchema> = {}): WorldSchema {
  return {
    id: 'test_world',
    name: '测试世界',
    seed: 'test_seed',
    theme: '测试',
    description: '用于边界情况测试的世界',
    dimensions: [5, 5] as [number, number],
    map: Array(5).fill(null).map(() => Array(5).fill('grass')),
    tiles: {
      grass: { name: '草地', walkable: true },
      wall: { name: '墙壁', walkable: false },
    },
    agents: [makeAgent()],
    items: [],
    rules: [],
    winCondition: '通过所有测试',
    mode: 'game',
    ...overrides,
  }
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: [0, 0] as [number, number],
    hp: 100,
    maxHp: 100,
    inventory: [],
    steps: 0,
    ...overrides,
  }
}

function makeActionResponse(overrides: Partial<ActionResponse> = {}): ActionResponse {
  return {
    narrative: '什么也没有发生。',
    effects: {
      hpChange: 0,
      addItem: null,
      removeItem: null,
      movePlayer: null,
      agentReactions: [],
      mapChange: null,
    },
    choices: ['选项A', '选项B'],
    worldEvent: null,
    gameOver: false,
    gameOverReason: null,
    ...overrides,
  }
}

function makeTickResult(overrides: Partial<AgentTickResult> = {}): AgentTickResult {
  return {
    agentId: 'agent_1',
    action: '静静等待',
    narrative: '角色没有动作。',
    newPosition: null,
    newReflection: null,
    newPlan: null,
    interactsWithAgent: null,
    ...overrides,
  }
}

// ============================================================
// 1. retainWithImportance Edge Cases
// ============================================================

describe('retainWithImportance edge cases', () => {
  it('maxSize = 0 with core memories keeps most recent core (slice(-0) quirk)', () => {
    const observations = [
      makeObservation(1, 5),
      makeObservation(2, 8),
      makeObservation(3, 3),
    ]
    const result = retainWithImportance(observations, 0)
    // slice(-0) === slice(0) in JS, so core memories are retained
    // This documents the actual behavior: maxSize=0 with core memories
    // returns all core memories (importance >= 7)
    expect(result).toEqual([makeObservation(2, 8)])
  })

  it('maxSize = 1 with mix of core and regular memories should keep one core memory', () => {
    const observations = [
      makeObservation(1, 2, '普通记忆'),
      makeObservation(2, 9, '核心记忆'),
      makeObservation(3, 3, '另一个普通记忆'),
    ]
    const result = retainWithImportance(observations, 1)
    expect(result).toHaveLength(1)
    // Should keep the most recent core memory (sliced from end)
    expect(result[0].importance).toBeGreaterThanOrEqual(7)
  })

  it('100+ observations all with importance >= 7 (all core memories)', () => {
    const observations = Array.from({ length: 120 }, (_, i) =>
      makeObservation(i, 7 + (i % 4), `核心记忆 ${i}`)
    )
    const result = retainWithImportance(observations, 15)
    expect(result).toHaveLength(15)
    // All retained should be core memories (importance >= 7)
    result.forEach(o => {
      expect(o.importance).toBeGreaterThanOrEqual(7)
    })
    // Should keep the most recent ones (from the tail)
    expect(result[result.length - 1].step).toBe(119)
  })

  it('observations with importance = 0', () => {
    const observations = [
      makeObservation(1, 0, '无关紧要的事'),
      makeObservation(2, 0, '又一件无关紧要的事'),
      makeObservation(3, 0, '还是无关紧要的事'),
      makeObservation(4, 0, '第四件'),
      makeObservation(5, 0, '第五件'),
    ]
    const result = retainWithImportance(observations, 3)
    expect(result).toHaveLength(3)
    // With importance 0 and varying steps, recency should dominate
    // score = (0/10)*0.6 + (step/maxStep)*0.4
    // Most recent steps have higher recency score
    expect(result.map(o => o.step)).toContain(5)
    expect(result.map(o => o.step)).toContain(4)
  })

  it('observations with negative step numbers', () => {
    const observations = [
      makeObservation(-3, 5, '过去的记忆A'),
      makeObservation(-1, 8, '过去的核心记忆'),
      makeObservation(0, 3, '起点记忆'),
      makeObservation(1, 4, '正常记忆'),
    ]
    // Should not crash; negative steps are valid in terms of sorting
    const result = retainWithImportance(observations, 3)
    expect(result).toHaveLength(3)
    // Core memory (importance 8) should always be retained
    expect(result.some(o => o.importance === 8)).toBe(true)
    // Result should be sorted by step (chronological)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].step).toBeGreaterThanOrEqual(result[i - 1].step)
    }
  })

  it('maxSize larger than observations returns original array', () => {
    const observations = [makeObservation(1, 5)]
    const result = retainWithImportance(observations, 100)
    expect(result).toBe(observations) // same reference, no processing
  })

  it('empty observations array', () => {
    const result = retainWithImportance([], 10)
    expect(result).toEqual([])
  })
})

// ============================================================
// 2. validateAgentMove edge cases (tested via applyAgentTick)
// ============================================================

describe('validateAgentMove edge cases (via applyAgentTick)', () => {
  // Note: validateAgentMove is a private function called inside executeAgentTick
  // (the async LLM-calling path). applyAgentTick directly uses the newPosition
  // from the tick result — it trusts that validation happened upstream.
  // These tests document that applyAgentTick passes through whatever position
  // it receives, and that null/falsy positions fall back to the original.

  it('newPosition as empty array — truthy value is passed through directly', () => {
    const world = makeWorld()
    const result = makeTickResult({
      newPosition: [] as unknown as [number, number],
    })
    const updated = applyAgentTick(world, result)
    // [] is truthy in JS, so `result.newPosition || agent.position` uses []
    // This documents the current behavior: applyAgentTick trusts input
    expect(updated.agents[0].position).toEqual([])
  })

  it('newPosition as [NaN, NaN] — passed through since applyAgentTick trusts input', () => {
    const world = makeWorld()
    const result = makeTickResult({
      newPosition: [NaN, NaN] as [number, number],
    })
    const updated = applyAgentTick(world, result)
    // [NaN, NaN] is truthy, passed through directly
    expect(updated.agents[0].position).toEqual([NaN, NaN])
  })

  it('newPosition way out of bounds [999, 999] — passed through without re-validation', () => {
    const world = makeWorld()
    const result = makeTickResult({
      newPosition: [999, 999] as [number, number],
    })
    const updated = applyAgentTick(world, result)
    // applyAgentTick does not re-validate; validation is in executeAgentTick
    expect(updated.agents[0].position).toEqual([999, 999])
  })

  it('newPosition as null falls back to original agent position', () => {
    const world = makeWorld()
    const result = makeTickResult({
      newPosition: null,
    })
    const updated = applyAgentTick(world, result)
    // null || agent.position → keeps original
    expect(updated.agents[0].position).toEqual([2, 2])
  })

  it('valid newPosition 1 step away should be accepted', () => {
    const world = makeWorld()
    const result = makeTickResult({
      newPosition: [2, 3] as [number, number],
    })
    const updated = applyAgentTick(world, result)
    expect(updated.agents[0].position).toEqual([2, 3])
  })

  it('newPosition for non-existent agentId leaves all agents unchanged', () => {
    const world = makeWorld()
    const result = makeTickResult({
      agentId: 'ghost_agent',
      newPosition: [0, 0] as [number, number],
    })
    const updated = applyAgentTick(world, result)
    // No agent matches, all stay the same
    expect(updated.agents[0].position).toEqual([2, 2])
  })
})

// ============================================================
// 3. applyEffects edge cases
// ============================================================

describe('applyEffects edge cases', () => {
  it('agentReactions referencing non-existent agentId should be silently ignored', () => {
    const world = makeWorld()
    const player = makePlayer()
    const response = makeActionResponse({
      effects: {
        hpChange: 0,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [
          {
            agentId: 'non_existent_agent',
            reaction: '不存在的角色反应了',
            attitudeChange: 5,
            newObservation: '看到了什么',
          },
        ],
        mapChange: null,
      },
    })
    // Should not throw
    const { world: newWorld } = applyEffects(world, player, response)
    // Original agent should be unaffected
    expect(newWorld.agents[0].memory.attitude).toBe(0)
    expect(newWorld.agents[0].memory.observations).toHaveLength(0)
  })

  it('extremely large attitudeChange (+1000) should be clamped to 100', () => {
    const world = makeWorld()
    const player = makePlayer()
    const response = makeActionResponse({
      effects: {
        hpChange: 0,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [
          {
            agentId: 'agent_1',
            reaction: '非常感动',
            attitudeChange: 1000,
            newObservation: '玩家做了令人难以置信的事',
          },
        ],
        mapChange: null,
      },
    })
    const { world: newWorld } = applyEffects(world, player, response)
    expect(newWorld.agents[0].memory.attitude).toBeLessThanOrEqual(100)
  })

  it('extremely large negative attitudeChange (-1000) should be clamped to -100', () => {
    const world = makeWorld()
    const player = makePlayer()
    const response = makeActionResponse({
      effects: {
        hpChange: 0,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [
          {
            agentId: 'agent_1',
            reaction: '极度愤怒',
            attitudeChange: -1000,
            newObservation: '玩家做了不可饶恕的事',
          },
        ],
        mapChange: null,
      },
    })
    const { world: newWorld } = applyEffects(world, player, response)
    expect(newWorld.agents[0].memory.attitude).toBeGreaterThanOrEqual(-100)
  })

  it('mapChange to non-existent tile position should be silently ignored', () => {
    const world = makeWorld()
    const player = makePlayer()
    const response = makeActionResponse({
      effects: {
        hpChange: 0,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [],
        mapChange: {
          position: [99, 99] as [number, number],
          newTileId: 'lava',
          reason: '地面塌陷',
        },
      },
    })
    // Should not throw, map should remain unchanged
    const { world: newWorld } = applyEffects(world, player, response)
    expect(newWorld.map).toEqual(world.map)
  })

  it('empty world (no agents, no items, no rules) should not throw', () => {
    const world = makeWorld({
      agents: [],
      items: [],
      rules: [],
    })
    const player = makePlayer()
    const response = makeActionResponse()

    const { world: newWorld, player: newPlayer } = applyEffects(world, player, response)
    expect(newWorld.agents).toEqual([])
    expect(newWorld.items).toEqual([])
    expect(newPlayer.steps).toBe(1)
  })

  it('mapChange to position within bounds should update the tile', () => {
    const world = makeWorld()
    const player = makePlayer()
    const response = makeActionResponse({
      effects: {
        hpChange: 0,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [],
        mapChange: {
          position: [1, 1] as [number, number],
          newTileId: 'wall',
          reason: '墙壁出现',
        },
      },
    })
    const { world: newWorld } = applyEffects(world, player, response)
    expect(newWorld.map[1][1]).toBe('wall')
  })

  it('hpChange in game mode is clamped between 0 and maxHp', () => {
    const world = makeWorld()
    const player = makePlayer({ hp: 10, maxHp: 100 })
    const response = makeActionResponse({
      effects: {
        hpChange: -999,
        addItem: null,
        removeItem: null,
        movePlayer: null,
        agentReactions: [],
        mapChange: null,
      },
    })
    const { player: newPlayer } = applyEffects(world, player, response, 'game')
    expect(newPlayer.hp).toBe(0)
  })
})

// ============================================================
// 4. generateTrainingReport edge cases
// ============================================================

describe('generateTrainingReport edge cases', () => {
  it('empty narrative log should produce a valid report with 0 decisions', () => {
    const world = makeWorld({ mode: 'training' })
    const report = generateTrainingReport(world, [], 0)

    expect(report.decisionCount).toBe(0)
    expect(report.avgResponseLength).toBe(0)
    expect(report.totalSteps).toBe(0)
    expect(report.competencies).toHaveLength(5) // always 5 dimensions
    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallGrade).toBeDefined()
  })

  it('all narratives are decisions (no narrative type) — uses fallback scoring', () => {
    const narrativeLog = [
      { text: '→ 决定先收集情报', type: 'decision' },
      { text: '→ 和对方进行谈判', type: 'decision' },
      { text: '→ 基于分析结果做出长期战略规划', type: 'decision' },
    ]
    const world = makeWorld({ mode: 'training' })
    const report = generateTrainingReport(world, narrativeLog, 3)

    expect(report.decisionCount).toBe(3)
    // No 'narrative' type entries, so narrativeEvalTags will be empty
    // Fallback scoring should still compute reasonable scores
    report.competencies.forEach(c => {
      expect(c.score).toBeGreaterThanOrEqual(0)
      expect(c.score).toBeLessThanOrEqual(100)
      expect(['S', 'A', 'B', 'C', 'D']).toContain(c.grade)
    })
  })

  it('world with 0 agents should produce report without stakeholder crashes', () => {
    const world = makeWorld({ agents: [], mode: 'training' })
    const narrativeLog = [
      { text: '场景开始了。', type: 'narrative' },
      { text: '→ 观察周围环境', type: 'decision' },
    ]
    const report = generateTrainingReport(world, narrativeLog, 2)

    expect(report.stakeholders).toEqual([])
    expect(report.decisionCount).toBe(1)
    // Summary should still generate without division errors
    expect(report.summary).toBeTruthy()
    expect(report.overallScore).toBeGreaterThanOrEqual(0)
  })

  it('very long narrative log (50+ entries) should not crash', () => {
    const world = makeWorld({ mode: 'training' })
    const narrativeLog = Array.from({ length: 50 }, (_, i) => ({
      text: i % 2 === 0 ? `→ 决策 ${i}：因为考虑到长期利益做出全局战略选择` : `叙事 ${i}`,
      type: i % 2 === 0 ? 'decision' : 'narrative',
    }))
    const report = generateTrainingReport(world, narrativeLog, 50)
    expect(report.decisionCount).toBe(25)
    expect(report.phases).toHaveLength(3)
  })
})

// ============================================================
// 5. parseStructuredEvalTags edge cases
// ============================================================

describe('parseStructuredEvalTags edge cases', () => {
  it('evalTags with invalid grades (X, Z, lowercase) should be filtered out', () => {
    const data = {
      evalTags: [
        { dimension: '分析力', grade: 'X' },
        { dimension: '决断力', grade: 'Z' },
        { dimension: '沟通', grade: 'a' },  // lowercase
        { dimension: '战略', grade: 'A' },  // valid
      ],
    }
    const result = parseStructuredEvalTags(data)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ dimension: '战略', grade: 'A' })
  })

  it('evalTags with missing dimension field should be filtered out', () => {
    const data = {
      evalTags: [
        { grade: 'A' },                       // no dimension
        { dimension: '', grade: 'B' },         // empty dimension → falsy
        { dimension: '决策', grade: 'S' },     // valid
        { dimension: null, grade: 'C' },       // null dimension
      ],
    }
    const result = parseStructuredEvalTags(data)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ dimension: '决策', grade: 'S' })
  })

  it('evalTags as nested objects instead of flat — objects pass truthy check', () => {
    const data = {
      evalTags: [
        { dimension: { name: '分析力', category: '认知' }, grade: 'A' },
        { dimension: { name: '沟通' }, grade: 'B' },
      ],
    }
    const result = parseStructuredEvalTags(data)
    // dimension is an object (truthy) and grade matches /^[SABCD]$/
    // The function does not type-check dimension at runtime, so objects pass through.
    // This documents current behavior — a potential robustness issue:
    expect(result).toHaveLength(2)
    // The returned dimension values are objects, not strings:
    expect(typeof result[0].dimension).toBe('object')
  })

  it('null data should return empty array', () => {
    expect(parseStructuredEvalTags(null)).toEqual([])
    expect(parseStructuredEvalTags(undefined)).toEqual([])
  })

  it('data without evalTags property should return empty array', () => {
    expect(parseStructuredEvalTags({})).toEqual([])
    expect(parseStructuredEvalTags({ otherField: 'value' })).toEqual([])
  })

  it('evalTags as non-array should return empty array', () => {
    expect(parseStructuredEvalTags({ evalTags: 'not an array' })).toEqual([])
    expect(parseStructuredEvalTags({ evalTags: 123 })).toEqual([])
    expect(parseStructuredEvalTags({ evalTags: null })).toEqual([])
  })

  it('evalTags with all valid grades should all be retained', () => {
    const data = {
      evalTags: [
        { dimension: '分析力', grade: 'S' },
        { dimension: '决断力', grade: 'A' },
        { dimension: '利益', grade: 'B' },
        { dimension: '沟通', grade: 'C' },
        { dimension: '战略', grade: 'D' },
      ],
    }
    const result = parseStructuredEvalTags(data)
    expect(result).toHaveLength(5)
  })

  it('evalTags with missing grade field should be filtered out', () => {
    const data = {
      evalTags: [
        { dimension: '分析力' },              // no grade
        { dimension: '沟通', grade: '' },      // empty grade
        { dimension: '战略', grade: 'B' },     // valid
      ],
    }
    const result = parseStructuredEvalTags(data)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ dimension: '战略', grade: 'B' })
  })
})
