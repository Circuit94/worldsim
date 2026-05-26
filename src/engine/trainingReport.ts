/**
 * WorldSim — 培训评估报告生成器
 * 
 * 在培训模式结束后，基于整场 session 的决策数据生成结构化能力评估报告。
 * 
 * 评估维度：
 * 1. 分析判断力 — 信息识别、逻辑推理、本质洞察
 * 2. 决策魄力 — 果断程度、风险承受、明确立场
 * 3. 利益相关方管理 — 多方平衡、诉求整合、关系维护
 * 4. 沟通影响力 — 说服技巧、情绪管理、信息节奏
 * 5. 战略格局 — 长期视角、系统思维、取舍智慧
 */

import type { WorldSchema, Agent } from './types'

// ============================================================
// Types
// ============================================================

export interface CompetencyScore {
  dimension: string
  score: number          // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  evidence: string[]     // 支撑该评分的关键行为
  suggestion: string     // 改进建议
}

export interface StakeholderOutcome {
  name: string
  initialAttitude: number
  finalAttitude: number
  attitudeChange: number
  relationship: 'allied' | 'neutral' | 'opposed'
  keyMoments: string[]
}

export interface TrainingReport {
  // 基础信息
  scenarioName: string
  scenarioDescription: string
  totalSteps: number
  completedAt: string
  duration: string        // 估算耗时

  // 核心评估
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D'
  overallScore: number
  competencies: CompetencyScore[]

  // 利益相关方结果
  stakeholders: StakeholderOutcome[]

  // 决策分析
  decisionCount: number
  avgResponseLength: number
  decisionTimeline: { step: number; action: string; impact: string }[]

  // 阶段表现
  phases: {
    name: string
    performance: string
    score: number
  }[]

  // 总评与建议
  summary: string
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
}

// ============================================================
// Report Generation
// ============================================================

/**
 * 从 session 数据生成培训评估报告
 * 
 * @param structuredEvalTags - 从 LLM JSON response 中解析的结构化 eval tags（优先使用）
 */
export function generateTrainingReport(
  world: WorldSchema,
  narrativeLog: { text: string; type: string }[],
  playerSteps: number,
  structuredEvalTags?: { dimension: string; grade: string }[],
): TrainingReport {
  const decisions = narrativeLog
    .filter(l => l.text.startsWith('→'))
    .map(l => l.text.slice(2).trim())

  const narratives = narrativeLog
    .filter(l => l.type === 'narrative')
    .map(l => l.text)

  // 解析所有评估标签：优先使用结构化 eval tags，fallback 到 narrative 内嵌标签
  const narrativeEvalTags = narratives.map(parseEvalTags).flat()
  const allEvalTags = (structuredEvalTags && structuredEvalTags.length > 0)
    ? structuredEvalTags
    : narrativeEvalTags

  // 计算各维度得分
  const competencies = computeCompetencies(world.agents, allEvalTags, decisions)

  // 利益相关方结果
  const stakeholders = computeStakeholderOutcomes(world.agents, narratives)

  // 决策时间线
  const decisionTimeline = decisions.map((action, i) => ({
    step: i + 1,
    action: action.length > 80 ? action.slice(0, 80) + '...' : action,
    impact: getDecisionImpact(i, world.agents),
  }))

  // 阶段表现
  const phases = computePhasePerformance(decisions, allEvalTags, playerSteps)

  // 总分
  const overallScore = Math.round(
    competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
  )
  const overallGrade = scoreToGrade(overallScore)

  // 总评
  const summary = generateSummary(overallGrade, competencies, stakeholders, decisions.length)
  const strengths = extractStrengths(competencies)
  const improvements = extractImprovements(competencies)
  const nextSteps = generateNextSteps(overallGrade, improvements)

  return {
    scenarioName: world.name,
    scenarioDescription: world.description,
    totalSteps: playerSteps,
    completedAt: new Date().toISOString(),
    duration: `约 ${Math.max(5, decisions.length * 2)} 分钟`,

    overallGrade,
    overallScore,
    competencies,

    stakeholders,

    decisionCount: decisions.length,
    avgResponseLength: decisions.length > 0
      ? Math.round(decisions.reduce((sum, d) => sum + d.length, 0) / decisions.length)
      : 0,
    decisionTimeline,

    phases,

    summary,
    strengths,
    improvements,
    nextSteps,
  }
}

