/**
 * WorldSim Engine — Core Type Definitions
 * 
 * This type system defines a universal World Simulation Protocol.
 * The same schema powers game demos, training sandboxes, and behavior simulations.
 * 
 * Architecture Reference: Stanford "Generative Agents" (Park et al., 2023)
 * - Memory Stream → AgentMemory.observations
 * - Reflection → AgentMemory.reflections  
 * - Planning → AgentBehavior.goals
 */

// ============================================================
// World Schema — The Universal World Description Protocol
// ============================================================

export interface WorldSchema {
  id: string;
  name: string;
  seed: string;                          // Deterministic seed for reproducibility & sharing
  theme: string;                         // User's original natural language prompt
  description: string;
  dimensions: [number, number];          // Grid size (e.g. [7,7] for game, [5,1] for flow)
  map: string[][];                       // 2D array of tile type IDs
  tiles: Record<string, TileDef>;        // Tile definitions
  agents: Agent[];                       // NPCs / simulated personas
  items: Item[];                         // Collectible objects
  rules: WorldRule[];                    // Causal rules governing the world
  winCondition: string;
  mode: 'game' | 'simulation' | 'training';
}

export interface TileDef {
  emoji?: string;  // deprecated — visual system auto-generates from name/description
  name: string;
  walkable: boolean;
  description?: string;
}

// ============================================================
// Agent System — Memory-Driven Autonomous Entities
// ============================================================

export interface Agent {
  id: string;
  name: string;
  emoji?: string;  // deprecated — visual system auto-generates from agent name/id
  position: [number, number];
  persona: string;                       // Personality & background description
  goals: string[];                       // What this agent wants to achieve
  decisionStyle: 'rational' | 'emotional' | 'chaotic';
  memory: AgentMemory;
}

export interface AgentMemory {
  observations: Observation[];           // Raw observations (capped at 10)
  reflections: string[];                 // Higher-level reflections (capped at 3)
  attitude: number;                      // -100 to 100, attitude toward player
  knownFacts: string[];                  // Facts about the player
  currentPlan: string | null;            // Agent's current intention (updated via reflection)
}

export interface Observation {
  step: number;
  content: string;
  importance: number;                    // 1-10 scale
}

// ============================================================
// Items & Rules
// ============================================================

export interface Item {
  id: string;
  name: string;
  emoji?: string;  // deprecated — visual system auto-generates from item name
  position: [number, number];
  description: string;
  collected: boolean;
}

export interface WorldRule {
  id: string;
  trigger: string;                       // When this rule activates
  effect: string;                        // What happens
  fired: boolean;                        // Has this rule been triggered?
}

// ============================================================
// Player State
// ============================================================

export interface PlayerState {
  position: [number, number];
  hp: number;
  maxHp: number;
  inventory: string[];
  steps: number;
}

// ============================================================
// Action & Response Protocol
// ============================================================

export interface ActionResponse {
  narrative: string;
  effects: {
    hpChange: number;
    addItem: string | null;
    removeItem: string | null;
    movePlayer: [number, number] | null;
    agentReactions: AgentReaction[];
    mapChange: MapChange | null;
  };
  choices: string[];
  worldEvent: WorldEvent | null;         // Emergent world events (every N steps)
  gameOver: boolean;
  gameOverReason: string | null;
}

export interface AgentReaction {
  agentId: string;
  reaction: string;
  attitudeChange: number;
  newObservation: string;
}

export interface MapChange {
  position: [number, number];
  newTileId: string;
  reason: string;
}

export interface WorldEvent {
  description: string;
  mapChanges: MapChange[];
  affectedAgents: string[];
}

// ============================================================
// Agent Autonomous Action — Output of agent tick loop
// ============================================================

export interface AgentTickResult {
  agentId: string;
  action: string;                        // What the agent decided to do
  narrative: string;                     // Description of agent's autonomous action
  newPosition: [number, number] | null;  // Where agent moved (if any)
  newReflection: string | null;          // New higher-level reflection formed
  newPlan: string | null;                // Updated plan
  interactsWithAgent: string | null;     // If agent interacts with another agent
}

// ============================================================
// Debug / Transparency Layer
// ============================================================

export interface DebugLog {
  timestamp: number;
  type: 'world_gen' | 'action' | 'agent_tick';
  promptTokens: number;
  responseTokens: number;
  prompt: string;
  response: string;
  latencyMs: number;
}

// ============================================================
// Session Data — For behavior export & replay
// ============================================================

export interface SessionData {
  worldSchema: WorldSchema;
  playerDecisions: { step: number; action: string; result: string }[];
  agentBehaviorLog: { step: number; agentId: string; behavior: string }[];
  emergentEvents: WorldEvent[];
  outcome: string | null;
  totalTokensUsed: number;
  totalSteps: number;
}
