import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { MODEL_OPTIONS, type GeminiModel } from '../api/gemini'
import { SCENARIO_CONFIGS, type ScenarioMode } from '../engine/scenarios'

export default function WorldInput() {
  const [theme, setTheme] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('gemini-2.0-flash')
  const [mode, setMode] = useState<ScenarioMode>('game')
  const { setApiKey: storeSetKey, startGame, isProcessing, error } = useGameStore()

  const currentConfig = SCENARIO_CONFIGS[mode]

  const handleStart = () => {
    if (!apiKey.trim()) return
    if (!theme.trim()) return
    storeSetKey(apiKey.trim(), model)
    startGame(theme.trim(), mode)
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          WorldSim
        </h1>
        <p className="text-gray-400 text-sm">
          AI World Simulation Engine — One engine, infinite scenarios
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          Simulation Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(SCENARIO_CONFIGS).map(config => (
            <button
              key={config.mode}
              onClick={() => { setMode(config.mode); setTheme('') }}
              className={`text-center px-3 py-3 rounded-lg border text-sm transition-all ${
                mode === config.mode
                  ? 'border-purple-500 bg-purple-950/50 text-purple-200'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="text-lg">{config.icon}</div>
              <div className="font-medium text-xs mt-1">{config.label}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 text-center">{currentConfig.description}</p>
      </div>

      {/* API Key Input */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          {model.startsWith('deepseek') 
            ? 'DeepSeek API Key (platform.deepseek.com)' 
            : 'Gemini API Key (ai.google.dev)'}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={model.startsWith('deepseek') ? 'sk-...' : 'AIza...'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm
                     focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Model Selector (collapsed) */}
      <details className="group" open>
        <summary className="text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-400">
          Model Settings ▸
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-[10px] text-gray-600">DeepSeek (recommended)</p>
          <div className="grid grid-cols-1 gap-2">
            {MODEL_OPTIONS.filter(o => o.provider === 'deepseek').map(opt => (
              <button
                key={opt.id}
                onClick={() => setModel(opt.id)}
                className={`text-left px-4 py-2 rounded-lg border text-sm transition-all ${
                  model === opt.id
                    ? 'border-purple-500 bg-purple-950/50 text-purple-200'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs opacity-60">{opt.description}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600">Gemini (free tier)</p>
          <div className="grid grid-cols-1 gap-2">
            {MODEL_OPTIONS.filter(o => o.provider === 'gemini').map(opt => (
              <button
                key={opt.id}
                onClick={() => setModel(opt.id)}
                className={`text-left px-4 py-2 rounded-lg border text-sm transition-all ${
                  model === opt.id
                    ? 'border-purple-500 bg-purple-950/50 text-purple-200'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs opacity-60">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      </details>

      {/* Theme Input */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          {mode === 'game' ? 'World Theme' : mode === 'training' ? 'Training Scenario' : 'Simulation Setup'} — Describe in natural language
        </label>
        <textarea
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder={mode === 'game' 
            ? 'Describe the world you want to explore...' 
            : mode === 'training'
            ? 'Describe the training scenario (role, situation, challenge)...'
            : 'Describe the agents and environment to simulate...'}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm
                     focus:outline-none focus:border-purple-500 transition-colors resize-none"
        />
      </div>

      {/* Scenario Presets */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600">Presets — Click to use:</p>
        <div className="flex flex-wrap gap-2">
          {currentConfig.presets.map((preset, i) => (
            <button
              key={i}
              onClick={() => setTheme(preset.theme)}
              className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full
                         hover:border-purple-500 hover:text-purple-300 transition-all"
              title={preset.description}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!apiKey.trim() || !theme.trim() || isProcessing}
        className="w-full py-3 rounded-lg font-medium text-sm
                   bg-gradient-to-r from-purple-600 to-cyan-600 
                   hover:from-purple-500 hover:to-cyan-500
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        {isProcessing ? '⏳ Generating...' : `${currentConfig.icon} Launch ${currentConfig.label}`}
      </button>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Architecture hint */}
      <div className="pt-4 border-t border-gray-800 text-center">
        <p className="text-[10px] text-gray-700 leading-relaxed">
          Engine Architecture: World Schema DSL → Agent Memory Loop (Stanford Generative Agents) 
          → Deterministic Rule Engine → Pluggable Scenario Layer → Behavior Data Export
        </p>
      </div>
    </div>
  )
}