// ============================================================
// Computation Helpers
// ============================================================

function computeCompetencies(
  agents: Agent[],
  evalTags: { dimension: string; grade: string }[],
  decisions: string[]
): CompetencyScore[] {
  const dimensions = [
    { key: 'analytical', label: '分析判断力', keywords: ['分析力', '分析', '判断', '逻辑'] },
    { key: 'decisiveness', label: '决策魄力', keywords: ['决断力', '决策', '果断', '魄力'] },
    { key: 'stakeholder', label: '利益相关方管理', keywords: ['利益', '平衡', '相关方', '同理心', '协调'] },
    { key: 'influence', label: '沟通影响力', keywords: ['沟通', '影响', '表达', '说服'] },
    { key: 'strategic', label: '战略格局', keywords: ['战略', '格局', '全局', '长远'] },
  ]

  const gradeToScore: Record<string, number> = { S: 92, A: 78, B: 62, C: 45, D: 25 }

  return dimensions.map(dim => {
    // 从 LLM 评估标签中取分
    const matchedTags = evalTags.filter(tag =>
      dim.keywords.some(k => tag.dimension.includes(k))
    )

    let score: number
    if (matchedTags.length > 0) {
      // 取所有匹配标签的平均分
      score = Math.round(
        matchedTags.reduce((sum, t) => sum + (gradeToScore[t.grade] || 50), 0) / matchedTags.length
      )
    } else {
      // Fallback：基于可解释的行为指标计算，每个维度有独立的评估逻辑
      score = computeHeuristicBaseline(dim.key, agents, decisions)
    }

    const grade = scoreToGrade(score)
    const evidence = generateEvidence(dim.key, decisions, agents)
    const suggestion = generateSuggestion(dim.key, grade)

    return { dimension: dim.label, score, grade, evidence, suggestion }
  })
}

/**
 * 启发式基线评分（Heuristic Baseline）：当 LLM 未返回 eval tags 时的降级方案。
 * 
 * 设计原则：
 * - 这是一个"有总比没有好"的降级方案，不是精确评估
 * - 基于可观测的行为指标（决策长度、关键词命中、Agent 态度变化）
 * - 每个维度有独立的评估逻辑，避免单一指标主导
 * - 分数范围 [20, 95]，避免极端值误导用户
 * 
 * 局限性（已知）：
 * - 关键词匹配无法捕捉语义深度（"因为"不等于真正的因果分析）
 * - 决策长度与质量不完全正相关
 * - 无法评估决策的时机和上下文适当性
 * 
 * 当 LLM eval tags 可用时，此函数不会被调用。
 * 
 * @param dimKey - 维度标识符
 * @param agents - 当前世界中的所有 Agent
 * @param decisions - 用户做出的所有决策文本
 * @returns 0-100 的启发式分数
 */
