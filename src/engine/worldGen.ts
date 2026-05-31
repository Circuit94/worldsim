/**
 * WorldSim Engine — World Generation Module
 * 
 * Transforms user's natural language theme into a structured WorldSchema.
 * Uses deterministic seed for reproducible worlds (share & compare mechanic).
 */

import type { WorldSchema, Agent, AgentMemory, WorldConfig } from './types'
import { DEFAULT_WORLD_CONFIG } from './types'
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

function initAgentMemory(initialAttitude?: number): AgentMemory {
  return {
    observations: [],
    reflections: [],
    attitude: initialAttitude || 0,
    knownFacts: [],
    currentPlan: null,
  }
}

/**
 * Build config-aware modifier that injects user's custom settings into the prompt
 */
function buildConfigModifier(config: WorldConfig, mode: string): string {
  const parts: string[] = []

  // Map size (game mode only)
  if (mode === 'game') {
    if (config.mapSize !== 5) {
      parts.push(`地图尺寸改为 ${config.mapSize}×${config.mapSize}（调整 map 数组行列数）`)
    }
  }

  // NPC count
  parts.push(`生成 ${config.npcCount} 个NPC/角色`)

  // Item count (game mode)
  if (mode === 'game') {
    parts.push(`生成 ${config.itemCount} 个物品`)
  }

  // Rule count
  parts.push(`生成 ${config.ruleCount} 条规则/事件`)

  // Custom NPCs
  if (config.customNPCs.length > 0) {
    parts.push('以下角色必须按用户设定生成（不要修改核心设定）：')
    config.customNPCs.forEach((npc, i) => {
      parts.push(`  角色${i + 1}: 名字="${npc.name}", 人设="${npc.persona}", 目标=[${npc.goals.join('、')}], 决策风格=${npc.decisionStyle}`)
    })
    const remaining = config.npcCount - config.customNPCs.length
    if (remaining > 0) {
      parts.push(`  剩余 ${remaining} 个角色由AI自由生成，需与用户设定的角色形成互补或冲突`)
    }
  }

  // Custom rules
  if (config.customRules.length > 0) {
    parts.push('以下规则必须包含：')
    config.customRules.forEach((rule, i) => {
      parts.push(`  规则${i + 1}: 触发条件="${rule.trigger}" → 效果="${rule.effect}"`)
    })
  }

  // Narrative style
  const styleMap: Record<string, string> = {
    concise: '叙事风格：极简短信风，每句话必须有信息增量',
    literary: '叙事风格：文学化，注重氛围和细节描写，但不要堆砌',
    academic: '叙事风格：学术报告风，客观冷静，数据驱动',
    casual: '叙事风格：口语化，像朋友聊天一样轻松自然',
  }
  parts.push(styleMap[config.narrativeStyle])

  // Difficulty / NPC disposition
  const diffMap: Record<string, string> = {
    cooperative: 'NPC整体倾向：配合友好，愿意帮助，但各有底线',
    neutral: 'NPC整体倾向：中立客观，根据玩家行为决定态度',
    adversarial: 'NPC整体倾向：高对抗性，各有私心，不轻易妥协，需要策略才能争取',
  }
  parts.push(diffMap[config.difficulty])

  // Event frequency
  if (config.eventFrequency > 0) {
    parts.push(`世界事件频率：约每 ${config.eventFrequency} 步触发一次随机环境事件`)
  } else {
    parts.push('世界事件频率：不主动触发随机事件，仅响应玩家行为')
  }

  return parts.length > 0 ? '\n额外配置要求：\n' + parts.join('\n') : ''
}

export async function generateWorld(
  theme: string,
  customSeed?: string,
  promptModifier?: string,
  worldConfig?: WorldConfig
): Promise<{ world: WorldSchema; debug: DebugLog }> {
  const config = worldConfig || DEFAULT_WORLD_CONFIG
  const seed = customSeed || generateSeed(theme)
  
  // Build base prompt with config-aware map size
  const mapSize = config.mapSize
  const basePrompt = buildWorldGenPrompt(theme, seed, mapSize, config.npcCount, config.itemCount, config.ruleCount)
  
  // Layer modifiers: config modifier + scenario modifier
  const configMod = buildConfigModifier(config, 'game')
  const fullModifier = [configMod, promptModifier].filter(Boolean).join('\n')
  const prompt = fullModifier ? `${basePrompt}\n${fullModifier}` : basePrompt
  
  const { data, debug } = await callGemini(prompt, 'world_gen', config.temperature)

  // Transform raw API response into WorldSchema
  const world: WorldSchema = {
    id: `world_${Date.now().toString(36)}`,
    name: data.name,
    seed,
    theme,
    description: data.description,
    dimensions: data.dimensions || [data.map?.[0]?.length || mapSize, data.map?.length || mapSize],
    map: data.map,
    tiles: data.tiles,
    agents: (data.agents || []).map((a: any, i: number): Agent => {
      // Apply custom NPC initial attitude if defined
      const customNPC = config.customNPCs.find(c => c.name === a.name)
      const initialAttitude = customNPC?.initialAttitude ?? 0
      return {
        id: a.id || `agent_${i + 1}`,
        name: a.name,
        position: a.position,
        persona: a.persona,
        goals: a.goals || [],
        decisionStyle: a.decisionStyle || 'rational',
        memory: initAgentMemory(initialAttitude),
      }
    }),
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
  const playerStart = data.playerStart || [Math.floor(mapSize / 2), Math.floor(mapSize / 2)]
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
