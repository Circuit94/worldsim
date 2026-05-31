import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { MODEL_OPTIONS, type GeminiModel } from '../api/gemini'
import { SCENARIO_CONFIGS, type ScenarioMode } from '../engine/scenarios'
import { getStoredApiKey, storeApiKey } from '../engine/persistence'
import { ModeIcon, PresetIcon, IconLoader } from './Icons'

export default function WorldInput() {
  const [theme, setTheme] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('deepseek-chat')
  const [mode, setMode] = useState<ScenarioMode>('game')
  const [showApiSection, setShowApiSection] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const { setApiKey: storeSetKey, startGame, isProcessing, error } = useGameStore()

  const currentConfig = SCENARIO_CONFIGS[mode]

  useEffect(() => {
    const stored = getStoredApiKey()
    if (stored) {
      setApiKey(stored)
    } else {
      setShowApiSection(true)
    }
  }, [])

  const handleStart = () => {
    if (!apiKey.trim()) {
      setShowApiSection(true)
      return
    }
    if (!theme.trim()) return
    storeApiKey(apiKey.trim())
    storeSetKey(apiKey.trim(), model)
    startGame(theme.trim(), mode)
  }

  const handlePresetClick = (index: number, presetTheme: string) => {
    setSelectedPreset(index)
    setTheme(presetTheme)
  }

  const apiKeyConfigured = apiKey.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">
          创建你的世界
        </h1>
        <p className="text-white/40 text-xs">
          选择一个场景开始，或自定义你的主题
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-1 backdrop-blur-sm">
          {Object.values(SCENARIO_CONFIGS).map(config => {
            const isActive = mode === config.mode
            const colorMap = {
              game: 'text-indigo-300 bg-indigo-500/15 border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
              training: 'text-amber-300 bg-amber-500/15 border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.15)]',
              simulation: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]',
            }
            return (
              <button
                key={config.mode}
                onClick={() => { setMode(config.mode); setTheme(''); setSelectedPreset(null) }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? `${colorMap[config.mode]} border`
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                <ModeIcon emoji={config.icon} size={14} color={isActive ? undefined : '#64748b'} />
                <span className="ml-1.5">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-white/30">{currentConfig.description}</p>

      {/* Preset scenarios */}
      <div className="space-y-3">
        <p className="text-xs text-white/50 font-medium">推荐场景</p>
        <div className="grid grid-cols-2 gap-3">
          {currentConfig.presets.map((preset, i) => {
            const isSelected = selectedPreset === i
            return (
              <button
                key={i}
                onClick={() => handlePresetClick(i, preset.theme)}
                className={`text-left p-4 rounded-xl border transition-all duration-300 group cursor-pointer ${
                  isSelected
                    ? 'border-indigo-400/40 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.12)]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <PresetIcon emoji={preset.icon} size={20} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isSelected ? 'text-indigo-300' : 'text-white/80 group-hover:text-white'
                    }`}>
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom theme */}
      <div className="space-y-2">
        <p className="text-xs text-white/50 font-medium">
          {selectedPreset !== null ? '已选场景（可编辑）' : '或者，自定义主题'}
        </p>
        <textarea
          value={theme}
          onChange={e => { setTheme(e.target.value); setSelectedPreset(null) }}
          placeholder={mode === 'game' 
            ? '描述你想探索的世界（如：赛博朋克城市中的地下黑市、末日后的图书馆...）' 
            : mode === 'training'
            ? '描述培训场景（如：新任经理的第一次绩效面谈、危机公关发布会...）'
            : '描述要模拟的系统（如：5个AI Agent在封闭空间中的资源竞争...）'}
          rows={2}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none
                     bg-white/[0.03] border border-white/[0.08]
                     text-white placeholder:text-white/25
                     focus:border-indigo-400/50 focus:bg-white/[0.05]
                     transition-all duration-300"
        />
      </div>

      {/* API Key section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowApiSection(!showApiSection)}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiKeyConfigured ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-red-400 animate-pulse shadow-[0_0_6px_rgba(248,113,113,0.5)]'}`} />
          <span>{apiKeyConfigured ? 'API Key 已配置' : 'API Key 未配置（必需）'}</span>
          <span className="text-[10px]">{showApiSection ? '\u25BE' : '\u25B8'}</span>
        </button>

        {showApiSection && (
          <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-white/40">
                  {model.startsWith('deepseek') ? 'DeepSeek API Key' : 'Gemini API Key'}
                </label>
                <a
                  href={model.startsWith('deepseek') ? 'https://platform.deepseek.com/api_keys' : 'https://aistudio.google.com/apikey'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  免费获取 {'\u2192'}
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={model.startsWith('deepseek') ? 'sk-...' : 'AIza...'}
                className="w-full rounded-lg px-3 py-2.5 text-sm
                           bg-white/[0.04] border border-white/[0.1]
                           text-white placeholder:text-white/20
                           focus:border-indigo-400/50 transition-all duration-300"
              />
              <p className="text-[10px] text-white/25">
                Key 仅存储在浏览器本地，不会发送到任何第三方服务器
              </p>
            </div>

            <details className="group">
              <summary className="text-[11px] text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                切换模型 {'\u25B8'}
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/30">DeepSeek（推荐）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'deepseek').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all duration-300 cursor-pointer ${
                        model === opt.id
                          ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/[0.06] text-white/40 hover:border-white/[0.12] hover:text-white/60'
                      }`}
                    >
                      {opt.label} <span className="opacity-50">{opt.description}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/30">Gemini（免费额度）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'gemini').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all duration-300 cursor-pointer ${
                        model === opt.id
                          ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/[0.06] text-white/40 hover:border-white/[0.12] hover:text-white/60'
                      }`}
                    >
                      {opt.label} <span className="opacity-50">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Start button */}
      <div className="space-y-3">
        <button
          onClick={handleStart}
          disabled={!theme.trim() || isProcessing}
          className="w-full py-3.5 rounded-xl font-medium text-sm text-white
                     ws-btn-primary hover:ws-btn-primary-hover
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none
                     transition-all duration-300 cursor-pointer
                     relative overflow-hidden group"
        >
          {isProcessing ? (
            <span className="inline-flex items-center gap-2 relative z-10"><IconLoader size={14} /> 正在生成世界...</span>
          ) : (
            <span className="inline-flex items-center gap-2 relative z-10">
              <ModeIcon emoji={currentConfig.icon} size={16} />
              {!apiKeyConfigured ? '请先配置 API Key' : `启动${currentConfig.label}`}
            </span>
          )}
          {/* Button shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                          translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        </button>

        <div className="text-center text-[10px] text-white/25 space-y-1">
          <p>{'\u23F1'} 首次生成约 5-15 秒 · 后续每步 2-5 秒</p>
          <p>
            {mode === 'game' && '你将获得一个可探索的像素世界，包含 NPC、物品和事件'}
            {mode === 'training' && '你将进入一个情景模拟，面对利益相关方做出决策'}
            {mode === 'simulation' && '你将观察多个 AI Agent 自主交互，可随时干预'}
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl border border-red-400/30 bg-red-500/10 backdrop-blur-sm
                        text-xs text-red-300 flex items-start gap-2">
          <span className="text-red-400 shrink-0">{'\u26A0'}</span>
          <div>
            <p>{error}</p>
            {error.includes('API') && (
              <p className="text-red-400/70 mt-1">请检查 API Key 是否正确，或尝试切换模型</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