export function computeHeuristicBaseline(dimKey: string, agents: Agent[], decisions: string[]): number {
  const decisionCount = decisions.length
  if (decisionCount === 0) return 35  // 无决策数据，给低分

  const avgLength = decisions.reduce((s, d) => s + d.length, 0) / decisionCount
  const avgAttitude = agents.reduce((sum, a) => sum + a.memory.attitude, 0) / Math.max(agents.length, 1)
  const positiveAgentRatio = agents.filter(a => a.memory.attitude > 10).length / Math.max(agents.length, 1)
  const attitudeSpread = agents.length > 0
    ? Math.max(...agents.map(a => a.memory.attitude)) - Math.min(...agents.map(a => a.memory.attitude))
    : 0

  switch (dimKey) {
    case 'analytical': {
      // 分析判断力：决策长度体现信息密度，分析性关键词体现逻辑思维
      const analyticalKeywords = ['因为', '所以', '分析', '考虑', '基于', '根据', '判断', '评估', '数据', '信息']
      const keywordHits = decisions.filter(d => analyticalKeywords.some(k => d.includes(k))).length
      const lengthScore = Math.min(40, (avgLength / 80) * 40)  // 0-40 based on avg length
      const keywordScore = Math.min(30, (keywordHits / decisionCount) * 30)  // 0-30 based on keyword ratio
      const baseScore = 25 + lengthScore + keywordScore
      return Math.min(95, Math.max(20, Math.round(baseScore)))
    }
    case 'decisiveness': {
      // 决策魄力：决策密度 + 明确立场关键词
      const decisiveKeywords = ['决定', '必须', '立即', '直接', '明确', '坚持', '拒绝', '要求', '不接受']
      const keywordHits = decisions.filter(d => decisiveKeywords.some(k => d.includes(k))).length
      const densityScore = Math.min(35, (decisionCount / 10) * 35)
      const assertivenessScore = Math.min(35, (keywordHits / decisionCount) * 50)
      const baseScore = 25 + densityScore + assertivenessScore
      return Math.min(95, Math.max(20, Math.round(baseScore)))
    }
    case 'stakeholder': {
      // 利益相关方管理：正向态度比例 + 态度变化幅度（说明有互动）
      const attitudeScore = Math.min(40, positiveAgentRatio * 50)
      const engagementScore = Math.min(30, (attitudeSpread / 60) * 30)
      const baseScore = 30 + attitudeScore + engagementScore + (avgAttitude > 0 ? 10 : 0)
      return Math.min(95, Math.max(20, Math.round(baseScore)))
    }
    case 'influence': {
      // 沟通影响力：表达丰富度 + 实际影响效果（态度正向变化）
      const lengthScore = Math.min(30, (avgLength / 60) * 30)
      const influenceKeywords = ['建议', '提议', '说服', '解释', '强调', '沟通', '表达', '阐述']
      const keywordHits = decisions.filter(d => influenceKeywords.some(k => d.includes(k))).length
      const keywordScore = Math.min(25, (keywordHits / decisionCount) * 35)
      const effectScore = Math.min(25, positiveAgentRatio * 30)
      const baseScore = 25 + lengthScore + keywordScore + effectScore
      return Math.min(95, Math.max(20, Math.round(baseScore)))
    }
    case 'strategic': {
      // 战略格局：长期视角关键词 + 决策多样性（不重复同一策略）
      const strategicKeywords = ['长期', '未来', '全局', '整体', '战略', '规划', '布局', '权衡', '取舍', '优先']
      const keywordHits = decisions.filter(d => strategicKeywords.some(k => d.includes(k))).length
      const keywordScore = Math.min(35, (keywordHits / decisionCount) * 50)
      // 决策多样性：unique 决策前缀的比例
      const prefixes = decisions.map(d => d.slice(0, 10))
      const uniqueRatio = new Set(prefixes).size / prefixes.length
      const diversityScore = Math.min(30, uniqueRatio * 35)
      const baseScore = 25 + keywordScore + diversityScore
      return Math.min(95, Math.max(20, Math.round(baseScore)))
    }
    default:
      return 50
  }
}

function computeStakeholderOutcomes(agents: Agent[], narratives: string[]): StakeholderOutcome[] {
  return agents.map(agent => {
    const finalAttitude = agent.memory.attitude
    // 初始态度估算（从 observations 中推断）
    const observationCount = agent.memory.observations.length
    const initialAttitude = Math.max(-100, Math.min(100, 
      finalAttitude - (observationCount > 0 
        ? agent.memory.observations.reduce((sum, o) => sum + (o.importance > 5 ? 3 : -1), 0)
        : 0)
    ))

    const relationship: 'allied' | 'neutral' | 'opposed' = 
      finalAttitude > 20 ? 'allied' : finalAttitude < -20 ? 'opposed' : 'neutral'

    // 关键时刻
    const keyMoments = agent.memory.observations
      .filter(o => o.importance >= 7)
      .slice(-3)
      .map(o => o.content)

    return {
      name: agent.name,
      initialAttitude: Math.round(initialAttitude),
      finalAttitude,
      attitudeChange: Math.round(finalAttitude - initialAttitude),
      relationship,
      keyMoments,
    }
  })
}

