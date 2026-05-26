# 🌍 WorldSim — AI World Simulation Engine

> **Generate interactive worlds with memory-driven agents, causal events, and emergent narratives using LLMs.**

WorldSim is an open-source AI world simulation engine that transforms natural language descriptions into fully interactive, explorable worlds. It's not just a game — it's a **universal simulation framework** where the same engine powers games, training simulations, behavior modeling, and product testing.

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![AI](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange)
![Architecture](https://img.shields.io/badge/Architecture-Generative_Agents-purple)
![Visuals](https://img.shields.io/badge/Visuals-Pixel_Art_Tiles-green)

## 🎨 Visual System

WorldSim features a custom **pixel-art visual system** — no emoji, no CSS hacks. Every terrain tile and character avatar is a pre-generated 48×48 PNG with hand-crafted pixel art aesthetics:

**17 Terrain Tiles** — Forest, Grass, Water, Mountain, Desert, Lava, Ice, Swamp, Cave, Building, Village, Road, Corridor, Ruin, Tech, Default, Unwalkable

**13 Character Avatars** — Warrior, Mage, Merchant, Villager, Guard, Thief, Scholar, Elder, Robot, Monster, Princess, Healer, Player

The engine uses intelligent **keyword matching** to assign visuals based on AI-generated descriptions. A tile described as "dense pine forest with morning mist" automatically renders with the forest tile; an NPC described as "a wise old herbalist" gets the healer avatar. Hash-based fallback ensures every entity always has a unique, deterministic visual.

## ✨ What Makes This Different

| Feature | Traditional AI Games | WorldSim Engine |
|---------|---------------------|-----------------|
| **NPC Intelligence** | Stateless responses | **Memory-driven agents** with observations, attitudes & goals |
| **World Evolution** | Static until player acts | **Autonomous world events** — the world evolves independently |
| **Architecture** | Monolithic app | **Pluggable engine** — same core powers different scenario types |
| **Transparency** | Black box | **Full prompt engineering visibility** via Dev Mode |
| **Reproducibility** | Random each time | **Seed-based worlds** — share & compare different playthroughs |
| **Data Export** | None | **Session behavior logs** for analysis and modeling |

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorldSim Engine (Core)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │ World Schema│   │  Agent Memory     │   │   Event Bus     │  │
│  │   (DSL)     │   │  System           │   │   (Causal)      │  │
│  │             │   │                    │   │                 │  │
│  │ • Tile Map  │   │ • Observation      │   │ • World Rules   │  │
│  │ • Entities  │   │ • Reflection       │   │ • Auto Events   │  │
│  │ • Rules     │   │ • Attitude Track   │   │ • Triggers      │  │
│  │ • Items     │   │ • Goal Planning    │   │ • Side Effects  │  │
│  └─────────────┘   └──────────────────┘   └─────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Scenario Layer                               │
│                                                                   │
│  ┌──────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │  Game    │  │   Training    │  │  User Behavior         │   │
│  │  Demo    │  │   Sandbox     │  │  Simulator             │   │
│  │ (v0.1)  │  │  (planned)    │  │  (planned)             │   │
│  └──────────┘  └───────────────┘  └────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                   Renderer (Pluggable)                            │
│  Pixel Art Grid (current) │ Terminal ASCII │ 3D (future) │ API-only│
└─────────────────────────────────────────────────────────────────┘
```

### Core Design Principles

1. **Structured Output Engineering** — All AI outputs are constrained to JSON schemas, ensuring deterministic parsing and zero hallucination in game state
2. **Sliding Window Context** — Only the last 3 events are passed to the LLM, keeping token costs O(1) per action regardless of game length
3. **Memory-Driven Agents** — Inspired by [Stanford's Generative Agents](https://arxiv.org/abs/2304.03442) (Park et al., 2023): agents observe → store → reflect → plan
4. **Seed Reproducibility** — Same theme + seed = same world structure, enabling A/B comparisons and social sharing
5. **Token-Aware Design** — Every architectural decision optimizes for minimal token consumption while maximizing emergent behavior

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev/) (free tier is sufficient)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/worldsim.git
cd worldsim
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

Or enter the API key directly in the UI (it stays in your browser, never sent to any server except Google's API).

### Run

```bash
npm run dev
```

Open http://localhost:5173 — describe a world, and enter it.

## 💡 Usage Examples

### As a Game (Demo #1)
```
Theme: "An abandoned space station where the AI has gone rogue"
→ Generates a 7x7 station map with hostile/friendly NPCs, key cards, locked doors
→ NPCs remember your actions and form alliances or grudges
→ World events: power outages, hull breaches, AI announcements
```

### As a Training Sandbox
```
Theme: "A busy hospital ER on a Friday night — you are a new resident"
→ Patient NPCs arrive with symptoms, nurses have limited patience
→ Your decisions affect patient outcomes and team trust
→ Export session data for training assessment
```

### As a Behavior Simulator
```
Theme: "An e-commerce checkout flow — simulate 5 different user personas"
→ Each 'agent' navigates the flow differently based on personality
→ Rational users optimize, emotional users abandon on friction
→ Export behavior patterns for UX analysis
```

### As a Headless SDK (Enterprise Integration)
```typescript
import { WorldSimEngine } from 'worldsim/engine'

const engine = new WorldSimEngine({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash',
  mode: 'training',
  maxSteps: 20,
})

// Create simulation programmatically
const session = await engine.createSession({
  theme: 'Customer service: angry customer with defective product',
  mode: 'training',
})

// Run actions in batch (no UI needed)
await session.runBatch([
  'Listen and acknowledge frustration',
  'Offer immediate replacement',
])

// Or use autopilot with custom AI decision function
await session.runAutopilot(state => {
  if (state.lastEvent?.metrics.agentAttitudes['customer'] < -20)
    return 'Offer generous compensation'
  return 'Continue standard procedure'
})

// Export analytics for reporting
const report = session.exportAnalytics()
console.log(report.agentBehaviorSummary)
console.log(report.decisionPatterns)
```

## 🔬 Dev Mode (Prompt Engineering Transparency)

Click the **🔬 Dev Mode** button to open the transparency panel. It shows:

- Every prompt sent to the LLM (with exact token counts)
- Every JSON response received
- Latency per call
- Cumulative token usage
- Session export (JSON) for analysis

This is intentionally visible — it demonstrates the engineering behind AI product design.

## 📊 Token Economics

| Action | Input Tokens | Output Tokens | Cost (Gemini Flash Free) |
|--------|-------------|---------------|-------------------------|
| Generate World | ~800 | ~1500 | $0.00 |
| Per Player Action | ~600 | ~400 | $0.00 |
| Full Session (20 steps) | — | — | ~22K tokens total, $0.00 |

**Free tier supports ~45+ full game sessions per day.** No credit card required.

## 🗺️ Roadmap & Commercial Potential

### v0.1 — Game Demo ✅
- [x] World generation from natural language
- [x] Memory-driven NPC system (observe → reflect → plan → act)
- [x] Autonomous world events
- [x] Seed-based reproducible worlds
- [x] Prompt engineering transparency layer

### v0.2 (Current) — Engine Platform ✅
- [x] Multi-scenario mode (game / training / simulation)
- [x] Deterministic Rule Engine (LLM output validation layer)
- [x] Agent autonomous behavior loop (round-robin per turn)
- [x] Headless SDK mode (zero-UI programmatic API)
- [x] Batch simulation & autopilot mode
- [x] Session analytics dashboard
- [x] Keyboard shortcuts & save/load system
- [x] A/B testing support (same seed, different strategies)

### v0.3 — Commercial Ready (Planned)
- [ ] REST API server wrapper (Express/Hono)
- [ ] WebSocket real-time streaming
- [ ] Training assessment scoring system
- [ ] Multi-agent conversation (agent-to-agent dialogue)
- [ ] Plugin system for custom rule engines
- [ ] Multiplayer seed challenges

### Comparable Companies / Validation
- **Artificial Societies** (YC W25, $5.35M) — AI persona simulation for product testing
- **AgentHub** (YC S25) — Simulation environments for testing AI agents
- **InZOI** — Life simulation with AI-powered emergent NPC behavior
- **Stanford Generative Agents** (2023) — Academic foundation for memory-driven AI characters

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + Vite 6 | Fast HMR, modern DX |
| Styling | Tailwind CSS 4 | Utility-first, zero runtime |
| State | Zustand | Minimal boilerplate, immutable updates |
| AI | Google Gemini 2.5 Flash | Free tier, JSON mode, fast inference |
| Types | TypeScript 5.6 | Full type safety for world schema |
| Deploy | Vercel / any static host | Zero config, free |

## 📚 Academic References

- Park, J. S., et al. (2023). *Generative Agents: Interactive Simulacra of Human Behavior*. UIST 2023. [arXiv:2304.03442](https://arxiv.org/abs/2304.03442)
- Anthropic (2025). *Effective Context Engineering for AI Agents*. [anthropic.com](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Karpathy, A. (2025). *Vibe Coding* — Natural language driven software development.

## 📄 License

MIT — Use it, fork it, build on it.

---

<p align="center">
  <em>Built as a demonstration of AI-native product architecture, context engineering, and generative agent systems.</em>
</p>
