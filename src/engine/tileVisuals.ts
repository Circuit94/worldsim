/**
 * WorldSim — Tile Visual System v3 (Static PNG Tileset)
 * 
 * 使用提前生成好的像素风格 PNG 图片渲染地块。
 * 每种地形有独特的视觉效果，辨识度远超 CSS 渐变和 emoji。
 * 
 * 图片放在 /public/tiles/ 目录下，由 Vite 作为静态资源提供服务。
 */

// ============================================================
// 地块视觉映射 — 根据 tile 名称/描述关键词匹配图片
// ============================================================

export type TileCategory = 
  | 'forest' | 'grass' | 'water' | 'mountain' | 'desert'
  | 'lava' | 'ice' | 'swamp' | 'cave' | 'building'
  | 'village' | 'road' | 'corridor' | 'ruin' | 'tech' | 'default'

/** 获取瓦片图片 URL */
export function getTileImageUrl(category: TileCategory): string {
  return `/tiles/${category}.png`
}

/** 关键词 → 类别映射 */
const KEYWORD_TO_CATEGORY: [string[], TileCategory][] = [
  [['森林', '林', '树', 'forest', 'wood', 'jungle'], 'forest'],
  [['废墟', '废弃', '遗迹', '残骸', 'ruin', 'ruins', 'abandoned'], 'ruin'],
  [['水', '河', '湖', '海', '溪', '池', '泉', 'water', 'river', 'lake', 'ocean', 'sea'], 'water'],
  [['山', '岩', '崖', '峰', 'mountain', 'rock', 'cliff', 'hill', 'peak'], 'mountain'],
  [['路', '道', '径', '通道', '走廊', 'road', 'path', 'trail'], 'road'],
  [['廊', '厅', '室内', 'corridor', 'hallway', 'hall', 'room'], 'corridor'],
  [['城', '堡', '塔', '殿', '宫', '建筑', '房', '屋', '小屋', '棚', 'building', 'castle', 'tower', 'house', 'hut', 'cabin'], 'building'],
  [['沙', '荒', '戈壁', 'desert', 'sand', 'wasteland'], 'desert'],
  [['洞', '穴', '矿', '地下', 'cave', 'mine', 'underground', 'dungeon'], 'cave'],
  [['村', '镇', '市场', '集市', '广场', '商', 'village', 'town', 'market', 'plaza', 'shop'], 'village'],
  [['科技', '机械', '电子', '数据', '服务器', '太空', '飞船', '舱', 'tech', 'server', 'cyber', 'mech', 'space', 'station', 'ship'], 'tech'],
  [['草', '原', '平原', '田', '草地', 'grass', 'plain', 'field', 'meadow'], 'grass'],
  [['熔岩', '火', '岩浆', '火山', 'lava', 'fire', 'volcano', 'magma'], 'lava'],
  [['冰', '雪', '冻', '极', 'ice', 'snow', 'frozen', 'arctic', 'frost'], 'ice'],
  [['沼', '泽', '湿地', '泥', 'swamp', 'marsh', 'bog', 'wetland'], 'swamp'],
]

/** 根据 tile 名称/描述匹配类别 */
export function getTileCategory(tileName: string, tileDescription?: string): TileCategory {
  const searchText = `${tileName} ${tileDescription || ''}`.toLowerCase()
  
  for (const [keywords, category] of KEYWORD_TO_CATEGORY) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return category
    }
  }
  
  return 'default'
}

/** 获取 tile 的图片路径 */
export function getTileImage(tileName: string, tileDescription?: string): string {
  const category = getTileCategory(tileName, tileDescription)
  return getTileImageUrl(category)
}

/** 不可行走地块图片 */
export function getUnwalkableImage(): string {
  return '/tiles/unwalkable.png'
}

// ============================================================
// NPC 头像系统 — 使用预生成的像素风格 PNG 头像
// ============================================================

