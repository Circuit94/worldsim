/**
 * End-to-End Integration Test — Training Scenario
 * 
 * Tests the complete training pipeline without LLM calls:
 * 1. Create a training world (mock)
 * 2. Process multiple decisions via applyEffects
 * 3. Generate training report
 * 4. Verify report structure and scoring logic
 * 
 * This validates that all modules integrate correctly:
 * worldGen → actionHandler → agentLoop → trainingReport
 */

import { describe, it, expect } from 'vitest'
import { applyEffects } from '../actionHandler'
import { applyAgentTick } from '../agentLoop'
import { generateTrainingReport, reportToMarkdown, parseStructuredEvalTags } from '../trainingReport'
import { validateAndRepairMap } from '../mapValidator'
import type { WorldSchema, PlayerState, ActionResponse, AgentTickResult } from '../types'

// ============================================================
// Test Fixtures
// ============================================================

function createTrainingWorld(): WorldSchema {
  return {
    id: 'test_training_world',
    name: '大客户谈判',
    seed: 'test-seed',
    theme: '大客户谈判培训',
    description: '你是一名销售总监，需要与一位犹豫不决的大客户和一位内部反对者达成合作协议。',
    dimensions: [3, 3],
    map: [
      ['office', 'hall', 'office'],
      ['hall', 'meeting', 'hall'],
      ['office', 'hall', 'office'],
    ],
    tiles: {
      office: { name: '办公室', walkable: true },
      hall: { name: '走廊', walkable: true },
      meeting: { name: '会议室', walkable: true },
    },
    agents: [
      {
        id: 'agent_1',
        name: '王总',
        position: [1, 1],
        persona: '大客户CEO，对合作持观望态度，关注ROI和风险控制',
        goals: ['确保投资回报', '控制风险'],
        decisionStyle: 'rational',
        memory: {
          observations: [],
          reflections: [],
          attitude: 0,
          knownFacts: [],
          currentPlan: '评估合作方案的可行性',
        },
      },
      {
        id: 'agent_2',
        name: '李副总',
        position: [0, 0],
        persona: '内部反对者，担心合作会影响现有业务线，态度消极',
        goals: ['保护现有业务', '避免不必要的变革'],
        decisionStyle: 'emotional',
        memory: {
          observations: [],
          reflections: [],
          attitude: -20,
          knownFacts: [],
          currentPlan: '寻找反对合作的理由',
        },
      },
    ],
    items: [],
    rules: [
      {
        id: 'rule_1',
        trigger: '第5轮后',
        effect: '王总接到竞争对手的电话，时间压力增大',
        fired: false,
      },
    ],
    winCondition: '成功说服双方达成合作意向',
    mode: 'training',
  }
}

function createPlayerState(): PlayerState {
  return {
    position: [1, 1],
    hp: 100,
    maxHp: 100,
    inventory: [],
    steps: 0,
  }
}

/**
 * Simulate a player decision and its effects
 */
function simulateDecision(
  world: WorldSchema,
  player: PlayerState,
  decision: string,
  agentReactions: { agentId: string; reaction: string; attitudeChange: number; newObservation: string }[]
): { world: WorldSchema; player: PlayerState } {
  const response: ActionResponse = {
    narrative: `决策者选择了：${decision}`,
    effects: {
      hpChange: 0,
      addItem: null,
      removeItem: null,
      movePlayer: null,
      agentReactions,
      mapChange: null,
    },
    choices: ['继续推进', '调整策略', '暂停观察'],
    worldEvent: null,
    gameOver: false,
    gameOverReason: null,
  }

  return applyEffects(world, player, response, 'training')
}

// ============================================================
// Integration Tests
// ============================================================