function computePhasePerformance(
  decisions: string[],
  evalTags: { dimension: string; grade: string }[],
  totalSteps: number
): { name: string; performance: string; score: number }[] {
  const phases = [
    { name: '信息收集阶段 (1-4轮)', range: [0, 3] },
    { name: '决策推进阶段 (5-10轮)', range: [4, 9] },
    { name: '收敛结案阶段 (11-15轮)', range: [10, 14] },
  ]

  return phases.map(phase => {
    const phaseDecisions = decisions.slice(phase.range[0], phase.range[1] + 1)
    const avgLength = phaseDecisions.length > 0
      ? Math.round(phaseDecisions.reduce((s, d) => s + d.length, 0) / phaseDecisions.length)
      : 0

    let performance: string
    let score: number

    if (phaseDecisions.length === 0) {
      performance = '未进入此阶段'
      score = 0
    } else if (avgLength > 60) {
      performance = '决策详细充分，展现了深度思考'
      score = 80
    } else if (avgLength > 30) {
      performance = '决策方向明确，但细节可进一步展开'
      score = 65
    } else {
      performance = '决策过于简略，缺乏具体方案支撑'
      score = 40
    }

    return { name: phase.name, performance, score }
  })
}

// ============================================================
// Text Generation Helpers
// ============================================================

function generateSummary(
  grade: string, 
  competencies: CompetencyScore[], 
  stakeholders: StakeholderOutcome[],
  decisionCount: number
): string {
  const alliedCount = stakeholders.filter(s => s.relationship === 'allied').length
  const totalStakeholders = stakeholders.length
  const topCompetency = competencies.reduce((a, b) => a.score > b.score ? a : b)
  const weakCompetency = competencies.reduce((a, b) => a.score < b.score ? a : b)

  if (grade === 'S' || grade === 'A') {
    return `评估者在本次情景模拟中表现优秀（综合评级 ${grade}）。在 ${decisionCount} 轮决策中，成功争取到 ${alliedCount}/${totalStakeholders} 方支持。核心优势体现在"${topCompetency.dimension}"维度（${topCompetency.grade} 级），能够在压力下保持清晰的思路和有效的行动力。建议在"${weakCompetency.dimension}"方面进一步提升以达到更全面的领导力表现。`
  } else if (grade === 'B') {
    return `评估者在本次情景模拟中表现良好（综合评级 ${grade}）。在 ${decisionCount} 轮决策中展现了一定的决策能力。"${topCompetency.dimension}"是相对优势领域（${topCompetency.grade} 级），但"${weakCompetency.dimension}"存在明显短板（${weakCompetency.grade} 级），建议针对性加强训练。利益相关方管理方面，争取到 ${alliedCount}/${totalStakeholders} 方支持，仍有提升空间。`
  } else {
    return `评估者在本次情景模拟中表现待提升（综合评级 ${grade}）。${decisionCount} 轮决策中缺乏系统性的策略规划。"${weakCompetency.dimension}"是最突出的短板（${weakCompetency.grade} 级），建议从基础能力建设入手。仅争取到 ${alliedCount}/${totalStakeholders} 方支持，在多方博弈中需要更多实战练习。`
  }
}

function extractStrengths(competencies: CompetencyScore[]): string[] {
  return competencies
    .filter(c => c.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => `${c.dimension}（${c.grade} 级，${c.score}分）：${c.evidence[0] || '表现稳定'}`)
}

