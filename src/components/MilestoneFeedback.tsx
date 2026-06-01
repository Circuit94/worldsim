/**
 * MilestoneFeedback — 里程碑反馈卡片组件
 * 
 * 在关键轮次弹出，提供阶段性分析和鼓励，提升用户参与度。
 * 支持三种模式的不同视觉风格。
 */

import { useGameStore } from '../store/gameStore'
import type { MilestoneFeedback as MilestoneFeedbackType } from '../engine/milestoneFeedback'

export default function MilestoneFeedbackCard() {
  const { milestoneFeedback, dismissMilestone } = useGameStore()

  if (!milestoneFeedback) return null

  const config = getStyleConfig(milestoneFeedback)

  return (
    <div className={`rounded-xl p-4 border backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 ${config.containerClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <h3 className={`text-sm font-medium ${config.titleClass}`}>
            {milestoneFeedback.title}
          </h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${config.badgeClass}`}>
            第{milestoneFeedback.stepTriggered}轮
          </span>
        </div>
        <button
          onClick={dismissMilestone}
          className="text-white/30 hover:text-white/60 transition-colors text-sm cursor-pointer"
          title="关闭"
        >
          ✕
        </button>
      </div>

      {/* Main Content */}
      <div className={`text-sm leading-relaxed mb-3 ${config.contentClass}`}>
        {milestoneFeedback.content}
      </div>

      {/* Details */}
      {milestoneFeedback.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {milestoneFeedback.details.map((detail, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded border ${config.detailClass}`}
            >
              {detail}
            </span>
          ))}
        </div>
      )}

      {/* Encouragement / Suggestion */}
      <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${config.suggestionBgClass}`}>
        <span className="text-sm shrink-0">{config.suggestionIcon}</span>
        <p className={`text-xs leading-relaxed ${config.suggestionTextClass}`}>
          {milestoneFeedback.encouragement}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// 样式配置
// ============================================================

interface StyleConfig {
  icon: string
  containerClass: string
  titleClass: string
  badgeClass: string
  contentClass: string
  detailClass: string
  suggestionIcon: string
  suggestionBgClass: string
  suggestionTextClass: string
}

function getStyleConfig(feedback: MilestoneFeedbackType): StyleConfig {
  switch (feedback.type) {
    case 'coaching':
      return {
        icon: '📊',
        containerClass: 'bg-amber-500/[0.08] border-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.08)]',
        titleClass: 'text-amber-300',
        badgeClass: 'bg-amber-500/10 border-amber-400/30 text-amber-300',
        contentClass: 'text-white/70',
        detailClass: 'bg-amber-500/10 border-amber-400/20 text-amber-200/70',
        suggestionIcon: '💡',
        suggestionBgClass: 'bg-amber-500/[0.06] border-amber-400/20',
        suggestionTextClass: 'text-amber-200/80',
      }
    case 'observation':
      return {
        icon: '🔍',
        containerClass: 'bg-cyan-500/[0.08] border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.08)]',
        titleClass: 'text-cyan-300',
        badgeClass: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300',
        contentClass: 'text-white/70',
        detailClass: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-200/70',
        suggestionIcon: '🎯',
        suggestionBgClass: 'bg-cyan-500/[0.06] border-cyan-400/20',
        suggestionTextClass: 'text-cyan-200/80',
      }
    case 'exploration':
      return {
        icon: '🗺️',
        containerClass: 'bg-indigo-500/[0.08] border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.08)]',
        titleClass: 'text-indigo-300',
        badgeClass: 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300',
        contentClass: 'text-white/70',
        detailClass: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-200/70',
        suggestionIcon: '🧭',
        suggestionBgClass: 'bg-indigo-500/[0.06] border-indigo-400/20',
        suggestionTextClass: 'text-indigo-200/80',
      }
  }
}
