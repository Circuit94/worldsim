import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

/** Parse agent name from text like "[老K] 老K眯着眼..." */
function parseAgentPrefix(text: string): { agentName: string; rest: string } | null {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (match) return { agentName: match[1], rest: match[2] }
  return null
}

export default function NarrativeLog() {
  const { narrativeLog } = useGameStore()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [narrativeLog.length])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">事件日志</h3>
        <span className="text-[9px] text-gray-700 font-mono">{narrativeLog.length} 条</span>
      </div>
      <div className="max-h-[320px] min-h-[120px] overflow-y-auto space-y-1 p-3 bg-gray-900/30 rounded-lg border border-gray-800 text-sm">
        {narrativeLog.length === 0 && (
          <p className="text-gray-600 text-xs italic">世界尚未开始演化...</p>
        )}
        {narrativeLog.map((entry, i) => {
          // System entries (player actions, round markers)
          if (entry.type === 'system') {
            return (
              <div key={i} className="text-gray-500 text-xs font-mono leading-5 pl-0">
                {entry.text}
              </div>
            )
          }

          // Event entries (rule effects, world events)
          if (entry.type === 'event') {
            return (
              <div key={i} className="text-amber-400/80 text-xs leading-5 pl-0">
                {entry.text}
              </div>
            )
          }

          // Narrative entries — check for agent prefix
          const parsed = parseAgentPrefix(entry.text)
          if (parsed) {
            // Agent reaction line: [角色名] 内容
            return (
              <div key={i} className="flex items-start gap-1.5 leading-5 min-h-[20px]">
                <span className="shrink-0 text-cyan-400/70 text-xs font-mono whitespace-nowrap">
                  [{parsed.agentName}]
                </span>
                <span className="text-gray-200 break-words min-w-0">
                  {parsed.rest}
                </span>
              </div>
            )
          }

          // Plain narrative line
          return (
            <div key={i} className="text-gray-200 leading-5 flex items-start gap-1">
              {!entry.text.startsWith('→') && (
                <span className="text-purple-400/60 shrink-0">▸</span>
              )}
              <span className="break-words min-w-0">{entry.text}</span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
