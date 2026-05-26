# WorldSim 项目全景上下文

> 本文档记录项目的架构、技术栈、已完成工作、待办事项和关键决策，供下次对话快速恢复上下文。

---

## 1. 项目定位

WorldSim 是一个 **AI 世界模拟引擎**，核心卖点是用 LLM 生成交互式虚拟世界，内置记忆驱动的自主 Agent（参考 Stanford Generative Agents 论文）。

**当前聚焦方向**：B2B 企业培训模拟平台（TAM $380B），让企业用 AI 模拟真实商业场景来培训员工的软技能（谈判、冲突管理、利益平衡等）。

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 4 |
| 构建工具 | Vite 6 |
| LLM API | Google Gemini (`@google/generative-ai`) |
| 视觉系统 | Pixel Art 48×48 PNG（关键词匹配自动选取） |
| 测试 | Vitest |
| CI/CD | GitHub Actions（Node 18/20 矩阵，type check + test + build） |
| 包管理 | npm |

---

## 3. 项目结构

```
worldsim/
├── README.md                    # 项目介绍
├── PITCH.md                     # 投资者/产品 pitch（B2B 培训聚焦）
├── PROJECT_CONTEXT.md           # 本文件
├── package.json                 # scripts: dev/build/test/test:watch
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI（push/PR 自动测试）
├── src/
│   ├── api/
│   │   └── gemini.ts            # Gemini API 封装
│   ├── engine/                  # 核心引擎（可 headless 使用）
│   │   ├── index.ts             # 公共 API 导出
│   │   ├── types.ts             # 所有类型定义
│   │   ├── worldGen.ts          # LLM 世界生成（含 mapValidator 自动修复）
│   │   ├── actionHandler.ts     # 玩家动作处理（importance-weighted memory）
│   │   ├── agentLoop.ts         # Agent 自主行为循环（导出 retainWithImportance/retrieveRelevantMemory）
│   │   ├── ruleEngine.ts        # 确定性规则引擎（验证 LLM 输出）
│   │   ├── mapValidator.ts      # BFS 地图连通性检查 + 自动修复
│   │   ├── trainingReport.ts    # 培训评估报告生成器（可解释评分 + structured eval tags）
│   │   ├── scenarios.ts         # 场景配置（game/simulation/training）
│   │   ├── sdk.ts               # Headless SDK（WorldSimEngine 类）
│   │   ├── prompts.ts           # LLM 提示词模板（培训模式含强制 evalTags）
│   │   ├── persistence.ts       # 会话持久化
│   │   ├── tileVisuals.ts       # 像素画视觉匹配系统
│   │   └── __tests__/           # 测试套件（54 tests）
│   │       ├── ruleEngine.test.ts
│   │       ├── mapValidator.test.ts
│   │       ├── agentMemory.test.ts
│   │       └── trainingE2E.test.ts    # 端到端集成测试
│   ├── components/              # React UI 组件
│   │   └── TrainingView.tsx     # 培训报告面板（含 Markdown 导出）
│   └── ...其他组件
├── examples/
│   └── headless-demo.ts         # SDK 无头模式 demo
├── public/
│   └── tiles/                   # 48×48 像素画 PNG 资产
└── .gitignore
```

---

## 4. 核心架构设计

### 4.1 Agent 行为循环（Stanford Generative Agents）

```
Observe → Reflect → Plan → Act
```

- 每个玩家回合只 tick 1 个 Agent（round-robin，控制 token 成本）
- 反射每 5 次观察触发一次
- Agent 动作仅影响局部（曼哈顿距离 1）
- Training/Simulation 模式下所有 Agent 互相可见（无空间距离限制）

### 4.2 记忆系统（importance-weighted，统一策略）

- **保留策略**：`retainWithImportance()` — 最多保留 15 条（已导出，可直接测试）
  - 重要度 ≥ 7 的「核心记忆」永不被淘汰
  - 普通记忆按 `importance×0.6 + recency×0.4` 评分排序
  - **actionHandler 和 agentLoop 两条路径统一使用同一策略**
- **检索策略**：`retrieveRelevantMemory()` — 每次取 5 条放入 prompt（已导出）
  - 核心记忆占一半 slot
  - 剩余 slot 填最新的普通记忆
  - 按时间顺序排列，核心记忆用 ★ 标记

### 4.3 规则引擎（确定性层）

LLM 输出经过 7 层验证后才应用到状态：
1. 移动验证（边界、可行走性、曼哈顿距离 ≤ 3）
2. HP 变化钳制（-50 ~ +30）
3. 物品完整性（存在性、背包上限 10）
4. Agent 反应验证（ID/名称解析）
5. 地图变更验证
6. 态度变化钳制（±15）
7. 选项验证（1-5 个，缺失时填默认）

