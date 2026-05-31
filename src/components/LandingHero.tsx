/**
 * WorldSim — Landing Page v2
 * 
 * 设计升级：
 * - 深色科技感 + 玻璃态卡片
 * - 统一紫蓝色调，去掉杂色
 * - 增加呼吸感和视觉层次
 * - 精致的图标替代emoji
 * - 更强的CTA视觉引导
 */

import { hasAutoSave, loadAutoSave } from '../engine/persistence'
import { IconGlobe, IconClipboard, IconFlask } from './Icons'

export default function LandingHero({ onEnter }: { onEnter: (resumeAutoSave?: boolean) => void }) {
  const hasSave = hasAutoSave()
  const saveData = hasSave ? loadAutoSave() : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto relative">
      
      {/* 背景装饰光效 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/4 blur-[80px] pointer-events-none" />

      {/* ===== 顶部：品牌标识 + 核心价值主张 ===== */}
      <div className="text-center space-y-6 mb-16 relative z-10">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
            <IconGlobe size={22} color="#a78bfa" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient-brand">
            WorldSim
          </h1>
        </div>
        
        {/* 价值主张 */}
        <div className="space-y-3 max-w-xl mx-auto">
          <p className="text-xl sm:text-2xl text-[var(--ws-text-primary)] font-light leading-relaxed">
            输入一句话，生成一个<span className="font-medium text-purple-300">有记忆的 AI 世界</span>
          </p>
          <p className="text-base text-[var(--ws-text-secondary)] leading-relaxed">
            NPC 会记住你做过什么，世界会因你的选择而改变
          </p>
        </div>
      </div>

      {/* ===== 三种模式卡片 ===== */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14 relative z-10">
        <ModeCard
          icon={<IconGlobe size={24} color="#a78bfa" />}
          title="探索 AI 世界"
          description="描述任何主题，引擎即时生成可探索的世界。NPC 有自己的记忆和目标，会根据你的行为改变态度。"
          example="赛博朋克城市里的地下黑市"
          accentColor="purple"
        />
        <ModeCard
          icon={<IconClipboard size={24} color="#fbbf24" />}
          title="模拟职场挑战"
          description="面对 AI 扮演的客户、同事或上级，在压力场景中做决策。系统自动评估你的应变能力和沟通策略。"
          example="说服一个犹豫的大客户签约"
          accentColor="amber"
          highlight
        />
        <ModeCard
          icon={<IconFlask size={24} color="#34d399" />}
          title="观察角色互动"
          description="设定多个 AI 角色和规则，观察他们如何自主行动、结盟或冲突。适合研究涌现行为。"
          example="5 个性格迥异的人困在荒岛"
          accentColor="emerald"
        />
      </div>

      {/* ===== CTA 区域 ===== */}
      <div className="text-center space-y-4 relative z-10">
        {/* 继续上次 */}
        {hasSave && saveData && (
          <button
            onClick={() => onEnter(true)}
            className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-medium
                       glass-card hover:glass-card-hover transition-all duration-300 
                       cursor-pointer block sm:inline-block mb-3"
          >
            <span className="text-[var(--ws-text-secondary)]">继续上次：</span>
            <span className="text-purple-300 ml-1 font-medium">{saveData.worldName}</span>
            <span className="text-[var(--ws-text-muted)] text-xs ml-2">({saveData.steps}步)</span>
          </button>
        )}

        <button
          onClick={() => onEnter(false)}
          className="px-12 py-4 rounded-2xl font-semibold text-base text-white
                     btn-primary hover:btn-primary-hover
                     active:scale-[0.97] cursor-pointer"
        >
          开始新体验
          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
        </button>
        
        <p className="text-xs text-[var(--ws-text-muted)] mt-4">
          需要 DeepSeek 或 Gemini API Key · 密钥仅存浏览器本地，不经过任何服务器
        </p>
      </div>

      {/* ===== 底部技术亮点 ===== */}
      <div className="mt-16 pt-8 border-t border-white/[0.04] w-full relative z-10">
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
  accentColor: 'purple' | 'amber' | 'emerald'
  highlight?: boolean 
}) {
  const borderHighlight = highlight 
    ? 'border-amber-500/20 shadow-[0_0_30px_rgba(251,191,36,0.04)]' 
    : 'border-white/[0.06]'

  return (
    <div className={`
      relative p-6 rounded-2xl space-y-4 transition-all duration-300
      glass-card hover:glass-card-hover cursor-default
      ${borderHighlight}
      ${highlight ? 'sm:-translate-y-1' : ''}
    `}>
      {/* 推荐标签 */}
      {highlight && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full
                        bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
          推荐
        </div>
      )}

      {/* 图标 */}
      <div className={`
        w-11 h-11 rounded-xl flex items-center justify-center
        ${accentColor === 'purple' ? 'bg-purple-500/10 border border-purple-500/15' :
          accentColor === 'amber' ? 'bg-amber-500/10 border border-amber-500/15' :
          'bg-emerald-500/10 border border-emerald-500/15'}
      `}>
        {icon}
      </div>

      {/* 内容 */}
      <h3 className="text-sm font-semibold text-[var(--ws-text-primary)]">{title}</h3>
      <p className="text-[13px] text-[var(--ws-text-secondary)] leading-relaxed">{description}</p>
      
      {/* 示例 */}
      <div className="pt-2 border-t border-white/[0.04]">
        <p className="text-[11px] text-[var(--ws-text-muted)] italic">「{example}」</p>
      </div>
    </div>
  )
}

function TechBadge({ text }: { text: string }) {
  return (
    <span className="px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-[11px]">
      {text}
    </span>
  )
}
