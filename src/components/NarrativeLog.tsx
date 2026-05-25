import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export default function NarrativeLog() {
  const { narrativeLog } = useGameStore()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [narrativeLog.length])

  return (
    <div className="space-y-1">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider">事件日志</h3>
      <div className="h-48 overflow-y-auto space-y-1 p-3 bg-gray-900/30 rounded-lg border border-gray-800 text-sm">
        {narrativeLog.length === 0 && (
          <p className="text-gray-600 text-xs italic">世界尚未开始演化...</p>
        )}
        {narrativeLog.map((entry, i) => (
          <div
            key={i}
            className={`leading-relaxed ${
              entry.type === 'system'
                ? 'text-gray-500 text-xs font-mono'
                : entry.type === 'event'
                  ? 'text-amber-400 text-xs italic'
                  : 'text-gray-300'
            }`}
          >
            {entry.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
