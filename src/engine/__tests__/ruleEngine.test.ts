/**
 * Rule Engine Tests
 * 
 * Tests the deterministic validation layer that sits between LLM output
 * and game state application. Ensures hard constraints cannot be bypassed.
 */

import { describe, it, expect } from 'vitest'
import { validateAndCorrect, checkRuleTriggers, markRulesFired } from '../ruleEngine'
import type { WorldSchema, PlayerState, ActionResponse } from '../types'

// ============================================================
// Test Fixtures
// ============================================================

function createTestWorld(overrides?: Partial<WorldSchema>): WorldSchema {
  return {
    id: 'test_world',
    name: 'Test World',
    seed: 'test-seed',
    theme: 'test',
    description: 'A test world',
    dimensions: [5, 5],
    map: [
      ['grass', 'grass', 'grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass', 'grass'],
      ['grass', 'wall', 'wall', 'wall', 'grass'],
      ['grass', 'grass', 'grass', 'grass', 'grass'],
    ],
    tiles: {
      grass: { name: 'grass', walkable: true },
      wall: { name: 'wall', walkable: false },
    },
    agents: [
      {
        id: 'guard',
        name: '守卫',
        position: [1, 1],
        persona: 'A diligent guard',
        goals: ['protect the village'],
        decisionStyle: 'rational',
        memory: {
          observations: [],
          reflections: [],
          attitude: 0,
          knownFacts: [],
          currentPlan: null,
        },
      },
    ],
    items: [
      { id: 'key', name: '钥匙', position: [3, 0], description: 'A rusty key', collected: false },
      { id: 'potion', name: '药水', position: [4, 4], description: 'A healing potion', collected: false },
    ],
    rules: [
      { id: 'r1', trigger: 'has item 钥匙', effect: '打开密室门', fired: false },
      { id: 'r2', trigger: 'after 10 steps', effect: '夜幕降临', fired: false },
      { id: 'r3', trigger: 'hp below 30%', effect: '守护精灵出现', fired: false },
    ],
    winCondition: '收集所有物品',
    mode: 'game',
    ...overrides,
  }
}

function createTestPlayer(overrides?: Partial<PlayerState>): PlayerState {
  return {
    position: [2, 2],
    hp: 100,
    maxHp: 100,
    inventory: [],
    steps: 0,
    ...overrides,
  }
}

function createTestResponse(overrides?: Partial<ActionResponse>): ActionResponse {
  return {
    narrative: 'You look around.',
    effects: {
      hpChange: 0,
      addItem: null,
      removeItem: null,
      movePlayer: null,
      agentReactions: [],
      mapChange: null,
    },
    choices: ['继续探索', '休息一下', '四处查看'],
    worldEvent: null,
    gameOver: false,
    gameOverReason: null,
    ...overrides,
  }
}

// ============================================================
// Movement Validation
// ============================================================

describe('Rule Engine — Movement Validation', () => {
  it('allows valid movement within bounds to walkable tile', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ position: [2, 2] })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, movePlayer: [3, 2] },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(true)
    expect(result.sanitized.effects.movePlayer).toEqual([3, 2])
  })

  it('blocks movement to out-of-bounds position', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ position: [4, 4] })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, movePlayer: [5, 4] },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.movePlayer).toBeNull()
    expect(result.corrections.some(c => c.includes('超出边界'))).toBe(true)
  })

  it('blocks movement to non-walkable tile', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ position: [1, 3] })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, movePlayer: [1, 3] },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.movePlayer).toBeNull()
  })

  it('clamps movement distance exceeding 3', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ position: [0, 0] })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, movePlayer: [4, 4] },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.corrections.some(c => c.includes('超过上限'))).toBe(true)
    // Should be clamped to one step toward target
    expect(result.sanitized.effects.movePlayer).toEqual([1, 1])
  })
})

// ============================================================
// HP Validation
// ============================================================

describe('Rule Engine — HP Validation', () => {
  it('allows normal HP changes', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, hpChange: -20 },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(true)
    expect(result.sanitized.effects.hpChange).toBe(-20)
  })

  it('clamps excessive damage to -50', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, hpChange: -99 },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.hpChange).toBe(-50)
  })

  it('clamps excessive healing to 30', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ hp: 50 })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, hpChange: 80 },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.hpChange).toBe(30)
  })
})

// ============================================================
// Item Validation
// ============================================================

