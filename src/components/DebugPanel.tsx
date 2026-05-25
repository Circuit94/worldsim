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
                   bg-gray-900 border border-gray-700 text-gray-500
                   hover:border-purple-500 hover:text-purple-400 transition-all z-50"
      >
        🔬 Dev Mode
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
    <div className="fixed bottom-0 right-0 w-[480px] max-h-[60vh] bg-gray-950 border-l border-t border-gray-800 
                    overflow-hidden flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-purple-400">🔬 Prompt Engineering Transparency Layer</span>
          <span className="text-[10px] text-gray-600 font-mono">
            {totalTokensUsed.toLocaleString()} tokens total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-[10px] px-2 py-1 rounded bg-gray-800 border border-gray-700
                       hover:border-cyan-600 text-gray-400 hover:text-cyan-300 transition-all"
          >
            📦 Export Session
          </button>
          <button
            onClick={toggleDebug}
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {debugLogs.map((log, i) => (
          <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedLog(expandedLog === i ? null : i)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px]
                         hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                  log.type === 'world_gen' ? 'bg-purple-900 text-purple-300' : 'bg-cyan-900 text-cyan-300'
                }`}>
                  {log.type === 'world_gen' ? 'GEN' : 'ACT'}
                </span>
                <span className="text-gray-400 font-mono">
                  {log.promptTokens}→{log.responseTokens} tok
                </span>
                <span className="text-gray-600 font-mono">
                  {log.latencyMs}ms
                </span>
              </div>
              <span className="text-gray-600">{expandedLog === i ? '▼' : '▶'}</span>
            </button>

            {expandedLog === i && (
              <div className="border-t border-gray-800 p-3 space-y-3">
                <div>
                  <p className="text-[9px] text-gray-600 uppercase mb-1">Prompt (input)</p>
                  <pre className="text-[10px] text-gray-400 bg-gray-900 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {log.prompt}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] text-gray-600 uppercase mb-1">Response (output)</p>
                  <pre className="text-[10px] text-green-400/70 bg-gray-900 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {log.response}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {debugLogs.length === 0 && (
          <p className="text-xs text-gray-700 text-center py-8">
            No API calls yet. Generate a world to see prompt engineering in action.
          </p>
        )}
      </div>
    </div>
  )
}