export type AvatarType =
  | 'warrior' | 'mage' | 'merchant' | 'villager' | 'guard'
  | 'thief' | 'scholar' | 'elder' | 'robot' | 'monster'
  | 'princess' | 'healer'

/** 角色关键词 → 头像类型映射 */
const AVATAR_KEYWORD_MAP: [string[], AvatarType][] = [
  [['战士', '骑士', '勇士', '武士', '士兵', '将军', 'warrior', 'knight', 'soldier', 'fighter', 'general'], 'warrior'],
  [['法师', '巫师', '魔法', '术士', '女巫', 'mage', 'wizard', 'witch', 'sorcerer', 'magic'], 'mage'],
  [['商人', '商贩', '卖家', '店主', '小贩', '掌柜', 'merchant', 'trader', 'seller', 'shopkeeper', 'vendor'], 'merchant'],
  [['村民', '农民', '居民', '平民', '渔民', '工人', 'villager', 'farmer', 'peasant', 'citizen', 'worker'], 'villager'],
  [['守卫', '卫兵', '看守', '巡逻', '警卫', '门卫', 'guard', 'sentinel', 'patrol', 'warden'], 'guard'],
  [['盗贼', '小偷', '刺客', '暗杀', '间谍', '潜行', 'thief', 'rogue', 'assassin', 'spy', 'stealth', 'ninja'], 'thief'],
  [['学者', '教授', '研究', '科学', '博士', '智者', 'scholar', 'professor', 'scientist', 'researcher', 'sage'], 'scholar'],
  [['老人', '长者', '老者', '老翁', '长老', '族长', 'elder', 'old', 'ancient', 'patriarch'], 'elder'],
  [['机器', '机器人', '人工', 'AI', '自动', '机械', 'robot', 'android', 'machine', 'cyborg', 'droid', 'bot'], 'robot'],
  [['怪物', '野兽', '恶魔', '魔物', '兽', '哥布林', '兽人', 'monster', 'beast', 'demon', 'creature', 'goblin', 'orc'], 'monster'],
  [['公主', '王子', '贵族', '皇', '王后', '国王', '女王', '领主', 'princess', 'prince', 'noble', 'queen', 'king', 'lord', 'royal'], 'princess'],
  [['牧师', '治疗', '医生', '医师', '神官', '僧侣', '修女', 'healer', 'priest', 'cleric', 'doctor', 'monk', 'nun'], 'healer'],
]

/** 全部可用头像列表（用于 hash 兜底分配） */
const ALL_AVATAR_TYPES: AvatarType[] = [
  'warrior', 'mage', 'merchant', 'villager', 'guard',
  'thief', 'scholar', 'elder', 'robot', 'monster',
  'princess', 'healer',
]

/** 根据 agent 信息匹配头像类型 */
export function getAgentAvatarType(agentName: string, agentId: string, agentDescription?: string): AvatarType {
  const searchText = `${agentName} ${agentDescription || ''}`.toLowerCase()
  
  for (const [keywords, avatarType] of AVATAR_KEYWORD_MAP) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return avatarType
    }
  }
  
  // 没有匹配到关键词时，用 id hash 稳定分配一个头像
  const hash = agentId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)
  return ALL_AVATAR_TYPES[Math.abs(hash) % ALL_AVATAR_TYPES.length]
}

/** 获取 agent 头像图片 URL */
export function getAgentAvatarUrl(agentName: string, agentId: string, agentDescription?: string): string {
  const avatarType = getAgentAvatarType(agentName, agentId, agentDescription)
  return `/avatars/${avatarType}.png`
}

/** 获取玩家头像 URL */
export function getPlayerAvatarUrl(): string {
  return '/avatars/player.png'
}

/** 旧版兼容：仍然保留 accent color 用于图例边框等 */
export interface AgentVisual {
  avatarUrl: string
  accentColor: string
  initial: string
}

