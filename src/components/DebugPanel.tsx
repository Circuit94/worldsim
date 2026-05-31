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
                   glass-card text-[var(--ws-text-muted)]
                   hover:border-purple-500/20 hover:text-purple-300 transition-all z-50 cursor-pointer"
      >
        ◇ 开发模式
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
                    bg-[#0a0a12]/95 backdrop-blur-xl border-l border-t border-white/[0.06]
                    overflow-hidden flex flex-col z-50 shadow-2xl rounded-tl-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-purple-400">◇ 提示工程透明层</span>
          <span className="text-[10px] text-[var(--ws-text-muted)] font-mono">
            共 {totalTokensUsed.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]
                       hover:border-blue-500/20 text-[var(--ws-text-muted)] hover:text-blue-300 transition-all cursor-pointer"
          >
            ⇩ 导出会话
          </button>
          <button
            onClick={toggleDebug}
            className="text-[var(--ws-text-muted)] hover:text-white transition-colors text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {debugLogs.map((log, i) => (
          <div key={i} className="border border-white/[0.04] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedLog(expandedLog === i ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px]
                         hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                  log.type === 'world_gen' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                }`}>
                  {log.type === 'world_gen' ? '生成' : '行动'}
                </span>
                <span className="text-[var(--ws-text-secondary)] font-mono">
                  {log.promptTokens}→{log.responseTokens} Token
                </span>
                <span className="text-[var(--ws-text-muted)] font-mono">
                  {log.latencyMs}ms
                </span>
              </div>
              <span className="text-[var(--ws-text-muted)]">{expandedLog === i ? '▼' : '▶'}</span>
            </button>

            {expandedLog === i && (
              <div className="border-t border-white/[0.04] p-3 space-y-3">
                <div>
                  <p className="text-[9px] text-[var(--ws-text-muted)] uppercase mb-1">提示词 (输入)</p>
                  <pre className="text-[10px] text-[var(--ws-text-secondary)] bg-white/[0.02] p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">
                    {log.prompt}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--ws-text-muted)] uppercase mb-1">响应 (输出)</p>
                  <pre className="text-[10px] text-emerald-400/70 bg-white/[0.02] p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/[0.03]">
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
