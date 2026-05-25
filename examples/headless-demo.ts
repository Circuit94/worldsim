/**
 * WorldSim Headless SDK — Demo Script
 * 
 * This demonstrates how WorldSim can be used as a programmable engine
 * WITHOUT any UI, enabling:
 * 
 * 1. Enterprise Training Platforms: Automatically simulate onboarding scenarios
 * 2. Behavioral Research: Batch-run 100 simulations with different parameters
 * 3. AI Agent Testing: Use autopilot mode to test custom decision functions
 * 4. CI/CD Integration: Run behavioral regression tests in a pipeline
 * 
 * Usage:
 *   npx tsx examples/headless-demo.ts
 */

import { WorldSimEngine } from '../src/engine/sdk'
import type { AutopilotState, AnalyticsReport } from '../src/engine/sdk'

// ============================================================
// Example 1: Basic Simulation Run
// ============================================================

async function basicDemo() {
  console.log('═══════════════════════════════════════════')
  console.log(' WorldSim SDK — Basic Headless Demo')
  console.log('═══════════════════════════════════════════\n')

  const engine = new WorldSimEngine({
    apiKey: process.env.GEMINI_API_KEY || 'YOUR_API_KEY',
    model: 'gemini-2.0-flash',
    mode: 'training',
    maxSteps: 20,
    onStep: (event) => {
      console.log(`  [Step ${event.step}] ${event.action}`)
      console.log(`  → ${event.narrative}`)
      if (event.agentTick) {
        console.log(`  🤖 ${event.agentTick.agentId}: ${event.agentTick.action}`)
      }
      console.log(`  📊 Tokens: ${event.metrics.tokensUsed} | Latency: ${event.metrics.latencyMs}ms`)
      console.log()
    },
    onError: (err) => {
      console.error(`  ❌ [${err.code}] ${err.message}`)
    },
  })

  // Create a training session
  console.log('🌍 Creating world: "Corporate team conflict resolution"...\n')
  const session = await engine.createSession({
    theme: 'A corporate training scenario where a new manager must resolve conflict between two senior engineers who disagree on architecture decisions',
    mode: 'training',
  })

  console.log(`✅ World created: ${session.currentWorld.name}`)
  console.log(`   Agents: ${session.currentWorld.agents.map(a => a.name).join(', ')}`)
  console.log(`   Rules: ${session.currentWorld.rules.length}`)
  console.log()

  // Run a sequence of actions
  const actions = [
    'Observe the team dynamics quietly',
    'Ask Engineer A about their architecture proposal',
    'Ask Engineer B for their perspective',
    'Propose a compromise that combines both approaches',
    'Schedule a collaborative design session for next week',
  ]

  console.log('▸ Running batch simulation...\n')
  const results = await session.runBatch(actions)

  // Export analytics
  const report = session.exportAnalytics()
  printReport(report)
}

// ============================================================
// Example 2: Autopilot Mode (AI decides actions)
// ============================================================

async function autopilotDemo() {
  console.log('\n═══════════════════════════════════════════')
  console.log(' WorldSim SDK — Autopilot Mode')
  console.log('═══════════════════════════════════════════\n')

  const engine = new WorldSimEngine({
    apiKey: process.env.GEMINI_API_KEY || 'YOUR_API_KEY',
    model: 'gemini-2.0-flash',
    mode: 'simulation',
    maxSteps: 10,
  })

  const session = await engine.createSession({
    theme: 'A behavioral simulation of a marketplace where buyers and sellers negotiate prices',
    mode: 'simulation',
  })

  console.log(`🌍 World: ${session.currentWorld.name}\n`)

  // Custom decision function — an "AI player" that always tries to negotiate
  const negotiatorAgent = async (state: AutopilotState): Promise<string> => {
    const attitudes = state.lastEvent?.metrics.agentAttitudes || {}
    const avgAttitude = Object.values(attitudes).reduce((s, v) => s + v, 0) / 
                       (Object.values(attitudes).length || 1)

    // Strategy: be more aggressive when attitudes are high, more careful when low
    if (avgAttitude > 30) {
      return 'Drive a hard bargain on the current deal'
    } else if (avgAttitude < -20) {
      return 'Offer a generous concession to rebuild trust'
    } else {
      return 'Explore the marketplace and look for opportunities'
    }
  }

  const results = await session.runAutopilot(negotiatorAgent, 10)
  console.log(`Completed ${results.length} autopilot steps`)
  
  const report = session.exportAnalytics()
  printReport(report)
}