describe('Training E2E — Complete Pipeline', () => {
  it('runs a full training session and generates a valid report', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()
    const narrativeLog: { text: string; type: string }[] = []

    // Decision 1: 信息收集
    const d1 = '基于前期调研数据，向王总详细分析合作的ROI预期，用具体数字说明投资回报周期'
    const r1 = simulateDecision(world, player, d1, [
      { agentId: 'agent_1', reaction: '王总认真听取了数据分析', attitudeChange: 8, newObservation: '对方有备而来，数据详实' },
      { agentId: 'agent_2', reaction: '李副总质疑数据来源', attitudeChange: -3, newObservation: '对方试图用数据绕过风险讨论' },
    ])
    world = r1.world; player = r1.player
    narrativeLog.push({ text: `→ ${d1}`, type: 'decision' })
    narrativeLog.push({ text: '王总认真听取了数据分析，态度有所缓和。李副总仍持保留意见。', type: 'narrative' })

    // Decision 2: 利益平衡
    const d2 = '考虑到李副总的顾虑，提议设立风险共担机制，明确表示愿意承担前期投入的60%'
    const r2 = simulateDecision(world, player, d2, [
      { agentId: 'agent_1', reaction: '王总对风险共担方案表示兴趣', attitudeChange: 12, newObservation: '对方愿意承担风险，诚意可见' },
      { agentId: 'agent_2', reaction: '李副总态度略有松动', attitudeChange: 5, newObservation: '风险共担减轻了我方压力' },
    ])
    world = r2.world; player = r2.player
    narrativeLog.push({ text: `→ ${d2}`, type: 'decision' })
    narrativeLog.push({ text: '风险共担方案引起了双方的积极反应。', type: 'narrative' })

    // Decision 3: 战略推进
    const d3 = '建议分阶段推进合作，第一阶段小规模试点，根据结果决定是否全面展开，长期来看这对双方都有利'
    const r3 = simulateDecision(world, player, d3, [
      { agentId: 'agent_1', reaction: '王总表示分阶段方案可以接受', attitudeChange: 15, newObservation: '分阶段降低了决策风险' },
      { agentId: 'agent_2', reaction: '李副总不再明确反对', attitudeChange: 10, newObservation: '试点方案给了退出的余地' },
    ])
    world = r3.world; player = r3.player
    narrativeLog.push({ text: `→ ${d3}`, type: 'decision' })
    narrativeLog.push({ text: '分阶段方案获得双方认可，谈判取得突破性进展。', type: 'narrative' })

    // Decision 4: 果断收尾
    const d4 = '必须趁热打铁，直接提出签署意向书的时间表，明确下周三前完成初步协议'
    const r4 = simulateDecision(world, player, d4, [
      { agentId: 'agent_1', reaction: '王总同意下周讨论具体条款', attitudeChange: 5, newObservation: '对方推进节奏合理' },
      { agentId: 'agent_2', reaction: '李副总表示需要看到试点方案细节', attitudeChange: 2, newObservation: '至少没有被强行推进' },
    ])
    world = r4.world; player = r4.player
    narrativeLog.push({ text: `→ ${d4}`, type: 'decision' })
    narrativeLog.push({ text: '双方同意进入具体条款讨论阶段。', type: 'narrative' })

    // Generate report
    const report = generateTrainingReport(world, narrativeLog, player.steps)

    // ============ Assertions ============

    // Basic info
    expect(report.scenarioName).toBe('大客户谈判')
    expect(report.totalSteps).toBe(4)
    expect(report.decisionCount).toBe(4)

    // Competencies should have 5 dimensions
    expect(report.competencies).toHaveLength(5)
    for (const c of report.competencies) {
      expect(c.score).toBeGreaterThanOrEqual(20)
      expect(c.score).toBeLessThanOrEqual(95)
      expect(['S', 'A', 'B', 'C', 'D']).toContain(c.grade)
      expect(c.evidence.length).toBeGreaterThan(0)
      expect(c.suggestion.length).toBeGreaterThan(0)
    }

    // Stakeholders
    expect(report.stakeholders).toHaveLength(2)
    const wangResult = report.stakeholders.find(s => s.name === '王总')!
    const liResult = report.stakeholders.find(s => s.name === '李副总')!
    expect(wangResult.finalAttitude).toBe(40)  // 0 + 8 + 12 + 15 + 5
    expect(liResult.finalAttitude).toBe(-6)    // -20 + (-3) + 5 + 10 + 2
    expect(wangResult.relationship).toBe('allied')

    // Overall score should be reasonable
    expect(report.overallScore).toBeGreaterThanOrEqual(20)
    expect(report.overallScore).toBeLessThanOrEqual(95)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(report.overallGrade)

    // Summary should be non-empty
    expect(report.summary.length).toBeGreaterThan(50)

    // Phases
    expect(report.phases.length).toBe(3)

    // Next steps should exist
    expect(report.nextSteps.length).toBeGreaterThan(0)
  })

  it('generates valid Markdown export', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()
    const narrativeLog: { text: string; type: string }[] = []

    // Single decision
    const r = simulateDecision(world, player, '提出合作方案', [
      { agentId: 'agent_1', reaction: '表示兴趣', attitudeChange: 5, newObservation: '方案有吸引力' },
    ])
    world = r.world; player = r.player
    narrativeLog.push({ text: '→ 提出合作方案', type: 'decision' })
    narrativeLog.push({ text: '王总表示了初步兴趣。', type: 'narrative' })

    const report = generateTrainingReport(world, narrativeLog, player.steps)
    const markdown = reportToMarkdown(report)

    // Markdown structure checks
    expect(markdown).toContain('# 培训评估报告')
    expect(markdown).toContain('## 基本信息')
    expect(markdown).toContain('## 综合评级')
    expect(markdown).toContain('## 能力维度评估')
    expect(markdown).toContain('## 利益相关方结果')
    expect(markdown).toContain('## 阶段表现')
    expect(markdown).toContain('## 核心优势')
    expect(markdown).toContain('## 改进方向')
    expect(markdown).toContain('## 下一步建议')
    expect(markdown).toContain('大客户谈判')
  })

  it('correctly uses structured eval tags when provided', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()
    const narrativeLog: { text: string; type: string }[] = []

    const r = simulateDecision(world, player, '分析局势后果断决策', [
      { agentId: 'agent_1', reaction: '认可', attitudeChange: 10, newObservation: '对方很专业' },
    ])
    world = r.world; player = r.player
    narrativeLog.push({ text: '→ 分析局势后果断决策', type: 'decision' })
    narrativeLog.push({ text: '局势明朗化。', type: 'narrative' })

    // Provide structured eval tags (as if from LLM JSON response)
    const evalTags = [
      { dimension: '分析判断力', grade: 'A' },
      { dimension: '决策魄力', grade: 'S' },
      { dimension: '利益相关方管理', grade: 'B' },
      { dimension: '沟通影响力', grade: 'A' },
      { dimension: '战略格局', grade: 'B' },
    ]

    const report = generateTrainingReport(world, narrativeLog, player.steps, evalTags)

    // Scores should reflect the eval tags
    const analytical = report.competencies.find(c => c.dimension === '分析判断力')!
    const decisiveness = report.competencies.find(c => c.dimension === '决策魄力')!
    expect(analytical.grade).toBe('A')
    expect(decisiveness.grade).toBe('S')
    expect(decisiveness.score).toBe(92)
  })

  it('parseStructuredEvalTags correctly parses LLM response', () => {
    const validData = {
      evalTags: [
        { dimension: '分析判断力', grade: 'A' },
        { dimension: '决策魄力', grade: 'B' },
        { dimension: '利益相关方管理', grade: 'C' },
        { dimension: '沟通影响力', grade: 'S' },
        { dimension: '战略格局', grade: 'D' },
      ]
    }

    const tags = parseStructuredEvalTags(validData)
    expect(tags).toHaveLength(5)
    expect(tags[0]).toEqual({ dimension: '分析判断力', grade: 'A' })

    // Invalid data
    expect(parseStructuredEvalTags(null)).toEqual([])
    expect(parseStructuredEvalTags({})).toEqual([])
    expect(parseStructuredEvalTags({ evalTags: 'not array' })).toEqual([])
    expect(parseStructuredEvalTags({ evalTags: [{ dimension: 'x', grade: 'X' }] })).toEqual([])
  })

  it('fallback scoring produces differentiated scores based on decision content', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()
    const narrativeLog: { text: string; type: string }[] = []

    // Decisions with strong analytical keywords but weak strategic keywords
    const decisions = [
      '基于数据分析，考虑到各方因素，判断当前应该推进合作',
      '根据评估结果，因为ROI数据支撑充分，所以决定加大投入',
      '分析竞争对手动态后，评估我方优势，决定采取差异化策略',
    ]

    for (const d of decisions) {
      const r = simulateDecision(world, player, d, [
        { agentId: 'agent_1', reaction: '回应', attitudeChange: 3, newObservation: '观察' },
      ])
      world = r.world; player = r.player
      narrativeLog.push({ text: `→ ${d}`, type: 'decision' })
      narrativeLog.push({ text: '进展顺利。', type: 'narrative' })
    }

    // No eval tags — forces fallback scoring
    const report = generateTrainingReport(world, narrativeLog, player.steps)

    // Analytical should score higher than strategic (decisions have analytical keywords)
    const analytical = report.competencies.find(c => c.dimension === '分析判断力')!
    const strategic = report.competencies.find(c => c.dimension === '战略格局')!
    expect(analytical.score).toBeGreaterThan(strategic.score)
  })
})

