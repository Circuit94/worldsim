import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'

export default function StatusBar() {
  const { player, world, totalTokensUsed } = useGameStore()
  if (!player) return null

  const hpPercent = (player.hp / player.maxHp) * 100
  const hpColor = hpPercent > 60 ? 'bg-emerald-500' : hpPercent > 30 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs px-4 py-3 
                    glass-surface rounded-xl">
      {/* 生命值 */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--ws-text-muted)] text-[10px] uppercase tracking-wide">HP</span>
        <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full ${hpColor} rounded-full transition-all duration-300`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <span className="text-[var(--ws-text-secondary)] font-mono w-12">{player.hp}/{player.maxHp}</span>
      </div>

      {/* 背包 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--ws-text-muted)] text-[10px] uppercase tracking-wide">背包</span>
        <span className="text-[var(--ws-text-secondary)]">
          {player.inventory.length > 0 ? player.inventory.join(', ') : '空'}
        </span>
      </div>

      {/* 步数 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--ws-text-muted)] text-[10px] uppercase tracking-wide">步数</span>
        <span className="text-[var(--ws-text-secondary)] font-mono">{player.steps}</span>
      </div>

      {/* Token 用量 */}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[var(--ws-text-muted)] text-[10px]">消耗</span>
        <span className="text-[var(--ws-text-muted)] font-mono">{totalTokensUsed.toLocaleString()} Token</span>
      </div>

      {/* NPC 态度一览 */}
      {world && world.agents.length > 0 && (
        <div className="flex items-center gap-2">
          {world.agents.map(a => {
            const visual = getAgentVisual(a.name, a.id)
            return (
              <img
                key={a.id}
                src={visual.avatarUrl}
                alt={visual.initial}
                title={`${a.name}（态度: ${a.memory.attitude > 0 ? '+' : ''}${a.memory.attitude}）${a.memory.currentPlan ? '\n当前计划: ' + a.memory.currentPlan : ''}${a.memory.reflections.length > 0 ? '\n反思: ' + a.memory.reflections[a.memory.reflections.length - 1] : ''}`}
                className="w-5 h-5 rounded-full border object-cover cursor-help transition-opacity"
                style={{
                  borderColor: visual.accentColor,
                  opacity: Math.abs(a.memory.attitude) > 20 ? 1 : 0.5,
                  imageRendering: 'pixelated',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
