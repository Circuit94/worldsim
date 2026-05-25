import { useGameStore } from '../store/gameStore'

export default function StatusBar() {
  const { player, world, totalTokensUsed } = useGameStore()
  if (!player) return null

  const hpPercent = (player.hp / player.maxHp) * 100
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
      {/* 生命值 */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-[10px]">生命</span>
        <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${hpColor} transition-all duration-300`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <span className="text-gray-400 font-mono w-12">{player.hp}/{player.maxHp}</span>
      </div>

      {/* 背包 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-[10px]">背包</span>
        <span className="text-gray-400">
          {player.inventory.length > 0 ? player.inventory.join(', ') : '空'}
        </span>
      </div>

      {/* 步数 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-[10px]">步数</span>
        <span className="text-gray-400 font-mono">{player.steps}</span>
      </div>

      {/* Token 用量 */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-gray-700 text-[10px]">消耗</span>
        <span className="text-gray-700 font-mono">{totalTokensUsed.toLocaleString()} tokens</span>
      </div>

      {/* NPC 态度一览 */}
      {world && world.agents.length > 0 && (
        <div className="flex items-center gap-2">
          {world.agents.map(a => (
            <span
              key={a.id}
              title={`${a.name}（态度: ${a.memory.attitude > 0 ? '+' : ''}${a.memory.attitude}）${a.memory.currentPlan ? '\n当前计划: ' + a.memory.currentPlan : ''}${a.memory.reflections.length > 0 ? '\n反思: ' + a.memory.reflections[a.memory.reflections.length - 1] : ''}`}
              className={`text-sm cursor-help ${
                a.memory.attitude > 20 ? 'opacity-100' :
                a.memory.attitude < -20 ? 'opacity-100 grayscale' :
                'opacity-50'
              }`}
            >
              {a.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
