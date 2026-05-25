/**
 * WorldSim Engine — Scenario Presets
 * 
 * Demonstrates the engine's cross-domain reusability.
 * Same core (world gen + agent loop + rule engine) powers:
 * 
 * 1. GAME MODE — Player explores, NPCs react, world events emerge
 * 2. TRAINING MODE — Learner faces scenarios, assessed on decisions
 * 3. SIMULATION MODE — No human player, agents autonomously interact, generates behavior data
 * 
 * This is the key architectural proof that WorldSim is an ENGINE, not just a game.
 */

import type { WorldSchema } from './types'

export type ScenarioMode = 'game' | 'training' | 'simulation'

export interface ScenarioConfig {
  mode: ScenarioMode
  label: string
  description: string
  icon: string
  presets: ScenarioPreset[]
  worldGenModifier: string       // Extra instructions appended to world gen prompt
  actionModifier: string         // Extra instructions appended to action prompt
  agentTickEnabled: boolean      // Whether agents act autonomously
  showMap: boolean               // Whether to render the spatial grid
  showScore: boolean             // Whether to show assessment score
  autoRun: boolean               // Whether simulation runs without player input
  maxSteps: number | null        // Step limit (null = unlimited)
}

export interface ScenarioPreset {
  name: string
  icon: string
  theme: string
  description: string
  promptModifier?: string       // Extra prompt for this specific preset
}

// ============================================================
// Mode Configurations
// ============================================================

export const SCENARIO_CONFIGS: Record<ScenarioMode, ScenarioConfig> = {
  game: {
    mode: 'game',
    label: 'Exploration Game',
    description: 'Interactive world with NPCs, puzzles, and emergent events',
    icon: '🎮',
    presets: [
      {
        name: 'Space Station',
        icon: '🚀',
        theme: 'An abandoned space station where the AI has gone rogue. Dark corridors, malfunctioning robots, and one survivor hiding somewhere.',
        description: 'Sci-fi survival horror',
      },
      {
        name: 'Medieval Mystery',
        icon: '🏰',
        theme: 'A plague-ridden medieval village hiding a dark secret. The healer knows more than she reveals, the priest is missing, and wolves howl at night.',
        description: 'Dark fantasy investigation',
      },
      {
        name: 'Cyberpunk Market',
        icon: '🌆',
        theme: 'A cyberpunk black market in the undercity of Neo-Tokyo. Data dealers, chrome surgeons, and a bounty hunter looking for someone.',
        description: 'Neon-noir negotiation',
      },
    ],
    worldGenModifier: '',
    actionModifier: '',
    agentTickEnabled: true,
    showMap: true,
    showScore: false,
    autoRun: false,
    maxSteps: null,
  },

  training: {
    mode: 'training',
    label: 'Training Sandbox',
    description: 'Practice decision-making in realistic scenarios with AI assessment',
    icon: '🎓',
    presets: [
      {
        name: 'ER Triage',
        icon: '🏥',
        theme: 'A busy hospital emergency room on a Friday night. You are a new resident doctor. Multiple patients arrive with different severity levels. Nurses expect clear decisions. A senior doctor is watching your performance.',
        description: 'Medical decision-making under pressure',
      },
      {
        name: 'Crisis Management',
        icon: '🚨',
        theme: 'You are a PR director for a tech company. A data breach has just been discovered. The CEO wants answers, journalists are calling, users are angry on social media, and legal is preparing statements.',
        description: 'Corporate crisis communication',
      },
      {
        name: 'Sales Negotiation',
        icon: '🤝',
        theme: 'You are negotiating a major enterprise deal. The buyer has budget constraints, their technical team has concerns, and a competitor is offering a lower price. Your manager expects you to close this quarter.',
        description: 'B2B negotiation skills',
      },
    ],
    worldGenModifier: `
TRAINING MODE ADJUSTMENTS:
- Each agent represents a stakeholder with specific expectations
- Design clear evaluation criteria: what makes a "good" vs "poor" decision
- Include time pressure elements
- The world should present dilemmas with tradeoffs (no obvious right answers)
- Rules should track performance metrics implicitly`,
    actionModifier: `
TRAINING ASSESSMENT:
- After narrating the outcome, evaluate the player's decision quality
- Consider: timeliness, stakeholder management, ethical implications, strategic thinking
- Add a "score" field (0-100) to your response representing decision quality
- In choices, include at least one "obviously wrong" option and one "nuanced" option`,
    agentTickEnabled: true,
    showMap: false,
    showScore: true,
    autoRun: false,
    maxSteps: 15,
  },

  simulation: {
    mode: 'simulation',
    label: 'Behavior Simulation',
    description: 'Watch AI agents interact autonomously — generate behavior data',
    icon: '🔬',
    presets: [
      {
        name: 'Checkout Flow',
        icon: '🛒',
        theme: 'An e-commerce checkout flow. 4 different user personas navigate the purchase: a hurried professional, a price-sensitive student, a confused elderly person, and a suspicious first-time buyer. Each has different patience levels and decision patterns.',
        description: 'UX behavior modeling',
      },
      {
        name: 'Office Dynamics',
        icon: '🏢',
        theme: 'A startup office with 5 employees: an overworked engineer, an ambitious product manager, a new hire trying to fit in, a remote worker feeling isolated, and a manager struggling to keep everyone aligned. Simulate 1 day of interactions.',
        description: 'Team dynamics simulation',
      },
      {
        name: 'Market Economy',
        icon: '📈',
        theme: '4 traders in a simplified market: a conservative value investor, an aggressive day trader, a trend follower, and a contrarian. Each has different information and risk tolerances. Simulate their trading decisions.',
        description: 'Agent-based economic modeling',
      },
    ],
    worldGenModifier: `
SIMULATION MODE ADJUSTMENTS:
- There is NO human player in this simulation
- ALL entities are autonomous agents with distinct behavior patterns
- Focus on agent-to-agent interactions, not player-world interactions
- Design the world to generate interesting behavioral data
- Define clear observable metrics (satisfaction, productivity, conflict, etc.)
- Rules should represent environmental constraints the agents operate within`,
    actionModifier: `
SIMULATION MODE:
- You are simulating ONE turn of agent interactions (no human player)
- Each agent acts according to their persona and decision style
- Report what each agent does this turn
- Track measurable outcomes (metrics change)
- The "narrative" describes the overall turn outcome
- "choices" is not needed (set to empty array)`,
    agentTickEnabled: true,
    showMap: true,
    showScore: false,
    autoRun: true,
    maxSteps: 20,
  },
}

/**
 * Get scenario config by mode
 */
export function getScenarioConfig(mode: ScenarioMode): ScenarioConfig {
  return SCENARIO_CONFIGS[mode]
}

/**
 * Get all available modes with their labels
 */
export function getAvailableModes(): { mode: ScenarioMode; label: string; icon: string; description: string }[] {
  return Object.values(SCENARIO_CONFIGS).map(c => ({
    mode: c.mode,
    label: c.label,
    icon: c.icon,
    description: c.description,
  }))
}
