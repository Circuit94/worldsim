/**
 * Map Validator Tests
 * 
 * Tests the BFS connectivity checker and auto-repair mechanism.
 * Ensures LLM-generated maps with disconnected regions are detected and fixed.
 */

import { describe, it, expect } from 'vitest'
import { checkConnectivity, repairConnectivity, validateAndRepairMap } from '../mapValidator'
import type { WorldSchema } from '../types'

// ============================================================
// Test Fixtures
// ============================================================

function createTestWorld(map: string[][], tiles?: Record<string, any>): WorldSchema {
  return {
    id: 'test_world',
    name: 'Test',
    seed: 'test',
    theme: 'test',
    description: 'test',
    dimensions: [map[0].length, map.length],
    map,
    tiles: tiles ?? {
      grass: { name: 'grass', walkable: true },
      wall: { name: 'wall', walkable: false },
      water: { name: 'water', walkable: false },
    },
    agents: [],
    items: [],
    rules: [],
    winCondition: 'test',
    mode: 'game',
  }
}

// ============================================================
// Connectivity Detection
// ============================================================

describe('Map Validator — Connectivity Detection', () => {
  it('detects fully connected map', () => {
    const world = createTestWorld([
      ['grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass'],
    ])

    const report = checkConnectivity(world, [0, 0])
    expect(report.connected).toBe(true)
    expect(report.totalWalkable).toBe(9)
    expect(report.unreachablePositions).toHaveLength(0)
  })

  it('detects disconnected island', () => {
    // Top-left corner is cut off by walls
    const world = createTestWorld([
      ['grass', 'wall', 'grass', 'grass'],
      ['wall', 'wall', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass', 'grass'],
    ])

    // Start from bottom-right area
    const report = checkConnectivity(world, [2, 2])
    expect(report.connected).toBe(false)
    expect(report.unreachablePositions.length).toBeGreaterThan(0)
    // Position [0,0] should be unreachable
    expect(report.unreachablePositions.some(([r, c]) => r === 0 && c === 0)).toBe(true)
  })

  it('handles single walkable tile (player start) as connected', () => {
    const world = createTestWorld([
      ['wall', 'wall', 'wall'],
      ['wall', 'grass', 'wall'],
      ['wall', 'wall', 'wall'],
    ])

    const report = checkConnectivity(world, [1, 1])
    expect(report.connected).toBe(true)
    expect(report.totalWalkable).toBe(1)
  })

  it('detects multiple disconnected regions', () => {
    const world = createTestWorld([
      ['grass', 'wall', 'grass'],
      ['wall', 'wall', 'wall'],
      ['grass', 'wall', 'grass'],
    ])

    // Start from top-left
    const report = checkConnectivity(world, [0, 0])
    expect(report.connected).toBe(false)
    // Three other corners are unreachable
    expect(report.unreachablePositions.length).toBe(3)
  })

  it('handles map with no walkable tiles gracefully', () => {
    const world = createTestWorld([
      ['wall', 'wall'],
      ['wall', 'wall'],
    ])

    const report = checkConnectivity(world, [0, 0])
    expect(report.totalWalkable).toBe(0)
    expect(report.connected).toBe(true) // No unreachable tiles = trivially connected
  })
})

// ============================================================
// Auto-Repair
// ============================================================

describe('Map Validator — Auto Repair', () => {
  it('repairs simple disconnected island by carving path', () => {
    // Top-right grass is completely surrounded by walls
    const world = createTestWorld([
      ['grass', 'wall', 'grass'],
      ['grass', 'wall', 'wall'],
      ['grass', 'grass', 'grass'],
    ])

    // Start bottom-left — top-right [0,2] is disconnected
    const { repairedMap, report } = repairConnectivity(world, [2, 0])
    expect(report.connected).toBe(true)
    expect(report.repairsApplied).toBeGreaterThan(0)

    // At least one wall should have been converted to grass
    const hasNewPath = repairedMap.some((row, r) =>
      row.some((tile, c) => tile === 'grass' && world.map[r][c] === 'wall')
    )
    expect(hasNewPath).toBe(true)
  })

  it('does not modify already connected map', () => {
    const world = createTestWorld([
      ['grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass'],
      ['grass', 'grass', 'grass'],
    ])

    const { repairedMap, report } = repairConnectivity(world, [0, 0])
    expect(report.connected).toBe(true)
    expect(report.repairsApplied).toBe(0)
    expect(repairedMap).toEqual(world.map)
  })

  it('repairs multiple disconnected regions', () => {
    const world = createTestWorld([
      ['grass', 'wall', 'grass'],
      ['wall', 'wall', 'wall'],
      ['grass', 'wall', 'grass'],
    ])

    const { report } = repairConnectivity(world, [0, 0])
    expect(report.connected).toBe(true)
    expect(report.repairsApplied).toBeGreaterThan(0)
  })
})

// ============================================================
// validateAndRepairMap (integration)
// ============================================================

describe('Map Validator — validateAndRepairMap', () => {
  it('returns original world when map is connected', () => {
    const world = createTestWorld([
      ['grass', 'grass'],
      ['grass', 'grass'],
    ])

    const { world: result, report } = validateAndRepairMap(world, [0, 0])
    expect(result.map).toEqual(world.map)
    expect(report.connected).toBe(true)
  })

  it('returns repaired world when disconnected and autoRepair=true', () => {
    const world = createTestWorld([
      ['grass', 'wall', 'grass'],
      ['wall', 'wall', 'wall'],
      ['grass', 'wall', 'grass'],
    ])

    const { world: result, report } = validateAndRepairMap(world, [0, 0], true)
    expect(report.connected).toBe(true)
    // Map should be different from original
    expect(result.map).not.toEqual(world.map)
  })

  it('returns unmodified world when autoRepair=false', () => {
    const world = createTestWorld([
      ['grass', 'wall', 'grass'],
      ['wall', 'wall', 'wall'],
      ['grass', 'wall', 'grass'],
    ])

    const { world: result, report } = validateAndRepairMap(world, [0, 0], false)
    expect(report.connected).toBe(false)
    expect(result.map).toEqual(world.map)
  })
})
