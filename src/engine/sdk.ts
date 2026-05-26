/**
 * WorldSim Headless SDK
 * 
 * Zero-dependency engine interface for programmatic world simulation.
 * Designed for:
 * - Enterprise integration (training platforms, HR assessment systems)
 * - Automated testing of AI agent behaviors
 * - Batch simulation runs for research
 * - CI/CD behavioral regression testing
 * 
 * Usage:
 *   import { WorldSimEngine } from './engine/sdk'
 * 
 *   const engine = new WorldSimEngine({ apiKey: '...', model: 'gemini-2.0-flash' })
 *   const session = await engine.createSession({ theme: 'Corporate onboarding' })
 *   const result = await session.step('Introduce myself to the team')
 *   console.log(result.narrative, result.metrics)
 *   const report = session.exportAnalytics()
 */

import type {
  WorldSchema,
  PlayerState,
  ActionResponse,
  DebugLog,
  SessionData,
  AgentTickResult,
} from './types'
import { generateWorld, getPlayerStart } from './worldGen'
import { processAction, applyEffects } from './actionHandler'
import { executeAgentTick, applyAgentTick } from './agentLoop'
import { checkRuleTriggers, markRulesFired } from './ruleEngine'
import { SCENARIO_CONFIGS, type ScenarioMode } from './scenarios'
import { initGemini, setModel, type GeminiModel } from '../api/gemini'

// ============================================================
// SDK Configuration
// ============================================================

export interface SDKConfig {
  apiKey: string
  model?: GeminiModel
  mode?: ScenarioMode
  maxSteps?: number               // Auto-terminate after N steps (default: 100)
  timeoutMs?: number              // Timeout for LLM calls in ms (default: 30000)
  enableAgentTicks?: boolean      // Run agent behavior between steps (default: true)
  onStep?: (event: StepEvent) => void  // Real-time step callback
  onError?: (error: SDKError) => void  // Error callback
}

export interface SessionConfig {
  theme: string
  seed?: string
  mode?: ScenarioMode
  preset?: string                 // Scenario preset name
}

export interface StepEvent {
  step: number
  action: string
  narrative: string
  agentTick: AgentTickResult | null
  corrections: string[]
  firedRules: string[]
  metrics: StepMetrics
}

export interface StepMetrics {
  latencyMs: number
  tokensUsed: number
  cumulativeTokens: number
  agentAttitudes: Record<string, number>
}

export interface SDKError {
  code: 'RATE_LIMIT' | 'API_ERROR' | 'VALIDATION' | 'MAX_STEPS' | 'SESSION_ENDED' | 'TIMEOUT'
  message: string
  retryable: boolean
}

// ============================================================
// Analytics Report
// ============================================================

export interface AnalyticsReport {
  sessionId: string
  mode: ScenarioMode
  theme: string
  totalSteps: number
  totalTokens: number
  avgTokensPerStep: number
  avgLatencyMs: number
  agentBehaviorSummary: AgentSummary[]
  decisionPatterns: Record<string, number>
  rulesTriggered: { id: string; trigger: string; effect: string }[]
  outcome: 'completed' | 'game_over' | 'max_steps' | 'aborted'
  outcomeReason: string | null
  timeline: TimelineEntry[]
}

export interface AgentSummary {
  id: string
  name: string
  finalAttitude: number
  totalActions: number
  reflections: string[]
  planHistory: string[]
}

export interface TimelineEntry {
  step: number
  type: 'player_action' | 'agent_action' | 'rule_fired' | 'world_event'
  description: string
}

// ============================================================
// WorldSimEngine — Main SDK Class
// ============================================================

export class WorldSimEngine {
  private config: Required<SDKConfig>

  constructor(config: SDKConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gemini-2.0-flash',
      mode: config.mode || 'game',
      maxSteps: config.maxSteps || 100,
      timeoutMs: config.timeoutMs || 30000,
      enableAgentTicks: config.enableAgentTicks ?? true,
      onStep: config.onStep || (() => {}),
      onError: config.onError || (() => {}),
    }

