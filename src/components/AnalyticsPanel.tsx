/**
 * WorldSim — 会话分析面板 v2
 * 玻璃态设计，统一色调
 */

import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'

export default function AnalyticsPanel() {
  const { world, player, narrativeLog, debugLogs, totalTokensUsed } = useGameStore()

  const analytics = useMemo(() => {
    if (!world || !player) return null

    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0))
    const actionHistory = narrativeLog
      .filter(l => l.text.startsWith('> '))
      .map(l => l.text.slice(2))

    if (player.position) {
      heatmap[player.position[1]][player.position[0]] += 1
    }

    const attitudeTimeline = world.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      agentId: agent.id,
      attitude: agent.memory.attitude,
      observations: agent.memory.observations.length,
      reflections: agent.memory.reflections.length,
      plan: agent.memory.currentPlan,
    }))

    const decisionTypes = categorizeDecisions(actionHistory)

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
    <div className="glass-card rounded-2xl p-5 space-y-5">
      <h3 className="text-sm font-medium text-[var(--ws-text-primary)] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        会话分析
        <span className="text-[10px] text-[var(--ws-text-muted)] font-normal">实时行为数据</span>
      </h3>

      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="行动次数" value={analytics.totalActions} />
        <MetricCard label="平均延迟" value={`${analytics.avgLatency}ms`} />
        <MetricCard label="Token/次" value={analytics.avgTokensPerAction} />
        <MetricCard label="规则触发" value={`${analytics.rulesTriggered}/${analytics.totalRules}`} />
      </div>

      {/* 角色关系图 */}
      <div className="space-y-2">
        <p className="text-[10px] text-[var(--ws-text-muted)] uppercase tracking-wider">角色关系</p>
        {analytics.attitudeTimeline.map(agent => (
          <div key={agent.id} className="flex items-center gap-2 text-xs h-6">
            <div className="shrink-0 w-5 h-5">
              <AgentDot name={agent.name} agentId={agent.agentId} />
            </div>
            <span className="shrink-0 w-12 truncate text-[var(--ws-text-secondary)]">{agent.name}</span>
            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden relative min-w-0">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  agent.attitude > 0 ? 'bg-emerald-500' : agent.attitude < 0 ? 'bg-red-500' : 'bg-gray-600'
                }`}
                style={{
                  width: `${Math.abs(agent.attitude) / 2}%`,
                  marginLeft: agent.attitude >= 0 ? '50%' : `${50 - Math.abs(agent.attitude) / 2}%`,
                }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.08]" />
            </div>
            <span className={`shrink-0 w-8 text-right font-mono text-[11px] ${
              agent.attitude > 0 ? 'text-emerald-400' : agent.attitude < 0 ? 'text-red-400' : 'text-[var(--ws-text-muted)]'
            }`}>
              {agent.attitude > 0 ? '+' : ''}{agent.attitude}
            </span>
          </div>
        ))}
      </div>

      {/* 决策模式 */}
      <div className="space-y-2">
        <p className="text-[10px] text-[var(--ws-text-muted)] uppercase tracking-wider">决策模式</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(analytics.decisionTypes).map(([type, count]) => (
            <span
              key={type}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[var(--ws-text-secondary)]"
            >
              {getDecisionIcon(type)} {getDecisionLabel(type)}: {count as number}
            </span>
          ))}
        </div>
      </div>

      {/* API 调用效率 */}
      <div className="space-y-1">
        <p className="text-[10px] text-[var(--ws-text-muted)] uppercase tracking-wider">API 效率</p>
        <div className="flex gap-3 text-[10px] text-[var(--ws-text-muted)]">
          <span>▸ 玩家行动: {analytics.actionCalls}</span>
          <span>▸ 智能体自主: {analytics.agentCalls}</span>
          <span>▸ 总 Token: {totalTokensUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* 热力图 */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[var(--ws-text-muted)] uppercase tracking-wider">位置热力图</p>
        <div className="grid grid-cols-7 gap-px">
          {analytics.heatmap.flat().map((val, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: val > 0
                  ? `rgba(139, 92, 246, ${Math.min(val * 0.3, 1)})`
                  : 'rgba(255, 255, 255, 0.02)',
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
    <div className="text-center p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div className="text-sm font-mono text-purple-300">{value}</div>
      <div className="text-[9px] text-[var(--ws-text-muted)] mt-0.5">{label}</div>
    </div>
  )
}

function categorizeDecisions(actions: string[]): Record<string, number> {
  const categories: Record<string, number> = {}
  
  for (const action of actions) {
    const lower = action.toLowerCase()
    let type = 'other'
    
    if (lower.includes('talk') || lower.includes('ask') || lower.includes('say') || lower.includes('speak') || lower.includes('交谈') || lower.includes('问') || lower.includes('说') || lower.includes('对话')) {
      type = 'social'
    } else if (lower.includes('look') || lower.includes('examine') || lower.includes('search') || lower.includes('inspect') || lower.includes('查看') || lower.includes('观察') || lower.includes('搜索') || lower.includes('检查')) {
      type = 'explore'
    } else if (lower.includes('move') || lower.includes('go') || lower.includes('walk') || lower.includes('enter') || lower.includes('前往') || lower.includes('走') || lower.includes('进入') || lower.includes('移动')) {
      type = 'navigate'
    } else if (lower.includes('attack') || lower.includes('fight') || lower.includes('hit') || lower.includes('defend') || lower.includes('攻击') || lower.includes('打') || lower.includes('战斗') || lower.includes('防御')) {
      type = 'combat'
    } else if (lower.includes('take') || lower.includes('grab') || lower.includes('pick') || lower.includes('use') || lower.includes('拿') || lower.includes('捡') || lower.includes('使用') || lower.includes('拾取')) {
      type = 'interact'
    } else if (lower.includes('wait') || lower.includes('rest') || lower.includes('hide') || lower.includes('等待') || lower.includes('休息') || lower.includes('躲藏')) {
      type = 'passive'
    }

    categories[type] = (categories[type] || 0) + 1
  }

  return categories
}

function AgentDot({ name, agentId }: { name: string; agentId: string }) {
  const visual = getAgentVisual(name, agentId)
  return (
    <img
      src={visual.avatarUrl}
      alt={visual.initial}
      className="w-5 h-5 rounded-full border object-cover block"
      style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
    />
  )
}

function getDecisionIcon(type: string): string {
  const icons: Record<string, string> = {
    social: '◇', explore: '○', navigate: '→', combat: '×', interact: '□', passive: '·', other: '?',
  }
  return icons[type] || '?'
}

function getDecisionLabel(type: string): string {
  const labels: Record<string, string> = {
    social: '社交', explore: '探索', navigate: '移动', combat: '战斗', interact: '交互', passive: '等待', other: '其他',
  }
  return labels[type] || '其他'
}
