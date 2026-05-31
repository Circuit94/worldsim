import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { MODEL_OPTIONS, type GeminiModel } from '../api/gemini'
import { SCENARIO_CONFIGS, type ScenarioMode } from '../engine/scenarios'
import { getStoredApiKey, storeApiKey } from '../engine/persistence'
import { ModeIcon, PresetIcon, IconLoader } from './Icons'
import type { WorldConfig, CustomNPC, CustomRule } from '../engine/types'
import { DEFAULT_WORLD_CONFIG } from '../engine/types'

// ============================================================
// Sub-components
// ============================================================

function NPCEditor({ npcs, onChange }: { npcs: CustomNPC[]; onChange: (npcs: CustomNPC[]) => void }) {
  const addNPC = () => {
    onChange([...npcs, { name: '', persona: '', goals: [''], decisionStyle: 'rational', initialAttitude: 0 }])
  }
  const removeNPC = (idx: number) => {
    onChange(npcs.filter((_, i) => i !== idx))
  }
  const updateNPC = (idx: number, field: keyof CustomNPC, value: any) => {
    const updated = [...npcs]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/50 font-medium">自定义角色</p>
        <button
          onClick={addNPC}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          + 添加角色
        </button>
      </div>
      {npcs.length === 0 && (
        <p className="text-[10px] text-white/25 italic">未设置自定义角色，AI 将自由生成所有 NPC</p>
      )}
      {npcs.map((npc, i) => (
        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">角色 {i + 1}</span>
            <button onClick={() => removeNPC(i)} className="text-[10px] text-red-400/60 hover:text-red-400 cursor-pointer">删除</button>
          </div>
          <input
            value={npc.name}
            onChange={e => updateNPC(i, 'name', e.target.value)}
            placeholder="角色名称"
            className="w-full rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
          />
          <input
            value={npc.persona}
            onChange={e => updateNPC(i, 'persona', e.target.value)}
            placeholder="人设描述（如：精明的商人，表面和善但暗藏心机）"
            className="w-full rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
          />
          <input
            value={npc.goals.join('、')}
            onChange={e => updateNPC(i, 'goals', e.target.value.split('、').filter(Boolean))}
            placeholder="目标（用「、」分隔，如：赚钱、保护家人）"
            className="w-full rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
          />
          <div className="flex gap-2">
            <select
              value={npc.decisionStyle}
              onChange={e => updateNPC(i, 'decisionStyle', e.target.value)}
              className="flex-1 rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
            >
              <option value="rational">理性决策</option>
              <option value="emotional">情绪驱动</option>
              <option value="chaotic">混乱随机</option>
              <option value="cautious">谨慎保守</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/30">态度</span>
              <input
                type="range"
                min="-100"
                max="100"
                value={npc.initialAttitude ?? 0}
                onChange={e => updateNPC(i, 'initialAttitude', Number(e.target.value))}
                className="w-16 h-1 accent-indigo-400"
              />
              <span className="text-[10px] text-white/40 w-6 text-right">{npc.initialAttitude ?? 0}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RuleEditor({ rules, onChange }: { rules: CustomRule[]; onChange: (rules: CustomRule[]) => void }) {
  const addRule = () => {
    onChange([...rules, { trigger: '', effect: '' }])
  }
  const removeRule = (idx: number) => {
    onChange(rules.filter((_, i) => i !== idx))
  }
  const updateRule = (idx: number, field: keyof CustomRule, value: string) => {
    const updated = [...rules]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-white/50 font-medium">自定义规则/事件</p>
        <button
          onClick={addRule}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          + 添加规则
        </button>
      </div>
      {rules.length === 0 && (
        <p className="text-[10px] text-white/25 italic">未设置自定义规则，AI 将自由生成世界事件</p>
      )}
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 space-y-1.5">
            <input
              value={rule.trigger}
              onChange={e => updateRule(i, 'trigger', e.target.value)}
              placeholder="触发条件（如：玩家进入酒馆）"
              className="w-full rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
            />
            <input
              value={rule.effect}
              onChange={e => updateRule(i, 'effect', e.target.value)}
              placeholder="效果（如：触发酒馆老板的隐藏任务线）"
              className="w-full rounded-md px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
            />
          </div>
          <button onClick={() => removeRule(i)} className="text-[10px] text-red-400/60 hover:text-red-400 mt-1.5 cursor-pointer">✕</button>
        </div>
      ))}
    </div>
  )
}

function SliderField({ label, value, onChange, min, max, step = 1, suffix = '' }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/50 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-24 h-1 accent-indigo-400"
        />
        <span className="text-[11px] text-white/60 w-10 text-right font-mono">{value}{suffix}</span>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function WorldInput() {
  const [theme, setTheme] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('deepseek-chat')
  const [mode, setMode] = useState<ScenarioMode>('game')
  const [showApiSection, setShowApiSection] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const { setApiKey: storeSetKey, startGame, isProcessing, error } = useGameStore()

  // Advanced config state
  const [worldConfig, setWorldConfig] = useState<WorldConfig>({ ...DEFAULT_WORLD_CONFIG })

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
    startGame(theme.trim(), mode, worldConfig)
  }

  const handlePresetClick = (index: number, presetTheme: string) => {
    setSelectedPreset(index)
    setTheme(presetTheme)
  }

  const updateConfig = <K extends keyof WorldConfig>(key: K, value: WorldConfig[K]) => {
    setWorldConfig(prev => ({ ...prev, [key]: value }))
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

      {/* Advanced Configuration Panel */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
        >
          <span className="text-[10px]">{showAdvanced ? '▾' : '▸'}</span>
          <span>高级配置</span>
          <span className="text-[10px] text-white/25">（NPC设定 · 世界参数 · 提示策略）</span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
            {/* Scene Structure */}
            <div className="space-y-3">
              <p className="text-[11px] text-white/60 font-medium border-b border-white/[0.06] pb-1.5">场景结构</p>
              {mode === 'game' && (
                <SliderField label="地图尺寸" value={worldConfig.mapSize} onChange={v => updateConfig('mapSize', v)} min={3} max={10} suffix="×" />
              )}
              <SliderField label="NPC 数量" value={worldConfig.npcCount} onChange={v => updateConfig('npcCount', v)} min={1} max={8} />
              {mode === 'game' && (
                <SliderField label="物品数量" value={worldConfig.itemCount} onChange={v => updateConfig('itemCount', v)} min={0} max={10} />
              )}
              <SliderField label="规则/事件数" value={worldConfig.ruleCount} onChange={v => updateConfig('ruleCount', v)} min={1} max={8} />
              <SliderField label="最大步数" value={worldConfig.maxSteps ?? 50} onChange={v => updateConfig('maxSteps', v)} min={10} max={100} step={5} />
            </div>

            {/* Prompt Strategy */}
            <div className="space-y-3">
              <p className="text-[11px] text-white/60 font-medium border-b border-white/[0.06] pb-1.5">提示策略</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">叙事风格</span>
                <select
                  value={worldConfig.narrativeStyle}
                  onChange={e => updateConfig('narrativeStyle', e.target.value as WorldConfig['narrativeStyle'])}
                  className="rounded-md px-2.5 py-1 text-[11px] bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
                >
                  <option value="concise">极简短信</option>
                  <option value="literary">文学化</option>
                  <option value="academic">学术报告</option>
                  <option value="casual">口语轻松</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50">NPC 倾向</span>
                <select
                  value={worldConfig.difficulty}
                  onChange={e => updateConfig('difficulty', e.target.value as WorldConfig['difficulty'])}
                  className="rounded-md px-2.5 py-1 text-[11px] bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
                >
                  <option value="cooperative">配合友好</option>
                  <option value="neutral">中立客观</option>
                  <option value="adversarial">高对抗性</option>
                </select>
              </div>
              <SliderField label="创意温度" value={worldConfig.temperature} onChange={v => updateConfig('temperature', v)} min={0.1} max={1.5} step={0.1} />
              <SliderField label="事件频率" value={worldConfig.eventFrequency} onChange={v => updateConfig('eventFrequency', v)} min={0} max={10} suffix="步" />
              <p className="text-[10px] text-white/25">温度越高输出越随机；事件频率 0 = 仅响应玩家行为</p>
            </div>

            {/* NPC Editor */}
            <div className="border-t border-white/[0.06] pt-3">
              <NPCEditor npcs={worldConfig.customNPCs} onChange={npcs => updateConfig('customNPCs', npcs)} />
            </div>

            {/* Rule Editor */}
            <div className="border-t border-white/[0.06] pt-3">
              <RuleEditor rules={worldConfig.customRules} onChange={rules => updateConfig('customRules', rules)} />
            </div>

            {/* Reset button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setWorldConfig({ ...DEFAULT_WORLD_CONFIG })}
                className="text-[10px] text-white/30 hover:text-white/50 transition-colors cursor-pointer"
              >
                重置为默认
              </button>
            </div>
          </div>
        )}
      </div>

      {/* API Key section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowApiSection(!showApiSection)}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiKeyConfigured ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-red-400 animate-pulse shadow-[0_0_6px_rgba(248,113,113,0.5)]'}`} />
          <span>{apiKeyConfigured ? 'API Key 已配置' : 'API Key 未配置（必需）'}</span>
          <span className="text-[10px]">{showApiSection ? '▾' : '▸'}</span>
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
                  免费获取 →
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
                切换模型 ▸
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
          <p>⏱ 首次生成约 5-15 秒 · 后续每步 2-5 秒</p>
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
          <span className="text-red-400 shrink-0">⚠</span>
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
