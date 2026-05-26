/**
 * WorldSim Engine — Public API
 * 
 * This is the main entry point for programmatic usage.
 * Import from this module to use WorldSim as a headless engine.
 * 
 * @example
 * import { WorldSimEngine } from 'worldsim/engine'
 * const engine = new WorldSimEngine({ apiKey: '...' })
 * const session = await engine.createSession({ theme: '...' })
 * const result = await session.step('Look around')
 */

// SDK (primary interface)
export { WorldSimEngine, SimulationSession } from './sdk'
export type {
  SDKConfig,
  SessionConfig,
  StepEvent,
  StepMetrics,
  SDKError,
  AnalyticsReport,
  AgentSummary,
  TimelineEntry,
  AutopilotState,
  SessionSnapshot,
} from './sdk'

// Core types (for advanced usage)
export type {
  WorldSchema,
  TileDef,
  Agent,
  AgentMemory,
  Observation,
  Item,
  WorldRule,
  PlayerState,
  ActionResponse,
  AgentReaction,
  MapChange,
  WorldEvent,
  AgentTickResult,
  DebugLog,
  SessionData,
} from './types'

// Scenario configs
export { SCENARIO_CONFIGS } from './scenarios'
export type { ScenarioMode, ScenarioConfig } from './scenarios'

// Individual modules (for custom pipelines)
export { generateWorld, getPlayerStart } from './worldGen'
export { processAction, applyEffects } from './actionHandler'
export { executeAgentTick, applyAgentTick, getTickingAgent, retainWithImportance, retrieveRelevantMemory } from './agentLoop'
export { validateAndCorrect, checkRuleTriggers, markRulesFired } from './ruleEngine'
export { checkConnectivity, repairConnectivity, validateAndRepairMap } from './mapValidator'
export type { ConnectivityReport } from './mapValidator'
