/**
 * SimulationView v2 (Cyber Glass Dark Theme)
 * Multi-agent simulation observation dashboard
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'
import MilestoneFeedbackCard from './MilestoneFeedback'

export default function SimulationView() {
  const { world, player, narrativeLog, isProcessing, performAction, phase, exportSession } = useGameStore()
  const [autoRunning, setAutoRunning] = useState(false)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [showExport, setShowExport] = useState(false)
  const autoRef = useRef<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  
  if (!world || !player) return null

  const stepCount = player.steps
  const maxSteps = 12
  const progressPercent = (stepCount / maxSteps) * 100

  useEffect(() => {
    if (autoRunning && !isProcessing && phase === 'playing' && stepCount < maxSteps) {
      const delay = speed === 'slow' ? 4000 : speed === 'normal' ? 2000 : 800
      autoRef.current = window.setTimeout(() => {
        performAction('__AUTO_TICK__')
      }, delay)
    }
    if (stepCount >= maxSteps && autoRunning) {
      setAutoRunning(false)
    }
    return () => { if (autoRef.current) clearTimeout(autoRef.current) }
  }, [autoRunning, isProcessing, phase, stepCount])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [narrativeLog.length])

  const metrics = parseSimMetrics(narrativeLog)

  const handleExport = () => {
    const data = exportSession()
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `simulation_${world.name}_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setShowExport(true)
      setTimeout(() => setShowExport(false), 2000)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* Control Panel */}
      <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-400/30 rounded text-cyan-300 font-medium">
                多智能体仿真
              </span>
              <h2 className="text-sm font-medium text-white/80 truncate">{world.name}</h2>
            </div>
            <p className="text-xs text-white/40">{world.description}</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center border border-white/[0.08] rounded overflow-hidden">
              {(['slow', 'normal', 'fast'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-[10px] transition-colors cursor-pointer ${
                    speed === s 
                      ? 'bg-cyan-500/15 text-cyan-300' 
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {s === 'slow' ? '1x' : s === 'normal' ? '2x' : '5x'}
                </button>
              ))}
            </div>

            <button
              onClick={() => performAction('__AUTO_TICK__')}
              disabled={isProcessing || autoRunning || stepCount >= maxSteps}
              className="px-3 py-1.5 rounded text-xs border border-white/[0.08] text-white/50
                         hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-30 transition-all cursor-pointer"
            >
              步进
            </button>

            <button
              onClick={() => setAutoRunning(!autoRunning)}
              disabled={stepCount >= maxSteps}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                autoRunning
                  ? 'bg-red-500/10 border border-red-400/30 text-red-300 hover:bg-red-500/20'
                  : 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20'
              } disabled:opacity-30`}
            >
              {autoRunning ? '\u25A0 暂停' : '\u25B6 运行'}
            </button>

            <button
              onClick={handleExport}
              className="px-3 py-1.5 rounded text-xs border border-white/[0.08] text-white/50
                         hover:border-indigo-400/30 hover:text-indigo-300 transition-all relative cursor-pointer"
            >
              {showExport ? '\u2713 已导出' : '导出数据'}
            </button>

            <div className="text-center pl-2 border-l border-white/[0.08]">
              <div className="text-lg font-mono text-cyan-400 leading-none">{stepCount}</div>
              <div className="text-[9px] text-white/30">/{maxSteps}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-400 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* Left: Timeline */}
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-medium">推演记录</span>
              {isProcessing && (
                <span className="text-[10px] text-cyan-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
                  计算中
                </span>
              )}
            </div>
            <div ref={logRef} className="p-4 max-h-[480px] overflow-y-auto">
              <div className="relative pl-4 border-l border-white/[0.08] space-y-4">
                {narrativeLog.map((log, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[21px] w-2 h-2 rounded-full ${
                      log.type === 'system' ? 'bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.5)]' :
                      log.type === 'event' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' :
                      'bg-white/20'
                    }`} />
                    <div className={`pl-2 ${
                      log.type === 'system' ? 'text-cyan-300/70 text-[10px] font-mono' :
                      log.type === 'event' ? 'text-amber-300/70 text-[11px]' :
                      'text-white/70 text-sm leading-relaxed'
                    }`}>
                      {log.type === 'narrative' ? stripSimMetrics(log.text) : log.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {metrics.length > 0 && (
            <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-[10px] text-white/40 font-medium mb-2">关键变量追踪</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {metrics.map((m, i) => (
                  <div key={i} className="p-2 bg-white/[0.03] rounded border border-white/[0.06] text-center">
                    <div className="text-sm font-mono text-cyan-400">{m.value}</div>
                    <div className="text-[9px] text-white/30 mt-0.5">{m.key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestone Feedback */}
          <MilestoneFeedbackCard />
        </div>

        {/* Right: Agent Status + Metrics */}
        <div className="space-y-3">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <h3 className="text-xs text-white/50 font-medium mb-2">智能体状态</h3>
            <div className="space-y-2">
              {world.agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} allAgents={world.agents} />
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <h3 className="text-xs text-white/50 font-medium mb-2">系统指标</h3>
            <div className="grid grid-cols-2 gap-2">
              <MetricCell 
                label="交互事件" 
                value={narrativeLog.filter(l => l.type === 'narrative').length} 
              />
              <MetricCell 
                label="活跃Agent" 
                value={world.agents.filter(a => a.memory.observations.length > 0).length}
                total={world.agents.length}
              />
              <MetricCell 
                label="环境事件触发" 
                value={world.rules.filter(r => r.fired).length}
                total={world.rules.length}
              />
              <MetricCell 
                label="Agent反思" 
                value={world.agents.reduce((s, a) => s + a.memory.reflections.length, 0)} 
              />
              <MetricCell 
                label="平均态度" 
                value={Math.round(world.agents.reduce((s, a) => s + a.memory.attitude, 0) / world.agents.length)}
                suffix="/100"
              />
              <MetricCell 
                label="观察记录" 
                value={world.agents.reduce((s, a) => s + a.memory.observations.length, 0)} 
              />
            </div>
          </div>

          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <h3 className="text-xs text-white/50 font-medium mb-2">Agent 态势分布</h3>
            <div className="space-y-1.5">
              {world.agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-16 truncate shrink-0">{agent.name}</span>
                  <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
                    <div className="absolute left-1/2 top-0 w-px h-full bg-white/10" />
                    <div 
                      className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                        agent.memory.attitude >= 0 ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.3)]' : 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.3)]'
                      }`}
                      style={{
                        left: agent.memory.attitude >= 0 ? '50%' : `${50 + agent.memory.attitude / 2}%`,
                        width: `${Math.abs(agent.memory.attitude) / 2}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30 font-mono w-8 text-right">
                    {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {(stepCount >= maxSteps || phase === 'gameover') && (
            <div className="bg-cyan-500/[0.08] border border-cyan-400/20 rounded-xl p-3">
              <h3 className="text-xs text-cyan-300 font-medium mb-1">推演完成</h3>
              <p className="text-[10px] text-white/50 leading-relaxed">
                {maxSteps} 轮推演已完成。点击"导出数据"获取完整的 Agent 行为日志和交互数据，可用于进一步分析。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function AgentCard({ agent, allAgents }: { agent: any; allAgents: any[] }) {
  const lastObs = agent.memory.observations[agent.memory.observations.length - 1]
  const decisionStyleLabel: Record<string, string> = {
    'rational-bounded': '有限理性',
    'heuristic': '经验驱动',
    'reactive': '反应式',
    'strategic': '策略型',
    'rational': '理性',
    'emotional': '情感驱动',
    'chaotic': '混沌',
  }

  return (
    <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/80 font-medium flex items-center gap-1.5">
          {(() => {
            const visual = getAgentVisual(agent.name, agent.id)
            return (
              <img
                src={visual.avatarUrl}
                alt={visual.initial}
                className="w-4 h-4 rounded-full border object-cover"
                style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
              />
            )
          })()}
          {agent.name}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 font-mono">
          {decisionStyleLabel[agent.decisionStyle] || agent.decisionStyle}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-1">
        {agent.goals.slice(0, 2).map((g: string, i: number) => (
          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-400/20 rounded text-cyan-300/70">
            {g.length > 15 ? g.slice(0, 15) + '...' : g}
          </span>
        ))}
      </div>
      {lastObs && (
        <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
          最新：{lastObs.content}
        </p>
      )}
      {agent.memory.currentPlan && (
        <p className="text-[10px] text-cyan-300/60 mt-0.5">
          计划：{agent.memory.currentPlan}
        </p>
      )}
    </div>
  )
}

function MetricCell({ label, value, total, suffix }: { label: string; value: number; total?: number; suffix?: string }) {
  return (
    <div className="p-2 bg-white/[0.03] rounded-lg border border-white/[0.06] text-center">
      <div className="text-sm font-mono text-cyan-400 leading-none">
        {value}{total !== undefined && <span className="text-white/30 text-[10px]">/{total}</span>}
        {suffix && <span className="text-white/30 text-[10px]">{suffix}</span>}
      </div>
      <div className="text-[9px] text-white/30 mt-1">{label}</div>
    </div>
  )
}

// ============================================================
// Utilities
// ============================================================

function parseSimMetrics(narrativeLog: { text: string; type: string }[]): { key: string; value: string }[] {
  const lastNarrative = narrativeLog.filter(l => l.type === 'narrative').slice(-1)[0]?.text || ''
  const pipeIndex = lastNarrative.lastIndexOf('|')
  if (pipeIndex === -1) return []
  
  const tagStr = lastNarrative.slice(pipeIndex + 1)
  const matches = tagStr.matchAll(/\[([^:]+):([^\]]+)\]/g)
  return [...matches].map(m => ({ key: m[1], value: m[2] }))
}

function stripSimMetrics(text: string): string {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return text
  const afterPipe = text.slice(pipeIndex + 1)
  if (/\[[^\]]+:[^\]]+\]/.test(afterPipe)) {
    return text.slice(0, pipeIndex).trim()
  }
  return text
}
