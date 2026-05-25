import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import LandingHero from './components/LandingHero'
import WorldInput from './components/WorldInput'
import GameMap from './components/GameMap'
import StatusBar from './components/StatusBar'
import NarrativeLog from './components/NarrativeLog'
import ActionPanel from './components/ActionPanel'
import DebugPanel from './components/DebugPanel'
import AnalyticsPanel from './components/AnalyticsPanel'

export default function App() {
  const { phase, world, scenarioMode } = useGameStore()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showLanding, setShowLanding] = useState(true)

  if (phase === 'setup' && showLanding) {
    return <LandingHero onEnter={() => setShowLanding(false)} />
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WorldInput />
      </div>
    )
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">🌍</div>
          <p className="text-gray-400 text-sm animate-pulse">Generating world simulation...</p>
          <div className="text-gray-700 text-[10px] space-y-1">
            <p>▸ Constructing spatial map & tile system</p>
            <p>▸ Instantiating memory-driven agents</p>
            <p>▸ Compiling causal rule chains</p>
            <p>▸ Seeding world state for reproducibility</p>
          </div>
        </div>
      </div>
    )
  }

  // Playing or GameOver
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-mono text-gray-600">
            <span className="text-purple-400">WorldSim</span>
            <span className="text-gray-500 ml-1 text-[10px]">
              {scenarioMode === 'game' ? '探索' : scenarioMode === 'training' ? '培训' : '仿真'}
            </span>
            <span className="text-[10px] text-gray-700 ml-2">{world?.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            {world && (
              <span className="text-[10px] text-gray-700 font-mono hidden sm:inline">
                seed:{world.seed.slice(0, 16)}
              </span>
            )}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`text-xs px-2 py-1 rounded border transition-all ${
                showAnalytics 
                  ? 'bg-purple-950 border-purple-700 text-purple-300' 
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-purple-700'
              }`}
            >
              📊
            </button>
            <button
              onClick={() => useGameStore.getState().reset()}
              className="text-xs px-2 py-1 rounded bg-gray-900 border border-gray-800
                         hover:border-red-700 text-gray-500 hover:text-red-400 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Left column — Map + Status + Log */}
          <div className="space-y-4">
            <GameMap />
            <StatusBar />
            <NarrativeLog />
            {/* Analytics (inline when toggled) */}
            {showAnalytics && (
              <div className="lg:hidden">
                <AnalyticsPanel />
              </div>
            )}
          </div>

          {/* Right column — Actions + Agents + Analytics */}
          <div className="space-y-4">
            <ActionPanel />

            {/* Agent info panel */}
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
                        <span>{agent.emoji} <strong>{agent.name}</strong></span>
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
                          💭 {agent.memory.reflections[agent.memory.reflections.length - 1]}
                        </p>
                      )}
                      {agent.memory.observations.length > 0 && (
                        <p className="text-gray-600 mt-0.5 text-[10px]">
                          📝 {agent.memory.observations[agent.memory.observations.length - 1]?.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Panel (desktop sidebar) */}
            {showAnalytics && (
              <div className="hidden lg:block">
                <AnalyticsPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug Transparency Layer */}
      <DebugPanel />
    </div>
  )
}
