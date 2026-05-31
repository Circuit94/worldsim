/**
 * Unified loading indicator component
 */
export default function LoadingDots({ text, className = '' }: { text?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-xs text-white/50 py-3 ${className}`}>
      <div className="flex gap-1" role="status" aria-label="加载中">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      {text && <span>{text}</span>}
    </div>
  )
}