### 4.4 地图验证器（已集成到 worldGen 主流程）

- `checkConnectivity()`: BFS 洪水填充，检测所有可行走瓦片是否可达
- `repairConnectivity()`: 自动从断连区域向可达区域 BFS 找最短路径，转换阻挡瓦片
- `validateAndRepairMap()`: 集成入口，**在 `generateWorld()` 结束时自动调用**

### 4.5 培训报告（可解释评分系统）

- 5 维胜任力评分：分析判断力、决策魄力、利益相关方管理、沟通影响力、战略格局
- **评分来源优先级**：
  1. LLM structured eval tags（JSON 格式，prompt 中强制要求）
  2. Narrative 内嵌 pipe 格式标签（兼容旧格式）
  3. 可解释 fallback：基于维度特定的行为指标（关键词命中率、决策密度、态度变化等）
- 利益相关方结果分析
- 阶段性表现追踪
- Markdown 导出

---

## 5. GitHub 信息

- **仓库**: `git@github.com:Circuit94/worldsim.git`
- **分支**: `main`
- **CI**: GitHub Actions（push/PR 触发，Node 18+20 矩阵）
- **认证方式**: SSH key

---

## 6. 已完成的改进（按轮次）

### 第一轮 Code Review 改进

| # | 改进项 | 状态 |
|---|--------|------|
| 1 | 修复 Seed Reproducibility 虚假声明 → Seed Hinting | ✅ |
| 2 | PITCH 重写聚焦 B2B 培训单场景 | ✅ |
| 3 | 端到端培训 Demo（评分报告模块 + UI） | ✅ |
| 4 | Agent 记忆 importance-weighted retrieval | ✅ |
| 5 | 地图连通性 BFS 检查 + 自动修复 | ✅ |
| 6 | 测试套件（44 tests all pass） | ✅ |

### 第二轮 Code Review 改进

| # | 改进项 | 状态 |
|---|--------|------|
| 1 | mapValidator 接入 worldGen 主流程（生成后自动验证修复） | ✅ |
| 2 | 导出 retainWithImportance/retrieveRelevantMemory，测试真实源码 | ✅ |
| 3 | actionHandler 记忆更新统一使用 importance-weighted retention | ✅ |
| 4 | 培训报告评分可解释性改造（替换 sin 伪随机 + structured eval tags） | ✅ |
| 5 | 修复 training mode 下 Agent 感知范围问题（全员互相可见） | ✅ |
| 6 | 端到端集成测试（培训场景完整流程，8 个测试用例） | ✅ |
| 7 | GitHub Actions CI（Node 18/20 矩阵，type check + test + build） | ✅ |

---

## 7. 潜在后续工作

- **Agent-to-Agent 互动**：当前 Agent 只能和玩家互动，不能自主和其他 Agent 对话。对于多方博弈场景是关键缺失。
- **更精细的 importance 评分**：目前新产生的观察 importance = |attitudeChange| + 3，应由 LLM 动态评估（1-10）
- **培训场景更多模板**：当前只有 scenarios.ts 中的几个预设，需要更多行业场景
- **SDK 文档补全**：headless SDK 的使用文档需要完善
- **Observability**：生产环境需要 prompt 拒绝率、session 中断率、报告生成失败率等指标
- **30 秒 Demo Video**：录制完整培训 session 流程视频放在 repo 顶部
- **真人 Pilot**：找一个真人跑完完整 training session，贴出实际报告

---

## 8. 运行命令

```bash
# 开发
npm run dev          # 启动 Vite 开发服务器

# 测试
npm run test         # vitest run (单次，54 tests)
npm run test:watch   # vitest (watch 模式)

# 构建
npm run build        # tsc + vite build

# Headless Demo
npm run demo:headless  # 运行 examples/headless-demo.ts
```

---

## 9. 关键文件快速索引

| 需要做什么 | 看哪个文件 |
|-----------|-----------|
| 改 Agent 行为逻辑 | `src/engine/agentLoop.ts` |
| 改 LLM 提示词 | `src/engine/prompts.ts` |
| 改规则验证逻辑 | `src/engine/ruleEngine.ts` |
| 改世界生成 | `src/engine/worldGen.ts` |
| 改培训报告评分 | `src/engine/trainingReport.ts` |
| 改地图验证 | `src/engine/mapValidator.ts` |
| 改场景配置 | `src/engine/scenarios.ts` |
| 改类型定义 | `src/engine/types.ts` |
| 改 SDK | `src/engine/sdk.ts` |
| 改 UI | `src/components/` |
| 改视觉匹配 | `src/engine/tileVisuals.ts` |
| 写测试 | `src/engine/__tests__/` |
| 改 CI | `.github/workflows/ci.yml` |

---

*最后更新：2025年，第二轮 code review 改进后*
