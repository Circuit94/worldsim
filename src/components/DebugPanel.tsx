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
                   bg-white/[0.04] border border-white/[0.1] text-white/40 backdrop-blur-sm
                   hover:border-indigo-400/30 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.1)]
                   transition-all duration-300 z-50 cursor-pointer"
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
                    bg-[#0f0f1a]/95 backdrop-blur-xl border-l border-t border-white/[0.08]
                    overflow-hidden flex flex-col z-50 shadow-2xl rounded-tl-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-indigo-400">◇ 提示工程透明层</span>
          <span className="text-[10px] text-white/30 font-mono">
            共 {totalTokensUsed.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1]
                       hover:border-indigo-400/30 text-white/40 hover:text-indigo-300 transition-all duration-300 cursor-pointer"
          >
            ⇩ 导出会话
          </button>
          <button
            onClick={toggleDebug}
            className="text-white/30 hover:text-white/70 transition-colors text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {debugLogs.map((log, i) => (
          <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.1] transition-colors">
            <button
              onClick={() => setExpandedLog(expandedLog === i ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px]
                         hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                  log.type === 'world_gen' 
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/30' 
                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                }`}>
                  {log.type === 'world_gen' ? '生成' : '行动'}
                </span>
                <span className="text-white/50 font-mono">
                  {log.promptTokens}→{log.responseTokens} Token
                </span>
                <span className="text-white/30 font-mono">
                  {log.latencyMs}ms
                </span>
              </div>
              <span className="text-white/30">{expandedLog === i ? '▼' : '▶'}</span>
            </button>

            {expandedLog === i && (
              <div className="border-t border-white/[0.06] p-3 space-y-3">
                <div>
                  <p className="text-[9px] text-white/30 uppercase mb-1">提示词 (输入)</p>
                  <pre className="text-[10px] text-white/60 bg-white/[0.02] p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/[0.06]">
                    {log.prompt}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] text-white/30 uppercase mb-1">响应 (输出)</p>
                  <pre className="text-[10px] text-indigo-300/80 bg-indigo-500/[0.05] p-2.5 rounded-lg overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap border border-indigo-400/10">
                    {log.response}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {debugLogs.length === 0 && (
          <p className="text-xs text-white/30 text-center py-8">
            暂无 API 调用记录。生成一个世界后即可查看提示工程细节。
          </p>
        )}
      </div>
    </div>
  )
}
