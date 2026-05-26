/**
 * GameMap — 像素风格探索地图 v3 (Static PNG Tileset)
 * 
 * 使用提前生成好的 48x48 像素风格 PNG 图片渲染地块。
 * 每种地形都有独特的颜色和纹理，一眼可辨。
 * 
 * - NPC 使用预生成的像素风格动漫头像 PNG
 * - 物品使用 SVG 图标
 * - 迷雾随探索揭开
 * - 玩家位置高亮
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
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs text-gray-400">{world.name}</span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">
          {player.steps}步 · {cols}×{world.dimensions[1]}
        </span>
      </div>

      {/* 地图 + 信息面板 */}
      <div className="flex gap-3 flex-col sm:flex-row">
        {/* 地图网格 */}
        <div
          ref={mapRef}
          className="relative rounded-xl border border-gray-800/60 bg-[#0a0a0f] p-2 overflow-auto
                     shadow-[inset_0_1px_12px_rgba(0,0,0,0.8)] max-h-[420px] flex-1 min-w-0"
        >
          <div
            className="grid gap-[1px] w-fit mx-auto"
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

                // 迷雾层
                const fogLevel = visible ? 0 : explored ? 0.4 : 0.82

                // 地块图片
                const tileImgSrc = tile?.walkable === false
                  ? getUnwalkableImage()
                  : getTileImage(tile?.name || '', tile?.description)

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`
                      relative w-[48px] h-[48px] rounded-md overflow-hidden cursor-pointer select-none
                      transition-all duration-200
                      ${isPlayer ? 'ring-2 ring-purple-400/70 z-10 scale-105' :
                        isHovered ? 'ring-1 ring-white/40 z-10 brightness-110' : ''}
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

                    {/* 地块名称 — 底部标签（仅近距离可见时） */}
                    {visible && tile?.name && !entity && !isPlayer && (
                      <div className="absolute bottom-0 left-0 right-0 px-0.5 py-px bg-black/50 backdrop-blur-sm">
                        <span className="text-[7px] text-white/70 leading-none block text-center truncate">
                          {tile.name}
                        </span>
                      </div>
                    )}

                    {/* 实体：Agent — 像素风格头像 PNG */}
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
                              boxShadow: `0 0 10px ${visual.accentColor}50`,
                              imageRendering: 'pixelated',
                            }}
                            draggable={false}
                          />
                        </div>
                      )
                    })()}

                    {/* 实体：物品 — SVG 图标 */}
                    {entity?.type === 'item' && (() => {
                      const icon = getItemIcon(entity.data.name, entity.data.description)
                      return (
                        <div className={`absolute inset-0 flex items-center justify-center z-10
                          transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="w-7 h-7 rounded-md bg-black/60 border border-white/20
                                         flex items-center justify-center animate-float backdrop-blur-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={icon.color}>
                              <path d={icon.path} />
                            </svg>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 玩家 — 像素头像 */}
                    {isPlayer && (
                      <div className="absolute inset-0 flex items-center justify-center z-20" data-player>
                        <div className="absolute w-11 h-11 rounded-full bg-purple-400/15 animate-ping-slow" />
                        <img
                          src={getPlayerAvatarUrl()}
                          alt="玩家"
                          className="w-10 h-10 rounded-full border-2 border-purple-300/80 shadow-lg shadow-purple-500/50 object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          draggable={false}
                        />
                      </div>
                    )}

                    {/* 迷雾 */}
                    {fogLevel > 0 && (
                      <div
                        className="absolute inset-0 bg-[#0a0a0f] pointer-events-none transition-opacity duration-700"
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
        <div className="w-full sm:w-44 shrink-0 space-y-2">
          {hoverInfo ? (
            <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-2.5 space-y-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {/* 小地块预览 */}
                <img
                  src={getTileImage(hoverInfo.tile?.name || '', hoverInfo.tile?.description)}
                  alt=""
                  className="w-6 h-6 rounded border border-gray-700"
                />
                <span className="text-xs text-gray-200 font-medium">{hoverInfo.tile?.name || '未知'}</span>
              </div>
              {hoverInfo.tile?.description && (
                <p className="text-[10px] text-gray-500 leading-relaxed">{hoverInfo.tile.description}</p>
              )}
              <div className="text-[9px] text-gray-600 font-mono">({hoverInfo.x}, {hoverInfo.y})</div>
              {hoverInfo.isPlayer && (
                <div className="text-[10px] text-purple-400 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a4 4 0 1 0 0 8 4 4 0 1 0 0-8z" /><path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z" /></svg>
                  你在这里
                </div>
              )}
              {hoverInfo.entity?.type === 'agent' && (() => {
                const visual = getAgentVisual(hoverInfo.entity!.data.name, hoverInfo.entity!.data.id, hoverInfo.entity!.data.persona)
                return (
                  <div className="pt-1.5 border-t border-gray-800 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={visual.avatarUrl}
                        alt={hoverInfo.entity!.data.name}
                        className="w-5 h-5 rounded-full border"
                        style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                      />
                      <span className="text-[11px] text-gray-200">{hoverInfo.entity!.data.name}</span>
                    </div>
                    <div className={`text-[10px] ${
                      hoverInfo.entity!.data.memory.attitude > 20 ? 'text-emerald-400' :
                      hoverInfo.entity!.data.memory.attitude < -20 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      态度 {hoverInfo.entity!.data.memory.attitude > 0 ? '+' : ''}{hoverInfo.entity!.data.memory.attitude}
                    </div>
                    {hoverInfo.entity!.data.memory.currentPlan && (
                      <div className="text-[9px] text-gray-500">
                        → {hoverInfo.entity!.data.memory.currentPlan}
                      </div>
                    )}
                  </div>
                )
              })()}
              {hoverInfo.entity?.type === 'item' && (() => {
                const icon = getItemIcon(hoverInfo.entity!.data.name, hoverInfo.entity!.data.description)
                return (
                  <div className="pt-1.5 border-t border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={icon.color}><path d={icon.path} /></svg>
                      <span className="text-[10px]" style={{ color: icon.color }}>{hoverInfo.entity!.data.name}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5">{hoverInfo.entity!.data.description}</p>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-600 text-center">悬停查看地块详情</p>
            </div>
          )}

          {/* 图例 */}
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-2 space-y-1.5">
            <div className="text-[9px] text-gray-500 mb-1">图例</div>
            <div className="flex items-center gap-1.5">
              <img src={getPlayerAvatarUrl()} alt="玩家" className="w-5 h-5 rounded-full border border-purple-300/50" style={{ imageRendering: 'pixelated' }} />
              <span className="text-[10px] text-gray-400">你</span>
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
                  <span className="text-[10px] text-gray-400">{a.name}</span>
                </div>
              )
            })}
            {world.items.filter(i => !i.collected).length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-black/50 border border-white/20 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#f0c050"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
                </div>
                <span className="text-[10px] text-gray-400">物品</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
