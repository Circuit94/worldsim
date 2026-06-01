/**
 * SummaryOverlay — 全局总结弹窗
 * 
 * 当用户到达 maxSteps 时弹出，展示阶段性评估报告。
 * 用户可以选择"查看完整报告"或"继续挑战"。
 */

import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateTrainingReport, reportToMarkdown, type TrainingReport } from '../engine/trainingReport'

export default function SummaryOverlay() {
  const { world, player, narrativeLog, scenarioMode, summaryState, continuePastSummary, dismissSummary, exportSession } = useGameStore()
  const [report, setReport] = useState<TrainingReport | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!summaryState || !world || !player) return null

  const isTraining = scenarioMode === 'training'
  const isSimulation = scenarioMode === 'simulation'

  const handleGenerateReport = () => {
    if (isTraining) {
      const r = generateTrainingReport(world, narrativeLog, player.steps)
      setReport(r)
      setShowFullReport(true)
    } else if (isSimulation) {
      // 仿真模式导出 JSON
      const data = exportSession()
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `simulation_${world.name}_${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  const handleCopyReport = () => {
    if (!report) return
    const md = reportToMarkdown(report)
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleContinue = () => {
    continuePastSummary()
  }

  // 计算简要统计
  const decisionCount = narrativeLog.filter(l => l.text.startsWith('→')).length
  const agentInteractions = world.agents.reduce((s, a) => s + a.memory.observations.length, 0)
  const avgAttitude = Math.round(world.agents.reduce((s, a) => s + a.memory.attitude, 0) / Math.max(world.agents.length, 1))

  // 模式特定的颜色主题
  const themeColor = isTraining ? 'amber' : isSimulation ? 'cyan' : 'indigo'
  const borderClass = `border-${themeColor}-400/30`
  const bgClass = `bg-${themeColor}-500/10`
  const textClass = `text-${themeColor}-300`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f1219] border border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r ${
          isTraining ? 'from-amber-500/10 to-orange-500/5' : 
          isSimulation ? 'from-cyan-500/10 to-indigo-500/5' : 
          'from-indigo-500/10 to-purple-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isTraining ? 'bg-amber-500/15 border border-amber-400/30' :
              isSimulation ? 'bg-cyan-500/15 border border-cyan-400/30' :
              'bg-indigo-500/15 border border-indigo-400/30'
            }`}>
              <span className="text-lg">{isTraining ? '📋' : isSimulation ? '🔬' : '🌍'}</span>
            </div>
            <div>
              <h2 className="text-base font-medium text-white/90">
                {isTraining ? '阶段评估完成' : isSimulation ? '推演轮次已满' : '探索阶段完成'}
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                已完成 {summaryState.stepReached} 轮{isTraining ? '情景评估' : isSimulation ? '自主推演' : '世界探索'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className={`text-lg font-mono font-medium ${isTraining ? 'text-amber-400' : isSimulation ? 'text-cyan-400' : 'text-indigo-400'}`}>
                {summaryState.stepReached}
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">完成轮次</div>
            </div>
            <div className="text-center p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className={`text-lg font-mono font-medium ${isTraining ? 'text-amber-400' : isSimulation ? 'text-cyan-400' : 'text-indigo-400'}`}>
                {isTraining ? decisionCount : agentInteractions}
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">{isTraining ? '决策次数' : '交互事件'}</div>
            </div>
            <div className="text-center p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className={`text-lg font-mono font-medium ${
                avgAttitude > 10 ? 'text-emerald-400' : avgAttitude < -10 ? 'text-red-400' : 'text-white/60'
              }`}>
                {avgAttitude > 0 ? '+' : ''}{avgAttitude}
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">平均态度</div>
            </div>
          </div>

          {/* 关键角色态势 */}
          <div className="mt-3 space-y-1.5">
            <span className="text-[10px] text-white/40 font-medium">
              {isTraining ? '利益相关方最终态势' : '智能体最终状态'}
            </span>
            {world.agents.slice(0, 4).map(agent => (
              <div key={agent.id} className="flex items-center justify-between text-xs">
                <span className="text-white/60 truncate max-w-[140px]">{agent.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${agent.memory.attitude >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.abs(agent.memory.attitude))}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono w-8 text-right ${
                    agent.memory.attitude > 0 ? 'text-emerald-400' : agent.memory.attitude < 0 ? 'text-red-400' : 'text-white/40'
                  }`}>
                    {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Section (if generated) */}
        {showFullReport && report && (
          <div className="px-6 py-3 border-b border-white/[0.06] max-h-[200px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/70 font-medium">能力评估概览</span>
              <button
                onClick={handleCopyReport}
                className="text-[10px] px-2 py-1 bg-white/[0.03] border border-white/[0.08] rounded text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                {copied ? '已复制 ✓' : '复制报告'}
              </button>
            </div>
            <div className="space-y-2">
              {report.competencies.map(c => (
                <div key={c.dimension} className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50 w-24 shrink-0">{c.dimension}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${c.score >= 75 ? 'bg-emerald-400' : c.score >= 50 ? 'bg-amber-400' : 'bg-orange-400'}`}
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono w-6 ${
                    c.grade === 'S' ? 'text-purple-300' : c.grade === 'A' ? 'text-emerald-300' : 
                    c.grade === 'B' ? 'text-amber-300' : 'text-orange-300'
                  }`}>{c.grade}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <p className="text-[11px] text-white/50 leading-relaxed">
                综合评级：<strong className={`${
                  report.overallGrade === 'S' ? 'text-purple-300' : report.overallGrade === 'A' ? 'text-emerald-300' : 'text-amber-300'
                }`}>{report.overallGrade}</strong>（{report.overallScore}分）— {report.summary.slice(0, 80)}...
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex items-center gap-3">
          {!showFullReport && (
            <button
              onClick={handleGenerateReport}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                isTraining 
                  ? 'bg-amber-500/10 border-amber-400/30 text-amber-300 hover:bg-amber-500/20 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                  : isSimulation
                  ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/20'
              }`}
            >
              {isTraining ? '生成评估报告' : isSimulation ? '导出推演数据' : '查看探索总结'}
            </button>
          )}
          <button
            onClick={handleContinue}
            className={`${showFullReport ? 'flex-1' : ''} px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border
                       bg-white/[0.03] border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/[0.2]`}
          >
            继续挑战 →
          </button>
          {showFullReport && (
            <button
              onClick={() => dismissSummary()}
              className="px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
            >
              关闭
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-3">
          <p className="text-[10px] text-white/25 text-center">
            {isTraining 
              ? '继续挑战将解锁额外轮次，但不影响已有评估结果' 
              : isSimulation 
              ? '继续推演可观察系统更长期的演化趋势'
              : '你可以继续探索这个世界'}
          </p>
        </div>
      </div>
    </div>
  )
}
