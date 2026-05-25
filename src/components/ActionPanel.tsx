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
      <div className="space-y-3">
        <div className="text-center text-sm text-gray-400 py-4">
          模拟已结束
        </div>
        <button
          onClick={() => useGameStore.getState().reset()}
          className="w-full py-2 rounded-lg text-sm bg-gray-800 border border-gray-700
                     hover:border-purple-500 transition-colors"
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">可选行动</h3>
        <span className="text-[10px] text-gray-700">按 1-{choices.length} 选择，/ 输入自定义</span>
      </div>

      {/* AI 生成的选项 */}
      <div className="grid grid-cols-1 gap-2">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleAction(choice)}
            disabled={isProcessing}
            className="text-left px-3 py-2 text-sm rounded-lg
                       bg-gray-900 border border-gray-700
                       hover:border-purple-500 hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all group"
          >
            <kbd className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded mr-2
                           group-hover:text-purple-400 group-hover:bg-purple-950 transition-colors">
              {i + 1}
            </kbd>
            {choice}
          </button>
        ))}
      </div>

      {/* 自定义行动输入 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={customAction}
          onChange={e => setCustomAction(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAction(customAction)}
          placeholder="输入自定义行动...（按 / 聚焦）"
          disabled={isProcessing}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:border-cyan-500 transition-colors
                     disabled:opacity-40"
        />
        <button
          onClick={() => handleAction(customAction)}
          disabled={!customAction.trim() || isProcessing}
          className="px-4 py-2 text-sm rounded-lg bg-cyan-900 border border-cyan-700
                     hover:bg-cyan-800 disabled:opacity-40 transition-colors"
        >
          执行
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-2">
          <div className="flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
          </div>
          <span>世界正在思考...</span>
        </div>
      )}
    </div>
  )
}
