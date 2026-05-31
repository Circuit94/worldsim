/**
 * WorldSim — Landing Page v4 (Cyber Glass Dark Theme)
 * 
 * 深色毛玻璃 · 极光背景 · 渐变高光 · 沉浸感首页
 */

import { hasAutoSave, loadAutoSave } from '../engine/persistence'
import { IconGlobe, IconClipboard, IconFlask } from './Icons'

export default function LandingHero({ onEnter }: { onEnter: (resumeAutoSave?: boolean) => void }) {
  const hasSave = hasAutoSave()
  const saveData = hasSave ? loadAutoSave() : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto relative">
      
      {/* Animated aurora blobs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[100px] pointer-events-none animate-float" />
      <div className="absolute top-1/2 left-2/3 w-[300px] h-[300px] rounded-full bg-blue-600/6 blur-[80px] pointer-events-none animate-sway-slow" />

      {/* Brand + Value Proposition */}
      <div className="text-center space-y-6 mb-16 relative z-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 
                          border border-indigo-400/30 flex items-center justify-center
                          shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-glow-pulse">
            <IconGlobe size={26} color="#a5b4fc" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            World<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Sim</span>
          </h1>
        </div>
        
        <div className="space-y-3 max-w-xl mx-auto">
          <p className="text-xl sm:text-2xl text-white/90 font-light leading-relaxed">
            输入一句话，生成一个<span className="font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">有记忆的 AI 世界</span>
          </p>
          <p className="text-base text-white/50 leading-relaxed">
            NPC 会记住你做过什么，世界会因你的选择而改变
          </p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14 relative z-10">
        <ModeCard
          icon={<IconGlobe size={24} color="#a5b4fc" />}
          title="探索 AI 世界"
          description="描述任何主题，引擎即时生成可探索的世界。NPC 有自己的记忆和目标，会根据你的行为改变态度。"
          example="赛博朋克城市里的地下黑市"
          accentColor="indigo"
          delay={0}
        />
        <ModeCard
          icon={<IconClipboard size={24} color="#fbbf24" />}
          title="模拟职场挑战"
          description="面对 AI 扮演的客户、同事或上级，在压力场景中做决策。系统自动评估你的应变能力和沟通策略。"
          example="说服一个犹豫的大客户签约"
          accentColor="amber"
          highlight
          delay={100}
        />
        <ModeCard
          icon={<IconFlask size={24} color="#22d3ee" />}
          title="观察角色互动"
          description="设定多个 AI 角色和规则，观察他们如何自主行动、结盟或冲突。适合研究涌现行为。"
          example="5 个性格迥异的人困在荒岛"
          accentColor="cyan"
          delay={200}
        />
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 relative z-10">
        {hasSave && saveData && (
          <button
            onClick={() => onEnter(true)}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-medium
                       ws-card hover:ws-card-hover transition-all duration-300 
                       cursor-pointer block sm:inline-block mb-3"
          >
            <span className="text-white/50">继续上次：</span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent ml-1 font-medium">
              {saveData.worldName}
            </span>
            <span className="text-white/30 text-xs ml-2">({saveData.steps}步)</span>
          </button>
        )}

        <button
          onClick={() => onEnter(false)}
          className="px-14 py-4 rounded-2xl font-semibold text-base text-white
                     ws-btn-primary hover:ws-btn-primary-hover
                     active:scale-[0.97] cursor-pointer
                     relative overflow-hidden group"
        >
          <span className="relative z-10">开始新体验</span>
          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1 relative z-10">{'\u2192'}</span>
          {/* Button shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                          translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
        </button>
        
        <p className="text-xs text-white/30 mt-4">
          需要 DeepSeek 或 Gemini API Key · 密钥仅存浏览器本地，不经过任何服务器
        </p>
      </div>

      {/* Tech badges */}
      <div className="mt-16 pt-8 border-t border-white/5 w-full relative z-10">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
          <TechBadge text="Stanford Generative Agents" />
          <TechBadge text="~200 Token/Agent/回合" />
          <TechBadge text="7 层规则引擎" />
          <TechBadge text="MIT 开源" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function ModeCard({ 
  icon, title, description, example, accentColor, highlight, delay 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  example: string
  accentColor: 'indigo' | 'amber' | 'cyan'
  highlight?: boolean
  delay: number
}) {
  const glowColor = {
    indigo: 'rgba(99, 102, 241, 0.15)',
    amber: 'rgba(251, 191, 36, 0.12)',
    cyan: 'rgba(34, 211, 238, 0.12)',
  }[accentColor]

  const borderHighlight = highlight 
    ? 'border-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.08)]' 
    : 'border-white/[0.08]'

  return (
    <div 
      className={`
        relative p-6 rounded-2xl space-y-4 transition-all duration-500
        ws-card hover:ws-card-hover cursor-default group
        ${borderHighlight}
        ${highlight ? 'sm:-translate-y-1' : ''}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {highlight && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full
                        bg-amber-500/10 border border-amber-400/40 text-amber-300 text-[10px] font-medium
                        backdrop-blur-sm">
          推荐
        </div>
      )}

      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300
                   group-hover:scale-110 group-hover:shadow-lg"
        style={{ 
          background: `${glowColor}`,
          borderColor: `${glowColor.replace('0.15', '0.3').replace('0.12', '0.3')}`,
          boxShadow: `0 0 12px ${glowColor}`
        }}
      >
        {icon}
      </div>

      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
      
      <div className="pt-3 border-t border-white/5">
        <p className="text-[11px] text-white/30 italic">{'\u300C'}{example}{'\u300D'}</p>
      </div>
    </div>
  )
}

function TechBadge({ text }: { text: string }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px]
                     backdrop-blur-sm hover:border-white/[0.15] hover:text-white/60 transition-all duration-300">
      {text}
    </span>
  )
}
