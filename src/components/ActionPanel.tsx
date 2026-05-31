import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

export default function ActionPanel() {
  const { choices, performAction, isProcessing, phase } = useGameStore()
  const [customAction, setCustomAction] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts: 1-5 for choices, focus input on any key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }
      if (isProcessing || phase !== 'playing') return

      const num = parseInt(e.key)
      if (num >= 1 && num <= choices.length) {
        e.preventDefault()
        performAction(choices[num - 1])
      }

      if (e.key === '/' || e.key === 'Enter') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, isProcessing, phase, performAction])

  if (phase === 'gameover') {
    return (
      <div className="ws-card rounded-2xl p-5 space-y-4">
        <div className="text-center text-sm text-white/50 py-4">
          模拟已结束
        </div>
        <button
          onClick={() => useGameStore.getState().reset()}
          className="w-full py-2.5 rounded-xl text-sm font-medium
                     ws-btn-ghost hover:ws-btn-ghost-hover cursor-pointer"
        >
          重新开始
        </button>
      </div>
    )
  }

  const handleAction = (action: string) => {
    if (!action.trim() || isProcessing) return
    performAction(action.trim())
    setCustomAction('')
  }

  return (
    <div className="ws-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">可选行动</h3>
        {choices.length > 0 && (
          <span className="text-[10px] text-white/30">按 1-{choices.length} 选择</span>
        )}
      </div>

      {/* AI 生成的选项 */}
      {choices.length > 0 && (
      <div className="grid grid-cols-1 gap-2">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleAction(choice)}
            disabled={isProcessing}
            className="text-left px-4 py-3 text-sm rounded-xl
                       bg-white/[0.03] border border-white/[0.08]
                       hover:border-indigo-400/40 hover:bg-indigo-500/[0.06]
                       hover:shadow-[0_0_12px_rgba(99,102,241,0.1)]
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all duration-300 group cursor-pointer"
          >
            <kbd className="text-[10px] text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded mr-2.5 
                           border border-white/[0.1]
                           group-hover:text-indigo-300 group-hover:bg-indigo-500/10 
                           group-hover:border-indigo-400/30 transition-all duration-300 font-mono">
              {i + 1}
            </kbd>
            <span className="text-white/60 group-hover:text-white/90 transition-colors duration-300">
              {choice}
            </span>
          </button>
        ))}
      </div>
      )}

      {/* 自定义行动输入 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customAction}
            onChange={e => setCustomAction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAction(customAction)}
            placeholder="做点别的...（按 / 聚焦）"
            disabled={isProcessing}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm
                       bg-white/[0.03] border border-white/[0.08]
                       text-white placeholder:text-white/20
                       focus:border-indigo-400/50 focus:bg-white/[0.05]
                       transition-all duration-300
                       disabled:opacity-30"
          />
          <button
            onClick={() => handleAction(customAction)}
            disabled={!customAction.trim() || isProcessing}
            className="px-4 py-2.5 text-sm rounded-xl
                       bg-indigo-500/15 border border-indigo-400/30 text-indigo-300
                       hover:bg-indigo-500/25 hover:border-indigo-400/50
                       hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]
                       disabled:opacity-30 transition-all duration-300 cursor-pointer"
          >
            ↵
          </button>
        </div>
        {choices.length > 0 && (
          <p className="text-[10px] text-white/25 pl-1">不限于上面的选项，你可以尝试任何行动</p>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-xs text-white/40 py-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Agent 正在观察、反思、决策...</span>
        </div>
      )}
    </div>
  )
}
