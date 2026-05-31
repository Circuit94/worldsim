import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

export default function DebugPanel() {
  const { debugLogs, showDebug, toggleDebug, totalTokensUsed, exportSession } = useGameStore()
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  if (!showDebug) {
    return (
      <button
        onClick={toggleDebug}
        className="fixed bottom-4 right-4 px-3 py-1.5 text-[10px] rounded-full
                   ws-card text-[var(--ws-text-muted)]
                   hover:border-indigo-300 hover:text-indigo-600 transition-all z-50 cursor-pointer"
      >
        {'\u25C7'} 开发模式
      </button>
    )
  }

  const handleExport = () => {
    const session = exportSession()
    if (!session) return
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldsim-session-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed bottom-0 right-0 w-[480px] max-h-[60vh] 
                    bg-white/95 backdrop-blur-xl border-l border-t border-[var(--ws-border)]
                    overflow-hidden flex flex-col z-50 shadow-xl rounded-tl-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ws-border)] bg-[var(--ws-surface-alt)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-indigo-600">{'\u25C7'} 提示工程透明层</span>
          <span className="text-[10px] text-[var(--ws-text-muted)] font-mono">
            共 {totalTokensUsed.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-white border border-[var(--ws-border)]
                       hover:border-indigo-300 text-[var(--ws-text-muted)] hover:text-indigo-600 transition-all cursor-pointer"
          >
            {'\u21E9'} 导出会话
          </button>
          <button
            onClick={toggleDebug}
            className="text-[var(--ws-text-muted)] hover:text-[var(--ws-text-primary)] transition-colors text-sm cursor-pointer p-1"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {debugLogs.map((log, i) => (
          <div key={i} className="border border-[var(--ws-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedLog(expandedLog === i ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px]
                         hover:bg-[var(--ws-surface-alt)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                  log.type === 'world_gen' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-sky-50 text-sky-600 border border-sky-200'
                }`}>
                  {log.type === 'world_gen' ? '生成' : '行动'}
                </span>
                <span className="text-[var(--ws-text-secondary)] font-mono">
                  {log.promptTokens}{'\u2192'}{log.responseTokens} Token
                </span>
                <span className="text-[var(--ws-text-muted)] font-mono">
                  {log.latencyMs}ms
                </span>
              </div>
              <span className="text-[var(--ws-text-muted)]">{expandedLog === i ? '\u25BC' : '\u25B6'}</span>
            </button>

            {expandedLog === i && (
              <div className="border-t border-[var(--ws-border)] p-3 space-y-3">
                <div>
                  <p className="text-[9px] text-[var(--ws-text-muted)] uppercase mb-1">提示词 (输入)</p>
                  <pre className="text-[10px] text-[var(--ws-text-secondary)] bg-[var(--ws-surface-alt)] p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-[var(--ws-border)]">
                    {log.prompt}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--ws-text-muted)] uppercase mb-1">响应 (输出)</p>
                  <pre className="text-[10px] text-indigo-700 bg-indigo-50/50 p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-indigo-100">
                    {log.response}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {debugLogs.length === 0 && (
          <p className="text-xs text-[var(--ws-text-muted)] text-center py-8">
            暂无 API 调用记录。生成一个世界后即可查看提示工程细节。
          </p>
        )}
      </div>
    </div>
  )
}
