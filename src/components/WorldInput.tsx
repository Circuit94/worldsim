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

  // 尝试从 localStorage 恢复 API Key
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
      {/* Header — 简洁 */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-gray-200">
          创建你的世界
        </h1>
        <p className="text-gray-500 text-xs">
          选择一个场景开始，或自定义你的主题
        </p>
      </div>

      {/* ============================================================ */}
      {/* 模式选择 — 紧凑标签页 */}
      {/* ============================================================ */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
          {Object.values(SCENARIO_CONFIGS).map(config => {
            const isActive = mode === config.mode
            const colorMap = {
              game: 'text-purple-300 bg-purple-950/80 border-purple-700',
              training: 'text-amber-300 bg-amber-950/80 border-amber-700',
              simulation: 'text-emerald-300 bg-emerald-950/80 border-emerald-700',
            }
            return (
              <button
                key={config.mode}
                onClick={() => { setMode(config.mode); setTheme(''); setSelectedPreset(null) }}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? `${colorMap[config.mode]} border`
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ModeIcon emoji={config.icon} size={14} color={isActive ? undefined : '#6b7280'} />
                <span className="ml-1.5">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 模式说明 */}
      <p className="text-center text-[11px] text-gray-600">{currentConfig.description}</p>

      {/* ============================================================ */}
      {/* 预设场景 — 主要入口，大卡片 */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">推荐场景</p>
        <div className="grid grid-cols-2 gap-2">
          {currentConfig.presets.map((preset, i) => {
            const isSelected = selectedPreset === i
            return (
              <button
                key={i}
                onClick={() => handlePresetClick(i, preset.theme)}
                className={`text-left p-3 rounded-lg border transition-all group ${
                  isSelected
                    ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500/30'
                    : 'border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <PresetIcon emoji={preset.icon} size={20} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-200' : 'text-gray-300 group-hover:text-gray-200'}`}>
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 自定义主题 — 可展开 */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">
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
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm
                     focus:outline-none focus:border-purple-500 transition-colors resize-none
                     placeholder:text-gray-700"
        />
      </div>

      {/* ============================================================ */}
      {/* API Key — 折叠式，已配置时只显示状态 */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <button
          onClick={() => setShowApiSection(!showApiSection)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiKeyConfigured ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span>{apiKeyConfigured ? 'API Key 已配置' : 'API Key 未配置（必需）'}</span>
          <span className="text-[10px]">{showApiSection ? '▾' : '▸'}</span>
        </button>

        {showApiSection && (
          <div className="space-y-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-gray-500">
                  {model.startsWith('deepseek') ? 'DeepSeek API Key' : 'Gemini API Key'}
                </label>
                <a
                  href={model.startsWith('deepseek') ? 'https://platform.deepseek.com/api_keys' : 'https://aistudio.google.com/apikey'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                >
                  免费获取 →
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={model.startsWith('deepseek') ? 'sk-...' : 'AIza...'}
                className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[10px] text-gray-700">
                Key 仅存储在浏览器本地，不会发送到任何第三方服务器
              </p>
            </div>

            {/* 模型选择 */}
            <details className="group">
              <summary className="text-[11px] text-gray-600 cursor-pointer hover:text-gray-400">
                切换模型 ▸
              </summary>
              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-600">DeepSeek（推荐）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'deepseek').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-1.5 rounded border text-xs transition-all ${
                        model === opt.id
                          ? 'border-purple-600 bg-purple-950/50 text-purple-200'
                          : 'border-gray-800 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {opt.label} <span className="opacity-50">{opt.description}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-600">Gemini（免费额度）</p>
                  {MODEL_OPTIONS.filter(o => o.provider === 'gemini').map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={`w-full text-left px-3 py-1.5 rounded border text-xs transition-all ${
                        model === opt.id
                          ? 'border-purple-600 bg-purple-950/50 text-purple-200'
                          : 'border-gray-800 text-gray-500 hover:border-gray-600'
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

      {/* ============================================================ */}
      {/* 启动按钮 + 期望设定 */}
      {/* ============================================================ */}
      <div className="space-y-2">
        <button
          onClick={handleStart}
          disabled={!theme.trim() || isProcessing}
          className="w-full py-3 rounded-lg font-medium text-sm
                     bg-gradient-to-r from-purple-600 to-cyan-600 
                     hover:from-purple-500 hover:to-cyan-500
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-purple-900/20"
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

        {/* 期望设定 */}
        <div className="text-center text-[10px] text-gray-700 space-y-0.5">
          <p>⏱ 首次生成约 5-15 秒 · 后续每步 2-5 秒</p>
          <p>
            {mode === 'game' && '你将获得一个可探索的像素世界，包含 NPC、物品和事件'}
            {mode === 'training' && '你将进入一个情景模拟，面对利益相关方做出决策'}
            {mode === 'simulation' && '你将观察多个 AI Agent 自主交互，可随时干预'}
          </p>
        </div>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300 flex items-start gap-2">
          <span className="text-red-500 shrink-0">⚠</span>
          <div>
            <p>{error}</p>
            {error.includes('API') && (
              <p className="text-red-400/60 mt-1">请检查 API Key 是否正确，或尝试切换模型</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
