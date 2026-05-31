/**
 * WorldSim — Landing Page v3
 * 
 * Light theme, clean cards, unified typography
 */

import { hasAutoSave, loadAutoSave } from '../engine/persistence'
import { IconGlobe, IconClipboard, IconFlask } from './Icons'

export default function LandingHero({ onEnter }: { onEnter: (resumeAutoSave?: boolean) => void }) {
  const hasSave = hasAutoSave()
  const saveData = hasSave ? loadAutoSave() : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto relative">
      
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-indigo-100/60 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-100/40 blur-[80px] pointer-events-none" />

      {/* Brand + Value Proposition */}
      <div className="text-center space-y-6 mb-16 relative z-10">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <IconGlobe size={22} color="#6366f1" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--ws-text-primary)]">
            WorldSim
          </h1>
        </div>
        
        <div className="space-y-3 max-w-xl mx-auto">
          <p className="text-xl sm:text-2xl text-[var(--ws-text-primary)] font-light leading-relaxed">
            输入一句话，生成一个<span className="font-medium text-indigo-600">有记忆的 AI 世界</span>
          </p>
          <p className="text-base text-[var(--ws-text-secondary)] leading-relaxed">
            NPC 会记住你做过什么，世界会因你的选择而改变
          </p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14 relative z-10">
        <ModeCard
          icon={<IconGlobe size={24} color="#6366f1" />}
          title="探索 AI 世界"
          description="描述任何主题，引擎即时生成可探索的世界。NPC 有自己的记忆和目标，会根据你的行为改变态度。"
          example="赛博朋克城市里的地下黑市"
          accentColor="indigo"
        />
        <ModeCard
          icon={<IconClipboard size={24} color="#d97706" />}
          title="模拟职场挑战"
          description="面对 AI 扮演的客户、同事或上级，在压力场景中做决策。系统自动评估你的应变能力和沟通策略。"
          example="说服一个犹豫的大客户签约"
          accentColor="amber"
          highlight
        />
        <ModeCard
          icon={<IconFlask size={24} color="#0891b2" />}
          title="观察角色互动"
          description="设定多个 AI 角色和规则，观察他们如何自主行动、结盟或冲突。适合研究涌现行为。"
          example="5 个性格迥异的人困在荒岛"
          accentColor="cyan"
        />
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 relative z-10">
        {hasSave && saveData && (
          <button
            onClick={() => onEnter(true)}
            className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-medium
                       ws-card hover:ws-card-hover transition-all duration-300 
                       cursor-pointer block sm:inline-block mb-3"
          >
            <span className="text-[var(--ws-text-secondary)]">继续上次：</span>
            <span className="text-indigo-600 ml-1 font-medium">{saveData.worldName}</span>
            <span className="text-[var(--ws-text-muted)] text-xs ml-2">({saveData.steps}步)</span>
          </button>
        )}

        <button
          onClick={() => onEnter(false)}
          className="px-12 py-4 rounded-2xl font-semibold text-base text-white
                     ws-btn-primary hover:ws-btn-primary-hover
                     active:scale-[0.97] cursor-pointer"
        >
          开始新体验
          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">{'\u2192'}</span>
        </button>
        
        <p className="text-xs text-[var(--ws-text-muted)] mt-4">
          需要 DeepSeek 或 Gemini API Key · 密钥仅存浏览器本地，不经过任何服务器
        </p>
      </div>

      {/* Tech badges */}
      <div className="mt-16 pt-8 border-t border-[var(--ws-border)] w-full relative z-10">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-[var(--ws-text-muted)]">
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
  icon, title, description, example, accentColor, highlight 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  example: string
  accentColor: 'indigo' | 'amber' | 'cyan'
  highlight?: boolean 
}) {
  const borderHighlight = highlight 
    ? 'border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.06)]' 
    : 'border-[var(--ws-border)]'

  return (
    <div className={`
      relative p-6 rounded-2xl space-y-4 transition-all duration-300
      ws-card hover:ws-card-hover cursor-default
      ${borderHighlight}
      ${highlight ? 'sm:-translate-y-1' : ''}
    `}>
      {highlight && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full
                        bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-medium">
          推荐
        </div>
      )}

      <div className={`
        w-11 h-11 rounded-xl flex items-center justify-center
        ${accentColor === 'indigo' ? 'bg-indigo-50 border border-indigo-200' :
          accentColor === 'amber' ? 'bg-amber-50 border border-amber-200' :
          'bg-cyan-50 border border-cyan-200'}
      `}>
        {icon}
      </div>

      <h3 className="text-sm font-semibold text-[var(--ws-text-primary)]">{title}</h3>
      <p className="text-[13px] text-[var(--ws-text-secondary)] leading-relaxed">{description}</p>
      
      <div className="pt-2 border-t border-[var(--ws-border)]">
        <p className="text-[11px] text-[var(--ws-text-muted)] italic">{'\u300C'}{example}{'\u300D'}</p>
      </div>
    </div>
  )
}

function TechBadge({ text }: { text: string }) {
  return (
    <span className="px-3 py-1 rounded-full bg-[var(--ws-surface-alt)] border border-[var(--ws-border)] text-[11px]">
      {text}
    </span>
  )
}
