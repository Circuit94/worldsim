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
import { type MilestoneFeedback, shouldTriggerMilestone, parseMilestoneFeedback, generateLocalMilestone, stripMilestoneTag } from '../engine/milestoneFeedback'

/**
 * 根据模式生成初始选项
 */
function getInitialChoices(mode: ScenarioMode): string[] {
  switch (mode) {
    case 'training':
      return [
        '[信息锁定] 直接向在场最关键的决策者提出一个封闭式问题，迫使其表明立场底线，同时观察其他人的即时反应来判断联盟关系',
        '[主动破局] 在所有人开口之前率先抛出你的方案框架（含具体数字和时间节点），抢占议程主导权，迫使其他方围绕你的方案展开讨论',
        '[定向施压] 选择立场最弱的一方，用已掌握的事实数据当面质疑其核心论点的逻辑漏洞，通过击破一点来动摇整体僵局',
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
        { text: `智能体数量：${world.agents.length} · 最大轮次：12 · 状态：就绪`, type: 'system' },
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

/** 到达 maxSteps 时触发的全局总结状态 */
export interface SummaryState {
  triggered: boolean
  stepReached: number
  canContinue: boolean
}

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
  
  // Runtime config (editable during play)
  runtimeConfig: WorldConfig

  // Milestone feedback
  milestoneFeedback: MilestoneFeedback | null

  // Summary overlay (maxSteps reached)
  summaryState: SummaryState | null

  // Actions
  setApiKey: (key: string, model?: GeminiModel) => void
  startGame: (theme: string, mode?: ScenarioMode, worldConfig?: WorldConfig) => Promise<void>
  performAction: (action: string) => Promise<void>
  toggleDebug: () => void
  exportSession: () => SessionData | null
  reset: () => void

  // Milestone actions
  dismissMilestone: () => void

  // Summary actions
  dismissSummary: () => void
  continuePastSummary: () => void

  // Runtime editing actions
  updateAgent: (agentId: string, updates: Partial<{ persona: string; goals: string[]; decisionStyle: string; attitude: number }>) => void
  addRule: (trigger: string, effect: string) => void
  removeRule: (ruleIndex: number) => void
  updateRuntimeConfig: (updates: Partial<WorldConfig>) => void
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
  runtimeConfig: { ...DEFAULT_WORLD_CONFIG },
  milestoneFeedback: null,
  summaryState: null,

  setApiKey: (key: string, model?: GeminiModel) => {
    initGemini(key, model)
    set({ error: null })
  },

  startGame: async (theme: string, mode: ScenarioMode = 'game', worldConfig?: WorldConfig) => {
    const config = getScenarioConfig(mode)
    const finalWorldConfig = worldConfig || DEFAULT_WORLD_CONFIG
    set({ phase: 'generating', error: null, isProcessing: true, scenarioMode: mode, runtimeConfig: finalWorldConfig })

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

      // 里程碑反馈检测
      let milestone: MilestoneFeedback | null = null
      const nextStep = newPlayer.steps // steps already incremented by applyEffects
      if (shouldTriggerMilestone(nextStep, scenarioMode)) {
        // 尝试从 LLM 输出解析里程碑
        milestone = parseMilestoneFeedback(response.narrative, nextStep, scenarioMode, finalWorld, newPlayer)
        // 如果 LLM 没有输出里程碑标记，使用本地 fallback
        if (!milestone) {
          milestone = generateLocalMilestone(nextStep, scenarioMode, finalWorld, newPlayer, newNarrativeLog)
        }
      }

      // 清理 narrative 中的里程碑标记（不在日志中显示原始标记）
      const cleanedLogs = newNarrativeLog.map(log => 
        log.type === 'narrative' ? { ...log, text: stripMilestoneTag(log.text) } : log
      )

      // 检测是否到达 maxSteps（触发全局总结弹窗，而非直接结束）
      const config = getScenarioConfig(scenarioMode)
      const reachedMaxSteps = config.maxSteps !== null && newPlayer.steps >= config.maxSteps && !response.gameOver
      const currentSummary = get().summaryState
      const shouldShowSummary = reachedMaxSteps && (!currentSummary || !currentSummary.triggered)

      set({
        world: finalWorld,
        player: newPlayer,
        narrativeLog: cleanedLogs,
        choices: newChoices,
        phase: response.gameOver ? 'gameover' : 'playing',
        debugLogs: [...debugLogs, debug, ...agentDebug],
        totalTokensUsed: newTotalTokens,
        isProcessing: false,
        milestoneFeedback: milestone,
        summaryState: shouldShowSummary ? { triggered: true, stepReached: newPlayer.steps, canContinue: true } : get().summaryState,
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
    runtimeConfig: { ...DEFAULT_WORLD_CONFIG },
    milestoneFeedback: null,
    summaryState: null,
  }),

  dismissMilestone: () => set({ milestoneFeedback: null }),

  dismissSummary: () => set({ summaryState: null }),

  continuePastSummary: () => {
    // 用户选择继续挑战：清除 summary 状态，允许继续游玩
    set({ summaryState: null })
  },

  // Runtime editing actions — modify world state during gameplay
  updateAgent: (agentId, updates) => {
    const { world } = get()
    if (!world) return
    const newAgents = world.agents.map(a => {
      if (a.id !== agentId) return a
      return {
        ...a,
        persona: updates.persona ?? a.persona,
        goals: updates.goals ?? a.goals,
        decisionStyle: (updates.decisionStyle as any) ?? a.decisionStyle,
        memory: {
          ...a.memory,
          attitude: updates.attitude ?? a.memory.attitude,
        },
      }
    })
    set({ world: { ...world, agents: newAgents } })
  },

  addRule: (trigger, effect) => {
    const { world } = get()
    if (!world) return
    const newRule = {
      id: `rule_custom_${Date.now().toString(36)}`,
      trigger,
      effect,
      fired: false,
    }
    set({ world: { ...world, rules: [...world.rules, newRule] } })
  },

  removeRule: (ruleIndex) => {
    const { world } = get()
    if (!world) return
    set({ world: { ...world, rules: world.rules.filter((_, i) => i !== ruleIndex) } })
  },

  updateRuntimeConfig: (updates) => {
    set(s => ({ runtimeConfig: { ...s.runtimeConfig, ...updates } }))
  },
}))
