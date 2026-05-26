/**
 * WorldSim — 会话分析面板
 * 
 * 可视化会话数据，展示商业价值：
 * - 行为热力图（玩家在哪里停留最多）
 * - NPC 态度变化（关系动态）
 * - 决策模式分析
 * - Token 效率指标
 */

import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'

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
      agentId: agent.id,
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
        ◆ 会话分析
        <span className="text-[10px] text-gray-600 font-normal">实时行为数据</span>
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
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">角色关系</p>
        {analytics.attitudeTimeline.map(agent => (
          <div key={agent.id} className="flex items-center gap-2 text-xs">
            <AgentDot name={agent.name} agentId={agent.agentId} />
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

      {/* 决策模式 */}
      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">决策模式</p>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(analytics.decisionTypes).map(([type, count]) => (
            <span
              key={type}
              className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-400"
            >
              {getDecisionIcon(type)} {getDecisionLabel(type)}: {count as number}
            </span>
          ))}
        </div>
      </div>

      {/* API 调用效率 */}
      <div className="space-y-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">API 效率</p>
        <div className="flex gap-3 text-[10px] text-gray-500">
          <span>▸ 玩家行动: {analytics.actionCalls}</span>
          <span>▸ 智能体自主: {analytics.agentCalls}</span>
          <span>▸ 总 Token: {totalTokensUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* 热力图 */}
      <div className="space-y-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">位置热力图</p>
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
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>
  )
}

function categorizeDecisions(actions: string[]): Record<string, number> {
  const categories: Record<string, number> = {}
  
  for (const action of actions) {
    const lower = action.toLowerCase()
    let type = 'other'
    
    // 中英文关键词匹配
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
      className="w-5 h-5 rounded-full border object-cover shrink-0"
      style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
    />
  )
}

function getDecisionIcon(type: string): string {
  const icons: Record<string, string> = {
    social: '◇',
    explore: '○',
    navigate: '→',
    combat: '×',
    interact: '□',
    passive: '·',
    other: '?',
  }
  return icons[type] || '?'
}

function getDecisionLabel(type: string): string {
  const labels: Record<string, string> = {
    social: '社交',
    explore: '探索',
    navigate: '移动',
    combat: '战斗',
    interact: '交互',
    passive: '等待',
    other: '其他',
  }
  return labels[type] || '其他'
}
