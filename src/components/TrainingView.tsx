/**
 * TrainingView — 情景评估模式专用布局
 * 
 * 定位：企业级能力评估平台
 * 设计参考：SHL OPQ测评界面 × Hogan Assessment × MBA案例教学
 * 
 * 核心组成：
 * - 左侧：情景推进面板（案例叙述 + 策略决策输入）
 * - 右侧：实时评估仪表盘（能力雷达 + 利益相关方态势 + 阶段反馈）
 * - 无任何游戏化元素（无HP/地图/背包/emoji按钮）
 */

import { useGameStore } from '../store/gameStore'

export default function TrainingView() {
  const { world, player, narrativeLog, choices, isProcessing, performAction, phase } = useGameStore()
  
  if (!world || !player) return null

  const stepCount = player.steps
  const maxSteps = 15
  const progressPercent = (stepCount / maxSteps) * 100
  
  // 阶段划分
  const currentPhase = stepCount <= 4 ? '信息收集' : stepCount <= 10 ? '决策推进' : '收敛结案'
  const phaseIndex = stepCount <= 4 ? 0 : stepCount <= 10 ? 1 : 2

  // 解析 narrative 中的评估标签（格式：...|[维度:等级]）
  const lastNarrative = narrativeLog.filter(l => l.type === 'narrative').slice(-1)[0]?.text || ''
  const evalTags = parseEvalTags(lastNarrative)

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* 顶部：场景概要 + 阶段进度 */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/50 border border-amber-800/50 rounded text-amber-300 font-medium">
                情景评估
              </span>
              <h2 className="text-sm font-medium text-gray-200 truncate">{world.name}</h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{world.description}</p>
          </div>
          {/* 阶段进度 */}
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-gray-500 mb-1">评估进度</div>
            <div className="flex items-center gap-2">
              {['信息收集', '决策推进', '收敛结案'].map((p, i) => (
                <div key={p} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    i < phaseIndex ? 'bg-amber-400' : 
                    i === phaseIndex ? 'bg-amber-400 ring-2 ring-amber-400/30' : 
                    'bg-gray-700'
                  }`} />
                  <span className={`text-[10px] ${i === phaseIndex ? 'text-amber-300' : 'text-gray-600'}`}>
                    {p}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 w-40 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{stepCount}/{maxSteps} 轮</div>
          </div>
        </div>
        {/* 评估目标 */}
        <div className="mt-3 px-3 py-2 bg-gray-950/50 rounded border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 shrink-0">评估目标</span>
            <p className="text-[11px] text-gray-400">{world.winCondition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        {/* ========== 左侧：情景推进 ========== */}
        <div className="space-y-3">
          {/* 情景记录 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800">
              <span className="text-[10px] text-gray-500 font-medium">情景记录</span>
            </div>
            <div className="p-4 max-h-[380px] overflow-y-auto space-y-3">
              {narrativeLog.map((log, i) => (
                <div key={i} className={getLogStyle(log)}>
                  {log.type === 'system' && !log.text.startsWith('→') ? (
                    <span className="text-[10px]">{log.text}</span>
                  ) : log.text.startsWith('→') ? (
                    <div className="pl-3 border-l-2 border-amber-700/50">
                      <span className="text-[10px] text-amber-500/70 block mb-0.5">你的决策</span>
                      <span className="text-sm text-gray-200">{log.text.slice(2)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {stripEvalTags(log.text)}
                    </p>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">情景推进中...</span>
                </div>
              )}
            </div>
          </div>

          {/* 决策输入区 — 以开放式输入为主 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            {/* 主输入区 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-300 font-medium">你的决策</span>
                <span className="text-[10px] text-gray-600">描述你将采取的行动方案</span>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const textarea = (e.target as HTMLFormElement).elements.namedItem('customAction') as HTMLTextAreaElement
                  if (textarea.value.trim()) {
                    performAction(textarea.value.trim())
                    textarea.value = ''
                  }
                }}
              >
                <textarea
                  name="customAction"
                  placeholder="请输入你的决策方案。例如：&#10;• 先私下找CTO确认技术排查的最早出结果时间，用该时间锚定对外声明节奏&#10;• 向CEO建议采用'三段式'回应：1小时内发持股声明，4小时后出技术说明，24小时内公布补偿方案&#10;• 安抚法务总监，承诺在声明中只确认'已知事实'而不做责任定性"
                  disabled={isProcessing}
                  rows={4}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200
                             placeholder:text-gray-600 focus:outline-none focus:border-amber-600/50 transition-colors
                             disabled:opacity-40 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-600">
                    越详细的决策描述，评估系统能给出越精准的能力诊断
                  </span>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 bg-amber-900/50 border border-amber-700/50 rounded-lg text-sm text-amber-200
                               hover:bg-amber-800/50 hover:border-amber-600/50 disabled:opacity-40 transition-all"
                  >
                    提交决策
                  </button>
                </div>
              </form>
            </div>

            {/* 策略参考（可折叠，降低为辅助提示） */}
            {choices.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gray-500 hover:text-gray-400 transition-colors">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 6L14 10L6 14V6Z"/>
                  </svg>
                  <span>参考策略方向</span>
                  <span className="text-gray-700">— 可直接采用或作为思考起点</span>
                </summary>
                <div className="mt-2 space-y-1.5 pl-5">
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => performAction(choice)}
                      disabled={isProcessing}
                      className="w-full text-left px-3 py-2 rounded border text-[12px] transition-all
                                 bg-gray-950/30 border-gray-800 text-gray-400
                                 hover:border-amber-700/40 hover:bg-amber-950/10 hover:text-gray-300
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-amber-600/40 font-mono mr-1.5">{String.fromCharCode(65 + i)}.</span>
                      {choice}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* ========== 右侧：评估仪表盘 ========== */}
        <div className="space-y-3">
          {/* 能力维度评估 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-gray-400 font-medium">能力诊断</h3>
              {evalTags.length > 0 && (
                <span className="text-[9px] text-amber-400/50">实时更新</span>
              )}
            </div>
            <div className="space-y-2.5">
              <CompetencyBar 
                label="分析判断力" 
                score={getCompetencyScore(world.agents, 'analytical', evalTags)} 
                description="信息识别、逻辑推理、本质洞察"
              />
              <CompetencyBar 
                label="决策魄力" 
                score={getCompetencyScore(world.agents, 'decisiveness', evalTags)} 
                description="果断程度、风险承受、明确立场"
              />
              <CompetencyBar 
                label="利益相关方管理" 
                score={getCompetencyScore(world.agents, 'stakeholder', evalTags)} 
                description="多方平衡、诉求整合、关系维护"
              />
              <CompetencyBar 
                label="沟通影响力" 
                score={getCompetencyScore(world.agents, 'influence', evalTags)} 
                description="说服技巧、情绪管理、信息节奏"
              />
              <CompetencyBar 
                label="战略格局" 
                score={getCompetencyScore(world.agents, 'strategic', evalTags)} 
                description="长期视角、系统思维、取舍智慧"
              />
            </div>
          </div>

          {/* 利益相关方态势 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <h3 className="text-xs text-gray-400 font-medium mb-2">利益相关方态势</h3>
            <div className="space-y-2">
              {world.agents.map(agent => (
                <div key={agent.id} className="p-2 bg-gray-950/60 rounded border border-gray-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300 font-medium">{agent.name}</span>
                    <StanceIndicator attitude={agent.memory.attitude} />
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed mb-1">
                    {agent.goals[0] || agent.persona.slice(0, 40)}
                  </p>
                  {agent.memory.currentPlan && (
                    <div className="text-[10px] text-amber-400/40 mt-1">
                      当前动态：{agent.memory.currentPlan}
                    </div>
                  )}
                  {/* 态度变化趋势条 */}
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        agent.memory.attitude > 0 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${Math.abs(agent.memory.attitude)}%`,
                        marginLeft: agent.memory.attitude < 0 ? `${100 - Math.abs(agent.memory.attitude)}%` : '0'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 阶段总结（后半段才出现） */}
          {stepCount >= 5 && (
            <div className="bg-gray-900/50 border border-amber-900/30 rounded-lg p-3">
              <h3 className="text-xs text-amber-400/70 font-medium mb-2">阶段观察</h3>
              <div className="text-[10px] text-gray-500 space-y-1 leading-relaxed">
                {getPhaseInsights(world.agents, stepCount, narrativeLog)}
              </div>
            </div>
          )}

          {/* 场景结束后的复盘提示 */}
          {phase === 'gameover' && (
            <div className="bg-amber-950/20 border border-amber-800/50 rounded-lg p-3">
              <h3 className="text-xs text-amber-300 font-medium mb-2">评估完成</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                情景模拟已结束。完整评估报告将基于您在{maxSteps}轮决策中展现的能力维度进行综合评分。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 辅助组件
// ============================================================

/** 能力维度评分条 */
function CompetencyBar({ label, score, description }: { label: string; score: number; description: string }) {
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  const gradeColor = {
    S: 'text-purple-400 bg-purple-950/50 border-purple-800/50',
    A: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50',
    B: 'text-amber-400 bg-amber-950/50 border-amber-800/50',
    C: 'text-orange-400 bg-orange-950/50 border-orange-800/50',
    D: 'text-red-400 bg-red-950/50 border-red-800/50',
  }[grade]
  const barColor = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-orange-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-300">{label}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-medium ${gradeColor}`}>
          {grade}
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} rounded-full transition-all duration-700`} 
          style={{ width: `${score}%` }} 
        />
      </div>
      <p className="text-[9px] text-gray-600 mt-0.5">{description}</p>
    </div>
  )
}

/** 立场指示器 */
function StanceIndicator({ attitude }: { attitude: number }) {
  const label = attitude > 30 ? '支持' : attitude > 10 ? '偏支持' : attitude > -10 ? '中立' : attitude > -30 ? '偏反对' : '反对'
  const color = attitude > 30 ? 'text-emerald-400' : attitude > 10 ? 'text-emerald-300/70' : attitude > -10 ? 'text-gray-400' : attitude > -30 ? 'text-orange-300/70' : 'text-red-400'
  return <span className={`text-[10px] font-medium ${color}`}>{label}</span>
}

// ============================================================
// 工具函数
// ============================================================

function getLogStyle(log: { type: string; text: string }): string {
  if (log.type === 'system') return 'text-gray-500'
  if (log.type === 'event') return 'text-amber-400/60 text-[11px]'
  if (log.text.startsWith('→')) return ''
  return ''
}

/** 从 narrative 中解析评估标签 */
function parseEvalTags(text: string): { dimension: string; grade: string }[] {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return []
  const tagStr = text.slice(pipeIndex + 1)
  const matches = tagStr.matchAll(/\[([^:]+):([SABCD])\]/g)
  return [...matches].map(m => ({ dimension: m[1], grade: m[2] }))
}

/** 去除评估标签后的纯文本 */
function stripEvalTags(text: string): string {
  const pipeIndex = text.lastIndexOf('|')
  if (pipeIndex === -1) return text
  const afterPipe = text.slice(pipeIndex + 1)
  if (/\[[^\]]+:[SABCD]\]/.test(afterPipe)) {
    return text.slice(0, pipeIndex).trim()
  }
  return text
}

/** 基于Agent态度和评估标签计算能力分 */
function getCompetencyScore(agents: any[], dimension: string, evalTags: { dimension: string; grade: string }[]): number {
  // 优先从LLM返回的评估标签中取值
  const gradeMap: Record<string, number> = { S: 92, A: 78, B: 62, C: 45, D: 25 }
  const dimensionMap: Record<string, string[]> = {
    analytical: ['分析力', '分析', '判断'],
    decisiveness: ['决断力', '决策', '果断'],
    stakeholder: ['利益', '平衡', '相关方', '同理心'],
    influence: ['沟通', '影响', '表达'],
    strategic: ['战略', '格局', '全局'],
  }
  
  const matchKeys = dimensionMap[dimension] || []
  for (const tag of evalTags) {
    if (matchKeys.some(k => tag.dimension.includes(k))) {
      return gradeMap[tag.grade] || 50
    }
  }

  // Fallback：基于Agent态度变化的推算
  const avgAttitude = agents.reduce((sum, a) => sum + a.memory.attitude, 0) / Math.max(agents.length, 1)
  const base = 50
  const jitter = Math.sin(dimension.length * 7) * 8 // 维度差异化
  return Math.min(95, Math.max(15, base + avgAttitude * 0.4 + jitter))
}

/** 阶段性洞察生成 */
function getPhaseInsights(agents: any[], stepCount: number, narrativeLog: any[]): React.ReactNode {
  const supportCount = agents.filter(a => a.memory.attitude > 20).length
  const opposeCount = agents.filter(a => a.memory.attitude < -20).length
  const decisionCount = narrativeLog.filter(l => l.text.startsWith('→')).length

  const insights: string[] = []
  
  if (supportCount > agents.length / 2) {
    insights.push(`已争取到${supportCount}/${agents.length}方支持`)
  }
  if (opposeCount > 0) {
    insights.push(`仍有${opposeCount}方持反对态度，需关注`)
  }
  if (decisionCount < stepCount * 0.6) {
    insights.push('决策频率偏低，可能有犹豫倾向')
  }
  if (stepCount >= 10) {
    insights.push('进入收敛阶段，需开始整合各方意见')
  }
  
  if (insights.length === 0) {
    insights.push('情景正在发展中，持续观察决策质量')
  }

  return insights.map((text, i) => <p key={i}>• {text}</p>)
}
