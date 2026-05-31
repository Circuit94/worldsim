/**
 * WorldSim — Global State Management (Zustand)
 * 
 * Single source of truth for the entire simulation state.
 * Supports session export for behavior analysis.
 */

import { create } from 'zustand'
import type { WorldSchema, PlayerState, DebugLog, SessionData, ActionResponse, WorldConfig } from '../engine/types'
import { DEFAULT_WORLD_CONFIG } from '../engine/types'
import { generateWorld, getPlayerStart } from '../engine/worldGen'
import { processAction, applyEffects } from '../engine/actionHandler'
import { markRulesFired, checkRuleTriggers } from '../engine/ruleEngine'
import { executeAgentTick, applyAgentTick } from '../engine/agentLoop'
import { initGemini, type GeminiModel } from '../api/gemini'
import { type ScenarioMode, getScenarioConfig } from '../engine/scenarios'
import { autoSave } from '../engine/persistence'

/**
 * 根据模式生成初始选项
 */
function getInitialChoices(mode: ScenarioMode): string[] {
  switch (mode) {
    case 'training':
      return [
        '[信息梳理] 逐一确认各利益相关方的核心诉求、底线和当前情绪状态，建立博弈全景图',
        '[主动破局] 直接向决策权最大的一方提出你的方案框架，争取主导议程设置',
        '[试探施压] 以有限让步测试对方底线弹性，同时通过提问暴露对方信息盲区',
      ]
    case 'simulation':
      return [] // 仿真模式自动推进，不需要选项
    case 'game':
    default:
      return ['检查周围有什么值得注意的东西', '走过去和最近的人搭话', '朝最近的建筑物走去']
  }
}

/**
 * 根据模式生成不同风格的初始日志
 */
function getInitialNarrativeLog(
  mode: ScenarioMode,
  world: { name: string; description: string; winCondition: string; agents: any[] }
): { text: string; type: 'narrative' | 'event' | 'system' }[] {
  switch (mode) {
    case 'training':
      return [
        { text: `情景评估启动 — ${world.name}`, type: 'system' },
        { text: world.description, type: 'narrative' },
        { text: `评估目标：${world.winCondition}`, type: 'system' },
        { text: `参与角色：${world.agents.map(a => a.name).join('、')}`, type: 'system' },
      ]
    case 'simulation':
      return [
        { text: `仿真实验初始化 — ${world.name}`, type: 'system' },
        { text: world.description, type: 'narrative' },
        { text: `观测目标：${world.winCondition}`, type: 'system' },
        { text: `智能体数量：${world.agents.length} · 最大轮次：20 · 状态：就绪`, type: 'system' },
      ]
    case 'game':
    default:
      return [
        { text: `◈ ${world.name}`, type: 'system' },
        { text: world.description, type: 'narrative' },
        { text: `◎ 目标: ${world.winCondition}`, type: 'system' },
      ]
  }
}

export type GamePhase = 'setup' | 'generating' | 'playing' | 'gameover'

interface GameState {
  // Core state
  phase: GamePhase
  world: WorldSchema | null
  player: PlayerState | null
  
  // UI state
  narrativeLog: { text: string; type: 'narrative' | 'event' | 'system' }[]
  choices: string[]
  isProcessing: boolean
  error: string | null
  
  // Debug / transparency
  debugLogs: DebugLog[]
  showDebug: boolean
  
  // Scenario
  scenarioMode: ScenarioMode
  
  // Token tracking
  totalTokensUsed: number
  
  // Actions
  setApiKey: (key: string, model?: GeminiModel) => void
  startGame: (theme: string, mode?: ScenarioMode, worldConfig?: WorldConfig) => Promise<void>
  performAction: (action: string) => Promise<void>
  toggleDebug: () => void
  exportSession: () => SessionData | null
  reset: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'setup',
  world: null,
  player: null,
  narrativeLog: [],
  choices: [],
  isProcessing: false,
  error: null,
  debugLogs: [],
  showDebug: false,
  scenarioMode: 'game',
  totalTokensUsed: 0,

  setApiKey: (key: string, model?: GeminiModel) => {
    initGemini(key, model)
    set({ error: null })
  },

  startGame: async (theme: string, mode: ScenarioMode = 'game', worldConfig?: WorldConfig) => {
    const config = getScenarioConfig(mode)
    const finalWorldConfig = worldConfig || DEFAULT_WORLD_CONFIG
    set({ phase: 'generating', error: null, isProcessing: true, scenarioMode: mode })

    try {
      const { world, debug } = await generateWorld(theme, undefined, config.worldGenModifier || undefined, finalWorldConfig)
      
      const rawData = JSON.parse(debug.response)
      const startPos = getPlayerStart(rawData)
      
      const player: PlayerState = {
        position: startPos,
        hp: 100,
        maxHp: 100,
        inventory: [],
        steps: 0,
      }

      // 根据模式生成不同风格的初始日志
      const initialLog = getInitialNarrativeLog(mode, world)

      set({
        phase: 'playing',
        world,
        player,
        narrativeLog: initialLog,
        choices: getInitialChoices(mode),
        debugLogs: [debug],
        totalTokensUsed: debug.promptTokens + debug.responseTokens,
        isProcessing: false,
      })
    } catch (error: any) {
      set({
        phase: 'setup',
        error: error.message || '世界生成失败',
        isProcessing: false,
        debugLogs: error.debug ? [error.debug] : get().debugLogs,
      })
    }
  },

