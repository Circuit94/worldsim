/**
 * WorldSim Engine — Persistence Layer
 * 
 * Save/Load game state to localStorage.
 * Supports multiple save slots and auto-save.
 */

import type { WorldSchema, PlayerState, DebugLog } from './types'
import type { ScenarioMode } from './scenarios'

export interface SaveData {
  id: string
  timestamp: number
  worldName: string
  mode: ScenarioMode
  steps: number
  world: WorldSchema
  player: PlayerState
  narrativeLog: { text: string; type: 'narrative' | 'event' | 'system' }[]
  debugLogs: DebugLog[]
  totalTokensUsed: number
  choices: string[]
}

const SAVE_KEY_PREFIX = 'worldsim_save_'
const AUTO_SAVE_KEY = 'worldsim_autosave'
const MAX_SAVES = 5

/**
 * Save current game state
 */
export function saveGame(
  slot: string,
  world: WorldSchema,
  player: PlayerState,
  narrativeLog: SaveData['narrativeLog'],
  debugLogs: DebugLog[],
  totalTokensUsed: number,
  choices: string[],
  mode: ScenarioMode
): SaveData {
  const save: SaveData = {
    id: slot,
    timestamp: Date.now(),
    worldName: world.name,
    mode,
    steps: player.steps,
    world,
    player,
    narrativeLog,
    debugLogs: debugLogs.slice(-5), // Only keep last 5 debug logs to save space
    totalTokensUsed,
    choices,
  }

  try {
    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(save))
  } catch (e) {
    console.warn('[WorldSim] Failed to save:', e)
  }

  return save
}

/**
 * Auto-save (triggered after each action)
 */
export function autoSave(
  world: WorldSchema,
  player: PlayerState,
  narrativeLog: SaveData['narrativeLog'],
  debugLogs: DebugLog[],
  totalTokensUsed: number,
  choices: string[],
  mode: ScenarioMode
): void {
  saveGame(AUTO_SAVE_KEY, world, player, narrativeLog, debugLogs, totalTokensUsed, choices, mode)
}

/**
 * Load game from a save slot
 */
export function loadGame(slot: string): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot)
    if (!raw) return null
    return JSON.parse(raw) as SaveData
  } catch {
    return null
  }
}

/**
 * Load auto-save
 */
export function loadAutoSave(): SaveData | null {
  return loadGame(AUTO_SAVE_KEY)
}

/**
 * List all available saves (sorted by timestamp desc)
 */
export function listSaves(): SaveData[] {
  const saves: SaveData[] = []
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(SAVE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const save = JSON.parse(raw) as SaveData
          saves.push(save)
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return saves.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_SAVES)
}

/**
 * Delete a save
 */
export function deleteSave(slot: string): void {
  localStorage.removeItem(SAVE_KEY_PREFIX + slot)
}

/**
 * Check if auto-save exists
 */
export function hasAutoSave(): boolean {
  return localStorage.getItem(SAVE_KEY_PREFIX + AUTO_SAVE_KEY) !== null
}

/**
 * Store API key in localStorage (optional convenience)
 */
export function storeApiKey(key: string): void {
  try {
    localStorage.setItem('worldsim_apikey', key)
  } catch { /* ignore */ }
}

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem('worldsim_apikey')
  } catch {
    return null
  }
}
