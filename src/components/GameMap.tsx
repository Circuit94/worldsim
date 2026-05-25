import { useGameStore } from '../store/gameStore'

export default function GameMap() {
  const { world, player } = useGameStore()
  if (!world || !player) return null

  const [cols, rows] = world.dimensions

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">
          {world.name}
        </h3>
        <span className="text-[10px] text-gray-600 font-mono">
          {cols}×{rows} · seed: {world.seed.slice(0, 12)}
        </span>
      </div>

      <div
        className="grid gap-0.5 w-fit mx-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {world.map.map((row, y) =>
          row.map((tileId, x) => {
            const isPlayer = player.position[0] === x && player.position[1] === y
            const agent = world.agents.find(a => a.position[0] === x && a.position[1] === y)
            const item = world.items.find(i => !i.collected && i.position[0] === x && i.position[1] === y)
            const tile = world.tiles[tileId]

            // Determine what to show
            let emoji = tile?.emoji || '⬛'
            let label = tile?.name?.slice(0, 2) || ''
            let ringColor = 'border-gray-800'
            let bgColor = ''

            if (item) {
              emoji = item.emoji
              label = item.name?.slice(0, 2) || ''
              ringColor = 'border-yellow-700'
              bgColor = 'bg-yellow-950/20'
            }
            if (agent) {
              emoji = agent.emoji
              label = agent.name?.slice(0, 2) || ''
              ringColor = agent.memory.attitude > 20 
                ? 'border-green-600' 
                : agent.memory.attitude < -20 
                  ? 'border-red-600' 
                  : 'border-blue-700'
              bgColor = 'bg-blue-950/20'
            }
            if (isPlayer) {
              emoji = '👤'
              label = '你'
              ringColor = 'border-purple-500'
              bgColor = 'bg-purple-950/30'
            }

            // Tooltip
            const tooltip = isPlayer
              ? `你的位置 (${x}, ${y})`
              : agent
                ? `${agent.name}（态度: ${agent.memory.attitude > 0 ? '+' : ''}${agent.memory.attitude}）${agent.memory.currentPlan ? '\n计划: ' + agent.memory.currentPlan : ''}`
                : item
                  ? `物品: ${item.name}`
                  : `${tile?.name || tileId} (${x}, ${y})`

            return (
              <div
                key={`${x}-${y}`}
                className={`w-12 h-12 flex flex-col items-center justify-center
                           bg-gray-900 rounded border ${ringColor} ${bgColor}
                           hover:bg-gray-800 transition-colors cursor-default relative
                           ${isPlayer ? 'ring-1 ring-purple-400/50' : ''}`}
                title={tooltip}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="text-[8px] text-gray-500 leading-none mt-0.5 truncate max-w-[40px]">
                  {label}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-gray-500 pt-1">
        <span className="text-purple-400">👤 你</span>
        {world.agents.map(a => (
          <span key={a.id} className={
            a.memory.attitude > 20 ? 'text-green-400' :
            a.memory.attitude < -20 ? 'text-red-400' : 'text-gray-400'
          }>
            {a.emoji} {a.name}
            <span className="text-gray-600 ml-0.5">
              ({a.memory.attitude > 0 ? '+' : ''}{a.memory.attitude})
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