    // Initialize API
    initGemini(this.config.apiKey, this.config.model)
  }

  /**
   * Create a new simulation session
   */
  async createSession(sessionConfig: SessionConfig): Promise<SimulationSession> {
    const mode = sessionConfig.mode || this.config.mode
    const scenario = SCENARIO_CONFIGS[mode]
    const modifier = sessionConfig.preset
      ? scenario.presets.find(p => p.name === sessionConfig.preset)?.promptModifier || ''
      : scenario.worldGenModifier

    try {
      const { world, debug } = await withTimeout(
        generateWorld(sessionConfig.theme, sessionConfig.seed, modifier),
        this.config.timeoutMs,
        'createSession'
      )

      world.mode = mode
      const playerStart = getPlayerStart({ playerStart: [3, 3] })

      const player: PlayerState = {
        position: playerStart,
        hp: 100,
        maxHp: 100,
        inventory: [],
        steps: 0,
      }

      return new SimulationSession(
        world,
        player,
        this.config,
        debug
      )
    } catch (error: any) {
      const sdkError: SDKError = {
        code: error.message?.includes('429') ? 'RATE_LIMIT' : 'API_ERROR',
        message: `Failed to create session: ${error.message}`,
        retryable: error.message?.includes('429'),
      }
      this.config.onError(sdkError)
      throw sdkError
    }
  }

  /**
   * Resume a session from exported state
   */
  restoreSession(state: SessionSnapshot): SimulationSession {
    return new SimulationSession(
      state.world,
      state.player,
      this.config,
      null,
      state.history,
      state.debugLogs
    )
  }
}

// ============================================================
// SimulationSession — Stateful Session Object
// ============================================================

export interface SessionSnapshot {
  world: WorldSchema
  player: PlayerState
  history: StepEvent[]
  debugLogs: DebugLog[]
}

export class SimulationSession {
  private world: WorldSchema
  private player: PlayerState
  private config: Required<SDKConfig>
  private history: StepEvent[]
  private debugLogs: DebugLog[]
  private totalTokens: number
  private ended: boolean
  private endReason: string | null
  private timeline: TimelineEntry[]
  private agentPlanHistory: Record<string, string[]>

  constructor(
    world: WorldSchema,
    player: PlayerState,
    config: Required<SDKConfig>,
    initDebug: DebugLog | null,
    history: StepEvent[] = [],
    debugLogs: DebugLog[] = []
  ) {
    this.world = world
    this.player = player
    this.config = config
    this.history = history
    this.debugLogs = initDebug ? [initDebug, ...debugLogs] : debugLogs
    this.totalTokens = this.debugLogs.reduce((s, d) => s + d.promptTokens + d.responseTokens, 0)
    this.ended = false
    this.endReason = null
    this.timeline = []
    this.agentPlanHistory = {}
  }