function extractImprovements(competencies: CompetencyScore[]): string[] {
  return competencies
    .filter(c => c.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(c => `${c.dimension}（${c.grade} 级，${c.score}分）：${c.suggestion}`)
}

function generateNextSteps(grade: string, improvements: string[]): string[] {
  const steps: string[] = []

  if (grade === 'S' || grade === 'A') {
    steps.push('尝试更高难度的情景（如多方利益严重冲突 + 时间极度紧迫）')
    steps.push('练习"教练式"决策——在做出判断的同时引导团队自主思考')
  } else if (grade === 'B') {
    steps.push('重新挑战同一场景，尝试完全不同的策略路径进行对比')
    steps.push('重点针对最低分维度进行专项训练')
  } else {
    steps.push('从信息收集环节开始刻意练习——确保决策前掌握充分信息')
    steps.push('学习"利益相关方地图"工具，先画出各方诉求再做决策')
    steps.push('每次决策前问自己三个问题：谁受益？谁受损？有无第三选择？')
  }

  if (improvements.length > 0) {
    steps.push(`建议进入专项训练模块："${improvements[0].split('：')[0]}"强化训练`)
  }

  return steps
}

function generateEvidence(dimKey: string, decisions: string[], agents: Agent[]): string[] {
  const evidence: string[] = []
  
  if (decisions.length > 0) {
    // 优先引用用户的实际决策原文作为证据
    const relevantDecisions = findRelevantDecisions(dimKey, decisions)
    for (const d of relevantDecisions.slice(0, 2)) {
      const quoted = d.length > 60 ? d.slice(0, 57) + '...' : d
      evidence.push(`用户决策："${quoted}"`)
    }

    // 补充统计性证据
    if (dimKey === 'analytical' && decisions[decisions.length - 1].length > 50) {
      evidence.push('决策描述详细，体现了信息整合能力')
    }
    if (dimKey === 'decisiveness' && decisions.length >= 8) {
      evidence.push(`在限定轮次内做出了 ${decisions.length} 次有效决策`)
    }
    if (dimKey === 'stakeholder') {
      const positiveAgents = agents.filter(a => a.memory.attitude > 20).length
      if (positiveAgents > 0) {
        evidence.push(`成功将 ${positiveAgents} 位利益相关方转化为支持立场`)
      }
    }
    if (dimKey === 'influence') {
      const avgLength = decisions.reduce((s, d) => s + d.length, 0) / decisions.length
      if (avgLength > 40) {
        evidence.push('沟通表达丰富详实，策略意图清晰')
      }
    }
    if (dimKey === 'strategic' && decisions.some(d => d.includes('长期') || d.includes('未来') || d.includes('全局'))) {
      evidence.push('决策中体现了长期视角和全局观')
    }
  }

  if (evidence.length === 0) {
    evidence.push('需要更多决策样本进行评估')
  }

  return evidence
}

/**
 * 根据维度关键词找到最相关的用户决策，用于报告中引用原文。
 */
function findRelevantDecisions(dimKey: string, decisions: string[]): string[] {
  const keywordMap: Record<string, string[]> = {
    analytical: ['分析', '判断', '考虑', '因为', '基于', '评估', '数据', '信息', '逻辑', '推理'],
    decisiveness: ['决定', '必须', '立即', '直接', '明确', '坚持', '拒绝', '要求', '果断'],
    stakeholder: ['平衡', '各方', '协调', '兼顾', '利益', '诉求', '合作', '妥协', '共赢'],
    influence: ['建议', '说服', '解释', '强调', '沟通', '表达', '阐述', '提议', '引导'],
    strategic: ['长期', '未来', '全局', '整体', '战略', '规划', '布局', '权衡', '优先'],
  }
  const keywords = keywordMap[dimKey] || []
  return decisions.filter(d => keywords.some(k => d.includes(k)))
}

function generateSuggestion(dimKey: string, grade: string): string {
  if (grade === 'S' || grade === 'A') {
    return '保持当前水平，可尝试在更复杂场景中检验稳定性'
  }

  const suggestions: Record<string, string> = {
    analytical: '建议在做决策前先列出"已知信息"和"未知信息"，避免在信息不充分时仓促行动',
    decisiveness: '练习在信息不完整时也做出明确判断，可以使用"70%把握即行动"原则',
    stakeholder: '尝试在决策前画出利益相关方地图，标注每方的核心诉求和底线',
    influence: '建议采用"PREP"沟通框架（观点→理由→例证→重申），增强说服力',
    strategic: '做每个决策时问自己"这对 3 个月后有什么影响"，培养长期思维习惯',
  }

  return suggestions[dimKey] || '建议通过更多实战场景进行针对性训练'
}

// ============================================================
// Utilities
// ============================================================

function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

/**
 * Parse evaluation tags from narrative text.
 * Supports two formats:
 * 1. Legacy pipe format: "narrative text |[维度:等级][维度:等级]"
 * 2. JSON evalTags embedded in narrative (from structured output)
 */
function parseEvalTags(text: string): { dimension: string; grade: string }[] {
  // Try legacy pipe format first
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex !== -1) {
    const tagStr = text.slice(pipeIndex + 1)
    const matches = tagStr.matchAll(/\[([^:]+):([SABCD])\]/g)
    const results = [...matches].map(m => ({ dimension: m[1], grade: m[2] }))
    if (results.length > 0) return results
  }
  return []
}

