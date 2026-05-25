/**
 * WorldSim Engine — Prompt Templates
 * 
 * Two-prompt architecture for minimal token consumption:
 * 1. World Generation (~2300 tokens total)
 * 2. Action Response (~1000 tokens per step)
 * 
 * Design Principles:
 * - Structured JSON output via schema constraints
 * - Sliding window context (last 3 events only)
 * - NPC memory injection for emergent social dynamics
 */

import type { WorldSchema, Agent, PlayerState, Observation } from './types'

// ============================================================
// Prompt 1: World Generation
// ============================================================

export function buildWorldGenPrompt(theme: string, seed: string): string {
  return `You are a world simulation architect. Generate a 7x7 tile-based world based on the theme below.

THEME: "${theme}"
SEED: "${seed}"

REQUIREMENTS:
- Create a coherent, atmospheric world with 3-5 distinct areas
- Include 2-4 NPCs with unique personalities, goals, and decision styles  
- Place 2-3 collectible items that are meaningful to the world's narrative
- Define 2-3 causal rules (events that trigger based on conditions)
- The world should feel alive — NPCs have their own agendas independent of the player

OUTPUT FORMAT (strict JSON):
{
  "name": "World name (creative, evocative)",
  "description": "2-sentence world backstory",
  "map": [["tile_id", ...], ...],  // 7 rows × 7 cols
  "tiles": {
    "tile_id": { "emoji": "🏚️", "name": "Abandoned House", "walkable": true, "description": "..." }
  },
  "agents": [
    {
      "id": "agent_1",
      "name": "Character Name",
      "emoji": "👤",
      "position": [x, y],
      "persona": "Detailed personality, background, speaking style",
      "goals": ["Goal 1", "Goal 2"],
      "decisionStyle": "rational|emotional|chaotic"
    }
  ],
  "items": [
    { "id": "item_1", "name": "Item Name", "emoji": "🗝️", "position": [x, y], "description": "What it is and why it matters" }
  ],
  "rules": [
    { "id": "rule_1", "trigger": "When condition is met", "effect": "What happens in the world" }
  ],
  "winCondition": "Clear description of how the player wins",
  "playerStart": [x, y]
}

CONSTRAINTS:
- Use diverse emoji for tiles (nature: 🌲🌿⛰️🌊, structures: 🏚️🏰🏪🏠, paths: 🛤️)
- Ensure player start position is walkable
- At least one NPC should be initially friendly, one neutral, one potentially hostile
- Map should have clear pathways connecting areas (not random noise)
- Keep all text concise — this is a simulation, not a novel`
}

// ============================================================
// Prompt 2: Action Response
// ============================================================

export function buildActionPrompt(
  world: WorldSchema,
  player: PlayerState,
  action: string,
  nearbyAgents: Agent[],
  recentEvents: string[],
  stepCount: number
): string {
  const currentTile = world.map[player.position[1]][player.position[0]]
  const tileDef = world.tiles[currentTile]
  
  // Build NPC memory context (lightweight — only nearby agents)
  const agentContext = nearbyAgents.map(a => {
    const recentObs = a.memory.observations.slice(-3).map(o => o.content).join('; ')
    return `- ${a.name} (${a.persona.slice(0, 60)}...) | Attitude: ${a.memory.attitude}/100 | Knows: [${a.memory.knownFacts.join(', ')}] | Recent: ${recentObs || 'Nothing yet'}`
  }).join('\n')

  // Determine if a world event should fire (every 4 steps)
  const shouldGenerateWorldEvent = stepCount > 0 && stepCount % 4 === 0

  return `You are the Game Master of "${world.name}". Narrate the result of the player's action.

WORLD: ${world.description}
CURRENT LOCATION: ${tileDef.name} (${tileDef.emoji}) — ${tileDef.description || 'No description'}
PLAYER POSITION: [${player.position}]
PLAYER HP: ${player.hp}/${player.maxHp}
INVENTORY: [${player.inventory.join(', ') || 'empty'}]
STEP: ${stepCount}

NEARBY AGENTS:
${agentContext || '(none)'}

RECENT HISTORY (last 3):
${recentEvents.slice(-3).map((e, i) => `${i + 1}. ${e}`).join('\n') || '(none)'}

WORLD RULES (unfired):
${world.rules.filter(r => !r.fired).map(r => `- IF ${r.trigger} THEN ${r.effect}`).join('\n') || '(none active)'}

PLAYER ACTION: "${action}"

${shouldGenerateWorldEvent ? `⚡ WORLD EVENT REQUIRED: Since this is step ${stepCount}, generate an autonomous world event that happens REGARDLESS of the player's action. The world evolves on its own.` : ''}

OUTPUT (strict JSON):
{
  "narrative": "Vivid 1-2 sentence narration of what happens (max 80 chars)",
  "effects": {
    "hpChange": 0,
    "addItem": null,
    "removeItem": null,
    "movePlayer": null,
    "agentReactions": [
      { "agentId": "id", "reaction": "What they do/say", "attitudeChange": 0, "newObservation": "What they now remember" }
    ],
    "mapChange": null
  },
  "choices": ["Choice A", "Choice B", "Choice C"],
  "worldEvent": ${shouldGenerateWorldEvent ? '{ "description": "What happens in the world autonomously", "mapChanges": [], "affectedAgents": [] }' : 'null'},
  "gameOver": false,
  "gameOverReason": null
}

RULES:
- Narrative must be atmospheric and concise
- Agent reactions should reflect their memory and personality
- If player does something an agent witnesses, add it to their observation
- Attitude changes should be small (-10 to +10 per action)
- Choices should be meaningfully different (not just "go left/right")
- gameOver=true only if HP<=0 or winCondition is clearly met
- World events should feel organic — weather changes, NPC movements, resource depletion`
}
