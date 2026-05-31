import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { Diamond, ChevronDown } from 'lucide-react'

/** Parse agent name from text like "[老K] 老K眯着眼..." */
function parseAgentPrefix(text: string): { agentName: string; rest: string } | null {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (match) return { agentName: match[1], rest: match[2] }
  return null
}

export default function NarrativeLog() {
  const { narrativeLog } = useGameStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const prevLengthRef = useRef(narrativeLog.length)

  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 60
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsAtBottom(atBottom)
    if (atBottom) setHasNewMessages(false)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkIfAtBottom)
    return () => el.removeEventListener('scroll', checkIfAtBottom)
  }, [checkIfAtBottom])

  useEffect(() => {
    if (narrativeLog.length > prevLengthRef.current) {
      if (isAtBottom) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        setHasNewMessages(true)
      }
    }
    prevLengthRef.current = narrativeLog.length
  }, [narrativeLog.length, isAtBottom])

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
    setHasNewMessages(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">事件日志</h3>
        <span className="text-[10px] text-white/40 font-mono">{narrativeLog.length} 条</span>
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          className="max-h-[320px] min-h-[120px] overflow-y-auto space-y-1.5 p-4 
                     ws-surface rounded-xl text-sm"
          role="log"
          aria-label="事件日志"
          aria-live="polite"
        >
          {narrativeLog.length === 0 && (
            <div className="text-white/40 text-xs space-y-1.5 py-4 text-center">
              <p className="italic">世界尚未开始演化...</p>
              <p className="text-[10px] text-white/30">提示：按 1-5 快速选择行动，按 / 输入自定义行动</p>
            </div>
          )}
          {narrativeLog.map((entry, i) => {
            const isNew = i >= prevLengthRef.current - 1 && i === narrativeLog.length - 1

            // System entries (player actions, round markers)
            if (entry.type === 'system') {
              return (
                <div key={i} className={`text-white/40 text-xs font-mono leading-5 pl-0 ${isNew ? 'animate-slide-in' : ''}`}>
                  {entry.text}
                </div>
              )
            }

            // Event entries (rule effects, world events)
            if (entry.type === 'event') {
              return (
                <div key={i} className={`text-amber-400/80 text-xs leading-5 pl-0 flex items-start gap-1.5 ${isNew ? 'animate-slide-in' : ''}`}>
                  <Diamond size={10} className="text-amber-400 shrink-0 mt-1" />
                  <span>{entry.text}</span>
                </div>
              )
            }

            // Narrative entries — check for agent prefix
            const parsed = parseAgentPrefix(entry.text)
            if (parsed) {
              return (
                <div key={i} className={`flex items-start gap-1.5 leading-5 min-h-[20px] ${isNew ? 'animate-slide-in' : ''}`}>
                  <span className="shrink-0 text-indigo-400 text-xs font-mono whitespace-nowrap">
                    [{parsed.agentName}]
                  </span>
                  <span className="text-white/80 break-words min-w-0">
                    {parsed.rest}
                  </span>
                </div>
              )
            }

            // Plain narrative line
            return (
              <div key={i} className={`text-white/80 leading-6 flex items-start gap-1.5 ${isNew ? 'animate-slide-in' : ''}`}>
                {!entry.text.startsWith('→') && (
                  <ChevronDown size={12} className="text-indigo-400/60 shrink-0 mt-1 rotate-[-90deg]" />
                )}
                <span className="break-words min-w-0">{entry.text}</span>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* New messages indicator */}
        {hasNewMessages && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 
                       px-3 py-1.5 rounded-full text-[10px]
                       bg-indigo-500/20 border border-indigo-400/40 text-indigo-300
                       backdrop-blur-sm shadow-[0_0_12px_rgba(99,102,241,0.2)]
                       hover:bg-indigo-500/30 transition-all cursor-pointer
                       animate-slide-in flex items-center gap-1"
          >
            <ChevronDown size={12} />
            新消息
          </button>
        )}
      </div>
    </div>
  )
}
