/**
 * WorldSim Engine — 场景模式配置
 * 
 * 三种差异化模式，面向不同受众：
 * 
 * 1. 探索模式（C端）— 游戏化世界探索，NPC有记忆，世界自主演化
 * 2. 培训模式（B端/企培）— 专业情景模拟+能力评估系统，对标 SHL/DDI 测评
 * 3. 仿真模式（研究/产品）— 多智能体推演引擎，对标 Agent-based Modeling
 */

import type { WorldSchema } from './types'

export type ScenarioMode = 'game' | 'training' | 'simulation'

export interface ScenarioConfig {
  mode: ScenarioMode
  label: string
  description: string
  icon: string
  presets: ScenarioPreset[]
  worldGenModifier: string       // 追加到世界生成提示词
  actionModifier: string         // 追加到行动响应提示词
  agentTickEnabled: boolean      // Agent 是否自主行动
  showMap: boolean               // 是否渲染空间网格
  showScore: boolean             // 是否展示评估分数
  autoRun: boolean               // 是否无需用户输入自动运行
  maxSteps: number | null        // 步数限制（null = 无限）
}

export interface ScenarioPreset {
  name: string
  icon: string
  theme: string
  description: string
  promptModifier?: string
}

// ============================================================
// 模式配置
// ============================================================

