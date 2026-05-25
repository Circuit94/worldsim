/**
 * WorldSim — Landing Page (一屏完成投资人叙事)
 * 
 * 设计原则：
 * - 一屏内完成 Hook → 痛点 → 方案 → 壁垒 → CTA 的完整闭环
 * - 不用 emoji 做视觉锤，改用文字标签 + 色彩区分
 * - 信息密度高但不杂乱，适合投资人 30 秒扫完
 */

export default function LandingHero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-5xl mx-auto">
      
      {/* ===== Top: Hook ===== */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-800/50 text-[11px] text-purple-300">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          MVP 已上线 · 7 天独立开发 · MIT 开源
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            WorldSim
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-200 font-light">
          用一句话生成一个<span className="text-purple-300 font-medium">有记忆的世界</span>
        </p>
        
        <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
          AI 世界模拟引擎 — NPC 拥有记忆和自主目标，世界遵循因果规则自动演化。
          不只是游戏，更是企业培训、行为仿真、AI Agent 测试的底层引擎。
        </p>
      </div>

      {/* ===== Middle: 三列 — 痛点 + 方案一体化 ===== */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <ModeCard
          label="C 端"
          labelColor="text-cyan-400 border-cyan-800 bg-cyan-950/30"
          mode="探索模式"
          pain="AI 叙事产品只有纯文本，无结构无记忆"
          solution="玩家输入主题即生成可交互世界，NPC 有态度有记忆"
          metric="留存验证 · 引擎 Demo"
        />
        <ModeCard
          label="B 端"
          labelColor="text-purple-300 border-purple-700 bg-purple-950/40"
          mode="培训模式"
          pain="企业培训靠 PPT + 真人扮演，贵且无法规模化"
          solution="AI 模拟职业场景，自动评估决策质量，输出能力报告"
          metric="¥5-50/次/人 · 核心变现"
          highlight
        />
        <ModeCard
          label="平台"
          labelColor="text-green-400 border-green-800 bg-green-950/30"
          mode="仿真 SDK"
          pain="AI Agent 上线前缺少安全测试环境"
          solution="Headless API，批量跑行为仿真和策略 A/B 测试"
          metric="API 计费 · 无需 UI"
        />
      </div>

      {/* ===== Bottom-left: 技术壁垒（紧凑横条） ===== */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 text-[10px]">
        <TechChip title="Stanford GenAgents" detail="观察→记忆→反思→规划→行动" />
        <TechChip title="规则引擎兜底" detail="7 道硬约束，LLM 输出不失控" />
        <TechChip title="~200 tokens/回合" detail="成本仅全量 context 的 1/20" />
        <TechChip title="Seed 可复现" detail="相同种子 = 相同世界，支持对照实验" />
      </div>

      {/* ===== 市场验证 — 一行紧凑 ===== */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 mb-8 text-[10px] text-gray-500">
        <span className="text-gray-400">同赛道已融资：</span>
        <MarketTag name="Artificial Societies" info="YC W25 · $5.35M" />
        <MarketTag name="AgentHub" info="YC S25" />
        <MarketTag name="Tavus/Synthesia" info="$78M+" />
        <MarketTag name="AI Dungeon" info="$200M+ rev" />
      </div>

      {/* ===== CTA ===== */}
      <div className="text-center space-y-3">
        <button
          onClick={onEnter}
          className="px-10 py-3.5 rounded-xl font-medium text-base
                     bg-gradient-to-r from-purple-600 to-cyan-600 
                     hover:from-purple-500 hover:to-cyan-500
                     transition-all duration-300 shadow-lg shadow-purple-900/30
                     hover:shadow-purple-700/40 hover:scale-[1.03] active:scale-[0.98]"
        >
          立即体验 →
        </button>
        <p className="text-[10px] text-gray-600">
          DeepSeek / Gemini · 无需注册 · Key 仅存浏览器本地
        </p>
      </div>

      {/* ===== Footer 极简 ===== */}
      <div className="mt-6 text-[9px] text-gray-700 text-center">
        TypeScript · React 19 · Vite 6 · MIT · Solo-built · ref: Park et al. "Generative Agents" (UIST 2023)
      </div>
    </div>
  )
}

// ============================================================
// Sub-components — 无 emoji，用文字标签 + 色彩
// ============================================================

function ModeCard({ 
  label, labelColor, mode, pain, solution, metric, highlight 
}: { 
  label: string; labelColor: string; mode: string
  pain: string; solution: string; metric: string; highlight?: boolean 
}) {
  return (
    <div className={`p-4 rounded-lg border space-y-2.5 transition-all ${
      highlight 
        ? 'border-purple-600 bg-purple-950/30 ring-1 ring-purple-800/40' 
        : 'border-gray-800 bg-gray-900/30'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${labelColor}`}>
          {label}
        </span>
        <span className="text-sm font-medium text-gray-200">{mode}</span>
      </div>
      <p className="text-[11px] text-red-400/70 leading-relaxed">✗ {pain}</p>
      <p className="text-[11px] text-green-400/70 leading-relaxed">✓ {solution}</p>
      <p className="text-[10px] text-gray-500 font-mono border-t border-gray-800/50 pt-1.5 mt-1">{metric}</p>
    </div>
  )
}

function TechChip({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-2 rounded border border-gray-800 bg-gray-900/40 space-y-0.5">
      <p className="text-gray-300 font-medium text-[10px]">{title}</p>
      <p className="text-gray-600 text-[9px]">{detail}</p>
    </div>
  )
}

function MarketTag({ name, info }: { name: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-800 bg-gray-900/40">
      <span className="text-gray-300">{name}</span>
      <span className="text-green-500">{info}</span>
    </span>
  )
}