  /**
   * Execute one simulation step
   * Returns the step result with narrative, effects, and metrics
   */
  async step(action: string): Promise<StepEvent> {
    if (this.ended) {
      const err: SDKError = {
        code: 'SESSION_ENDED',
        message: `Session ended: ${this.endReason}`,
        retryable: false,
      }
      this.config.onError(err)
      throw err
    }

    if (this.player.steps >= this.config.maxSteps) {
      this.ended = true
      this.endReason = 'Max steps reached'
      const err: SDKError = {
        code: 'MAX_STEPS',
        message: `Maximum steps (${this.config.maxSteps}) reached`,
        retryable: false,
      }
      this.config.onError(err)
      throw err
    }

    const recentEvents = this.history.slice(-5).map(h => h.narrative)

    try {
      // 1. Process player action
      const { response, debug, corrections, firedRules } = await processAction(
        this.world,
        this.player,
        action,
        recentEvents
      )
      this.debugLogs.push(debug)

      // 2. Apply effects
      const { world: newWorld, player: newPlayer } = applyEffects(this.world, this.player, response)
      this.world = newWorld
      this.player = newPlayer

      // 3. Mark fired rules
      if (firedRules.length > 0) {
        const triggers = checkRuleTriggers(this.world, this.player)
        const ruleIds = triggers.map(t => t.ruleId)
        this.world = markRulesFired(this.world, ruleIds)
        for (const rule of triggers) {
          this.timeline.push({
            step: this.player.steps,
            type: 'rule_fired',
            description: `${rule.ruleId} → ${rule.effect}`,
          })
        }
      }

      // 4. Agent tick (if enabled)
      let agentTick: AgentTickResult | null = null
      if (this.config.enableAgentTicks) {
        const tickResult = await executeAgentTick(this.world, this.player, this.player.steps)
        if (tickResult) {
          agentTick = tickResult.result
          this.debugLogs.push(tickResult.debug)
          this.world = applyAgentTick(this.world, tickResult.result)

          // Track agent plans
          if (tickResult.result.newPlan) {
            const agentId = tickResult.result.agentId
            if (!this.agentPlanHistory[agentId]) this.agentPlanHistory[agentId] = []
            this.agentPlanHistory[agentId].push(tickResult.result.newPlan)
          }

          this.timeline.push({
            step: this.player.steps,
            type: 'agent_action',
            description: `${tickResult.result.agentId}: ${tickResult.result.action}`,
          })
        }
      }

      // 5. Calculate step metrics
      const stepTokens = debug.promptTokens + debug.responseTokens
      this.totalTokens += stepTokens

      const metrics: StepMetrics = {
        latencyMs: debug.latencyMs,
        tokensUsed: stepTokens,
        cumulativeTokens: this.totalTokens,
        agentAttitudes: Object.fromEntries(
          this.world.agents.map(a => [a.id, a.memory.attitude])
        ),
      }

      // 6. Build step event
      const event: StepEvent = {
        step: this.player.steps,
        action,
        narrative: response.narrative,
        agentTick,
        corrections,
        firedRules,
        metrics,
      }

      this.history.push(event)
      this.timeline.push({
        step: this.player.steps,
        type: 'player_action',
        description: `${action} → ${response.narrative.slice(0, 60)}`,
      })

      // 7. Check game over
      if (response.gameOver) {
        this.ended = true
        this.endReason = response.gameOverReason || 'Game over'
      }

      // 8. Invoke callback
      this.config.onStep(event)

      return event
    } catch (error: any) {
      const sdkError: SDKError = {
        code: error.message?.includes('429') ? 'RATE_LIMIT' : 'API_ERROR',
        message: error.message,
        retryable: error.message?.includes('429'),
      }
      this.config.onError(sdkError)
      throw sdkError
    }
  }

  /**
   * Run multiple steps automatically (batch mode)
   * Takes an array of actions to execute sequentially
   */
  async runBatch(actions: string[]): Promise<StepEvent[]> {
    const results: StepEvent[] = []
    for (const action of actions) {
      const event = await this.step(action)
      results.push(event)
      if (this.ended) break
    }
    return results
  }

  /**
   * Run simulation with an AI decision function (autopilot)
   * The decider function receives current state and returns the next action
   */
  async runAutopilot(
    decider: (state: AutopilotState) => string | Promise<string>,
    maxSteps?: number
  ): Promise<StepEvent[]> {
    const limit = maxSteps || this.config.maxSteps
    const results: StepEvent[] = []

    while (!this.ended && this.player.steps < limit) {
      const state: AutopilotState = {
        world: this.world,
        player: this.player,
        lastEvent: results[results.length - 1] || null,
        step: this.player.steps,
      }

      const action = await decider(state)
      const event = await this.step(action)
      results.push(event)
    }

    return results
  }