  performAction: async (action: string) => {
    const { world, player, narrativeLog, debugLogs, totalTokensUsed, scenarioMode } = get()
    if (!world || !player) return

    // 仿真模式下自动推进时，替换为有意义的 prompt
    const resolvedAction = action === '__AUTO_TICK__' 
      ? '推进下一轮：所有智能体自主行动，报告本轮发生了什么'
      : action

    set({ isProcessing: true, error: null })

    const recentEvents = narrativeLog
      .filter(l => l.type === 'narrative')
      .slice(-3)
      .map(l => l.text)

    try {
      const { response, debug, corrections, firedRules } = await processAction(world, player, resolvedAction, recentEvents, scenarioMode)

      // Apply effects to get new state
      let { world: newWorld, player: newPlayer } = applyEffects(world, player, response, scenarioMode)

      // Mark fired rules in world state
      if (firedRules.length > 0) {
        const triggers = checkRuleTriggers(world, player)
        newWorld = markRulesFired(newWorld, triggers.map(t => t.ruleId))
      }

      // Build new narrative log entries
      const newLogs: { text: string; type: 'narrative' | 'event' | 'system' }[] = [
        { text: action === '__AUTO_TICK__' ? `▸ 第 ${player.steps + 1} 轮推演` : `→ ${action}`, type: 'system' },
        { text: response.narrative, type: 'narrative' },
      ]

      // Add rule engine corrections to debug (visible in dev mode)
      if (corrections.length > 0) {
        newLogs.push({ text: `[fix] ${corrections.join('；')}`, type: 'system' })
      }

      // Add fired rules to narrative
      for (const effect of firedRules) {
        newLogs.push({ text: `◦ ${effect}`, type: 'event' })
      }

      // Add agent reactions to log
      for (const reaction of response.effects.agentReactions) {
        const agent = newWorld.agents.find(a => a.id === reaction.agentId)
        if (agent) {
          newLogs.push({ text: `[${agent.name}] ${reaction.reaction}`, type: 'narrative' })
        }
      }

      // Add world event to log
      if (response.worldEvent) {
        newLogs.push({ text: `◈ ${response.worldEvent.description}`, type: 'event' })
      }

      // Check end condition
      if (response.gameOver) {
        const endLabel = scenarioMode === 'training' ? '评估完成' : 
                         scenarioMode === 'simulation' ? '推演结束' : '游戏结束'
        newLogs.push({ text: `${response.gameOverReason || endLabel}`, type: 'system' })
      }

      // --- Agent Autonomous Tick (after player action) ---
      // One agent acts per turn (round-robin), non-blocking on failure
      // Only in game mode — training/simulation already has agentReactions in the action response
      let finalWorld = newWorld
      let agentLogs: { text: string; type: 'narrative' | 'event' | 'system' }[] = []
      let agentDebug: DebugLog[] = []
      let agentTokens = 0

      if (!response.gameOver && scenarioMode === 'game') {
        try {
          const tickResult = await executeAgentTick(newWorld, newPlayer, newPlayer.steps)
          if (tickResult) {
            finalWorld = applyAgentTick(newWorld, tickResult.result, newPlayer.steps)
            agentLogs.push({
              text: `[${finalWorld.agents.find(a => a.id === tickResult.result.agentId)?.name || '智能体'}] ${tickResult.result.narrative}`,
              type: 'narrative',
            })
            agentDebug = [tickResult.debug]
            agentTokens = tickResult.debug.promptTokens + tickResult.debug.responseTokens
          }
        } catch {
          // Agent tick is non-critical — never block gameplay
        }
      }

      const newNarrativeLog = [...narrativeLog, ...newLogs, ...agentLogs]
      const newTotalTokens = totalTokensUsed + debug.promptTokens + debug.responseTokens + agentTokens
      const newChoices = response.gameOver ? [] : response.choices

      set({
        world: finalWorld,
        player: newPlayer,
        narrativeLog: newNarrativeLog,
        choices: newChoices,
        phase: response.gameOver ? 'gameover' : 'playing',
        debugLogs: [...debugLogs, debug, ...agentDebug],
        totalTokensUsed: newTotalTokens,
        isProcessing: false,
      })

      // Auto-save after each successful action
      if (!response.gameOver) {
        autoSave(finalWorld, newPlayer, newNarrativeLog, [...debugLogs, debug, ...agentDebug], newTotalTokens, newChoices, get().scenarioMode)
      }
    } catch (error: any) {
      set({
        error: error.message || '行动处理失败',
        isProcessing: false,
        debugLogs: error.debug ? [...debugLogs, error.debug] : debugLogs,
      })
    }
  },

  toggleDebug: () => set(s => ({ showDebug: !s.showDebug })),

  exportSession: () => {
    const { world, player, narrativeLog, debugLogs, totalTokensUsed } = get()
    if (!world || !player) return null

    return {
      worldSchema: world,
      playerDecisions: narrativeLog
        .filter(l => l.text.startsWith('→ '))
        .map((l, i) => ({ step: i, action: l.text.slice(2), result: narrativeLog[narrativeLog.indexOf(l) + 1]?.text || '' })),
      agentBehaviorLog: world.agents.flatMap(a =>
        a.memory.observations.map(obs => ({ step: obs.step, agentId: a.id, behavior: obs.content }))
      ),
      emergentEvents: [],
      outcome: get().phase === 'gameover' ? narrativeLog[narrativeLog.length - 1]?.text || null : null,
      totalTokensUsed,
      totalSteps: player.steps,
    }
  },

  reset: () => set({
    phase: 'setup',
    world: null,
    player: null,
    narrativeLog: [],
    choices: [],
    isProcessing: false,
    error: null,
    debugLogs: [],
    scenarioMode: 'game',
    totalTokensUsed: 0,
  }),
}))
