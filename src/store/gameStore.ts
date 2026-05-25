/**
 * WorldSim — Global State Management (Zustand)
 * 
 * Single source of truth for the entire simulation state.
 * Supports session export for behavior analysis.
 */

import { create } from 'zustand'
import type { WorldSchema, PlayerState, DebugLog, SessionData, ActionResponse } from '../engine/types'
import { generateWorld, getPlayerStart } from '../engine/worldGen'
import { processAction, applyEffects } from '../engine/actionHandler'
import { markRulesFired, checkRuleTriggers } from '../engine/ruleEngine'
import { executeAgentTick, applyAgentTick } from '../engine/agentLoop'
import { initGemini, type GeminiModel } from '../api/gemini'
import { type ScenarioMode, getScenarioConfig } from '../engine/scenarios'
import { autoSave } from '../engine/persistence'

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
  startGame: (theme: string, mode?: ScenarioMode) => Promise<void>
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

  startGame: async (theme: string, mode: ScenarioMode = 'game') => {
    const config = getScenarioConfig(mode)
    set({ phase: 'generating', error: null, isProcessing: true, scenarioMode: mode })

    try {
      const { world, debug } = await generateWorld(theme, undefined, config.worldGenModifier || undefined)
      
      const rawData = JSON.parse(debug.response)
      const startPos = getPlayerStart(rawData)
      
      const player: PlayerState = {
        position: startPos,
        hp: 100,
        maxHp: 100,
        inventory: [],
        steps: 0,
      }

      set({
        phase: 'playing',
        world,
        player,
        narrativeLog: [
          { text: `🌍 ${world.name}`, type: 'system' },
          { text: world.description, type: 'narrative' },
          { text: `🎯 Goal: ${world.winCondition}`, type: 'system' },
        ],
        choices: ['Look around', 'Talk to nearby person', 'Explore cautiously'],
        debugLogs: [debug],
        totalTokensUsed: debug.promptTokens + debug.responseTokens,
        isProcessing: false,
      })
    } catch (error: any) {
      set({
        phase: 'setup',
        error: error.message || 'Failed to generate world',
        isProcessing: false,
        debugLogs: error.debug ? [error.debug] : get().debugLogs,
      })
    }
  },

  performAction: async (action: string) => {
    const { world, player, narrativeLog, debugLogs, totalTokensUsed } = get()
    if (!world || !player) return

    set({ isProcessing: true, error: null })

    const recentEvents = narrativeLog
      .filter(l => l.type === 'narrative')
      .slice(-3)
      .map(l => l.text)

    try {
      const { response, debug, corrections, firedRules } = await processAction(world, player, action, recentEvents)

      // Apply effects to get new state
      let { world: newWorld, player: newPlayer } = applyEffects(world, player, response)

      // Mark fired rules in world state
      if (firedRules.length > 0) {
        const triggers = checkRuleTriggers(world, player)
        newWorld = markRulesFired(newWorld, triggers.map(t => t.ruleId))
      }

      // Build new narrative log entries
      const newLogs: { text: string; type: 'narrative' | 'event' | 'system' }[] = [
        { text: `> ${action}`, type: 'system' },
        { text: response.narrative, type: 'narrative' },
      ]

      // Add rule engine corrections to debug (visible in dev mode)
      if (corrections.length > 0) {
        newLogs.push({ text: `🔧 [Engine] ${corrections.join('; ')}`, type: 'system' })
      }

      // Add fired rules to narrative
      for (const effect of firedRules) {
        newLogs.push({ text: `⚙️ ${effect}`, type: 'event' })
      }

      // Add agent reactions to log
      for (const reaction of response.effects.agentReactions) {
        const agent = newWorld.agents.find(a => a.id === reaction.agentId)
        if (agent) {
          newLogs.push({ text: `${agent.emoji} ${agent.name}: ${reaction.reaction}`, type: 'narrative' })
        }
      }

      // Add world event to log
      if (response.worldEvent) {
        newLogs.push({ text: `⚡ ${response.worldEvent.description}`, type: 'event' })
      }

      // Check game over
      if (response.gameOver) {
        newLogs.push({ text: `🏁 ${response.gameOverReason || 'Game Over'}`, type: 'system' })
      }

      // --- Agent Autonomous Tick (after player action) ---
      // One agent acts per turn (round-robin), non-blocking on failure
      let finalWorld = newWorld
      let agentLogs: { text: string; type: 'narrative' | 'event' | 'system' }[] = []
      let agentDebug: DebugLog[] = []
      let agentTokens = 0

      if (!response.gameOver) {
        try {
          const tickResult = await executeAgentTick(newWorld, newPlayer, newPlayer.steps)
          if (tickResult) {
            finalWorld = applyAgentTick(newWorld, tickResult.result)
            agentLogs.push({
              text: `${finalWorld.agents.find(a => a.id === tickResult.result.agentId)?.emoji || '🤖'} ${tickResult.result.narrative}`,
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
        error: error.message || 'Failed to process action',
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
        .filter(l => l.text.startsWith('> '))
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