/**
 * Parse eval tags from structured JSON response (new format).
 * Called separately when processing raw LLM response data.
 */
export function parseStructuredEvalTags(
  data: any
): { dimension: string; grade: string }[] {
  if (!data?.evalTags || !Array.isArray(data.evalTags)) return []
  return data.evalTags
    .filter((tag: any) => tag?.dimension && tag?.grade && /^[SABCD]$/.test(tag.grade))
    .map((tag: any) => ({ dimension: tag.dimension, grade: tag.grade }))
}

function getDecisionImpact(decisionIndex: number, agents: Agent[]): string {
  // 基于决策顺序推断阶段影响
  if (decisionIndex < 3) return '信息收集期 — 建立情境认知'
  if (decisionIndex < 8) return '决策推进期 — 推动局势变化'
  return '收敛期 — 整合各方达成结论'
}

// ============================================================
// Report Export (Markdown format)
// ============================================================

/**
 * 将报告导出为 Markdown 格式（可直接粘贴到文档中）
 */
export function reportToMarkdown(report: TrainingReport): string {
  const lines: string[] = []

  lines.push(`# 培训评估报告`)
  lines.push(``)
  lines.push(`## 基本信息`)
  lines.push(``)
  lines.push(`| 项目 | 内容 |`)
  lines.push(`|------|------|`)
  lines.push(`| 场景 | ${report.scenarioName} |`)
  lines.push(`| 总轮次 | ${report.totalSteps} |`)
  lines.push(`| 决策次数 | ${report.decisionCount} |`)
  lines.push(`| 平均决策长度 | ${report.avgResponseLength} 字 |`)
  lines.push(`| 评估耗时 | ${report.duration} |`)
  lines.push(`| 完成时间 | ${new Date(report.completedAt).toLocaleString('zh-CN')} |`)
  lines.push(``)
  lines.push(`## 综合评级：${report.overallGrade}（${report.overallScore}分）`)
  lines.push(``)
  lines.push(report.summary)
  lines.push(``)
  lines.push(`## 能力维度评估`)
  lines.push(``)
  lines.push(`| 维度 | 评级 | 得分 | 改进建议 |`)
  lines.push(`|------|------|------|----------|`)
  for (const c of report.competencies) {
    lines.push(`| ${c.dimension} | ${c.grade} | ${c.score} | ${c.suggestion} |`)
  }
  lines.push(``)
  lines.push(`## 利益相关方结果`)
  lines.push(``)
  lines.push(`| 角色 | 初始态度 | 最终态度 | 变化 | 关系 |`)
  lines.push(`|------|----------|----------|------|------|`)
  for (const s of report.stakeholders) {
    const arrow = s.attitudeChange > 0 ? '↑' : s.attitudeChange < 0 ? '↓' : '→'
    lines.push(`| ${s.name} | ${s.initialAttitude} | ${s.finalAttitude} | ${arrow}${Math.abs(s.attitudeChange)} | ${s.relationship} |`)
  }
  lines.push(``)
  lines.push(`## 阶段表现`)
  lines.push(``)
  for (const p of report.phases) {
    lines.push(`**${p.name}**：${p.performance}（${p.score}分）`)
    lines.push(``)
  }
  lines.push(`## 核心优势`)
  lines.push(``)
  for (const s of report.strengths) {
    lines.push(`- ${s}`)
  }
  lines.push(``)
  lines.push(`## 改进方向`)
  lines.push(``)
  for (const i of report.improvements) {
    lines.push(`- ${i}`)
  }
  lines.push(``)
  lines.push(`## 下一步建议`)
  lines.push(``)
  for (const n of report.nextSteps) {
    lines.push(`- ${n}`)
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(`*本报告由 WorldSim AI 培训引擎自动生成*`)

  return lines.join('\n')
}
