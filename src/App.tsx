import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import { getAgentVisual } from './engine/tileVisuals'
import { loadAutoSave, getStoredApiKey } from './engine/persistence'
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
          const storedKey = getStoredApiKey()
          if (storedKey) {
            useGameStore.getState().setApiKey(storedKey)
          }
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
      ? ['构建空间地图与地块系统', '初始化记忆驱动的 Agent', '编译因果规则链', '播种可复现的世界状态']
      : scenarioMode === 'training'
      ? ['构建情景模拟环境', '初始化利益相关方角色', '设定决策评估维度', '加载能力评估模型']
      : ['部署多智能体仿真环境', '配置行为模型参数', '初始化交互规则', '启动自主推演引擎']

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          {/* 加载动画 */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-purple-500/20 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" className="animate-spin" style={{ animationDuration: '3s' }}>
                {scenarioMode === 'game' 
                  ? <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>
                  : scenarioMode === 'training'
                  ? <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>
                  : <><path d="M9 3h6v11a3 3 0 1 1-6 0V3z"/><path d="M6 14a6 6 0 0 0 12 0"/><line x1="12" y1="20" x2="12" y2="23"/></>}
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--ws-text-secondary)] text-sm">
              {scenarioMode === 'game' ? '正在生成世界模拟...' : 
               scenarioMode === 'training' ? '正在构建评估情景...' : 
               '正在部署仿真环境...'}
            </p>
            <p className="text-[var(--ws-text-muted)] text-xs">通常需要 5-15 秒</p>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-1.5">
            {loadingText.map((t, i) => (
              <p key={i} className="text-[var(--ws-text-muted)] text-[11px] animate-fade-in-up" 
                 style={{ animationDelay: `${i * 200}ms`, opacity: 0 }}>
                <span className="text-purple-400/60 mr-1.5">▸</span>{t}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Playing / GameOver
  // ============================================================

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* 顶部栏 */}
      <div className="max-w-6xl mx-auto mb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-mono text-[var(--ws-text-muted)]">
            <span className="text-gradient-brand font-semibold">WorldSim</span>
            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${
              scenarioMode === 'game' ? 'text-purple-300 border-purple-500/20 bg-purple-500/5' :
              scenarioMode === 'training' ? 'text-amber-300 border-amber-500/20 bg-amber-500/5' :
              'text-emerald-300 border-emerald-500/20 bg-emerald-500/5'
            }`}>
              {scenarioMode === 'game' ? '探索' : scenarioMode === 'training' ? '情景评估' : '仿真'}
            </span>
            <span className="text-[11px] text-[var(--ws-text-muted)] ml-3">{world?.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            {world && scenarioMode === 'game' && (
              <span className="text-[10px] text-[var(--ws-text-muted)] font-mono hidden sm:inline">
                种子:{world.seed.slice(0, 16)}
              </span>
            )}
            {scenarioMode === 'game' && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  showAnalytics 
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' 
                    : 'bg-white/[0.02] border-white/[0.06] text-[var(--ws-text-muted)] hover:border-purple-500/20 hover:text-purple-300'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
              </button>
            )}
            <button
              onClick={() => useGameStore.getState().reset()}
              className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]
                         hover:border-red-500/20 text-[var(--ws-text-muted)] hover:text-red-400 transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 模式专属布局 */}
      {scenarioMode === 'training' && <TrainingView />}
      {scenarioMode === 'simulation' && <SimulationView />}
      {scenarioMode === 'game' && (
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
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
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-medium text-[var(--ws-text-secondary)] uppercase tracking-wider">
                    角色 <span className="text-[var(--ws-text-muted)]">({world.agents.length} 活跃)</span>
                  </h3>
                  <div className="space-y-2">
                    {world.agents.map(agent => (
                      <div
                        key={agent.id}
                        className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {(() => {
                              const visual = getAgentVisual(agent.name, agent.id)
                              return (
                                <img
                                  src={visual.avatarUrl}
                                  alt={visual.initial}
                                  className="w-5 h-5 rounded-full border object-cover"
                                  style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                                />
                              )
                            })()}
                            <strong className="text-[var(--ws-text-primary)]">{agent.name}</strong>
                          </span>
                          <span className={`font-mono text-[11px] ${
                            agent.memory.attitude > 20 ? 'text-emerald-400' :
                            agent.memory.attitude < -20 ? 'text-red-400' :
                            'text-[var(--ws-text-muted)]'
                          }`}>
                            {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                          </span>
                        </div>
                        {agent.memory.currentPlan && (
                          <p className="text-purple-400/60 mt-1.5 text-[10px]">
                            → {agent.memory.currentPlan}
                          </p>
                        )}
                        {agent.memory.reflections.length > 0 && (
                          <p className="text-blue-400/50 mt-1 text-[10px] italic">
                            ◦ {agent.memory.reflections[agent.memory.reflections.length - 1]}
                          </p>
                        )}
                        {agent.memory.observations.length > 0 && (
                          <p className="text-[var(--ws-text-muted)] mt-1 text-[10px]">
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

      {/* Debug */}
      {scenarioMode === 'game' && <DebugPanel />}
    </div>
  )
}
