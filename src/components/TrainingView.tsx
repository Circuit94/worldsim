/**
 * TrainingView v2 (Cyber Glass Dark Theme)
 * Scenario assessment mode
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateTrainingReport, reportToMarkdown, type TrainingReport } from '../engine/trainingReport'
import MilestoneFeedbackCard from './MilestoneFeedback'
import SummaryOverlay from './SummaryOverlay'

export default function TrainingView() {
  const { world, player, narrativeLog, choices, isProcessing, performAction, phase } = useGameStore()
  const [report, setReport] = useState<TrainingReport | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [isPolishing, setIsPolishing] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<Record<string, number[]>>({
    analytical: [], decisiveness: [], stakeholder: [], influence: [], strategic: []
  })
  const logContainerRef = useRef<HTMLDivElement>(null)
  
  if (!world || !player) return null

  const stepCount = player.steps
  const maxSteps = 8
  const progressPercent = (stepCount / maxSteps) * 100
  
  const phaseIndex = stepCount <= 2 ? 0 : stepCount <= 5 ? 1 : 2

  const lastNarrative = narrativeLog.filter(l => l.type === 'narrative').slice(-1)[0]?.text || ''
  const evalTags = parseEvalTags(lastNarrative)

  // 计算当前分数并追踪历史
  const currentScores = useMemo(() => {
    const dimensions = ['analytical', 'decisiveness', 'stakeholder', 'influence', 'strategic'] as const
    const scores: Record<string, number> = {}
    for (const dim of dimensions) {
      scores[dim] = getCompetencyScore(world.agents, dim, evalTags, stepCount)
    }
    return scores
  }, [world.agents, evalTags, stepCount])

  // 记录分数历史（每当 stepCount 变化时追加）
  useEffect(() => {
    if (stepCount === 0) return
    setScoreHistory(prev => {
      const next = { ...prev }
      for (const [dim, score] of Object.entries(currentScores)) {
        const history = [...(prev[dim] || [])]
        // 只在新轮次追加（避免重复）
        if (history.length < stepCount) {
          history.push(score)
        }
        next[dim] = history
      }
      return next
    })
  }, [stepCount])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [narrativeLog.length])

  const handlePolish = async () => {
    if (!customInput.trim()) return
    setIsPolishing(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    const polished = polishDecisionText(customInput)
    setCustomInput(polished)
    setIsPolishing(false)
  }

  const handleSubmit = () => {
    if (!customInput.trim() || isProcessing) return
    performAction(customInput.trim())
    setCustomInput('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* Summary Overlay */}
      <SummaryOverlay />

      {/* Header: Scenario + Progress */}
      <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-400/30 rounded text-amber-300 font-medium">
                情景评估
              </span>
              <h2 className="text-sm font-medium text-white/80 truncate">{world.name}</h2>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">{world.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-white/40 mb-1">评估进度</div>
            <div className="flex items-center gap-2">
              {['信息收集', '决策推进', '收敛结案'].map((p, i) => (
                <div key={p} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    i < phaseIndex ? 'bg-amber-400' : 
                    i === phaseIndex ? 'bg-amber-400 ring-2 ring-amber-400/30' : 
                    'bg-white/10'
                  }`} />
                  <span className={`text-xs ${i === phaseIndex ? 'text-amber-300' : 'text-white/30'}`}>
                    {p}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 w-40 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-white/30 mt-1 font-mono">{stepCount}/{maxSteps} 轮</div>
          </div>
        </div>
        <div className="mt-3 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 shrink-0">评估目标</span>
            <p className="text-xs text-white/70">{world.winCondition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        {/* Left: Scenario Progress */}
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
              <span className="text-xs text-white/50 font-medium">情景记录</span>
            </div>
            <div ref={logContainerRef} className="p-4 max-h-[380px] overflow-y-auto space-y-3 scroll-smooth">
              {narrativeLog.map((log, i) => (
                <div key={i} className={getLogStyle(log)}>
                  {log.type === 'system' && !log.text.startsWith('\u2192') ? (
                    <span className="text-xs text-white/30">{log.text}</span>
                  ) : log.text.startsWith('\u2192') ? (
                    <div className="pl-3 border-l-2 border-amber-400/60">
                      <span className="text-xs text-amber-300/80 block mb-0.5">你的决策</span>
                      <span className="text-sm text-white/80">{log.text.slice(2)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/70 leading-relaxed">
                      {stripEvalTags(log.text)}
                    </p>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
                  <span className="text-xs text-white/40">情景推进中...</span>
                </div>
              )}
            </div>
          </div>

          {/* Milestone Feedback */}
          <MilestoneFeedbackCard />

          {/* Decision Input */}
          <div className="rounded-xl p-4 space-y-4 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            {choices.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/70 font-medium">参考策略方向</span>
                  <span className="text-xs text-white/30">&mdash; 可直接采用或作为思考起点</span>
                </div>
                <div className="space-y-1.5">
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => performAction(choice)}
                      disabled={isProcessing}
                      className="w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer
                                 bg-white/[0.02] border-white/[0.06] text-white/60
                                 hover:border-amber-400/30 hover:bg-amber-500/[0.05] hover:text-white/80
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-amber-400 font-mono mr-2">{String.fromCharCode(65 + i)}.</span>
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/70 font-medium">自定义决策</span>
                <span className="text-xs text-white/30">用自己的话描述行动方案</span>
              </div>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder={'输入你的决策方案，可以用口语化表达，例如：\n"先稳住那个反对的人，然后找老板私下聊聊技术方案的时间线"'}
                disabled={isProcessing}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white/80
                           placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 
                           focus:shadow-[0_0_12px_rgba(251,191,36,0.1)] transition-all
                           disabled:opacity-40 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePolish}
                    disabled={!customInput.trim() || isProcessing || isPolishing}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer
                               bg-indigo-500/10 border-indigo-400/30 text-indigo-300
                               hover:bg-indigo-500/15 hover:border-indigo-400/50
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isPolishing ? '\u27F3 优化中...' : '\u2728 AI 润色'}
                  </button>
                  <span className="text-xs text-white/30">
                    将口语优化为结构化决策
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!customInput.trim() || isProcessing}
                  className="px-5 py-1.5 bg-amber-500/10 border border-amber-400/30 rounded-lg text-sm text-amber-300
                             hover:bg-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)]
                             disabled:opacity-40 transition-all cursor-pointer"
                >
                  提交决策
                </button>
              </div>
              <p className="text-xs text-white/25 mt-1.5">
                越详细的决策描述，评估越精准 &middot; Ctrl+Enter 快速提交
              </p>
            </div>
          </div>
        </div>

        {/* Right: Assessment Dashboard */}
        <div className="space-y-3">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-white/70 font-medium">能力诊断</h3>
              {evalTags.length > 0 && (
                <span className="text-xs text-amber-400">实时更新</span>
              )}
            </div>
            <div className="space-y-3">
              <CompetencyBar label="分析判断力" score={currentScores.analytical} history={scoreHistory.analytical} description="信息识别、逻辑推理、本质洞察" />
              <CompetencyBar label="决策魄力" score={currentScores.decisiveness} history={scoreHistory.decisiveness} description="果断程度、风险承受、明确立场" />
              <CompetencyBar label="利益相关方管理" score={currentScores.stakeholder} history={scoreHistory.stakeholder} description="多方平衡、诉求整合、关系维护" />
              <CompetencyBar label="沟通影响力" score={currentScores.influence} history={scoreHistory.influence} description="说服技巧、情绪管理、信息节奏" />
              <CompetencyBar label="战略格局" score={currentScores.strategic} history={scoreHistory.strategic} description="长期视角、系统思维、取舍智慧" />
            </div>
          </div>

          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
            <h3 className="text-xs text-white/70 font-medium mb-2">利益相关方态势</h3>
            <div className="space-y-2">
              {world.agents.map(agent => (
                <div key={agent.id} className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/80 font-medium">{agent.name}</span>
                    <StanceIndicator attitude={agent.memory.attitude} />
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed mb-1">
                    {agent.goals[0] || agent.persona.slice(0, 40)}
                  </p>
                  {agent.memory.currentPlan && (
                    <div className="text-xs text-amber-300/70 mt-1">
                      当前动态：{agent.memory.currentPlan}
                    </div>
                  )}
                  <div className="mt-1.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        agent.memory.attitude > 0 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.3)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.3)]'
                      }`}
                      style={{ 
                        width: `${Math.abs(agent.memory.attitude)}%`,
                        marginLeft: agent.memory.attitude < 0 ? `${100 - Math.abs(agent.memory.attitude)}%` : '0'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stepCount >= 3 && (
            <div className="bg-amber-500/[0.08] border border-amber-400/20 rounded-xl p-3">
              <h3 className="text-xs text-amber-300 font-medium mb-2">阶段观察</h3>
              <div className="text-xs text-white/50 space-y-1 leading-relaxed">
                {getPhaseInsights(world.agents, stepCount, narrativeLog)}
              </div>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="bg-amber-500/[0.08] border border-amber-400/20 rounded-xl p-3">
              <h3 className="text-sm text-amber-300 font-medium mb-2">评估完成</h3>
              {!report ? (
                <button
                  onClick={() => {
                    const r = generateTrainingReport(world, narrativeLog, stepCount)
                    setReport(r)
                    setShowReport(true)
                  }}
                  className="w-full px-4 py-2.5 bg-amber-500/10 border border-amber-400/30 rounded-lg text-sm text-amber-300
                             hover:bg-amber-500/20 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)] transition-all cursor-pointer"
                >
                  生成评估报告
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-200">
                      综合评级：<strong className="text-lg">{report.overallGrade}</strong>（{report.overallScore}分）
                    </span>
                    <button
                      onClick={() => setShowReport(!showReport)}
                      className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      {showReport ? '收起报告' : '展开报告'}
                    </button>
                  </div>
                  {showReport && <ReportPanel report={report} />}
                </div>
              )}
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

function CompetencyBar({ label, score, history, description }: { label: string; score: number; history: number[]; description: string }) {
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  const gradeColor: Record<string, string> = {
    S: 'text-purple-300 bg-purple-500/15 border-purple-400/30',
    A: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
    B: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
    C: 'text-orange-300 bg-orange-500/15 border-orange-400/30',
    D: 'text-red-300 bg-red-500/15 border-red-400/30',
  }
  const barColor = score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-orange-400'

  // 计算趋势变化
  const prevScore = history.length >= 2 ? history[history.length - 2] : null
  const delta = prevScore !== null ? score - prevScore : null
  const trendIcon = delta === null ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→'
  const trendColor = delta === null ? '' : delta > 3 ? 'text-emerald-400' : delta > 0 ? 'text-emerald-300/70' : delta < -3 ? 'text-red-400' : delta < 0 ? 'text-orange-400' : 'text-white/40'

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/70">{label}</span>
        <div className="flex items-center gap-1.5">
          {/* 趋势指示器 */}
          {delta !== null && (
            <span className={`text-[10px] font-mono font-medium ${trendColor}`}>
              {trendIcon}{Math.abs(delta)}
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded border font-mono font-medium ${gradeColor[grade]}`}>
            {grade}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
        {/* 上一轮位置标记 */}
        {prevScore !== null && Math.abs(score - prevScore) > 2 && (
          <div 
            className="absolute top-0 w-0.5 h-full bg-white/20 transition-all duration-500"
            style={{ left: `${prevScore}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-2">
          <p className="text-xs text-white/30">{description}</p>
          {/* 迷你趋势线 */}
          {history.length >= 2 && (
            <MiniSparkline data={history} current={score} />
          )}
        </div>
        <span className="text-xs text-white/40 font-mono font-medium">{score}</span>
      </div>
    </div>
  )
}

/** 迷你趋势折线图 */
function MiniSparkline({ data, current }: { data: number[]; current: number }) {
  const allPoints = [...data, current]
  const min = Math.min(...allPoints) - 5
  const max = Math.max(...allPoints) + 5
  const range = max - min || 1
  const width = 40
  const height = 12

  const points = allPoints.map((v, i) => {
    const x = (i / Math.max(allPoints.length - 1, 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  // 趋势颜色
  const lastDelta = allPoints.length >= 2 ? allPoints[allPoints.length - 1] - allPoints[allPoints.length - 2] : 0
  const color = lastDelta > 0 ? '#34d399' : lastDelta < 0 ? '#f87171' : '#94a3b8'

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 当前点 */}
      {allPoints.length > 0 && (
        <circle
          cx={(allPoints.length - 1) / Math.max(allPoints.length - 1, 1) * width}
          cy={height - ((current - min) / range) * height}
          r="2"
          fill={color}
        />
      )}
    </svg>
  )
}

function StanceIndicator({ attitude }: { attitude: number }) {
  const label = attitude > 30 ? '支持' : attitude > 10 ? '偏支持' : attitude > -10 ? '中立' : attitude > -30 ? '偏反对' : '反对'
  const color = attitude > 30 ? 'text-emerald-400' : attitude > 10 ? 'text-emerald-300/70' : attitude > -10 ? 'text-white/50' : attitude > -30 ? 'text-orange-400' : 'text-red-400'
  return <span className={`text-xs font-medium ${color}`}>{label}</span>
}

// ============================================================
// Utilities
// ============================================================

function getLogStyle(log: { type: string; text: string }): string {
  if (log.type === 'system') return 'text-white/30'
  if (log.type === 'event') return 'text-amber-300/70 text-xs'
  return ''
}

function polishDecisionText(raw: string): string {
  let polished = raw.trim()
  if (polished.length < 20) return polished

  const parts = polished.split(/[，,。；;、]/).filter(p => p.trim())
  if (parts.length >= 2) {
    polished = parts.map((p, i) => `${i + 1}. ${p.trim()}`).join('\n')
  }

  if (/先|然后|接着|最后|同时/.test(raw) && !polished.includes('\n')) {
    polished = polished
      .replace(/先/, '\n1. 先')
      .replace(/然后|接着/, '\n2. 然后')
      .replace(/最后/, '\n3. 最后')
      .replace(/同时/, '\n- 同时')
      .trim()
  }

  return polished
}

function parseEvalTags(text: string): { dimension: string; grade: string }[] {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return []
  const tagStr = text.slice(pipeIndex + 1)
  const matches = tagStr.matchAll(/\[([^:]+):([SABCD])\]/g)
  return [...matches].map(m => ({ dimension: m[1], grade: m[2] }))
}

function stripEvalTags(text: string): string {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return text
  const afterPipe = text.slice(pipeIndex + 1)
  if (/\[[^\]]+:[SABCD]\]/.test(afterPipe)) {
    return text.slice(0, pipeIndex).trim()
  }
  return text
}

function getCompetencyScore(agents: any[], dimension: string, evalTags: { dimension: string; grade: string }[], stepCount: number = 0): number {
  // 分数映射：拉大区分度，让 S/A 和 C/D 之间差距更明显
  const gradeMap: Record<string, number> = { S: 95, A: 82, B: 65, C: 38, D: 18 }
  const dimensionMap: Record<string, string[]> = {
    analytical: ['分析力', '分析', '判断', '分析判断'],
    decisiveness: ['决断力', '决策', '果断', '决策魄力'],
    stakeholder: ['利益', '平衡', '相关方', '同理心', '利益相关方'],
    influence: ['沟通', '影响', '表达', '沟通影响'],
    strategic: ['战略', '格局', '全局', '战略格局'],
  }
  
  const matchKeys = dimensionMap[dimension] || []
  for (const tag of evalTags) {
    if (matchKeys.some(k => tag.dimension.includes(k))) {
      const baseScore = gradeMap[tag.grade] || 50
      // 加入基于态度的微调（±8），让同等级内也有变化
      const attitudeBonus = Math.round(
        agents.reduce((sum, a) => sum + a.memory.attitude, 0) / Math.max(agents.length, 1) * 0.08
      )
      return Math.min(98, Math.max(10, baseScore + attitudeBonus))
    }
  }

  // Fallback：没有 evalTags 时，基于 agent 态度和步数生成差异化分数
  const avgAttitude = agents.reduce((sum, a) => sum + a.memory.attitude, 0) / Math.max(agents.length, 1)
  // 不同维度使用不同的基准和权重，制造差异
  const dimensionSeeds: Record<string, { base: number; attWeight: number; stepBonus: number }> = {
    analytical: { base: 42, attWeight: 0.6, stepBonus: 3 },
    decisiveness: { base: 35, attWeight: 0.5, stepBonus: 4 },
    stakeholder: { base: 48, attWeight: 0.8, stepBonus: 2 },
    influence: { base: 38, attWeight: 0.7, stepBonus: 3 },
    strategic: { base: 30, attWeight: 0.4, stepBonus: 5 },
  }
  const seed = dimensionSeeds[dimension] || { base: 40, attWeight: 0.5, stepBonus: 3 }
  const rawScore = seed.base + avgAttitude * seed.attWeight + stepCount * seed.stepBonus
  // 加入基于维度名的确定性抖动（让各维度不完全同步变化）
  const jitter = Math.sin(dimension.length * 13 + stepCount * 7) * 6
  return Math.min(95, Math.max(12, Math.round(rawScore + jitter)))
}

function getPhaseInsights(agents: any[], stepCount: number, narrativeLog: any[]): React.ReactNode {
  const supportCount = agents.filter(a => a.memory.attitude > 20).length
  const opposeCount = agents.filter(a => a.memory.attitude < -20).length
  const decisionCount = narrativeLog.filter(l => l.text.startsWith('\u2192')).length

  const insights: string[] = []
  
  if (supportCount > agents.length / 2) {
    insights.push(`已争取到${supportCount}/${agents.length}方支持`)
  }
  if (opposeCount > 0) {
    insights.push(`仍有${opposeCount}方持反对态度，需关注`)
  }
  if (decisionCount < stepCount * 0.6) {
    insights.push('决策频率偏低，可能有犹豫倾向')
  }
  if (stepCount >= 6) {
    insights.push('进入收敛阶段，需开始整合各方意见')
  }
  
  if (insights.length === 0) {
    insights.push('情景正在发展中，持续观察决策质量')
  }

  return insights.map((text, i) => <p key={i}>&bull; {text}</p>)
}

// ============================================================
// Report Panel
// ============================================================

function ReportPanel({ report }: { report: TrainingReport }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const md = reportToMarkdown(report)
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-3 mt-2">
      <button
        onClick={handleCopy}
        className="text-xs px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded text-white/50 
                   hover:text-white/80 hover:border-white/[0.15] transition-all cursor-pointer"
      >
        {copied ? '已复制 Markdown \u2713' : '复制完整报告 (Markdown)'}
      </button>

      <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3">
        <h4 className="text-xs text-white/70 font-medium mb-2">能力维度评估</h4>
        <div className="space-y-2">
          {report.competencies.map(c => (
            <div key={c.dimension}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-white/70">{c.dimension}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${
                  c.grade === 'S' ? 'text-purple-300 bg-purple-500/15' :
                  c.grade === 'A' ? 'text-emerald-300 bg-emerald-500/15' :
                  c.grade === 'B' ? 'text-amber-300 bg-amber-500/15' :
                  c.grade === 'C' ? 'text-orange-300 bg-orange-500/15' :
                  'text-red-300 bg-red-500/15'
                }`}>{c.grade} ({c.score})</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    c.score >= 75 ? 'bg-emerald-400' : c.score >= 50 ? 'bg-amber-400' : 'bg-orange-400'
                  }`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-0.5">{c.suggestion}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3">
        <h4 className="text-xs text-white/70 font-medium mb-2">利益相关方结果</h4>
        <div className="space-y-1.5">
          {report.stakeholders.map(s => (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <span className="text-white/70">{s.name}</span>
              <span className={`font-mono ${
                s.relationship === 'allied' ? 'text-emerald-400' :
                s.relationship === 'opposed' ? 'text-red-400' :
                'text-white/40'
              }`}>
                {s.finalAttitude > 0 ? '+' : ''}{s.finalAttitude}
                <span className="text-white/30 ml-1">
                  ({s.attitudeChange > 0 ? '\u2191' : s.attitudeChange < 0 ? '\u2193' : '\u2192'}{Math.abs(s.attitudeChange)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3">
        <h4 className="text-xs text-white/70 font-medium mb-2">总评</h4>
        <p className="text-xs text-white/50 leading-relaxed">{report.summary}</p>
      </div>

      {report.strengths.length > 0 && (
        <div className="bg-emerald-500/[0.08] rounded-lg border border-emerald-400/20 p-3">
          <h4 className="text-xs text-emerald-300 font-medium mb-1">核心优势</h4>
          {report.strengths.map((s, i) => (
            <p key={i} className="text-xs text-white/50 leading-relaxed">&bull; {s}</p>
          ))}
        </div>
      )}
      {report.improvements.length > 0 && (
        <div className="bg-orange-500/[0.08] rounded-lg border border-orange-400/20 p-3">
          <h4 className="text-xs text-orange-300 font-medium mb-1">改进方向</h4>
          {report.improvements.map((s, i) => (
            <p key={i} className="text-xs text-white/50 leading-relaxed">&bull; {s}</p>
          ))}
        </div>
      )}

      <div className="bg-amber-500/[0.08] rounded-lg border border-amber-400/20 p-3">
        <h4 className="text-xs text-amber-300 font-medium mb-1">下一步建议</h4>
        {report.nextSteps.map((s, i) => (
          <p key={i} className="text-xs text-white/50 leading-relaxed">&bull; {s}</p>
        ))}
      </div>
    </div>
  )
}
