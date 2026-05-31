/**
 * RuntimeEditor — 游戏进行中的实时编辑面板
 * 
 * 支持在游戏过程中修改：
 * - NPC 人设、目标、决策风格、态度
 * - 世界规则（增删）
 * - 提示策略参数（叙事风格、难度、温度、事件频率）
 */

import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getAgentVisual } from '../engine/tileVisuals'
import { Settings, ChevronDown, ChevronRight, Plus, Trash2, Save } from 'lucide-react'

// ============================================================
// Agent Editor (inline)
// ============================================================

function AgentEditor({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const world = useGameStore(s => s.world)
  const updateAgent = useGameStore(s => s.updateAgent)
  const agent = world?.agents.find(a => a.id === agentId)
  
  const [persona, setPersona] = useState(agent?.persona || '')
  const [goals, setGoals] = useState(agent?.goals.join('、') || '')
  const [style, setStyle] = useState<string>(agent?.decisionStyle || 'rational')
  const [attitude, setAttitude] = useState(agent?.memory.attitude || 0)

  if (!agent) return null

  const handleSave = () => {
    updateAgent(agentId, {
      persona,
      goals: goals.split('、').filter(Boolean),
      decisionStyle: style,
      attitude,
    })
    onClose()
  }

  const visual = getAgentVisual(agent.name, agent.id)

  return (
    <div className="p-3 rounded-lg bg-white/[0.04] border border-indigo-400/20 space-y-2.5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={visual.avatarUrl} alt={agent.name} className="w-5 h-5 rounded-full border object-cover" style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }} />
          <span className="text-xs text-white/80 font-medium">{agent.name}</span>
        </div>
        <button onClick={handleSave} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer">
          <Save size={10} /> 保存
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-white/40">人设</label>
        <textarea
          value={persona}
          onChange={e => setPersona(e.target.value)}
          rows={2}
          className="w-full rounded-md px-2.5 py-1.5 text-[11px] bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-white/40">目标（「、」分隔）</label>
        <input
          value={goals}
          onChange={e => setGoals(e.target.value)}
          className="w-full rounded-md px-2.5 py-1.5 text-[11px] bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-indigo-400/40 transition-all"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] text-white/40">决策风格</label>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="w-full rounded-md px-2 py-1.5 text-[11px] bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
          >
            <option value="rational">理性</option>
            <option value="emotional">情绪</option>
            <option value="chaotic">混乱</option>
            <option value="cautious">谨慎</option>
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] text-white/40">态度 ({attitude})</label>
          <input
            type="range"
            min={-100}
            max={100}
            value={attitude}
            onChange={e => setAttitude(Number(e.target.value))}
            className="w-full h-1 accent-indigo-400 mt-2"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main RuntimeEditor
// ============================================================

export default function RuntimeEditor() {
  const world = useGameStore(s => s.world)
  const runtimeConfig = useGameStore(s => s.runtimeConfig)
  const updateRuntimeConfig = useGameStore(s => s.updateRuntimeConfig)
  const addRule = useGameStore(s => s.addRule)
  const removeRule = useGameStore(s => s.removeRule)

  const [isOpen, setIsOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('agents')
  const [newRuleTrigger, setNewRuleTrigger] = useState('')
  const [newRuleEffect, setNewRuleEffect] = useState('')

  if (!world) return null

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleAddRule = () => {
    if (newRuleTrigger.trim() && newRuleEffect.trim()) {
      addRule(newRuleTrigger.trim(), newRuleEffect.trim())
      setNewRuleTrigger('')
      setNewRuleEffect('')
    }
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
            : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-amber-400/30 hover:text-amber-300'
        }`}
        aria-label="实时编辑"
        title="实时编辑面板"
      >
        <Settings size={14} />
      </button>

      {/* Editor panel */}
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-80 max-h-[70vh] overflow-y-auto
                        rounded-xl bg-[#0f1129]/95 border border-white/[0.1] backdrop-blur-xl shadow-2xl
                        animate-fade-in-up">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-xs font-medium text-white/70">实时编辑</h3>
              <span className="text-[10px] text-white/30">修改立即生效</span>
            </div>

            {/* === NPC Section === */}
            <div>
              <button
                onClick={() => toggleSection('agents')}
                className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/80 transition-colors cursor-pointer w-full"
              >
                {expandedSection === 'agents' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="font-medium">角色编辑</span>
                <span className="text-white/30 ml-1">({world.agents.length})</span>
              </button>

              {expandedSection === 'agents' && (
                <div className="mt-2 space-y-2">
                  {world.agents.map(agent => {
                    const visual = getAgentVisual(agent.name, agent.id)
                    if (editingAgent === agent.id) {
                      return <AgentEditor key={agent.id} agentId={agent.id} onClose={() => setEditingAgent(null)} />
                    }
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setEditingAgent(agent.id)}
                        className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]
                                   hover:border-white/[0.12] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <img src={visual.avatarUrl} alt={agent.name} className="w-4 h-4 rounded-full border object-cover" style={{ borderColor: visual.accentColor, imageRendering: 'pixelated' }} />
                          <span className="text-[11px] text-white/70 group-hover:text-white/90">{agent.name}</span>
                          <span className="text-[10px] text-white/30 ml-auto">点击编辑</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* === Rules Section === */}
            <div>
              <button
                onClick={() => toggleSection('rules')}
                className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/80 transition-colors cursor-pointer w-full"
              >
                {expandedSection === 'rules' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="font-medium">世界规则</span>
                <span className="text-white/30 ml-1">({world.rules.length})</span>
              </button>

              {expandedSection === 'rules' && (
                <div className="mt-2 space-y-2">
                  {world.rules.map((rule, i) => (
                    <div key={rule.id || i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-300/70 truncate">触发: {rule.trigger}</p>
                        <p className="text-[10px] text-white/50 truncate">效果: {rule.effect}</p>
                        {rule.fired && <span className="text-[9px] text-emerald-400/60">已触发</span>}
                      </div>
                      <button
                        onClick={() => removeRule(i)}
                        className="text-red-400/40 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                        title="删除规则"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {/* Add new rule */}
                  <div className="p-2 rounded-lg border border-dashed border-white/[0.08] space-y-1.5">
                    <input
                      value={newRuleTrigger}
                      onChange={e => setNewRuleTrigger(e.target.value)}
                      placeholder="触发条件..."
                      className="w-full rounded-md px-2 py-1 text-[10px] bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:border-indigo-400/30 transition-all"
                    />
                    <input
                      value={newRuleEffect}
                      onChange={e => setNewRuleEffect(e.target.value)}
                      placeholder="效果..."
                      className="w-full rounded-md px-2 py-1 text-[10px] bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:border-indigo-400/30 transition-all"
                    />
                    <button
                      onClick={handleAddRule}
                      disabled={!newRuleTrigger.trim() || !newRuleEffect.trim()}
                      className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 disabled:text-white/20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus size={10} /> 添加规则
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* === Prompt Strategy Section === */}
            <div>
              <button
                onClick={() => toggleSection('strategy')}
                className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/80 transition-colors cursor-pointer w-full"
              >
                {expandedSection === 'strategy' ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="font-medium">提示策略</span>
              </button>

              {expandedSection === 'strategy' && (
                <div className="mt-2 space-y-3 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50">叙事风格</span>
                    <select
                      value={runtimeConfig.narrativeStyle}
                      onChange={e => updateRuntimeConfig({ narrativeStyle: e.target.value as any })}
                      className="rounded-md px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
                    >
                      <option value="concise">极简短信</option>
                      <option value="literary">文学化</option>
                      <option value="academic">学术报告</option>
                      <option value="casual">口语轻松</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50">NPC 倾向</span>
                    <select
                      value={runtimeConfig.difficulty}
                      onChange={e => updateRuntimeConfig({ difficulty: e.target.value as any })}
                      className="rounded-md px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/70 cursor-pointer"
                    >
                      <option value="cooperative">配合友好</option>
                      <option value="neutral">中立客观</option>
                      <option value="adversarial">高对抗性</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50">创意温度</span>
                      <span className="text-[10px] text-white/40 font-mono">{runtimeConfig.temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.5}
                      step={0.1}
                      value={runtimeConfig.temperature}
                      onChange={e => updateRuntimeConfig({ temperature: Number(e.target.value) })}
                      className="w-full h-1 accent-indigo-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50">事件频率</span>
                      <span className="text-[10px] text-white/40 font-mono">{runtimeConfig.eventFrequency === 0 ? '关闭' : `每${runtimeConfig.eventFrequency}步`}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={runtimeConfig.eventFrequency}
                      onChange={e => updateRuntimeConfig({ eventFrequency: Number(e.target.value) })}
                      className="w-full h-1 accent-indigo-400"
                    />
                  </div>

                  <p className="text-[9px] text-white/25 mt-1">策略参数将在下一次行动时生效</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