  /**
   * Export full analytics report for the session
   */
  exportAnalytics(): AnalyticsReport {
    const agentSummaries: AgentSummary[] = this.world.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      finalAttitude: agent.memory.attitude,
      totalActions: this.history.filter(h => h.agentTick?.agentId === agent.id).length,
      reflections: agent.memory.reflections,
      planHistory: this.agentPlanHistory[agent.id] || [],
    }))

    const decisionPatterns = categorizeActions(this.history.map(h => h.action))

    const rulesTriggered = this.world.rules
      .filter(r => r.fired)
      .map(r => ({ id: r.id, trigger: r.trigger, effect: r.effect }))

    let outcome: AnalyticsReport['outcome'] = 'aborted'
    if (this.ended && this.endReason?.includes('Max steps')) outcome = 'max_steps'
    else if (this.ended) outcome = 'game_over'
    else if (this.player.steps >= this.config.maxSteps) outcome = 'max_steps'

    const avgLatency = this.debugLogs.length > 0
      ? Math.round(this.debugLogs.reduce((s, d) => s + d.latencyMs, 0) / this.debugLogs.length)
      : 0

    return {
      sessionId: this.world.id,
      mode: this.world.mode as ScenarioMode,
      theme: this.world.theme,
      totalSteps: this.player.steps,
      totalTokens: this.totalTokens,
      avgTokensPerStep: this.player.steps > 0 ? Math.round(this.totalTokens / this.player.steps) : 0,
      avgLatencyMs: avgLatency,
      agentBehaviorSummary: agentSummaries,
      decisionPatterns,
      rulesTriggered,
      outcome,
      outcomeReason: this.endReason,
      timeline: this.timeline,
    }
  }

  /**
   * Export raw session data for replay / research
   */
  exportSessionData(): SessionData {
    return {
      worldSchema: this.world,
      playerDecisions: this.history.map(h => ({
        step: h.step,
        action: h.action,
        result: h.narrative,
      })),
      agentBehaviorLog: this.history
        .filter(h => h.agentTick)
        .map(h => ({
          step: h.step,
          agentId: h.agentTick!.agentId,
          behavior: h.agentTick!.action,
        })),
      emergentEvents: [],
      outcome: this.endReason,
      totalTokensUsed: this.totalTokens,
      totalSteps: this.player.steps,
    }
  }

  /**
   * Snapshot session state (for save/restore)
   */
  snapshot(): SessionSnapshot {
    return {
      world: structuredClone(this.world),
      player: structuredClone(this.player),
      history: [...this.history],
      debugLogs: [...this.debugLogs],
    }
  }

  // Getters
  get currentWorld(): WorldSchema { return this.world }
  get currentPlayer(): PlayerState { return this.player }
  get isEnded(): boolean { return this.ended }
  get stepCount(): number { return this.player.steps }
  get tokenCount(): number { return this.totalTokens }
}

// ============================================================
// Autopilot Types
// ============================================================

export interface AutopilotState {
  world: WorldSchema
  player: PlayerState
  lastEvent: StepEvent | null
  step: number
}

// ============================================================
// Utility
// ============================================================

function categorizeActions(actions: string[]): Record<string, number> {
  const categories: Record<string, number> = {}

  for (const action of actions) {
    const lower = action.toLowerCase()
    let type = 'other'

    // English keywords
    if (/talk|ask|say|speak|greet|introduce/i.test(lower)) type = 'social'
    else if (/look|examine|search|inspect|observe/i.test(lower)) type = 'explore'
    else if (/move|go|walk|enter|leave|head/i.test(lower)) type = 'navigate'
    else if (/attack|fight|hit|defend|strike/i.test(lower)) type = 'combat'
    else if (/take|grab|pick|use|open|activate/i.test(lower)) type = 'interact'
    else if (/wait|rest|hide|sleep/i.test(lower)) type = 'passive'
    // Chinese keywords (培训模式下用户通常用中文输入)
    else if (/说|问|谈|沟通|交流|介绍|建议|提议|解释|表达|回应|回答/.test(action)) type = 'social'
    else if (/看|观察|检查|调查|了解|分析|研究|查看|审视|探索/.test(action)) type = 'explore'
    else if (/去|走|前往|进入|离开|移动|到达|返回/.test(action)) type = 'navigate'
    else if (/攻击|战斗|打|防御|反击|对抗/.test(action)) type = 'combat'
    else if (/拿|取|使用|打开|激活|操作|拾取|获取/.test(action)) type = 'interact'
    else if (/等待|休息|隐藏|等|观望|按兵不动/.test(action)) type = 'passive'
    // Training-specific categories (Chinese)
    else if (/决定|选择|决策|拒绝|同意|接受|否决|批准/.test(action)) type = 'decide'
    else if (/协调|平衡|妥协|整合|调解|斡旋/.test(action)) type = 'coordinate'

    categories[type] = (categories[type] || 0) + 1
  }

  return categories
}

// ============================================================
// Timeout Utility
// ============================================================

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified duration, it rejects with a TIMEOUT SDKError.
 * 
 * @param promise - The async operation to wrap
 * @param ms - Timeout in milliseconds
 * @param operation - Name of the operation (for error messages)
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject({
        code: 'TIMEOUT' as const,
        message: `Operation "${operation}" timed out after ${ms}ms`,
        retryable: true,
      })
    }, ms)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}
