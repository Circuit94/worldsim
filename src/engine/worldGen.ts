/**
 * WorldSim Engine — World Generation Module
 * 
 * Transforms user's natural language theme into a structured WorldSchema.
 * Uses deterministic seed for reproducible worlds (share & compare mechanic).
 */

import type { WorldSchema, Agent, AgentMemory } from './types'
import { buildWorldGenPrompt } from './prompts'
import { callGemini } from '../api/gemini'
import { validateAndRepairMap } from './mapValidator'
import type { DebugLog } from './types'

function generateSeed(theme: string): string {
  // Simple hash-based seed from theme + timestamp
  const hash = theme.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return `${theme.slice(0, 16).replace(/\s+/g, '-')}-${Math.abs(hash).toString(36)}`
}

function initAgentMemory(): AgentMemory {
  return {
    observations: [],
    reflections: [],
    attitude: 0,
    knownFacts: [],
    currentPlan: null,
  }
}

export async function generateWorld(
  theme: string,
  customSeed?: string,
  promptModifier?: string
): Promise<{ world: WorldSchema; debug: DebugLog }> {
  const seed = customSeed || generateSeed(theme)
  const basePrompt = buildWorldGenPrompt(theme, seed)
  const prompt = promptModifier ? `${basePrompt}\n${promptModifier}` : basePrompt
  
  const { data, debug } = await callGemini(prompt, 'world_gen')

  // Transform raw API response into WorldSchema
  const world: WorldSchema = {
    id: `world_${Date.now().toString(36)}`,
    name: data.name,
    seed,
    theme,
    description: data.description,
    dimensions: data.dimensions || [data.map?.[0]?.length || 5, data.map?.length || 5],
    map: data.map,
    tiles: data.tiles,
    agents: (data.agents || []).map((a: any): Agent => ({
      id: a.id,
      name: a.name,
      position: a.position,
      persona: a.persona,
      goals: a.goals || [],
      decisionStyle: a.decisionStyle || 'rational',
      memory: initAgentMemory(),
    })),
    items: (data.items || []).map((item: any) => ({
      ...item,
      collected: false,
    })),
    rules: (data.rules || []).map((rule: any) => ({
      ...rule,
      fired: false,
    })),
    winCondition: data.winCondition || '探索并生存',
    mode: 'game',
  }

  // Validate and auto-repair map connectivity
  const playerStart = data.playerStart || [2, 2]
  const { world: validatedWorld, report } = validateAndRepairMap(world, playerStart)
  
  if (report.repairsApplied > 0) {
    console.info(
      `[WorldGen] Map auto-repaired: ${report.repairsApplied} tiles converted for connectivity.`
    )
  }

  return { world: validatedWorld, debug }
}

export function getPlayerStart(data: any): [number, number] {
  return data.playerStart || [2, 2]
}