describe('Rule Engine — Item Validation', () => {
  it('allows collecting an existing uncollected item', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, addItem: '钥匙' },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(true)
    expect(result.sanitized.effects.addItem).toBe('钥匙')
  })

  it('blocks collecting non-existent item', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, addItem: '不存在的物品' },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.addItem).toBeNull()
  })

  it('blocks removing item not in inventory', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ inventory: [] })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, removeItem: '钥匙' },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.removeItem).toBeNull()
  })

  it('blocks adding item when inventory full (10 items)', () => {
    const world = createTestWorld()
    const player = createTestPlayer({
      inventory: Array(10).fill('stuff'),
    })
    const response = createTestResponse({
      effects: { ...createTestResponse().effects, addItem: '钥匙' },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.valid).toBe(false)
    expect(result.sanitized.effects.addItem).toBeNull()
  })
})

// ============================================================
// Agent Reactions Validation
// ============================================================

describe('Rule Engine — Agent Reactions', () => {
  it('allows reactions referencing valid agent IDs', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: {
        ...createTestResponse().effects,
        agentReactions: [
          { agentId: 'guard', reaction: '点头', attitudeChange: 5, newObservation: '玩家经过' },
        ],
      },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.sanitized.effects.agentReactions).toHaveLength(1)
    expect(result.sanitized.effects.agentReactions[0].agentId).toBe('guard')
  })

  it('resolves agent name to ID when LLM uses name instead of ID', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: {
        ...createTestResponse().effects,
        agentReactions: [
          { agentId: '守卫', reaction: '皱眉', attitudeChange: -3, newObservation: '有人靠近' },
        ],
      },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.sanitized.effects.agentReactions).toHaveLength(1)
    expect(result.sanitized.effects.agentReactions[0].agentId).toBe('guard')
  })

  it('clamps attitude changes exceeding ±15', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      effects: {
        ...createTestResponse().effects,
        agentReactions: [
          { agentId: 'guard', reaction: '暴怒', attitudeChange: -30, newObservation: '被攻击了' },
        ],
      },
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.sanitized.effects.agentReactions[0].attitudeChange).toBe(-15)
  })
})

// ============================================================
// Rule Triggers
// ============================================================

describe('Rule Engine — Rule Triggers', () => {
  it('triggers item-based rule when player has the item', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ inventory: ['钥匙'] })

    const triggered = checkRuleTriggers(world, player)
    expect(triggered).toHaveLength(1)
    expect(triggered[0].ruleId).toBe('r1')
    expect(triggered[0].effect).toBe('打开密室门')
  })

  it('triggers step-based rule when steps threshold reached', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ steps: 12 })

    const triggered = checkRuleTriggers(world, player)
    expect(triggered.some(r => r.ruleId === 'r2')).toBe(true)
  })

  it('triggers HP-based rule when HP below threshold', () => {
    const world = createTestWorld()
    const player = createTestPlayer({ hp: 20, maxHp: 100 })

    const triggered = checkRuleTriggers(world, player)
    expect(triggered.some(r => r.ruleId === 'r3')).toBe(true)
  })

  it('does not re-trigger already fired rules', () => {
    const world = createTestWorld({
      rules: [
        { id: 'r1', trigger: 'has item 钥匙', effect: '打开密室门', fired: true },
      ],
    })
    const player = createTestPlayer({ inventory: ['钥匙'] })

    const triggered = checkRuleTriggers(world, player)
    expect(triggered).toHaveLength(0)
  })

  it('markRulesFired correctly updates world', () => {
    const world = createTestWorld()
    const updated = markRulesFired(world, ['r1', 'r2'])

    expect(updated.rules.find(r => r.id === 'r1')?.fired).toBe(true)
    expect(updated.rules.find(r => r.id === 'r2')?.fired).toBe(true)
    expect(updated.rules.find(r => r.id === 'r3')?.fired).toBe(false)
  })
})

// ============================================================
// Choices Validation
// ============================================================

describe('Rule Engine — Choices', () => {
  it('adds default choices when none provided', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({ choices: [] })

    const result = validateAndCorrect(response, world, player)
    expect(result.sanitized.choices.length).toBeGreaterThan(0)
  })

  it('truncates choices exceeding 5', () => {
    const world = createTestWorld()
    const player = createTestPlayer()
    const response = createTestResponse({
      choices: ['1', '2', '3', '4', '5', '6', '7'],
    })

    const result = validateAndCorrect(response, world, player)
    expect(result.sanitized.choices).toHaveLength(5)
  })
})
