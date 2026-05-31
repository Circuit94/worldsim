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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-[var(--ws-text-primary)]">
          创建你的世界
        </h1>
        <p className="text-[var(--ws-text-muted)] text-xs">
          选择一个场景开始，或自定义你的主题
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-[var(--ws-surface-alt)] border border-[var(--ws-border)] rounded-lg p-0.5">
          {Object.values(SCENARIO_CONFIGS).map(config => {
            const isActive = mode === config.mode
            const colorMap = {
              game: 'text-indigo-700 bg-white border-indigo-200 shadow-sm',
              training: 'text-amber-700 bg-white border-amber-200 shadow-sm',
              simulation: 'text-cyan-700 bg-white border-cyan-200 shadow-sm',
            }
            return (
              <button
                key={config.mode}
                onClick={() => { setMode(config.mode); setTheme(''); setSelectedPreset(null) }}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? `${colorMap[config.mode]} border`
                    : 'text-[var(--ws-text-muted)] hover:text-[var(--ws-text-secondary)]'
                }`}
              >
                <ModeIcon emoji={config.icon} size={14} color={isActive ? undefined : '#8b92a8'} />
                <span className="ml-1.5">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-[var(--ws-text-muted)]">{currentConfig.description}</p>

      {/* Preset scenarios */}
      <div className="space-y-2">
        <p className="text-xs text-[var(--ws-text-secondary)] font-medium">推荐场景</p>
        <div className="grid grid-cols-2 gap-2">
          {currentConfig.presets.map((preset, i) => {
            const isSelected = selectedPreset === i
            return (
              <button
                key={i}
                onClick={() => handlePresetClick(i, preset.theme)}
                className={`text-left p-3 rounded-lg border transition-all group cursor-pointer ${
                  isSelected
                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-[var(--ws-border)] bg-white hover:border-indigo-200 hover:bg-[var(--ws-surface-alt)]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <PresetIcon emoji={preset.icon} size={20} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-[var(--ws-text-primary)] group-hover:text-indigo-700'}`}>
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-[var(--ws-text-muted)] mt-0.5 line-clamp-2">
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
        <p className="text-xs text-[var(--ws-text-secondary)] font-medium">
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
          className="w-full bg-white border border-[var(--ws-border)] rounded-lg px-4 py-2.5 text-sm
                     text-[var(--ws-text-primary)] placeholder:text-[var(--ws-text-muted)]
                     focus:outline-none focus:border-indigo-400 transition-colors resize-none"
        />
      </div>

      {/* API Key section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowApiSection(!showApiSection)}
          className="flex items-center gap-2 text-xs text-[var(--ws-text-muted)] hover:text-[var(--ws-text-secondary)] transition-colors cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiKeyConfigured ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
          <span>{apiKeyConfigured ? 'API Key 已配置' : 'API Key 未配置（必需）'}</span>
          <span className="text-[10px]">{showApiSection ? '\u25BE' : '\u25B8'}</span>
        </button>

        {showApiSection && (
          <div className="space-y-3 p-3 bg-[var(--ws-surface-alt)] border border-[var(--ws-border)] rounded-lg">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-[var(--ws-text-muted)]">
                  {model.startsWith('deepseek') ? 'DeepSeek API Key' : 'Gemini API Key'}
                </label>
                <a
                  href={model.startsWith('deepseek') ? 'https://platform.deepseek.com/api_keys' : 'https://aistudio.google.com/apikey'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 underline"
                >
                  免费获取 {'\u2192'}
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={model.startsWith('deepseek') ? 'sk-...' : 'AIza...'}
                className="w-full bg-white border border-[var(--ws-border)] rounded-md px-3 py-2 text-sm
                           text-[var(--ws-text-primary)] placeholder:text-[var(--ws-text-muted)]
                           focus:outline-none focus:border-indigo-400 transition-colors"
              />
              <p className="text-[10px] text-[var(--ws-text-muted)]">
                Key 仅存储在浏览器本地，不会发送到任何第三方服务器
              </p>
            </div>

            <details className="group">
              <summary className="text-[11px] text-[var(--ws-text-muted)] cursor-pointer hover:text-[var(--ws-text-secondary)]">
                切换模型 {'\u25B8'}
              </summary>
              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-[var(--ws-text-muted)]">DeepSeek（推荐）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'deepseek').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-1.5 rounded border text-xs transition-all cursor-pointer ${
                        model === opt.id
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-[var(--ws-border)] text-[var(--ws-text-muted)] hover:border-indigo-200'
                      }`}
                    >
                      {opt.label} <span className="opacity-60">{opt.description}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[var(--ws-text-muted)]">Gemini（免费额度）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'gemini').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-1.5 rounded border text-xs transition-all cursor-pointer ${
                        model === opt.id
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-[var(--ws-border)] text-[var(--ws-text-muted)] hover:border-indigo-200'
                      }`}
                    >
                      {opt.label} <span className="opacity-60">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Start button */}
      <div className="space-y-2">
        <button
          onClick={handleStart}
          disabled={!theme.trim() || isProcessing}
          className="w-full py-3 rounded-lg font-medium text-sm text-white
                     ws-btn-primary hover:ws-btn-primary-hover
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 cursor-pointer"
        >
          {isProcessing ? (
            <span className="inline-flex items-center gap-2"><IconLoader size={14} /> 正在生成...</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ModeIcon emoji={currentConfig.icon} size={16} />
              {!apiKeyConfigured ? '请先配置 API Key' : `启动${currentConfig.label}`}
            </span>
          )}
        </button>

        <div className="text-center text-[10px] text-[var(--ws-text-muted)] space-y-0.5">
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
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <span className="text-red-500 shrink-0">{'\u26A0'}</span>
          <div>
            <p>{error}</p>
            {error.includes('API') && (
              <p className="text-red-500 mt-1">请检查 API Key 是否正确，或尝试切换模型</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
