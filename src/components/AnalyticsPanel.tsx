/**
 * WorldSim — Analytics Panel v5 (Cyber Glass Dark + Lucide Icons + Contrast)
 */

import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'
import { MessageCircle, Search, Navigation, Swords, Hand, Pause, HelpCircle, Activity, Play, Bot, Coins } from 'lucide-react'

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
    <div className="ws-card rounded-2xl p-5 space-y-5">
      <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
        <Activity size={14} className="text-indigo-400" />
        会话分析
        <span className="text-[10px] text-white/40 font-normal">实时行为数据</span>
      </h3>

      {/* Core metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="行动次数" value={analytics.totalActions} />
        <MetricCard label="平均延迟" value={`${analytics.avgLatency}ms`} />
        <MetricCard label="Token/次" value={analytics.avgTokensPerAction} />
        <MetricCard label="规则触发" value={`${analytics.rulesTriggered}/${analytics.totalRules}`} />
      </div>

      {/* Agent relationships */}
      <div className="space-y-2">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">角色关系</p>
        {analytics.attitudeTimeline.map(agent => (
          <div key={agent.id} className="flex items-center gap-2 text-xs h-6">
            <div className="shrink-0 w-5 h-5">
              <AgentDot name={agent.name} agentId={agent.agentId} />
            </div>
            <span className="shrink-0 w-12 truncate text-white/70">{agent.name}</span>
            <div
              className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative min-w-0"
              role="progressbar"
              aria-valuenow={agent.attitude}
              aria-valuemin={-100}
              aria-valuemax={100}
              aria-label={`${agent.name} 态度 ${agent.attitude}`}
            >
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  agent.attitude > 0 ? 'bg-emerald-400' : agent.attitude < 0 ? 'bg-red-400' : 'bg-white/20'
                }`}
                style={{
                  width: `${Math.abs(agent.attitude) / 2}%`,
                  marginLeft: agent.attitude >= 0 ? '50%' : `${50 - Math.abs(agent.attitude) / 2}%`,
                }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
            </div>
            <span className={`shrink-0 w-8 text-right font-mono text-[11px] ${
              agent.attitude > 0 ? 'text-emerald-400' : agent.attitude < 0 ? 'text-red-400' : 'text-white/40'
            }`}>
              {agent.attitude > 0 ? '+' : ''}{agent.attitude}
            </span>
          </div>
        ))}
      </div>

      {/* Decision patterns */}
      <div className="space-y-2">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">决策模式</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(analytics.decisionTypes).map(([type, count]) => (
            <span
              key={type}
              className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-white/60 flex items-center gap-1"
            >
              {getDecisionIconComponent(type)}
              {getDecisionLabel(type)}: {count as number}
            </span>
          ))}
        </div>
      </div>

      {/* API efficiency */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">API 效率</p>
        <div className="flex flex-wrap gap-3 text-[10px] text-white/50">
          <span className="flex items-center gap-1">
            <Play size={8} className="text-white/40" /> 玩家行动: {analytics.actionCalls}
          </span>
          <span className="flex items-center gap-1">
            <Bot size={8} className="text-white/40" /> 智能体自主: {analytics.agentCalls}
          </span>
          <span className="flex items-center gap-1">
            <Coins size={8} className="text-white/40" /> 总 Token: {totalTokensUsed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">位置热力图</p>
        <div className="grid grid-cols-7 gap-px w-fit" role="img" aria-label="玩家位置热力图">
          {analytics.heatmap.flat().map((val, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: val > 0
                  ? `rgba(129, 140, 248, ${Math.min(val * 0.3, 1)})`
                  : 'rgba(255, 255, 255, 0.04)',
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
    <div className="text-center p-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08]">
      <div className="text-sm font-mono text-indigo-300">{value}</div>
      <div className="text-[9px] text-white/40 mt-0.5">{label}</div>
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
    } else if (lower.includes('wait') || lower.includes('rest') || lower.includes('hide') || lower.includes('等待') || lower.includes('休息') || lower.includes('蹲藏')) {
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

function getDecisionIconComponent(type: string) {
  const size = 10
  const cls = "text-white/40"
  switch (type) {
    case 'social': return <MessageCircle size={size} className={cls} />
    case 'explore': return <Search size={size} className={cls} />
    case 'navigate': return <Navigation size={size} className={cls} />
    case 'combat': return <Swords size={size} className={cls} />
    case 'interact': return <Hand size={size} className={cls} />
    case 'passive': return <Pause size={size} className={cls} />
    default: return <HelpCircle size={size} className={cls} />
  }
}

function getDecisionLabel(type: string): string {
  const labels: Record<string, string> = {
    social: '社交', explore: '探索', navigate: '移动', combat: '战斗', interact: '交互', passive: '等待', other: '其他',
  }
  return labels[type] || '其他'
}
