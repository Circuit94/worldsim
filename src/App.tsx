import { useState, useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { getAgentVisual } from './engine/tileVisuals'
import { loadAutoSave, getStoredApiKey } from './engine/persistence'
import { BarChart3, X, ArrowRight, CircleDot, Eye } from 'lucide-react'
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
import RuntimeEditor from './components/RuntimeEditor'

export default function App() {
  const { phase, world, scenarioMode } = useGameStore()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [phaseReady, setPhaseReady] = useState(false)

  // Phase transition animation
  useEffect(() => {
    setPhaseReady(false)
    const t = requestAnimationFrame(() => setPhaseReady(true))
    return () => cancelAnimationFrame(t)
  }, [phase, showLanding])

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
      <div className={`min-h-screen flex items-center justify-center p-4 phase-enter ${phaseReady ? 'phase-enter-active' : ''}`}>
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
      <div className={`min-h-screen flex items-center justify-center phase-enter ${phaseReady ? 'phase-enter-active' : ''}`}>
        <div className="text-center space-y-6">
          {/* Loading orb with glow */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            <div className="absolute inset-1 rounded-2xl bg-white/[0.03] border border-white/[0.1] backdrop-blur-sm flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="1.5" strokeLinecap="round" className="animate-spin" style={{ animationDuration: '3s' }}>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                {scenarioMode === 'game' 
                  ? <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>
                  : scenarioMode === 'training'
                  ? <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>
                  : <><path d="M9 3h6v11a3 3 0 1 1-6 0V3z"/><path d="M6 14a6 6 0 0 0 12 0"/><line x1="12" y1="20" x2="12" y2="23"/></>}
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm">
              {scenarioMode === 'game' ? '正在生成世界模拟...' : 
               scenarioMode === 'training' ? '正在构建评估情景...' : 
               '正在部署仿真环境...'}
            </p>
            <p className="text-white/40 text-xs">通常需要 5-15 秒</p>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {loadingText.map((t, i) => (
              <p key={i} className="text-white/50 text-[11px] animate-fade-in-up" 
                 style={{ animationDelay: `${i * 200}ms`, opacity: 0 }}>
                <ArrowRight size={9} className="inline mr-1.5 text-indigo-400" />{t}
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
    <div className={`min-h-screen p-4 sm:p-6 phase-enter ${phaseReady ? 'phase-enter-active' : ''}`}>
      {/* Top bar */}
      <div className="max-w-6xl mx-auto mb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-mono text-white/40">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-semibold">WorldSim</span>
            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border backdrop-blur-sm ${
              scenarioMode === 'game' ? 'text-indigo-300 border-indigo-400/30 bg-indigo-500/10' :
              scenarioMode === 'training' ? 'text-amber-300 border-amber-400/30 bg-amber-500/10' :
              'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
            }`}>
              {scenarioMode === 'game' ? '探索' : scenarioMode === 'training' ? '情景评估' : '仿真'}
            </span>
            <span className="text-[11px] text-white/40 ml-3">{world?.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            {world && scenarioMode === 'game' && (
              <span className="text-[10px] text-white/30 font-mono hidden sm:inline">
                种子:{world.seed.slice(0, 16)}
              </span>
            )}
            <RuntimeEditor />
            {scenarioMode === 'game' && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  showAnalytics 
                    ? 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-indigo-400/30 hover:text-indigo-300'
                }`}
                aria-label={showAnalytics ? '隐藏分析面板' : '显示分析面板'}
                aria-pressed={showAnalytics}
              >
                <BarChart3 size={14} />
              </button>
            )}
            <button
              onClick={() => useGameStore.getState().reset()}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08]
                         hover:border-red-400/30 text-white/50 hover:text-red-400 transition-all cursor-pointer"
              aria-label="结束当前会话"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Mode-specific layouts */}
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

              {/* Agent info */}
              {world && world.agents.length > 0 && (
                <div className="rounded-2xl p-5 space-y-3 bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    角色 <span className="text-white/40">({world.agents.length} 活跃)</span>
                  </h3>
                  <div className="space-y-2">
                    {world.agents.map(agent => (
                      <div
                        key={agent.id}
                        className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-xs
                                   hover:border-white/[0.12] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            {(() => {
                              const visual = getAgentVisual(agent.name, agent.id)
                              return (
                                <img
                                  src={visual.avatarUrl}
                                  alt={agent.name}
                                  className="w-5 h-5 rounded-full border object-cover flex-shrink-0"
                                  style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }}
                                />
                              )
                            })()}
                            <strong className="text-white/80 truncate">{agent.name}</strong>
                          </span>
                          <span className={`font-mono text-[11px] flex-shrink-0 ${
                            agent.memory.attitude > 20 ? 'text-emerald-400' :
                            agent.memory.attitude < -20 ? 'text-red-400' :
                            'text-white/40'
                          }`}>
                            {agent.memory.attitude > 0 ? '+' : ''}{agent.memory.attitude}
                          </span>
                        </div>
                        {agent.memory.currentPlan && (
                          <p className="text-indigo-300/80 mt-1.5 text-[10px] flex items-center gap-1">
                            <ArrowRight size={8} /> {agent.memory.currentPlan}
                          </p>
                        )}
                        {agent.memory.reflections.length > 0 && (
                          <p className="text-cyan-300/60 mt-1 text-[10px] italic flex items-center gap-1">
                            <CircleDot size={8} /> {agent.memory.reflections[agent.memory.reflections.length - 1]}
                          </p>
                        )}
                        {agent.memory.observations.length > 0 && (
                          <p className="text-white/40 mt-1 text-[10px] flex items-center gap-1">
                            <Eye size={8} /> {agent.memory.observations[agent.memory.observations.length - 1]?.content}
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