// ============================================================
// Example 3: Batch Comparison (A/B Testing Behavior)
// ============================================================

async function batchComparisonDemo() {
  console.log('\n═══════════════════════════════════════════')
  console.log(' WorldSim SDK — Batch A/B Testing')
  console.log('═══════════════════════════════════════════\n')

  const engine = new WorldSimEngine({
    apiKey: process.env.GEMINI_API_KEY || 'YOUR_API_KEY',
    model: 'gemini-2.0-flash',
    maxSteps: 5,
  })

  const theme = 'Customer service scenario: angry customer calling about a defective product'

  // Strategy A: Empathetic approach
  const strategyA = ['Listen carefully and acknowledge their frustration',
                     'Apologize sincerely for the inconvenience',
                     'Offer immediate replacement with express shipping']

  // Strategy B: Procedural approach
  const strategyB = ['Ask for the order number and verify the account',
                     'Explain the standard return policy and timeline',
                     'Process the return request through standard channels']

  console.log('Running Strategy A (Empathetic)...')
  const sessionA = await engine.createSession({ theme, seed: 'comparison-seed-v1', mode: 'training' })
  await sessionA.runBatch(strategyA)
  const reportA = sessionA.exportAnalytics()

  console.log('Running Strategy B (Procedural)...')
  const sessionB = await engine.createSession({ theme, seed: 'comparison-seed-v1', mode: 'training' })
  await sessionB.runBatch(strategyB)
  const reportB = sessionB.exportAnalytics()

  // Compare
  console.log('\n📊 Comparison Results:')
  console.log('┌─────────────────────────────────────────────────────┐')
  console.log(`│ Strategy A (Empathetic):                            │`)
  console.log(`│   Avg Agent Attitude: ${avgAttitude(reportA).toFixed(1).padStart(6)}                        │`)
  console.log(`│   Total Tokens: ${reportA.totalTokens.toString().padStart(6)}                             │`)
  console.log('├─────────────────────────────────────────────────────┤')
  console.log(`│ Strategy B (Procedural):                            │`)
  console.log(`│   Avg Agent Attitude: ${avgAttitude(reportB).toFixed(1).padStart(6)}                        │`)
  console.log(`│   Total Tokens: ${reportB.totalTokens.toString().padStart(6)}                             │`)
  console.log('└─────────────────────────────────────────────────────┘')
}

// ============================================================
// Utilities
// ============================================================

function printReport(report: AnalyticsReport) {
  console.log('\n┌─── Analytics Report ───────────────────────────────┐')
  console.log(`│ Session: ${report.sessionId.padEnd(40)} │`)
  console.log(`│ Mode: ${report.mode.padEnd(12)} Theme: ${report.theme.slice(0, 22).padEnd(22)} │`)
  console.log(`│ Steps: ${report.totalSteps.toString().padEnd(5)} Outcome: ${report.outcome.padEnd(21)} │`)
  console.log(`│ Tokens: ${report.totalTokens.toString().padEnd(8)} (${report.avgTokensPerStep}/step)${' '.repeat(18)}│`)
  console.log(`│ Avg Latency: ${report.avgLatencyMs}ms${' '.repeat(35)}│`)
  console.log('├─── Agent Behavior ─────────────────────────────────┤')
  for (const agent of report.agentBehaviorSummary) {
    console.log(`│ ${agent.name.padEnd(15)} attitude: ${agent.finalAttitude.toString().padStart(4)} │ actions: ${agent.totalActions} │`)
  }
  console.log('├─── Decision Patterns ──────────────────────────────┤')
  for (const [type, count] of Object.entries(report.decisionPatterns)) {
    console.log(`│ ${type.padEnd(12)}: ${'█'.repeat(count).padEnd(20)} (${count})${' '.repeat(15)}│`)
  }
  console.log('└────────────────────────────────────────────────────┘')
}

function avgAttitude(report: AnalyticsReport): number {
  const attitudes = report.agentBehaviorSummary.map(a => a.finalAttitude)
  return attitudes.reduce((s, v) => s + v, 0) / (attitudes.length || 1)
}

// ============================================================
// Run
// ============================================================

async function main() {
  try {
    await basicDemo()
    // Uncomment to run additional demos:
    // await autopilotDemo()
    // await batchComparisonDemo()
  } catch (error) {
    console.error('Demo failed:', error)
  }
}

main()
