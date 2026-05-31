/**
 * GameMap — 像素风格探索地图 v4 (Refined Design)
 * 
 * 设计升级：
 * - 玻璃态容器
 * - 更精致的地块边框和阴影
 * - 统一的色调系统
 */

import { useGameStore } from '../store/gameStore'
import { useMemo, useRef, useEffect, useState } from 'react'
import { getTileImage, getUnwalkableImage, getAgentVisual, getPlayerAvatarUrl, getItemIcon } from '../engine/tileVisuals'

/** 曼哈顿距离 */
function dist(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

/** 已探索过的格子记录 */
let exploredSet = new Set<string>()

export function resetExploredSet() {
  exploredSet = new Set<string>()
}

export default function GameMap() {
  const { world, player } = useGameStore()

  useEffect(() => {
    if (!world) {
      exploredSet = new Set<string>()
    }
  }, [world])
  const mapRef = useRef<HTMLDivElement>(null)
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null)

  // 记录已探索区域
  useEffect(() => {
    if (!player) return
    const [px, py] = player.position
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) {
          exploredSet.add(`${px + dx},${py + dy}`)
        }
      }
    }
  }, [player?.position])

  // 玩家移动时滚动到可见
  useEffect(() => {
    if (mapRef.current && player) {
      const el = mapRef.current.querySelector('[data-player]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [player?.position])

  if (!world || !player) return null

  const [cols] = world.dimensions

  // 实体索引
  const entityAt = useMemo(() => {
    const m = new Map<string, { type: 'agent' | 'item'; data: any }>()
    world.agents.forEach(a => m.set(`${a.position[0]},${a.position[1]}`, { type: 'agent', data: a }))
    world.items.filter(i => !i.collected).forEach(i => {
      const k = `${i.position[0]},${i.position[1]}`
      if (!m.has(k)) m.set(k, { type: 'item', data: i })
    })
    return m
  }, [world.agents, world.items])

  // hovered tile 详情
  const hoverInfo = useMemo(() => {
    if (!hoveredTile) return null
    const { x, y } = hoveredTile
    const tileId = world.map[y]?.[x]
    const tile = world.tiles[tileId]
    const entity = entityAt.get(`${x},${y}`)
    const isPlayer = player.position[0] === x && player.position[1] === y
    return { tile, entity, isPlayer, x, y }
  }, [hoveredTile, world, player, entityAt])

  return (
    <div className="space-y-3">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-glow-pulse" />
          <span className="text-xs text-[var(--ws-text-secondary)]">{world.name}</span>
        </div>
        <span className="text-[10px] text-[var(--ws-text-muted)] font-mono">
          {player.steps}步 · {cols}×{world.dimensions[1]}
        </span>
      </div>

      {/* 地图 + 信息面板 */}
      <div className="flex gap-4 flex-col sm:flex-row">
        {/* 地图网格 */}
        <div
          ref={mapRef}
          className="relative rounded-2xl glass-card p-3 overflow-auto max-h-[420px] flex-1 min-w-0"
        >
          <div
            className="grid gap-[2px] w-fit mx-auto"
            style={{ gridTemplateColumns: `repeat(${cols}, 48px)` }}
          >
            {world.map.map((row, y) =>
              row.map((tileId, x) => {
                const tile = world.tiles[tileId]
                const isPlayer = player.position[0] === x && player.position[1] === y
                const entity = entityAt.get(`${x},${y}`)
                const d = dist(player.position, [x, y])
                const explored = exploredSet.has(`${x},${y}`)
                const visible = d <= 2
                const isHovered = hoveredTile?.x === x && hoveredTile?.y === y

                const fogLevel = visible ? 0 : explored ? 0.4 : 0.82

                const tileImgSrc = tile?.walkable === false
                  ? getUnwalkableImage()
                  : getTileImage(tile?.name || '', tile?.description)

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`
                      relative w-[48px] h-[48px] rounded-lg overflow-hidden cursor-pointer select-none
                      transition-all duration-200
                      ${isPlayer ? 'ring-2 ring-purple-400/60 z-10 scale-105' :
                        isHovered ? 'ring-1 ring-white/30 z-10 brightness-110' : ''}
                    `}
                    onMouseEnter={() => setHoveredTile({ x, y })}
                    onMouseLeave={() => setHoveredTile(null)}
                  >
                    {/* 地块图片 */}
                    <img
                      src={tileImgSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />

                    {/* 地块名称 */}
                    {visible && tile?.name && !entity && !isPlayer && (
                      <div className="absolute bottom-0 left-0 right-0 px-0.5 py-px bg-black/60 backdrop-blur-sm">
                        <span className="text-[7px] text-white/70 leading-none block text-center truncate">
                          {tile.name}
                        </span>
                      </div>
                    )}

                    {/* 实体：Agent */}
                    {entity?.type === 'agent' && (() => {
                      const visual = getAgentVisual(entity.data.name, entity.data.id, entity.data.persona)
                      return (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 
                          transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                          <img
                            src={visual.avatarUrl}
                            alt={entity.data.name}
                            className="w-10 h-10 rounded-full border-2 shadow-lg object-cover"
                            style={{
                              borderColor: visual.accentColor,
                              boxShadow: `0 0 12px ${visual.accentColor}40`,
                              imageRendering: 'pixelated',
                            }}
                            draggable={false}
                          />
                        </div>
                      )
                    })()}

                    {/* 实体：物品 */}
                    {entity?.type === 'item' && (() => {
                      const icon = getItemIcon(entity.data.name, entity.data.description)
                      return (
                        <div className={`absolute inset-0 flex items-center justify-center z-10
                          transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="w-7 h-7 rounded-lg bg-black/60 border border-white/15
                                         flex items-center justify-center animate-float backdrop-blur-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={icon.color}>
                              <path d={icon.path} />
                            </svg>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 玩家 */}
                    {isPlayer && (
                      <div className="absolute inset-0 flex items-center justify-center z-20" data-player>
                        <div className="absolute w-11 h-11 rounded-full bg-purple-400/15 animate-ping-slow" />
                        <img
                          src={getPlayerAvatarUrl()}
                          alt="玩家"
                          className="w-10 h-10 rounded-full border-2 border-purple-300/80 shadow-lg shadow-purple-500/40 object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          draggable={false}
                        />
                      </div>
                    )}

                    {/* 迷雾 */}
                    {fogLevel > 0 && (
                      <div
                        className="absolute inset-0 bg-[#08080f] pointer-events-none transition-opacity duration-700"
                        style={{ opacity: fogLevel }}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 右侧 Hover 详情面板 */}
        <div className="w-full sm:w-44 shrink-0 space-y-3">
          {hoverInfo ? (
            <div className="glass-card rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src={getTileImage(hoverInfo.tile?.name || '', hoverInfo.tile?.description)}
                  alt=""
                  className="w-6 h-6 rounded border border-white/[0.08]"
                />
                <span className="text-xs text-[var(--ws-text-primary)] font-medium">{hoverInfo.tile?.name || '未知'}</span>
              </div>
              {hoverInfo.tile?.description && (
                <p className="text-[10px] text-[var(--ws-text-muted)] leading-relaxed">{hoverInfo.tile.description}</p>
              )}
              <div className="text-[9px] text-[var(--ws-text-muted)] font-mono">({hoverInfo.x}, {hoverInfo.y})</div>
              {hoverInfo.isPlayer && (
                <div className="text-[10px] text-purple-400 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a4 4 0 1 0 0 8 4 4 0 1 0 0-8z" /><path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z" /></svg>
                  你在这里
                </div>
              )}
              {hoverInfo.entity?.type === 'agent' && (() => {
                const visual = getAgentVisual(hoverInfo.entity!.data.name, hoverInfo.entity!.data.id, hoverInfo.entity!.data.persona)
                return (
                  <div className="pt-2 border-t border-white/[0.04] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={visual.avatarUrl}
                        alt={hoverInfo.entity!.data.name}
                        className="w-5 h-5 rounded-full border"
                        style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                      />
                      <span className="text-[11px] text-[var(--ws-text-primary)]">{hoverInfo.entity!.data.name}</span>
                    </div>
                    <div className={`text-[10px] ${
                      hoverInfo.entity!.data.memory.attitude > 20 ? 'text-emerald-400' :
                      hoverInfo.entity!.data.memory.attitude < -20 ? 'text-red-400' : 'text-[var(--ws-text-secondary)]'
                    }`}>
                      态度 {hoverInfo.entity!.data.memory.attitude > 0 ? '+' : ''}{hoverInfo.entity!.data.memory.attitude}
                    </div>
                    {hoverInfo.entity!.data.memory.currentPlan && (
                      <div className="text-[9px] text-[var(--ws-text-muted)]">
                        → {hoverInfo.entity!.data.memory.currentPlan}
                      </div>
                    )}
                  </div>
                )
              })()}
              {hoverInfo.entity?.type === 'item' && (() => {
                const icon = getItemIcon(hoverInfo.entity!.data.name, hoverInfo.entity!.data.description)
                return (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={icon.color}><path d={icon.path} /></svg>
                      <span className="text-[10px]" style={{ color: icon.color }}>{hoverInfo.entity!.data.name}</span>
                    </div>
                    <p className="text-[9px] text-[var(--ws-text-muted)] mt-0.5">{hoverInfo.entity!.data.description}</p>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="glass-surface rounded-xl p-3">
              <p className="text-[10px] text-[var(--ws-text-muted)] text-center">悬停查看地块详情</p>
            </div>
          )}

          {/* 图例 */}
          <div className="glass-surface rounded-xl p-3 space-y-2">
            <div className="text-[9px] text-[var(--ws-text-muted)] uppercase tracking-wider mb-1">图例</div>
            <div className="flex items-center gap-1.5">
              <img src={getPlayerAvatarUrl()} alt="玩家" className="w-5 h-5 rounded-full border border-purple-300/50" style={{ imageRendering: 'pixelated' }} />
              <span className="text-[10px] text-[var(--ws-text-secondary)]">你</span>
            </div>
            {world.agents.map(a => {
              const visual = getAgentVisual(a.name, a.id, a.persona)
              return (
                <div key={a.id} className="flex items-center gap-1.5">
                  <img
                    src={visual.avatarUrl}
                    alt={a.name}
                    className="w-5 h-5 rounded-full border"
                    style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                  />
                  <span className="text-[10px] text-[var(--ws-text-secondary)]">{a.name}</span>
                </div>
              )
            })}
            {world.items.filter(i => !i.collected).length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-black/50 border border-white/15 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#f0c050"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
                </div>
                <span className="text-[10px] text-[var(--ws-text-secondary)]">物品</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