export function getAgentVisual(agentName: string, agentId: string, agentDescription?: string): AgentVisual {
  const hash = agentId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)
  const hue = Math.abs(hash) % 360
  
  return {
    avatarUrl: getAgentAvatarUrl(agentName, agentId, agentDescription),
    accentColor: `hsl(${hue}, 70%, 70%)`,
    initial: agentName.charAt(0),
  }
}

// ============================================================
// 物品 SVG 图标系统
// ============================================================

const ITEM_ICONS: Record<string, string> = {
  key: 'M12 2C9.24 2 7 4.24 7 7c0 2.03 1.21 3.77 2.94 4.56L7 18.5V22h3v-2h2v-2h2l1.44-1.44A5.003 5.003 0 0017 7c0-2.76-2.24-5-5-5zm1.5 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  weapon: 'M6.92 5L5 6.92l1.42 1.42L3.71 11.06l1.42 1.42 2.71-2.71 1.42 1.42-2.71 2.71 1.42 1.42 2.71-2.71 1.42 1.42-2.71 2.71 1.42 1.42 2.71-2.71L16.08 17l1.42-1.42L6.92 5z',
  potion: 'M5 19h14v2H5v-2zm7-18h2v2h-2V1zm0 4h2v1c2.76 0 5 2.24 5 5v7H5v-7c0-2.76 2.24-5 5-5V5h2z',
  scroll: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z',
  gem: 'M12 2L2 9l2.5 11h15L22 9 12 2zm0 3.3L17.6 9H6.4L12 5.3z',
  food: 'M12 2C8.43 2 5.23 3.54 3.01 6L12 22l8.99-16C18.77 3.54 15.57 2 12 2z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6.3 1 .9 1 1.5v3c0 .8-.7 1.5-1.5 1.5h-4.5c-.8 0-1.5-.7-1.5-1.5v-3c0-.6.4-1.2 1-1.5V9.5C9.2 8.1 10.6 7 12 7z',
  tool: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  default: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
}

const ITEM_KEYWORD_MAP: [string[], string][] = [
  [['钥匙', '锁', 'key', 'lock', 'card', '卡'], 'key'],
  [['剑', '刀', '武器', '匕首', '弓', 'sword', 'weapon', 'blade', 'dagger', 'bow'], 'weapon'],
  [['药', '瓶', '水', '血', 'potion', 'elixir', 'heal', 'bottle'], 'potion'],
  [['书', '卷', '信', '笔记', '日记', '文件', 'scroll', 'book', 'note', 'letter', 'document', 'paper'], 'scroll'],
  [['宝石', '水晶', '钻', '矿石', '石', 'gem', 'crystal', 'diamond', 'stone', 'ore'], 'gem'],
  [['食物', '面包', '苹果', '果', '肉', 'food', 'bread', 'apple', 'fruit', 'meat'], 'food'],
  [['盾', '甲', '护', '防', 'shield', 'armor', 'protect'], 'shield'],
  [['工具', '锤', '斧', '锯', '绳', 'tool', 'hammer', 'axe', 'rope'], 'tool'],
]

export function getItemIcon(itemName: string, itemDescription?: string): { path: string; color: string } {
  const searchText = `${itemName} ${itemDescription || ''}`.toLowerCase()
  
  for (const [keywords, category] of ITEM_KEYWORD_MAP) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return { path: ITEM_ICONS[category], color: getItemColor(category) }
    }
  }
  
  return { path: ITEM_ICONS.default, color: '#a0a0c0' }
}

function getItemColor(category: string): string {
  const colors: Record<string, string> = {
    key: '#f0c050',
    weapon: '#c0c0d0',
    potion: '#60c080',
    scroll: '#d0b080',
    gem: '#a060e0',
    food: '#e09050',
    shield: '#7090c0',
    tool: '#90a0a0',
    default: '#a0a0c0',
  }
  return colors[category] || colors.default
}
