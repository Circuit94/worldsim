import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'

export default function StatusBar() {
  const { player, world, totalTokensUsed } = useGameStore()
  if (!player) return null

  const hpPercent = (player.hp / player.maxHp) * 100
  const hpColor = hpPercent > 60 ? 'bg-emerald-400' : hpPercent > 30 ? 'bg-amber-400' : 'bg-red-400'
  const hpGlow = hpPercent > 60 ? 'shadow-[0_0_6px_rgba(52,211,153,0.4)]' : hpPercent > 30 ? 'shadow-[0_0_6px_rgba(251,191,36,0.4)]' : 'shadow-[0_0_6px_rgba(248,113,113,0.4)]'

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs px-4 py-3 
                    ws-surface rounded-xl">
      {/* 生命值 */}
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-[10px] uppercase tracking-wide">HP</span>
        <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full ${hpColor} ${hpGlow} rounded-full transition-all duration-500`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <span className="text-white/60 font-mono w-12">{player.hp}/{player.maxHp}</span>
      </div>

      {/* 背包 */}
      <div className="flex items-center gap-1.5">
        <span className="text-white/30 text-[10px] uppercase tracking-wide">背包</span>
        <span className="text-white/60">
          {player.inventory.length > 0 ? player.inventory.join(', ') : '空'}
        </span>
      </div>

      {/* 步数 */}
      <div className="flex items-center gap-1.5">
        <span className="text-white/30 text-[10px] uppercase tracking-wide">步数</span>
        <span className="text-white/60 font-mono">{player.steps}</span>
      </div>

      {/* Token 用量 */}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-white/20 text-[10px]">消耗</span>
        <span className="text-white/30 font-mono">{totalTokensUsed.toLocaleString()} Token</span>
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
                className="w-5 h-5 rounded-full border object-cover cursor-help transition-all duration-300 hover:scale-125"
                style={{
                  borderColor: visual.accentColor,
                  opacity: Math.abs(a.memory.attitude) > 20 ? 1 : 0.5,
                  imageRendering: 'pixelated',
                  boxShadow: Math.abs(a.memory.attitude) > 20 ? `0 0 8px ${visual.accentColor}40` : 'none',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
