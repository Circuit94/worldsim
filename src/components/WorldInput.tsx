import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { MODEL_OPTIONS, type GeminiModel } from '../api/gemini'
import { SCENARIO_CONFIGS, type ScenarioMode } from '../engine/scenarios'
import { ModeIcon, PresetIcon, IconLoader } from './Icons'

export default function WorldInput() {
  const [theme, setTheme] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('deepseek-chat')
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
          AI 世界模拟引擎 — 一个引擎，无限场景
        </p>
      </div>

      {/* 模式选择 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          选择场景模式
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(SCENARIO_CONFIGS).map(config => {
            const colorMap = {
              game: { active: 'border-purple-500 bg-purple-950/50 text-purple-200', dot: 'bg-purple-400' },
              training: { active: 'border-amber-500 bg-amber-950/50 text-amber-200', dot: 'bg-amber-400' },
              simulation: { active: 'border-emerald-500 bg-emerald-950/50 text-emerald-200', dot: 'bg-emerald-400' },
            }
            const colors = colorMap[config.mode]
            return (
              <button
                key={config.mode}
                onClick={() => { setMode(config.mode); setTheme('') }}
                className={`text-center px-3 py-3 rounded-lg border text-sm transition-all ${
                  mode === config.mode
                    ? colors.active
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex justify-center"><ModeIcon emoji={config.icon} size={22} color={mode === config.mode ? undefined : '#6b7280'} /></div>
                <div className="font-medium text-xs mt-1">{config.label}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  {config.mode === 'game' ? 'C端玩家' : config.mode === 'training' ? 'B端培训' : '研究分析'}
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-600 text-center">{currentConfig.description}</p>
      </div>

      {/* API Key 输入 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          {model.startsWith('deepseek') 
            ? 'DeepSeek API Key（platform.deepseek.com 获取）' 
            : 'Gemini API Key（ai.google.dev 获取）'}
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

      {/* 模型选择 */}
      <details className="group">
        <summary className="text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-400">
          模型设置 ▸
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-[10px] text-gray-600">DeepSeek（推荐，性价比最高）</p>
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
          <p className="text-[10px] text-gray-600">Gemini（免费额度）</p>
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

      {/* 主题输入 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          {mode === 'game' ? '世界主题' : mode === 'training' ? '培训场景' : '仿真设定'} — 用自然语言描述
        </label>
        <textarea
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder={mode === 'game' 
            ? '描述你想探索的世界（如：赛博朋克城市、末日后的图书馆、海底遗迹...）' 
            : mode === 'training'
            ? '描述培训场景（角色、情境、挑战...）'
            : '描述要模拟的 Agent 和环境...'}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm
                     focus:outline-none focus:border-purple-500 transition-colors resize-none"
        />
      </div>

      {/* 预设场景 */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600">快捷预设 — 点击使用：</p>
        <div className="flex flex-wrap gap-2">
          {currentConfig.presets.map((preset, i) => (
            <button
              key={i}
              onClick={() => setTheme(preset.theme)}
              className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full
                         hover:border-purple-500 hover:text-purple-300 transition-all"
              title={preset.description}
            >
              <PresetIcon emoji={preset.icon} size={13} className="inline-block mr-1 opacity-70" />{preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 启动按钮 */}
      <button
        onClick={handleStart}
        disabled={!apiKey.trim() || !theme.trim() || isProcessing}
        className="w-full py-3 rounded-lg font-medium text-sm
                   bg-gradient-to-r from-purple-600 to-cyan-600 
                   hover:from-purple-500 hover:to-cyan-500
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        {isProcessing ? (
          <span className="inline-flex items-center gap-2"><IconLoader size={14} /> 正在生成世界...</span>
        ) : (
          <span className="inline-flex items-center gap-2"><ModeIcon emoji={currentConfig.icon} size={16} /> 启动{currentConfig.label}</span>
        )}
      </button>

      {/* 错误显示 */}
      {error && (
        <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 底部架构提示 */}
      <div className="pt-4 border-t border-gray-800 text-center">
        <p className="text-[10px] text-gray-700 leading-relaxed">
          引擎架构：自然语言 → World Schema → Agent Memory Loop (Stanford Generative Agents) 
          → 确定性规则引擎 → 场景层 → 行为数据输出
        </p>
      </div>
    </div>
  )
}
