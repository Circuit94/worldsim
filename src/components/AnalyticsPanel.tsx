/**
 * WorldSim — Analytics Dashboard
 * 
 * Visualizes session data to demonstrate commercial value:
 * - Behavior heatmap (where player spent time)
 * - NPC attitude timeline (relationship dynamics)
 * - Decision pattern analysis
 * - Token efficiency metrics
 * 
 * This is the "why enterprises would pay" component.
 */

import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'

export default function AnalyticsPanel() {
  const { world, player, narrativeLog, debugLogs, totalTokensUsed } = useGameStore()

  const analytics = useMemo(() => {
    if (!world || !player) return null

    // Calculate movement heatmap
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0))
    const actionHistory = narrativeLog
      .filter(l => l.text.startsWith('> '))
      .map(l => l.text.slice(2))

    // Track position changes through narrative
    if (player.position) {
      heatmap[player.position[1]][player.position[0]] += 1
    }

    // Agent attitude over time
    const attitudeTimeline = world.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      attitude: agent.memory.attitude,
      observations: agent.memory.observations.length,
      reflections: agent.memory.reflections.length,
      plan: agent.memory.currentPlan,
    }))

    // Decision categorization
    const decisionTypes = categorizeDecisions(actionHistory)

    // Token efficiency
    const avgTokensPerAction = debugLogs.length > 0
      ? Math.round(totalTokensUsed / debugLogs.length)
      : 0

    const actionCalls = debugLogs.filter(d => d.type === 'action').length
    const agentCalls = debugLogs.filter(d => d.type === 'agent_tick').length
    const avgLatency = debugLogs.length > 0
      ? Math.round(debugLogs.reduce((sum, d) => sum + d.latencyMs, 0) / debugLogs.length)
      : 0

    return {
      heatmap,
      attitudeTimeline,
      decisionTypes,
      avgTokensPerAction,
      actionCalls,
      agentCalls,
      avgLatency,
      totalActions: actionHistory.length,
      rulesTriggered: world.rules.filter(r => r.fired).length,
      totalRules: world.rules.length,
    }
  }, [world, player, narrativeLog, debugLogs, totalTokensUsed])

  if (!analytics) return null

  return (
    <div className="space-y-4 p-4 bg-gray-950 rounded-lg border border-gray-800">
      <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
        📊 Session Analytics
        <span className="text-[10px] text-gray-600 font-normal">Real-time behavior data</span>
      </h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Actions" value={analytics.totalActions} />
        <MetricCard label="Avg Latency" value={`${analytics.avgLatency}ms`} />
        <MetricCard label="Tokens/Action" value={analytics.avgTokensPerAction} />
        <MetricCard label="Rules Fired" value={`${analytics.rulesTriggered}/${analytics.totalRules}`} />
      </div>

      {/* Agent Relationship Map */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Agent Relationships</p>
        {analytics.attitudeTimeline.map(agent => (
          <div key={agent.id} className="flex items-center gap-2 text-xs">
            <span className="w-5">{agent.emoji}</span>
            <span className="w-20 truncate text-gray-400">{agent.name}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 ${
                  agent.attitude > 0 ? 'bg-green-500' : agent.attitude < 0 ? 'bg-red-500' : 'bg-gray-600'
                }`}
                style={{
                  width: `${Math.abs(agent.attitude) / 2}%`,
                  marginLeft: agent.attitude >= 0 ? '50%' : `${50 - Math.abs(agent.attitude) / 2}%`,
                }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-gray-600" />
            </div>
            <span className={`w-8 text-right font-mono ${
              agent.attitude > 0 ? 'text-green-400' : agent.attitude < 0 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {agent.attitude > 0 ? '+' : ''}{agent.attitude}
            </span>
          </div>
        ))}
      </div>

      {/* Decision Pattern */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Decision Patterns</p>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(analytics.decisionTypes).map(([type, count]) => (
            <span
              key={type}
              className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-400"
            >
              {getDecisionIcon(type)} {type}: {count as number}
            </span>
          ))}
        </div>
      </div>

      {/* API Call Breakdown */}
      <div className="space-y-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">API Efficiency</p>
        <div className="flex gap-3 text-[10px] text-gray-500">
          <span>🎯 Player actions: {analytics.actionCalls}</span>
          <span>🤖 Agent ticks: {analytics.agentCalls}</span>
          <span>⚡ Total tokens: {totalTokensUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* Mini Heatmap */}
      <div className="space-y-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Position Heatmap</p>
        <div className="grid grid-cols-7 gap-px">
          {analytics.heatmap.flat().map((val, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: val > 0
                  ? `rgba(168, 85, 247, ${Math.min(val * 0.3, 1)})`
                  : 'rgba(31, 41, 55, 0.5)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 bg-gray-900 rounded-lg border border-gray-800">
      <div className="text-sm font-mono text-purple-300">{value}</div>
      <div className="text-[9px] text-gray-600 uppercase">{label}</div>
    </div>
  )
}

function categorizeDecisions(actions: string[]): Record<string, number> {
  const categories: Record<string, number> = {}
  
  for (const action of actions) {
    const lower = action.toLowerCase()
    let type = 'other'
    
    if (lower.includes('talk') || lower.includes('ask') || lower.includes('say') || lower.includes('speak')) {
      type = 'social'
    } else if (lower.includes('look') || lower.includes('examine') || lower.includes('search') || lower.includes('inspect')) {
      type = 'explore'
    } else if (lower.includes('move') || lower.includes('go') || lower.includes('walk') || lower.includes('enter')) {
      type = 'navigate'
    } else if (lower.includes('attack') || lower.includes('fight') || lower.includes('hit') || lower.includes('defend')) {
      type = 'combat'
    } else if (lower.includes('take') || lower.includes('grab') || lower.includes('pick') || lower.includes('use')) {
      type = 'interact'
    } else if (lower.includes('wait') || lower.includes('rest') || lower.includes('hide')) {
      type = 'passive'
    }

    categories[type] = (categories[type] || 0) + 1
  }

  return categories
}

function getDecisionIcon(type: string): string {
  const icons: Record<string, string> = {
    social: '💬',
    explore: '🔍',
    navigate: '🚶',
    combat: '⚔️',
    interact: '🤚',
    passive: '⏸️',
    other: '❓',
  }
  return icons[type] || '❓'
}
