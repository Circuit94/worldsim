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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-[var(--ws-text-secondary)] uppercase tracking-wider">事件日志</h3>
        <span className="text-[10px] text-[var(--ws-text-muted)] font-mono">{narrativeLog.length} 条</span>
      </div>
      <div className="max-h-[320px] min-h-[120px] overflow-y-auto space-y-1.5 p-4 
                      glass-surface rounded-xl text-sm">
        {narrativeLog.length === 0 && (
          <div className="text-[var(--ws-text-muted)] text-xs space-y-1.5 py-4 text-center">
            <p className="italic">世界尚未开始演化...</p>
            <p className="text-[10px]">提示：按 1-5 快速选择行动，按 / 输入自定义行动</p>
          </div>
        )}
        {narrativeLog.map((entry, i) => {
          // System entries (player actions, round markers)
          if (entry.type === 'system') {
            return (
              <div key={i} className="text-[var(--ws-text-muted)] text-xs font-mono leading-5 pl-0">
                {entry.text}
              </div>
            )
          }

          // Event entries (rule effects, world events)
          if (entry.type === 'event') {
            return (
              <div key={i} className="text-amber-400/80 text-xs leading-5 pl-0 flex items-start gap-1.5">
                <span className="text-amber-500/60 shrink-0">◆</span>
                <span>{entry.text}</span>
              </div>
            )
          }

          // Narrative entries — check for agent prefix
          const parsed = parseAgentPrefix(entry.text)
          if (parsed) {
            return (
              <div key={i} className="flex items-start gap-1.5 leading-5 min-h-[20px]">
                <span className="shrink-0 text-blue-400/70 text-xs font-mono whitespace-nowrap">
                  [{parsed.agentName}]
                </span>
                <span className="text-[var(--ws-text-primary)] break-words min-w-0">
                  {parsed.rest}
                </span>
              </div>
            )
          }

          // Plain narrative line
          return (
            <div key={i} className="text-[var(--ws-text-primary)] leading-6 flex items-start gap-1.5">
              {!entry.text.startsWith('→') && (
                <span className="text-purple-400/50 shrink-0">▸</span>
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
