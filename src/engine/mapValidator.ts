/**
 * WorldSim Engine — Map Connectivity Validator
 * 
 * Ensures that all walkable tiles on the map are reachable from the player's
 * starting position. Uses BFS flood-fill to detect disconnected regions,
 * then auto-repairs by converting blocking tiles to walkable ones.
 * 
 * Why this matters:
 * - LLM-generated maps sometimes create unreachable islands
 * - Agents placed in disconnected areas become permanently stuck
 * - Training scenarios require all areas to be explorable
 */

import type { WorldSchema, TileDef } from './types'

export interface ConnectivityReport {
  connected: boolean
  totalWalkable: number
  reachable: number
  unreachablePositions: [number, number][]
  repairsApplied: number
}

/**
 * BFS flood-fill from a starting position.
 * Returns set of all reachable positions (encoded as "row,col" strings).
 */
function bfsFloodFill(
  map: string[][],
  tiles: Record<string, TileDef>,
  start: [number, number]
): Set<string> {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const visited = new Set<string>()
  const queue: [number, number][] = [start]
  const startKey = `${start[0]},${start[1]}`
  visited.add(startKey)

  const directions: [number, number][] = [
    [-1, 0], [1, 0], [0, -1], [0, 1]  // up, down, left, right
  ]

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    for (const [dr, dc] of directions) {
      const nr = r + dr
      const nc = c + dc
      const key = `${nr},${nc}`

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visited.has(key)) continue

      const tileId = map[nr][nc]
      const tileDef = tiles[tileId]
      if (tileDef?.walkable) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }

  return visited
}

/**
 * Find all walkable positions on the map.
 */
function getAllWalkablePositions(
  map: string[][],
  tiles: Record<string, TileDef>
): [number, number][] {
  const positions: [number, number][] = []
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < (map[r]?.length ?? 0); c++) {
      const tileId = map[r][c]
      if (tiles[tileId]?.walkable) {
        positions.push([r, c])
      }
    }
  }
  return positions
}

/**
 * Check map connectivity: are all walkable tiles reachable from the start?
 */
export function checkConnectivity(
  world: WorldSchema,
  playerStart: [number, number]
): ConnectivityReport {
  const { map, tiles } = world

  // If player start is not walkable, treat its position as walkable for BFS
  const allWalkable = getAllWalkablePositions(map, tiles)
  const reachable = bfsFloodFill(map, tiles, playerStart)

  // Also add player start itself (it must be reachable)
  reachable.add(`${playerStart[0]},${playerStart[1]}`)

  const unreachablePositions: [number, number][] = allWalkable.filter(
    ([r, c]) => !reachable.has(`${r},${c}`)
  )

  return {
    connected: unreachablePositions.length === 0,
    totalWalkable: allWalkable.length,
    reachable: reachable.size,
    unreachablePositions,
    repairsApplied: 0,
  }
}

/**
 * Auto-repair disconnected map regions.
 * 
 * Strategy: For each unreachable region, find the shortest path from
 * the nearest reachable tile to that region, converting blocking tiles
 * to the most common walkable tile along the way.
 * 
 * Returns a new map (does NOT mutate original) and a report.
 */
export function repairConnectivity(
  world: WorldSchema,
  playerStart: [number, number]
): { repairedMap: string[][]; report: ConnectivityReport } {
  const { map, tiles } = world

  // Deep copy map
  const repairedMap = map.map(row => [...row])

  // Find the most common walkable tile to use for repairs
  const defaultWalkableTile = findDefaultWalkableTile(map, tiles)

  let totalRepairs = 0
  let iterations = 0
  const maxIterations = 10  // Safety limit

  // Iteratively repair until connected or max iterations
  while (iterations < maxIterations) {
    iterations++
    const report = checkConnectivity(
      { ...world, map: repairedMap },
      playerStart
    )

    if (report.connected) {
      return {
        repairedMap,
        report: { ...report, repairsApplied: totalRepairs },
      }
    }

    // Pick the first unreachable position and carve a path to it
    const target = report.unreachablePositions[0]
    const reachable = bfsFloodFill(repairedMap, tiles, playerStart)

    // BFS from target to find nearest reachable tile (ignoring walkability)
    const path = findPathToReachable(repairedMap, target, reachable)
    if (!path || path.length === 0) {
      // Cannot repair — make the unreachable tile itself walkable
      repairedMap[target[0]][target[1]] = defaultWalkableTile
      totalRepairs++
      continue
    }

    // Convert blocking tiles along the path
    for (const [r, c] of path) {
      const tileId = repairedMap[r][c]
      if (!tiles[tileId]?.walkable) {
        repairedMap[r][c] = defaultWalkableTile
        totalRepairs++
      }
    }
  }

  // Final report after repairs
  const finalReport = checkConnectivity(
    { ...world, map: repairedMap },
    playerStart
  )

  return {
    repairedMap,
    report: { ...finalReport, repairsApplied: totalRepairs },
  }
}

/**
 * BFS from target ignoring walkability, to find path to nearest reachable tile.
 */
function findPathToReachable(
  map: string[][],
  target: [number, number],
  reachableSet: Set<string>
): [number, number][] | null {
  const rows = map.length
  const cols = map[0]?.length ?? 0
  const visited = new Set<string>()
  const parent = new Map<string, string>()
  const queue: [number, number][] = [target]
  const startKey = `${target[0]},${target[1]}`
  visited.add(startKey)

  const directions: [number, number][] = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ]

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const currentKey = `${r},${c}`

    // Found a reachable tile — reconstruct path
    if (reachableSet.has(currentKey) && currentKey !== startKey) {
      const path: [number, number][] = []
      let key: string | undefined = currentKey
      while (key && key !== startKey) {
        const [pr, pc] = key.split(',').map(Number) as [number, number]
        path.unshift([pr, pc])
        key = parent.get(key)
      }
      return path
    }

    for (const [dr, dc] of directions) {
      const nr = r + dr
      const nc = c + dc
      const key = `${nr},${nc}`

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visited.has(key)) continue

      visited.add(key)
      parent.set(key, currentKey)
      queue.push([nr, nc])
    }
  }

  return null
}

/**
 * Find the most common walkable tile ID to use for repairs.
 */
function findDefaultWalkableTile(
  map: string[][],
  tiles: Record<string, TileDef>
): string {
  const counts = new Map<string, number>()

  for (const row of map) {
    for (const tileId of row) {
      if (tiles[tileId]?.walkable) {
        counts.set(tileId, (counts.get(tileId) ?? 0) + 1)
      }
    }
  }

  // Return most common walkable tile, or first walkable tile as fallback
  let maxCount = 0
  let bestTile = Object.keys(tiles).find(id => tiles[id].walkable) ?? 'grass'

  for (const [tileId, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      bestTile = tileId
    }
  }

  return bestTile
}

/**
 * Validate and optionally repair a world's map connectivity.
 * This is the main entry point called after world generation.
 */
export function validateAndRepairMap(
  world: WorldSchema,
  playerStart: [number, number],
  autoRepair: boolean = true
): { world: WorldSchema; report: ConnectivityReport } {
  const report = checkConnectivity(world, playerStart)

  if (report.connected || !autoRepair) {
    return { world, report }
  }

  // Auto-repair
  const { repairedMap, report: repairReport } = repairConnectivity(world, playerStart)

  console.warn(
    `[MapValidator] Repaired ${repairReport.repairsApplied} tiles to ensure connectivity. ` +
    `${repairReport.unreachablePositions.length} positions remain unreachable.`
  )

  return {
    world: { ...world, map: repairedMap },
    report: repairReport,
  }
}
