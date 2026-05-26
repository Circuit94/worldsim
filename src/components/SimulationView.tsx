/**
 * SimulationView — 多智能体仿真模式专用布局
 * 
 * 定位：Agent-Based Modeling 推演观测台
 * 设计参考：NetLogo Monitor × AnyLogic Dashboard × 学术仿真论文图表
 * 
 * 核心组成：
 * - 顶部：仿真控制台（运行/暂停/步进/速度/导出）
 * - 左侧：推演记录（结构化时间线 + 关键变量追踪）
 * - 右侧：Agent 状态面板 + 涌现指标 + 数据摘要
 * - 无任何游戏化元素
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'

export default function SimulationView() {
  const { world, player, narrativeLog, isProcessing, performAction, phase, exportSession } = useGameStore()
  const [autoRunning, setAutoRunning] = useState(false)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [showExport, setShowExport] = useState(false)
  const autoRef = useRef<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  
  if (!world || !player) return null

  const stepCount = player.steps
  const maxSteps = 20
  const progressPercent = (stepCount / maxSteps) * 100

  // 自动推进逻辑
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

  // 自动滚动到最新日志
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [narrativeLog.length])

  // 解析推演指标（从 narrative 中提取 |[key:value] 格式）
  const metrics = parseSimMetrics(narrativeLog)

  // 数据导出
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
      {/* ========== 仿真控制台 ========== */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 border border-emerald-800/50 rounded text-emerald-300 font-medium">
                多智能体仿真
              </span>
              <h2 className="text-sm font-medium text-gray-200 truncate">{world.name}</h2>
            </div>
            <p className="text-xs text-gray-500">{world.description}</p>
          </div>
          
          {/* 控制按钮组 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 速度 */}
            <div className="flex items-center border border-gray-700 rounded overflow-hidden">
              {(['slow', 'normal', 'fast'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-[10px] transition-colors ${
                    speed === s 
                      ? 'bg-emerald-900/60 text-emerald-300' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s === 'slow' ? '1×' : s === 'normal' ? '2×' : '5×'}
                </button>
              ))}
            </div>

            {/* 步进 */}
            <button
              onClick={() => performAction('__AUTO_TICK__')}
              disabled={isProcessing || autoRunning || stepCount >= maxSteps}
              className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400
                         hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-30 transition-all"
            >
              步进
            </button>

            {/* 运行/暂停 */}
            <button
              onClick={() => setAutoRunning(!autoRunning)}
              disabled={stepCount >= maxSteps}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                autoRunning
                  ? 'bg-red-900/40 border border-red-700/50 text-red-300 hover:bg-red-800/40'
                  : 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/40'
              } disabled:opacity-30`}
            >
              {autoRunning ? '■ 暂停' : '▶ 运行'}
            </button>

            {/* 导出 */}
            <button
              onClick={handleExport}
              className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400
                         hover:border-blue-600 hover:text-blue-300 transition-all relative"
            >
              {showExport ? '✓ 已导出' : '导出数据'}
            </button>

            {/* 轮次 */}
            <div className="text-center pl-2 border-l border-gray-800">
              <div className="text-lg font-mono text-emerald-400 leading-none">{stepCount}</div>
              <div className="text-[9px] text-gray-600">/{maxSteps}</div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* ========== 左侧：推演记录 ========== */}
        <div className="space-y-3">
          {/* 时间线日志 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-medium">推演记录</span>
              {isProcessing && (
                <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  计算中
                </span>
              )}
            </div>
            <div ref={logRef} className="p-4 max-h-[480px] overflow-y-auto">
              <div className="relative pl-4 border-l border-gray-800/50 space-y-4">
                {narrativeLog.map((log, i) => (
                  <div key={i} className="relative">
                    {/* 时间线节点 */}
                    <div className={`absolute -left-[21px] w-2 h-2 rounded-full ${
                      log.type === 'system' ? 'bg-emerald-500/80' :
                      log.type === 'event' ? 'bg-cyan-500/80' :
                      'bg-gray-600'
                    }`} />
                    <div className={`pl-2 ${
                      log.type === 'system' ? 'text-emerald-400/60 text-[10px] font-mono' :
                      log.type === 'event' ? 'text-cyan-400/70 text-[11px]' :
                      'text-gray-300 text-sm leading-relaxed'
                    }`}>
                      {log.type === 'narrative' ? stripSimMetrics(log.text) : log.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 涌现指标追踪（如果LLM返回了） */}
          {metrics.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <h3 className="text-[10px] text-gray-500 font-medium mb-2">关键变量追踪</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {metrics.map((m, i) => (
                  <div key={i} className="p-2 bg-gray-950/60 rounded border border-gray-800/80 text-center">
                    <div className="text-sm font-mono text-emerald-400">{m.value}</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{m.key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========== 右侧：Agent 状态 + 系统指标 ========== */}
        <div className="space-y-3">
          {/* Agent 实时状态 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <h3 className="text-xs text-gray-400 font-medium mb-2">智能体状态</h3>
            <div className="space-y-2">
              {world.agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} allAgents={world.agents} />
              ))}
            </div>
          </div>

          {/* 系统指标 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <h3 className="text-xs text-gray-400 font-medium mb-2">系统指标</h3>
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

          {/* 关系热力图 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <h3 className="text-xs text-gray-400 font-medium mb-2">Agent 态势分布</h3>
            <div className="space-y-1.5">
              {world.agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-16 truncate shrink-0">{agent.name}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                    {/* 中线标记 */}
                    <div className="absolute left-1/2 top-0 w-px h-full bg-gray-700" />
                    {/* 态度条 */}
                    <div 
                      className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                        agent.memory.attitude >= 0 ? 'bg-emerald-500/70' : 'bg-red-500/70'
                      }`}
                      style={{
                        left: agent.memory.attitude >= 0 ? '50%' : `${50 + agent.memory.attitude / 2}%`,
                        width: `${Math.abs(agent.memory.attitude) / 2}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600 font-mono w-8 text-right">
                    {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 仿真结束提示 */}
          {(stepCount >= maxSteps || phase === 'gameover') && (
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3">
              <h3 className="text-xs text-emerald-300 font-medium mb-1">推演完成</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
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
// 辅助组件
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
    <div className="p-2 bg-gray-950/60 rounded border border-gray-800/80">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
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
        <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-500 font-mono">
          {decisionStyleLabel[agent.decisionStyle] || agent.decisionStyle}
        </span>
      </div>
      {/* 当前目标 */}
      <div className="flex flex-wrap gap-1 mb-1">
        {agent.goals.slice(0, 2).map((g: string, i: number) => (
          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-emerald-950/30 border border-emerald-900/30 rounded text-emerald-400/60">
            {g.length > 15 ? g.slice(0, 15) + '...' : g}
          </span>
        ))}
      </div>
      {/* 最新行为 */}
      {lastObs && (
        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
          最新：{lastObs.content}
        </p>
      )}
      {/* 当前计划 */}
      {agent.memory.currentPlan && (
        <p className="text-[10px] text-teal-400/50 mt-0.5">
          计划：{agent.memory.currentPlan}
        </p>
      )}
    </div>
  )
}

function MetricCell({ label, value, total, suffix }: { label: string; value: number; total?: number; suffix?: string }) {
  return (
    <div className="p-2 bg-gray-950/60 rounded border border-gray-800/80 text-center">
      <div className="text-sm font-mono text-emerald-400 leading-none">
        {value}{total !== undefined && <span className="text-gray-600 text-[10px]">/{total}</span>}
        {suffix && <span className="text-gray-600 text-[10px]">{suffix}</span>}
      </div>
      <div className="text-[9px] text-gray-500 mt-1">{label}</div>
    </div>
  )
}

// ============================================================
// 工具函数
// ============================================================

/** 从narrative中解析仿真指标（格式：|[key:value]） */
function parseSimMetrics(narrativeLog: { text: string; type: string }[]): { key: string; value: string }[] {
  const lastNarrative = narrativeLog.filter(l => l.type === 'narrative').slice(-1)[0]?.text || ''
  const pipeIndex = lastNarrative.lastIndexOf('|')
  if (pipeIndex === -1) return []
  
  const tagStr = lastNarrative.slice(pipeIndex + 1)
  const matches = tagStr.matchAll(/\[([^:]+):([^\]]+)\]/g)
  return [...matches].map(m => ({ key: m[1], value: m[2] }))
}

/** 去除指标标签后的纯叙述文本 */
function stripSimMetrics(text: string): string {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return text
  const afterPipe = text.slice(pipeIndex + 1)
  if (/\[[^\]]+:[^\]]+\]/.test(afterPipe)) {
    return text.slice(0, pipeIndex).trim()
  }
  return text
}