describe('Training E2E — Map Validation Integration', () => {
  it('validateAndRepairMap fixes disconnected training maps', () => {
    const world = createTrainingWorld()
    // Create a wall that isolates the bottom-right corner
    world.tiles['wall'] = { name: '墙壁', walkable: false }
    // Block all paths to [2,2] by walling off row 1 col 2 and row 2 col 1
    world.map[1][2] = 'wall'
    world.map[2][1] = 'wall'
    world.map[2][0] = 'wall'

    const { world: fixed, report } = validateAndRepairMap(world, [0, 0])
    
    // Should have repaired the map to restore connectivity
    expect(report.connected).toBe(true)
    expect(report.repairsApplied).toBeGreaterThan(0)
  })
})

describe('Training E2E — Agent Memory Consistency', () => {
  it('actionHandler and agentLoop use same retention strategy', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()

    // Fill agent memory to near capacity via actionHandler path
    for (let i = 0; i < 20; i++) {
      const r = simulateDecision(world, player, `decision ${i}`, [
        {
          agentId: 'agent_1',
          reaction: `reaction ${i}`,
          attitudeChange: i % 3 === 0 ? 5 : 1,
          newObservation: `observation ${i}`,
        },
      ])
      world = r.world; player = r.player
    }

    const agent1 = world.agents.find(a => a.id === 'agent_1')!
    
    // Memory should be capped at 15 (importance-weighted retention)
    expect(agent1.memory.observations.length).toBeLessThanOrEqual(15)

    // Now apply an agent tick — should also respect the same cap
    const tickResult: AgentTickResult = {
      agentId: 'agent_1',
      action: 'agent autonomous action',
      narrative: 'agent did something',
      newPosition: null,
      newReflection: null,
      newPlan: null,
      interactsWithAgent: null,
    }

    const worldAfterTick = applyAgentTick(world, tickResult, 21)
    const agent1AfterTick = worldAfterTick.agents.find(a => a.id === 'agent_1')!
    
    // Still capped at 15
    expect(agent1AfterTick.memory.observations.length).toBeLessThanOrEqual(15)
  })

  it('high-importance observations survive both paths', () => {
    let world = createTrainingWorld()
    let player = createPlayerState()

    // Create a high-importance observation via actionHandler
    const r = simulateDecision(world, player, 'critical decision', [
      {
        agentId: 'agent_1',
        reaction: 'critical reaction',
        attitudeChange: 15,  // importance = |15| + 3 = 18 → capped but >= 7
        newObservation: 'THIS IS CRITICAL',
      },
    ])
    world = r.world; player = r.player

    // Fill with many low-importance observations
    for (let i = 0; i < 20; i++) {
      const r2 = simulateDecision(world, player, `filler ${i}`, [
        {
          agentId: 'agent_1',
          reaction: `filler reaction ${i}`,
          attitudeChange: 0,  // importance = 0 + 3 = 3 (low)
          newObservation: `filler obs ${i}`,
        },
      ])
      world = r2.world; player = r2.player
    }

    const agent1 = world.agents.find(a => a.id === 'agent_1')!
    
    // The critical observation should still be present (importance >= 7)
    expect(agent1.memory.observations.some(o => o.content === 'THIS IS CRITICAL')).toBe(true)
  })
})
