# WorldSim — AI World Simulation Engine

> **Transform natural language into interactive worlds with memory-driven agents, causal events, and emergent narratives.**

WorldSim is an open-source AI world simulation engine that powers three distinct modes — game exploration, professional training assessment, and multi-agent behavioral simulation — through a unified architecture inspired by Stanford's Generative Agents research.

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![AI](https://img.shields.io/badge/AI-Multi_Provider-orange)
![Architecture](https://img.shields.io/badge/Architecture-Generative_Agents-purple)

---

## Table of Contents

- [Product Vision](#product-vision)
- [Architecture Overview](#architecture-overview)
- [Three Modes](#three-modes)
- [Core Engine Design](#core-engine-design)
- [Technical Stack](#technical-stack)
- [Quick Start](#quick-start)
- [Development Journey & Challenges](#development-journey--challenges)
- [Prompt Engineering Deep Dive](#prompt-engineering-deep-dive)
- [Engagement Optimization](#engagement-optimization)
- [Headless SDK](#headless-sdk)
- [Roadmap](#roadmap)
- [Academic References](#academic-references)

---

## Product Vision

WorldSim addresses a fundamental gap in the AI application landscape: while LLMs excel at single-turn Q&A, there is no lightweight, open-source framework for building **stateful, multi-turn, multi-agent interactive simulations** that maintain memory, enforce rules, and produce emergent behavior.

The engine serves three distinct markets through a single codebase:

1. **Consumer (Game Mode)** — Interactive fiction with memory-driven NPCs, autonomous world events, and spatial exploration. Comparable to AI Dungeon but with structured world state and deterministic rule enforcement.

2. **Enterprise (Training Mode)** — Professional competency assessment through high-fidelity scenario simulation. Comparable to SHL/DDI situational judgment tests but with dynamic, adaptive scenarios powered by LLMs. Evaluates 5 competency dimensions in real-time.

3. **Research/Product (Simulation Mode)** — Multi-agent behavioral modeling for user research, organizational dynamics, and market strategy. Comparable to Mesa/NetLogo/AnyLogic but with natural language agent definitions and zero-code setup.

### Market Validation

- **Artificial Societies** (YC W25, $5.35M) — AI persona simulation for product testing
- **AgentHub** (YC S25) — Simulation environments for testing AI agents
- **InZOI** — Life simulation with AI-powered emergent NPC behavior
- **Stanford Generative Agents** (2023) — Academic foundation for memory-driven AI characters

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                    WorldSim Engine (Core)                          |
+------------------------------------------------------------------+
|                                                                    |
|  +---------------+   +-------------------+   +-----------------+  |
|  | World Schema  |   | Agent Memory      |   | Rule Engine     |  |
|  | (DSL)         |   | System            |   | (7-Layer)       |  |
|  |               |   |                   |   |                 |  |
|  | - Tile Map    |   | - Observation     |   | - Movement      |  |
|  | - Entities    |   | - Reflection      |   | - HP Clamp      |  |
|  | - Rules       |   | - Attitude Track  |   | - Item Valid    |  |
|  | - Items       |   | - Goal Planning   |   | - Agent Ref     |  |
|  | - Win Cond    |   | - Importance Wt   |   | - Map Change    |  |
|  +---------------+   +-------------------+   | - Attitude Cap  |  |
|                                               | - Choice Valid  |  |
|                                               +-----------------+  |
+------------------------------------------------------------------+
|                      Scenario Layer                                |
|                                                                    |
|  +----------+  +---------------+  +----------------------------+  |
|  |  Game    |  |   Training    |  |  Simulation                |  |
|  |  Mode    |  |   Mode        |  |  Mode                      |  |
|  | (C-end)  |  |  (B-end)      |  |  (Research)                |  |
|  +----------+  +---------------+  +----------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                   LLM Provider Abstraction                         |
|  DeepSeek (default) | Google Gemini | Custom Provider              |
+------------------------------------------------------------------+
|                   Renderer (Pluggable)                             |
|  React UI (current) | Headless SDK (API-only) | Terminal (future)  |
+------------------------------------------------------------------+
```

### Data Flow Per Turn

```
User Action
    |
    v
[Prompt Builder] -- mode-specific prompt construction
    |
    v
[LLM Provider] -- structured JSON output
    |
    v
[Schema Normalizer] -- ensure all fields present
    |
    v
[Rule Engine] -- 7-layer validation & correction
    |
    v
[State Applicator] -- immutable state update
    |
    v
[Agent Tick] -- one agent acts autonomously (round-robin)
    |
    v
[Milestone Check] -- periodic feedback injection
    |
    v
[Summary Detection] -- maxSteps reached? show overlay
    |
    v
[UI Update] -- Zustand -> React re-render
```

---

## Three Modes

### Mode 1: Game (Exploration)

A spatial, interactive fiction experience where the player explores AI-generated worlds.

| Feature | Implementation |
|---------|---------------|
| World Generation | Natural language -> 5x5 to 8x8 tile grid with NPCs, items, rules |
| NPC Memory | Importance-weighted observation stream (max 15, core memories never evicted) |
| Autonomous Events | World events trigger every 3 steps via rule engine |
| Spatial System | Manhattan distance for NPC proximity, BFS pathfinding |
| Visual System | 17 terrain tiles + 13 character avatars (48x48 pixel art PNGs) |
| Win Condition | Deterministic rule triggers (item collection, location, NPC trust) |

**Preset Scenarios:** Abandoned Space Station, Plague Village, Cyberpunk Black Market

### Mode 2: Training (Competency Assessment)

A professional scenario simulation for enterprise talent assessment, benchmarked against SHL/DDI/Hogan methodologies.

| Feature | Implementation |
|---------|---------------|
| Scenario Design | Harvard Business School case-study style situations |
| Competency Model | 5 dimensions: Analytical Judgment, Decisiveness, Stakeholder Management, Communication Influence, Strategic Vision |
| Scoring | Real-time S/A/B/C/D grading per dimension per round |
| Report Generation | Structured assessment report with evidence, suggestions, stakeholder outcomes |
| Round Limit | 8 rounds (optimized from 15 for engagement) |
| No Spatial Concept | Pure decision-making, no movement/exploration mechanics |

**Preset Scenarios:** Crisis PR (Data Breach 48h), Cross-Department Budget Negotiation, High-Performer Ethics Dilemma

### Mode 3: Simulation (Multi-Agent)

An autonomous agent-based modeling engine where agents interact without human intervention.

| Feature | Implementation |
|---------|---------------|
| Agent Autonomy | All agents act independently each round based on decision models |
| Decision Models | rational-bounded, heuristic, reactive, strategic |
| Observable Variables | Conflict index, cooperation index, information transparency |
| Auto-Run | No human input required; system advances automatically |
| Round Limit | 12 rounds (optimized from 20 for engagement) |
| Data Export | Full session JSON with agent behavior logs |

**Preset Scenarios:** E-commerce User Decision Paths, Organizational Dynamics Sprint, SaaS Market Pricing Game Theory

---

## Core Engine Design

### 1. Structured Output Engineering

All LLM outputs are constrained to strict JSON schemas. The engine never relies on free-text parsing. Every response must conform to the `ActionResponse` interface:

```typescript
interface ActionResponse {
  narrative: string
  effects: {
    hpChange: number
    addItem: string | null
    removeItem: string | null
    movePlayer: [number, number] | null
    agentReactions: AgentReaction[]
    mapChange: MapChange | null
  }
  choices: string[]
  worldEvent: WorldEvent | null
  gameOver: boolean
  gameOverReason: string | null
}
```

### 2. 7-Layer Deterministic Rule Engine

The rule engine sits between LLM output and state application, enforcing hard constraints that the LLM cannot override:

1. **Movement Validation** — Boundary checks, walkability, Manhattan distance cap (max 3 per step)
2. **HP Clamping** — Single-hit cap at -50, healing cap at +30, prevents instant kills
3. **Item Integrity** — Validates item existence, collection state, inventory cap (10 items)
4. **Agent Reference Resolution** — Resolves agent IDs by both `id` and `name` (LLMs frequently return character names instead of IDs)
5. **Map Change Validation** — Position bounds, tile ID existence
6. **Attitude Change Clamping** — Caps at +/-15 per turn to prevent emotional whiplash
7. **Choice Validation** — Ensures choices array exists, caps at 5 options, provides mode-appropriate fallbacks

### 3. Importance-Weighted Memory System

Inspired by Stanford Generative Agents, each NPC maintains a memory stream with importance-weighted retention:

```
Memory Retention Algorithm:
1. Core memories (importance >= 7) are NEVER evicted
2. Regular memories scored: importance * 0.6 + recency * 0.4
3. When exceeding cap (15), lowest-scoring regular memories dropped
4. Reflection triggers every 5 observations (max 5 reflections)
```

This ensures NPCs remember critical interactions (betrayals, gifts, key revelations) indefinitely while gracefully forgetting routine observations.

### 4. Agent Autonomous Behavior Loop

One agent acts per player turn (round-robin scheduling) to minimize token cost while maintaining world liveliness:

```
Agent Tick Pipeline:
1. Select agent (step % agentCount)
2. Build context: nearby agents, recent observations, current plan
3. LLM generates: action, narrative, new position, reflection, plan update
4. Apply to world state (non-blocking, failure-tolerant)
5. Cost: ~200-300 tokens per tick
```

### 5. LLM Provider Abstraction

The engine supports multiple LLM backends through a unified interface:

```typescript
// Supported providers
type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'deepseek-chat' | 'custom'

// Provider routing
- DeepSeek: Default, pre-filled API key, cost-effective
- Gemini: Free tier (45+ sessions/day), fast inference
- Custom: Any OpenAI-compatible endpoint
```

### 6. Sliding Window Context

Only the last 3 events are passed to the LLM per action, keeping token costs O(1) regardless of session length. Combined with the importance-weighted memory system, this achieves rich context without token explosion.

---

## Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | React 19 + Vite 6 | Fast HMR, modern concurrent features |
| Styling | Tailwind CSS 4 | Utility-first, zero runtime CSS |
| State | Zustand 5 | Minimal boilerplate, immutable updates, no providers |
| AI (Default) | DeepSeek Chat | Cost-effective, good Chinese language support |
| AI (Alt) | Google Gemini 2.5 Flash | Free tier, JSON mode, fast inference |
| Types | TypeScript 5.6 | Full type safety across world schema |
| Icons | Lucide React | Consistent, tree-shakeable icon set |
| Testing | Vitest 4 | Fast, Vite-native test runner |
| Deploy | Vercel / any static host | Zero config, free tier |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A DeepSeek API key (default) or Google Gemini API key (free tier sufficient)

### Installation

```bash
git clone https://github.com/Circuit94/worldsim.git
cd worldsim
npm install
```

### Run

```bash
npm run dev
```

Open http://localhost:5173 — describe a world, and enter it.

The default DeepSeek API key is pre-filled for immediate use. You can switch to Gemini or a custom provider in the settings panel.

---

## Development Journey & Challenges

This section documents the key technical challenges encountered during development and the solutions implemented. It serves as both a retrospective and a reference for similar AI-native product engineering efforts.

### Challenge 1: Score Clustering in Competency Diagnosis

**Problem:** The training mode's real-time competency scoring consistently produced scores in the 50-60 range across all dimensions, making it impossible for users to perceive meaningful differentiation or progress.

**Root Cause Analysis:**
- LLM-generated `evalTags` grades (S/A/B/C/D) were being converted to scores with insufficient spread
- The scoring algorithm used a linear mapping that compressed the range
- Without explicit prompt instructions for differentiation, LLMs default to "safe middle" ratings

**Solution (commit `494b35f`):**
- Redesigned the score calculation to use a wider mapping: S=95, A=82, B=65, C=45, D=25
- Added trend visualization showing score changes over time (delta arrows)
- Introduced a "60% baseline marker" in the UI so users can immediately see above/below average
- Modified prompt instructions to require LLMs to differentiate grades based on specific behavioral evidence

### Challenge 2: Shallow/Repetitive Scenario Choices

**Problem:** Users reported that choices felt like "going in circles" — options were abstract, vague, and didn't create a sense of real progression. Examples of bad choices: "observe the situation", "continue communicating", "gather more information".

**Root Cause Analysis:**
- Default LLM behavior produces safe, generic options without specific actors or consequences
- No explicit constraint on choice quality in the prompt
- Fallback choices (when LLM fails to generate) were equally generic

**Solution (commit `94cf8bd`):**
- Implemented the "Three Elements Rule" (三要素): every choice must contain [WHO] + [HOW specifically] + [EXPECTED CONSEQUENCE]
- Enforced 30-character minimum per choice option
- Added explicit blacklist of vague phrases in the prompt: "observe", "wait", "gather info", "assess risk"
- Required format: `"[Strategy Name] Take [specific action] toward [specific person], expecting [specific outcome]"`
- Added "Scenario Progression Enforcement Rules" preventing two consecutive rounds with the same strategic landscape
- Rewrote all fallback choices to match the three-elements standard

**Before:**
```
- "了解更多情况"
- "尝试沟通"  
- "观察局势变化"
```

**After:**
```
- "[以退为进] 向CFO主动提出缩减10%预算换取Q2项目自主审批权，同时要求对方BU按完成率比例承担削减，迫使对方暴露真实底线"
- "[数据施压] 当场展示ROI对比表（你的BU 115% vs 对方85%），直接质问CFO'高绩效部门承担更大削减是否符合公司价值观'，制造公开压力"
- "[联盟策略] 会后30分钟内单独约CEO茶歇，带着两个替代方案让CEO做选择题，绕过CFO的一刀切逻辑"
```

### Challenge 3: Engagement Drop-off (Round Count Optimization)

**Problem:** User engagement data showed significant drop-off in longer sessions. Training mode (15 rounds) and simulation mode (20 rounds) were too long for the information density delivered per round.

**Solution (commit `c132d45`):**
- Reduced training from 15 to 8 rounds, simulation from 20 to 12 rounds
- Implemented milestone feedback system at key intervals (training: rounds 3 & 6; simulation: rounds 4 & 8)
- Milestone feedback provides structured coaching/observation without blocking flow
- Added "Summary Overlay" at maxSteps that presents a full report with option to continue

### Challenge 4: Silent Ending at MaxSteps

**Problem:** When reaching the round limit (8 for training, 12 for simulation), the session simply ended without ceremony. Users felt abruptly cut off with no closure or sense of accomplishment.

**Solution (commit `94cf8bd`):**
- Implemented `SummaryState` in the game store that triggers a full-screen overlay at maxSteps WITHOUT setting `gameOver: true`
- The overlay displays: completion stats, agent attitude summary, stakeholder outcomes
- Training mode: "Generate Assessment Report" button produces a structured competency report
- Simulation mode: "Export Data" button downloads full session JSON
- "Continue Challenge" button dismisses the overlay and allows unlimited additional rounds
- For simulation auto-run: the useEffect loop pauses when summaryState is active

### Challenge 5: Agent Spatial Behavior in Non-Spatial Modes

**Problem:** In training and simulation modes (which have no spatial concept), agents were generating physical movement descriptions like "walks toward", "looks around", "opens the door" — breaking immersion.

**Solution (commit `44d3a38`):**
- Split `buildAgentTickPrompt` into spatial and non-spatial variants
- Non-spatial mode restricts agent actions to: communication, decision-making, stance-taking, pressure application
- Added explicit blacklist of physical verbs in non-spatial prompts
- Agent `getAgentNearbyContext` returns no coordinates/distances in non-spatial mode

### Challenge 6: LLM Output Inconsistency (Agent ID vs Name)

**Problem:** LLMs frequently return character names (e.g., "CFO张总") instead of agent IDs (e.g., "agent_1") in `agentReactions`, causing reactions to be silently dropped.

**Solution (in Rule Engine):**
- Added bidirectional resolution: first try ID match, then fall back to name-to-ID mapping
- Built a `nameToId` map from world agents at validation time
- Silent resolution (no error logged) since this is expected LLM behavior, not a bug

### Challenge 7: Token Economics & Free Tier Viability

**Problem:** Needed to keep the entire experience within free-tier LLM limits while maintaining quality.

**Solution:**
- Sliding window context (last 3 events only)
- Agent tick limited to one agent per turn (round-robin)
- Importance-weighted memory prevents unbounded growth
- Concise prompt engineering (Chinese prompts are more token-efficient than English for the same semantic content)
- Result: ~22K tokens per full session, well within free tier limits

### Challenge 8: Dark Theme UI Readability

**Problem:** Multiple UI issues in dark theme: dropdown options invisible, text contrast too low, auto-scroll jumping entire page.

**Solutions (commits `74b5581`, `8dd8b08`, `4bc61e0`):**
- Fixed dropdown `<option>` elements with explicit dark backgrounds
- Raised minimum text size to 12px with gray-200/300/400 color hierarchy
- Changed auto-scroll from page-level to container-level scrolling
- Added `useRef` + `useEffect` scroll-to-bottom for narrative log

---

## Prompt Engineering Deep Dive

The prompt system is the most critical engineering surface in WorldSim. Each mode has completely independent prompt templates optimized for its specific output requirements.

### World Generation Prompt

Generates the initial `WorldSchema` from a natural language theme. Key constraints:
- Strict JSON output with Chinese text
- Compact naming (2-4 characters for tiles, NPCs)
- Win condition must use location names, never coordinates
- No emoji fields (visual system auto-generates from descriptions)

### Action Response Prompts (Mode-Specific)

**Game Mode:**
- Enforces "information increment" per sentence — no pure atmosphere descriptions
- Blacklists AI cliche words: "蜿蜒", "掩映", "缕缕", "潺潺", "斑驳", "氤氲"
- Requires each step to advance one meaningful "beat" (discovery, confrontation, consequence)
- Choices must be immediately executable concrete actions

**Training Mode:**
- Harvard Business School case-study narrative style
- Absolute prohibition on physical/spatial descriptions
- Three-elements rule for choices (WHO + HOW + CONSEQUENCE)
- Mandatory `evalTags` output with 5 competency dimensions per round
- Scenario progression enforcement: new information every round, escalation every 2-3 rounds

**Simulation Mode:**
- Academic paper results-description style (objective, quantifiable)
- Decision-theory vocabulary ("triggers satisficing heuristic", "information search cost exceeds threshold")
- Empty choices array (no human intervention)
- Observable variable state appended to narrative
- Emergence must come from agent interaction superposition, not individual agent mutations

### Milestone Feedback Injection

At designated rounds, additional prompt instructions are injected requesting structured milestone markers:
```
|[MILESTONE]diagnostic content::suggestion[/MILESTONE]
```
These are parsed from the LLM output, stripped from the displayed narrative, and shown as separate feedback cards. If LLM fails to include the marker, a local fallback generates feedback from current state.

---

## Engagement Optimization

The engagement system was designed based on the principle that **shorter sessions with higher information density outperform longer sessions with padding**.

### Round Reduction Strategy

| Mode | Before | After | Rationale |
|------|--------|-------|-----------|
| Training | 15 rounds | 8 rounds | Decision fatigue sets in at ~7-8 rounds for complex scenarios |
| Simulation | 20 rounds | 12 rounds | Agent behavior patterns typically stabilize by round 10-12 |
| Game | Unlimited | Unlimited | Exploration is self-paced, no forced endpoint |

### Milestone Feedback System

Provides structured feedback at key intervals without blocking flow:

- **Training (rounds 3, 6):** Coaching-style competency diagnosis with specific improvement suggestions
- **Simulation (rounds 4, 8):** System behavior summary with emergence observations and predictions
- **Game (rounds 5, 10):** World observation hints revealing hidden mechanics or NPC relationships

### Summary Overlay (MaxSteps)

When reaching the round limit, a full-screen overlay presents:
1. Completion statistics (rounds, decisions, interactions)
2. Agent/stakeholder attitude summary with visual bars
3. Mode-specific action: Generate Report (training) / Export Data (simulation)
4. "Continue Challenge" option for users who want more

The overlay does NOT end the game — it's a checkpoint, not a wall.

---

## Headless SDK

WorldSim can be used as a pure engine without any UI, enabling enterprise integration:

```typescript
import { WorldSimEngine } from 'worldsim/engine'

const engine = new WorldSimEngine({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  mode: 'training',
  maxSteps: 8,
})

const session = await engine.createSession({
  theme: 'Customer service: angry customer with defective product',
  mode: 'training',
})

// Run actions programmatically
await session.runBatch([
  'Listen and acknowledge frustration',
  'Offer immediate replacement',
])

// Or use autopilot with custom decision function
await session.runAutopilot(state => {
  if (state.lastEvent?.metrics.agentAttitudes['customer'] < -20)
    return 'Offer generous compensation'
  return 'Continue standard procedure'
})

// Export analytics
const report = session.exportAnalytics()
```

---

## Token Economics

| Action | Input Tokens | Output Tokens | Cost (DeepSeek) |
|--------|-------------|---------------|-----------------|
| Generate World | ~800 | ~1500 | ~$0.001 |
| Per Player Action | ~600 | ~400 | ~$0.0005 |
| Agent Tick | ~300 | ~200 | ~$0.0003 |
| Full Training Session (8 rounds) | — | — | ~$0.006 |
| Full Simulation (12 rounds) | — | — | ~$0.008 |

With Gemini free tier: **45+ full sessions per day at zero cost.**

---

## Roadmap

### v0.1 — Game Demo ✅
- [x] World generation from natural language
- [x] Memory-driven NPC system (observe -> reflect -> plan -> act)
- [x] Autonomous world events
- [x] Seed hinting system
- [x] Prompt engineering transparency layer (Dev Mode)

### v0.2 — Engine Platform ✅ (Current)
- [x] Multi-scenario mode (game / training / simulation)
- [x] 7-layer deterministic Rule Engine
- [x] Agent autonomous behavior loop (round-robin)
- [x] Headless SDK mode (zero-UI programmatic API)
- [x] LLM Provider abstraction (DeepSeek / Gemini / Custom)
- [x] Training competency assessment (5 dimensions, real-time scoring)
- [x] Simulation auto-run with observable variables
- [x] Milestone feedback system (coaching / observation / exploration)
- [x] Summary overlay with report generation
- [x] Importance-weighted memory retention
- [x] Runtime configuration panel (NPC editor, world params, prompt strategy)
- [x] Session analytics & export
- [x] Auto-save & resume
- [x] Engagement optimization (round reduction, choice quality enforcement)

### v0.3 — Commercial Ready (Planned)
- [ ] REST API server wrapper (Express/Hono)
- [ ] WebSocket real-time streaming
- [ ] Multi-agent conversation (agent-to-agent dialogue)
- [ ] Plugin system for custom rule engines
- [ ] Training scenario marketplace
- [ ] Assessment report PDF export
- [ ] Multiplayer seed challenges
- [ ] Fine-tuned scoring model (replace rule-based with ML)

---

## Project Structure

```
worldsim/
├── src/
│   ├── api/
│   │   └── gemini.ts              # LLM provider abstraction layer
│   ├── engine/
│   │   ├── types.ts               # Core type definitions (WorldSchema, Agent, etc.)
│   │   ├── worldGen.ts            # World generation from natural language
│   │   ├── actionHandler.ts       # Action processing pipeline
│   │   ├── ruleEngine.ts          # 7-layer deterministic validation
│   │   ├── agentLoop.ts           # Stanford Generative Agents implementation
│   │   ├── scenarios.ts           # Mode configurations & presets
│   │   ├── prompts.ts             # Mode-specific prompt templates
│   │   ├── milestoneFeedback.ts   # Periodic engagement feedback system
│   │   ├── trainingReport.ts      # Competency assessment report generator
│   │   ├── persistence.ts         # Auto-save & session management
│   │   └── index.ts               # Headless SDK entry point
│   ├── components/
│   │   ├── App.tsx                # Root component & routing
│   │   ├── LandingHero.tsx        # Landing page with auto-save resume
│   │   ├── WorldInput.tsx         # Theme input & preset selection
│   │   ├── TrainingView.tsx       # Training mode UI (competency panel, narrative)
│   │   ├── SimulationView.tsx     # Simulation mode UI (auto-run, agent status)
│   │   ├── SummaryOverlay.tsx     # MaxSteps summary popup
│   │   ├── ActionPanel.tsx        # Player action input & choices
│   │   ├── NarrativeLog.tsx       # Event log with auto-scroll
│   │   └── ...                    # Additional UI components
│   ├── store/
│   │   └── gameStore.ts           # Zustand global state management
│   └── assets/
│       └── tiles/                 # 48x48 pixel art PNGs (17 terrain + 13 avatars)
├── examples/
│   └── headless-demo.ts           # SDK usage example
├── tests/
│   └── *.test.ts                  # Vitest test suite
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## Dev Mode (Prompt Engineering Transparency)

Click the **Dev Mode** button to open the transparency panel showing:

- Every prompt sent to the LLM (with exact token counts)
- Every JSON response received
- Latency per call
- Cumulative token usage
- Rule engine corrections applied
- Session export (JSON) for analysis

This is intentionally visible — it demonstrates the engineering behind AI product design and enables rapid prompt iteration.

---

## Academic References

- Park, J. S., et al. (2023). *Generative Agents: Interactive Simulacra of Human Behavior*. UIST 2023. [arXiv:2304.03442](https://arxiv.org/abs/2304.03442)
- Anthropic (2025). *Effective Context Engineering for AI Agents*. [anthropic.com](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Karpathy, A. (2025). *Vibe Coding* — Natural language driven software development.

---

## License

MIT — Use it, fork it, build on it.

---

<p align="center">
  <em>Built as a demonstration of AI-native product architecture, context engineering, and generative agent systems.</em>
</p>
