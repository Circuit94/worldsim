/**
 * WorldSim — Landing Page (用户导向)
 * 
 * 设计原则：
 * - 3 秒内让用户理解「这是什么 + 我能做什么」
 * - 用场景化语言替代投资人话术
 * - 模式选择用用户视角描述，不用 B/C 端标签
 * - 突出「立即体验」的行动路径
 */

import { hasAutoSave, loadAutoSave } from '../engine/persistence'

export default function LandingHero({ onEnter }: { onEnter: (resumeAutoSave?: boolean) => void }) {
  const hasSave = hasAutoSave()
  const saveData = hasSave ? loadAutoSave() : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-4xl mx-auto">
      
      {/* ===== Top: Hook — 用户能理解的一句话 ===== */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            WorldSim
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-200 font-light max-w-lg mx-auto leading-relaxed">
          输入一句话，生成一个<span className="text-purple-300 font-medium">有记忆的 AI 世界</span>
          <br />
          <span className="text-base text-gray-400">NPC 会记住你做过什么，世界会因你的选择而改变</span>
        </p>
      </div>

      {/* ===== Middle: 三种玩法 — 用户视角描述 ===== */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <ModeCard
          icon="🗺️"
          title="探索一个 AI 世界"
          description="描述任何主题，引擎即时生成可探索的世界。NPC 有自己的记忆和目标，会根据你的行为改变态度。"
          example="「赛博朋克城市里的地下黑市」"
        />
        <ModeCard
          icon="🎯"
          title="模拟一次职场挑战"
          description="面对 AI 扮演的客户、同事或上级，在压力场景中做决策。系统自动评估你的应变能力和沟通策略。"
          example="「说服一个犹豫的大客户签约」"
          highlight
        />
        <ModeCard
          icon="🔬"
          title="观察 AI 角色互动"
          description="设定多个 AI 角色和规则，观察他们如何自主行动、结盟或冲突。适合研究涌现行为。"
          example="「5 个性格迥异的人困在荒岛」"
        />
      </div>

      {/* ===== CTA ===== */}
      <div className="text-center space-y-3">
        {/* 继续上次 */}
        {hasSave && saveData && (
          <button
            onClick={() => onEnter(true)}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-medium text-sm
                       bg-gray-800 border border-gray-700
                       hover:border-purple-500 hover:bg-gray-750
                       transition-all duration-200 mb-2 block sm:inline-block"
          >
            <span className="text-gray-300">继续上次：</span>
            <span className="text-purple-300 ml-1">{saveData.worldName}</span>
            <span className="text-gray-500 text-xs ml-2">({saveData.steps}步)</span>
          </button>
        )}

        <button
          onClick={() => onEnter(false)}
          className="px-10 py-3.5 rounded-xl font-medium text-base
                     bg-gradient-to-r from-purple-600 to-cyan-600 
                     hover:from-purple-500 hover:to-cyan-500
                     transition-all duration-300 shadow-lg shadow-purple-900/30
                     hover:shadow-purple-700/40 hover:scale-[1.03] active:scale-[0.98]"
        >
          开始新体验 →
        </button>
        
        <p className="text-[11px] text-gray-500 mt-2">
          需要 DeepSeek 或 Gemini API Key · 密钥仅存浏览器本地，不经过任何服务器
        </p>
      </div>

      {/* ===== 底部：简洁技术亮点（不喧宾夺主） ===== */}
      <div className="mt-12 pt-6 border-t border-gray-800/50 w-full">
        <div className="flex flex-wrap justify-center gap-4 text-[10px] text-gray-600">
          <span>基于 Stanford Generative Agents 论文</span>
          <span>·</span>
          <span>~200 Token/Agent/回合</span>
          <span>·</span>
          <span>7 层规则引擎兜底 LLM</span>
          <span>·</span>
          <span>MIT 开源</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function ModeCard({ 
  icon, title, description, example, highlight 
}: { 
  icon: string; title: string; description: string; example: string; highlight?: boolean 
}) {
  return (
    <div className={`p-5 rounded-xl border space-y-3 transition-all ${
      highlight 
        ? 'border-purple-600/60 bg-purple-950/20 ring-1 ring-purple-800/30' 
        : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
    }`}>
      <div className="text-2xl">{icon}</div>
      <h3 className="text-sm font-medium text-gray-200">{title}</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">{description}</p>
      <p className="text-[11px] text-gray-600 italic">{example}</p>
    </div>
  )
}
