import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import { getAgentVisual } from './engine/tileVisuals'
import { loadAutoSave } from './engine/persistence'
import LandingHero from './components/LandingHero'
import WorldInput from './components/WorldInput'
import GameMap from './components/GameMap'
import StatusBar from './components/StatusBar'
import NarrativeLog from './components/NarrativeLog'
import ActionPanel from './components/ActionPanel'
import DebugPanel from './components/DebugPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import TrainingView from './components/TrainingView'
import SimulationView from './components/SimulationView'

export default function App() {
  const { phase, world, scenarioMode } = useGameStore()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLanding, setShowLanding] = useState(true)

  if (phase === 'setup' && showLanding) {
    return <LandingHero onEnter={(resumeAutoSave) => {
      if (resumeAutoSave) {
        const save = loadAutoSave()
        if (save) {
          // Restore auto-save state directly into the store
          useGameStore.setState({
            phase: 'playing',
            world: save.world,
            player: save.player,
            narrativeLog: save.narrativeLog,
            choices: save.choices,
            debugLogs: save.debugLogs,
            totalTokensUsed: save.totalTokensUsed,
            scenarioMode: save.mode,
            isProcessing: false,
            error: null,
          })
          return
        }
      }
      setShowLanding(false)
    }} />
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WorldInput />
      </div>
    )
  }

  if (phase === 'generating') {
    const loadingText = scenarioMode === 'game' 
      ? ['▸ 构建空间地图与地块系统', '▸ 初始化记忆驱动的 Agent', '▸ 编译因果规则链', '▸ 播种可复现的世界状态']
      : scenarioMode === 'training'
      ? ['▸ 构建情景模拟环境', '▸ 初始化利益相关方角色', '▸ 设定决策评估维度', '▸ 加载能力评估模型']
      : ['▸ 部署多智能体仿真环境', '▸ 配置行为模型参数', '▸ 初始化交互规则', '▸ 启动自主推演引擎']

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full animate-bounce border-2 border-purple-500/50 flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #1a1030 0%, #2d1b69 100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
              {scenarioMode === 'game' 
                ? <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>
                : scenarioMode === 'training'
                ? <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>
                : <><path d="M9 3h6v11a3 3 0 1 1-6 0V3z"/><path d="M6 14a6 6 0 0 0 12 0"/><line x1="12" y1="20" x2="12" y2="23"/></>}
            </svg>
          </div>
          <p className="text-gray-400 text-sm animate-pulse">
            {scenarioMode === 'game' ? '正在生成世界模拟...' : 
             scenarioMode === 'training' ? '正在构建评估情景...' : 
             '正在部署仿真环境...'}
          </p>
          <p className="text-gray-600 text-xs">通常需要 5-15 秒，取决于模型响应速度</p>
          <div className="text-gray-700 text-[10px] space-y-1">
            {loadingText.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Playing / GameOver — 按模式渲染不同布局
  // ============================================================

  return (
    <div className="min-h-screen p-4">
      {/* 通用顶部栏 */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-mono text-gray-600">
            <span className="text-purple-400">WorldSim</span>
            <span className={`ml-1 text-[10px] ${
              scenarioMode === 'game' ? 'text-purple-500' :
              scenarioMode === 'training' ? 'text-amber-500' :
              'text-emerald-500'
            }`}>
              {scenarioMode === 'game' ? '探索' : scenarioMode === 'training' ? '情景评估' : '仿真'}
            </span>
            <span className="text-[10px] text-gray-700 ml-2">{world?.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            {world && scenarioMode === 'game' && (
              <span className="text-[10px] text-gray-700 font-mono hidden sm:inline">
                种子:{world.seed.slice(0, 16)}
              </span>
            )}
            {scenarioMode === 'game' && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`text-xs px-2 py-1 rounded border transition-all ${
                  showAnalytics 
                    ? 'bg-purple-950 border-purple-700 text-purple-300' 
                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-purple-700'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
              </button>
            )}
            <button
              onClick={() => useGameStore.getState().reset()}
              className="text-xs px-2 py-1 rounded bg-gray-900 border border-gray-800
                         hover:border-red-700 text-gray-500 hover:text-red-400 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* 模式专属布局 */}
      {scenarioMode === 'training' && <TrainingView />}
      {scenarioMode === 'simulation' && <SimulationView />}
      {scenarioMode === 'game' && (
        <div className="max-w-6xl mx-auto space-y-4">
          {/* 游戏模式 — 保持现有地图 + 状态 + 日志布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-4">
              <GameMap />
              <StatusBar />
              <NarrativeLog />
              {showAnalytics && (
                <div className="lg:hidden">
                  <AnalyticsPanel />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <ActionPanel />

              {/* Agent 信息 */}
              {world && world.agents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider">
                    角色 <span className="text-gray-700">({world.agents.length} 活跃)</span>
                  </h3>
                  <div className="space-y-1.5">
                    {world.agents.map(agent => (
                      <div
                        key={agent.id}
                        className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {(() => {
                              const visual = getAgentVisual(agent.name, agent.id)
                              return (
                                <img
                                  src={visual.avatarUrl}
                                  alt={visual.initial}
                                  className="w-4 h-4 rounded-full border object-cover"
                                  style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                                />
                              )
                            })()}
                            <strong>{agent.name}</strong>
                          </span>
                          <span className={`font-mono ${
                            agent.memory.attitude > 20 ? 'text-green-400' :
                            agent.memory.attitude < -20 ? 'text-red-400' :
                            'text-gray-500'
                          }`}>
                            {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                          </span>
                        </div>
                        {agent.memory.currentPlan && (
                          <p className="text-purple-400/60 mt-1 text-[10px]">
                            → {agent.memory.currentPlan}
                          </p>
                        )}
                        {agent.memory.reflections.length > 0 && (
                          <p className="text-cyan-400/50 mt-0.5 text-[10px] italic">
                            ◦ {agent.memory.reflections[agent.memory.reflections.length - 1]}
                          </p>
                        )}
                        {agent.memory.observations.length > 0 && (
                          <p className="text-gray-600 mt-0.5 text-[10px]">
                            ▸ {agent.memory.observations[agent.memory.observations.length - 1]?.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAnalytics && (
                <div className="hidden lg:block">
                  <AnalyticsPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug 仅在探索模式显示 */}
      {scenarioMode === 'game' && <DebugPanel />}
    </div>
  )
}