export const SCENARIO_CONFIGS: Record<ScenarioMode, ScenarioConfig> = {
  // ——————————————————————————————————
  // 探索模式（C端玩家）
  // ——————————————————————————————————
  game: {
    mode: 'game',
    label: '探索模式',
    description: '自由探索 AI 生成的世界，NPC 有记忆有态度，世界会自主演化',
    icon: '🌍',
    presets: [
      {
        name: '废弃空间站',
        icon: '🚀',
        theme: '一座废弃的太空站，AI 系统已经失控。黑暗的走廊里有故障的机器人在巡逻，某处角落藏着唯一的幸存者。你需要找到出路。',
        description: '科幻生存探索',
      },
      {
        name: '瘟疫村庄',
        icon: '🏰',
        theme: '一座被瘟疫笼罩的中世纪村庄，隐藏着黑暗的秘密。村里的治愈师知道的比她说的多，牧师失踪了，夜里狼群在嚎叫。',
        description: '暗黑奇幻悬疑',
      },
      {
        name: '赛博黑市',
        icon: '🌆',
        theme: '新东京地下城的赛博朋克黑市。数据贩子、改造外科医生、一个正在追踪目标的赏金猎人。你只是来买点东西，但卷入了一场交易纠纷。',
        description: '霓虹黑色谈判',
      },
    ],
    worldGenModifier: '',
    actionModifier: '',
    agentTickEnabled: true,
    showMap: true,
    showScore: false,
    autoRun: false,
    maxSteps: null,
  },

  // ——————————————————————————————————
  // 培训模式（B端 · 企业培训 / 人才测评）
  // 
  // 定位：对标 SHL、DDI、Hogan 等专业测评机构
  // 核心价值：情景模拟 × 能力模型 × 结构化评分
  // ——————————————————————————————————
  training: {
    mode: 'training',
    label: '情景评估',
    description: '基于能力模型的情景模拟评估 — 多维度实时诊断决策质量',
    icon: '📋',
    presets: [
      {
        name: '危机决策：公关危机48小时',
        icon: '🚨',
        theme: `你是某互联网公司公关副总裁。2小时前，安全团队确认约120万条用户手机号和订单数据遭泄露，黑客在暗网公开叫卖。
当前局面：
- CEO 要求15分钟内确定对外口径
- 法务总监坚持"事实未完全查清前不对外发声"
- CTO 承诺4小时内出技术调查报告，但无法承诺准确时间
- 记者已在联系前台求证，某大V刚发帖@公司官方
- 客服热线投诉量激增300%
你需要在各方压力下制定分阶段响应方案。`,
        description: '考察维度：危机响应、利益相关方管理、信息节奏控制',
      },
      {
        name: '资源博弈：跨部门预算谈判',
        icon: '💼',
        theme: `你是事业部总经理，今天是年度预算终审会。你的事业部去年完成率115%，但今年公司整体利润下滑，董事会要求所有BU压缩20%预算。
与会者：
- CFO（强硬派，按数据说话，偏好短期ROI）
- 另一个事业部GM（你的竞争对手，去年完成率只有85%但政治资源雄厚）
- CEO（希望维稳，不想看到公开冲突）
- 你的下属VP（在会议室外等你争取结果，团队士气取决于今天的结果）
你的目标是保住关键项目预算的同时维护跨部门关系。`,
        description: '考察维度：谈判策略、数据驱动论证、组织政治敏感度',
      },
      {
        name: '管理困境：高绩效员工的道德红线',
        icon: '⚖️',
        theme: `你是研发总监。团队核心架构师（3年司龄，不可替代级别）被匿名举报在外面接私活，使用了公司核心技术方案。
事实核查结果：
- HR 调查确认属实，涉及竞业限制条款
- 该员工负责的关键系统下个月要上线，只有他完全掌握
- 法务表示若不处理可能形成先例
- 该员工得知被调查后情绪激动，暗示"走的话会带走几个人"
- 你的VP明确告诉你"这件事不能耽误项目进度"
作为直属领导，你需要做出处置决定。`,
        description: '考察维度：原则坚守vs.务实妥协、法律风险管理、团队稳定性',
      },
    ],
    worldGenModifier: `
【系统角色】你是一个专业的组织行为学情景模拟构建系统。

【培训模式架构要求】
本模式用于企业中高层管理者的能力评估。请严格遵循以下设计规范：

1. 场景结构（非游戏！无空间概念）：
   - "map": [["场景"]], "dimensions": [1,1]（固定值，不要设计空间地图）
   - tiles只需一个：{ "场景": { "name": "决策情境", "walkable": true, "description": "管理决策情景模拟" } }
   - playerStart: [0,0]

2. Agent设计（代表利益相关方/角色）：
   - 每个Agent是一个有明确利益诉求的角色（上级/下属/客户/对手/监管方）
   - persona 必须包含：职位、核心诉求、底线、行为风格、与主角的权力关系
   - goals 描述该角色在此情景中的具体利益目标
   - decisionStyle 代表其谈判/互动风格（如"数据驱动"/"关系导向"/"强势施压"/"被动等待"）
   - memory.attitude 初始值反映该角色对你的初始立场（-100到100）

3. 规则设计（代表时间压力和环境变化）：
   - 每条rule代表一个外部事件触发（如"经过3步后 媒体开始报道""经过5步后 竞争对手出价"）
   - rule的effect必须制造新的决策压力
   - 不允许空间移动类规则

4. winCondition：描述评估目标而非"胜利条件"（如"在15轮内制定出各方可接受的解决方案"）

5. 所有文本必须为中文`,
    actionModifier: `
【情景评估推进规则 — 严格遵守】

你是一个高拟真度的管理情景模拟评估系统。这不是游戏，不是冒险，不是小说。

1. narrative 格式要求：
   - 以案例复盘记录风格描述场景进展
   - 应当描述：对话内容摘要、立场变化、信息揭露、压力升级、博弈态势
   - 风格参考：哈佛商学院案例教学的情景描写

2. 绝对禁止的表述（违反任何一条即为失败输出）：
   - 禁止任何物理空间/移动描写："走向""走到""转身""面前""推开门""坐下""站起"
   - 禁止任何感官描写："看到""听到""感觉到""注意到"
   - 禁止游戏化探索词汇："观察""查看""环顾""探索""调查""打开""拿起"
   - 正确示例："你向CFO提出了阶段性投入的方案，强调Q1的ROI数据支撑"
   - 错误示例："你走向CFO，试图说服他" — 这是游戏，不是评估

3. choices 设计原则（提供2-3个策略方向作为参考，用户可选可不选）：
   - 每个选项是一个完整的策略方案（而非单一动作）
   - 格式："[策略名称] 具体做法描述"
   - 示例："[以退为进] 主动提出缩减10%预算换取项目自主权，同时要求对方BU同比缩减"
   - 示例："[数据施压] 拿出ROI对比报告，要求CFO解释为何高完成率BU承担更大削减比例"
   - 示例："[联盟策略] 会后单独找CEO沟通，提供替代方案让CEO做选择题而非判断题"
   - 每个选项至少20字，策略意图必须清晰
   - 绝对禁止出现："观察局势""继续等待""了解情况""看看反应"这类空洞选项

4. agentReactions 要求：
   - 反应必须体现角色的利益计算和情绪状态
   - 态度变化要有逻辑依据
   - attitudeChange 范围控制在 -8 到 +8 之间
   - newObservation 记录该角色对你形成的新判断

5. 评估框架（内嵌于输出中）：
   - 在narrative末尾用|分隔附上简要评估标签
   - 格式示例："...|[分析力:B][决断力:A][同理心:C]"
   - 评估等级：S/A/B/C/D

6. 所有文本必须为中文
7. agentReactions 中 agentId 必须使用 agent 的 id（如 "agent_1"），不要使用角色名`,
    agentTickEnabled: true,
    showMap: false,
    showScore: true,
    autoRun: false,
    maxSteps: 15,
  },

  // ——————————————————————————————————
  // 仿真模式（研究 · 产品 · 策略推演）
  // 
  // 定位：对标 Mesa/NetLogo/AnyLogic 等 Agent-Based Modeling 工具
  // 核心价值：快速搭建多智能体推演 × 可观测 × 数据输出
  // ——————————————————————————————————
  simulation: {
    mode: 'simulation',
    label: '多智能体仿真',
    description: '自主智能体推演引擎 — 设定初始条件，观察涌现行为，输出结构化数据',
    icon: '🔬',
    presets: [
      {
        name: '用户决策路径仿真',
        icon: '🛒',
        theme: `【仿真目标】模拟4类典型用户在电商平台的购买决策全流程，产出行为路径差异报告。

智能体定义：
- Agent A "效率型用户"：30岁白领，目标明确，跳过所有推荐，直接搜索→下单，决策时间<2分钟
- Agent B "价格敏感型"：大学生，反复比价，频繁领券，购物车囤货等大促，对价格锚定高度敏感
- Agent C "高龄低频用户"：60岁退休教师，操作缓慢，容易被弹窗打断，不理解优惠规则，高误触率
- Agent D "谨慎首购用户"：首次使用该平台，反复查看评价、退货政策、客服响应时间，信任阈值极高

观测变量：完成率、平均决策步数、流失节点、求助次数、回退行为频率`,
        description: '产品策略 — 用户分群行为对比分析',
      },
      {
        name: '组织效能动力学仿真',
        icon: '🏢',
        theme: `【仿真目标】模拟跨职能团队在2周Sprint中的协作动态，识别效能瓶颈和冲突模式。

智能体定义：
- Agent "技术负责人"（过度承诺型）：总是说"没问题"，实际进度永远延期，不主动暴露风险
- Agent "QA工程师"（被边缘化型）：发现的问题经常被忽视，逐渐降低主动反馈意愿
- Agent "产品经理"（需求不稳定型）：每天都有"小调整"，不认为自己在频繁变更
- Agent "新人开发"（沉默型）：遇到阻塞不主动求助，等到deadline才暴露问题
- Agent "远程设计师"（孤岛型）：异步沟通为主，经常miss对齐会，产出与预期偏差大
- Agent "Scrum Master"（协调者）：试图用流程解决所有问题，对人际冲突回避

环境规则：每3轮触发一次需求变更、每5轮有一次对外交付节点
观测变量：信息传递延迟、阻塞时长、冲突频率、情绪曲线、交付质量`,
        description: '组织诊断 — 团队动态与系统性障碍识别',
      },
      {
        name: '市场定价博弈仿真',
        icon: '📈',
        theme: `【仿真目标】模拟同质化SaaS市场中4家公司3轮定价决策的纳什均衡趋势。

智能体定义：
- Agent "头部厂商"：市占率40%，品牌溢价，客户粘性高，决策风格保守（不轻易降价）
- Agent "新进入者"：融资充裕，用低价获客，月亏损容忍度3个月，激进定价
- Agent "垂直选手"：差异化定位特定行业，价格弹性低，关注利润率而非市占
- Agent "跟随者"：现金流紧张，被迫跟价，决策延迟1轮（观望后行动）

环境规则：每轮公开上一轮各家的市场份额变化、每2轮发布一次行业融资新闻
博弈参数：客户年流失率15%、获客成本递增、规模效应边际递减
观测变量：价格序列、市占率变化、利润率曲线、均衡收敛轮次`,
        description: '商业策略 — 竞争博弈与市场均衡推演',
      },
    ],
    worldGenModifier: `
【系统角色】你是一个多智能体仿真建模系统（Agent-Based Model Architect）。

【仿真模式架构要求】
本模式用于生成可观测、可量化的智能体自主交互推演。无人类玩家参与。

1. 环境结构（无空间概念）：
   - "map": [["环境"]], "dimensions": [1,1]（固定值）
   - tiles: { "环境": { "name": "仿真环境", "walkable": true, "description": "多智能体交互空间" } }
   - playerStart: [0,0]

2. Agent设计（核心）：
   - 每个Agent代表一个自主决策实体（用户/员工/公司/角色）
   - id 使用 "agent_1", "agent_2" 等格式
   - persona 必须包含：决策模型（什么条件下做什么选择）、可观测行为变量、约束条件
   - goals 是该Agent的优化目标函数（如"最小化成本""最大化市占率"）
   - decisionStyle 对应决策模型类型（"rational-bounded"/"heuristic"/"reactive"/"strategic"）
   - memory.attitude 初始值代表对系统中其他Agent的默认立场

3. Rules设计（环境事件调度器）：
   - 每条rule代表一个外部环境变化的触发器
   - trigger 使用步数条件（如"经过3步"）
   - effect 必须改变Agent的决策环境（注入新信息/约束变更/外部冲击）

4. winCondition：描述仿真观察目标（如"观察系统在20轮后是否达到稳态"）

5. items 数组留空即可（仿真不需要物品收集机制）

6. 所有文本必须为中文`,
    actionModifier: `
【多智能体仿真推演规则 — 严格遵守】

你正在执行一轮自主Agent推演（无人类玩家干预）。这是一个抽象行为模型，不是叙事游戏。

1. narrative 格式要求：
   - 系统观察者视角，描述本轮各Agent的决策行为和交互结果
   - 结构化记录：先列出每个Agent本轮的行动决策，再描述交互效果和系统状态变化
   - 风格参考：学术论文中的仿真结果描述（客观、可量化、无文学渲染）
   - 在narrative末尾用|分隔附上关键变量状态
   - 格式示例："...|[轮次:3][冲突指数:0.7][协作指数:0.4][信息透明度:0.3]"

2. 绝对禁止的表述（违反任何一条即为失败输出）：
   - 禁止任何物理空间/移动描写："走向""走到""快步走""转身""面前""身旁""眼前"
   - 禁止任何身体动作描写："看向""拿起""放下""点头""摇头""站起""坐下"
   - 禁止任何小说式场景渲染："阳光洒下""气氛紧张""空气凝固"
   - 正确的写法是描述Agent的决策和行为结果，而非物理动作
   - 错误示例："效率哥快步走向退休李" → 正确写法："Agent A 主动向 Agent C 发起交互，推送购买建议"
   - 错误示例："在搜索结果页仔细比较" → 正确写法："Agent C 执行比价决策，遍历3个SKU的价格属性"

3. agentReactions（核心输出）：
   - 每个活跃Agent必须有反应记录
   - reaction：该Agent本轮的决策行为描述（用决策语言，不用动作语言）
   - attitudeChange：对环境/其他Agent的态度变化（-5到+5，小步变化）
   - newObservation：该Agent获得的新信息或形成的新认知

4. choices：返回空数组 []（仿真模式无需人工选项）

5. 推演原则：
   - 每个Agent严格按照其persona中定义的决策模型行动
   - 用决策理论语言描述行为（"触发比价启发式""执行满意即止策略""信息搜集成本超过阈值，终止搜索"）
   - 不允许Agent突然"顿悟"或做出与persona不一致的行为
   - 涌现行为应当来自Agent间交互的叠加效应，而非单个Agent的突变
   - 每轮只推进一个时间步长

6. 所有文本必须为中文
7. agentReactions 中 agentId 必须使用 agent 的 id（如 "agent_1"）`,
    agentTickEnabled: true,
    showMap: false,
    showScore: false,
    autoRun: true,
    maxSteps: 20,
  },
}

/**
 * 获取场景配置
 */
export function getScenarioConfig(mode: ScenarioMode): ScenarioConfig {
  return SCENARIO_CONFIGS[mode]
}

/**
 * 获取所有可用模式
 */
export function getAvailableModes(): { mode: ScenarioMode; label: string; icon: string; description: string }[] {
  return Object.values(SCENARIO_CONFIGS).map(c => ({
    mode: c.mode,
    label: c.label,
    icon: c.icon,
    description: c.description,
  }))
}
