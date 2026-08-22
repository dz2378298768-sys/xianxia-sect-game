export type SectLevel = 'founding' | 'known' | 'famous' | 'dominant' | 'eternal';

export const SectLevelNames: Record<SectLevel, string> = {
  founding: '草创期',
  known: '小有名气',
  famous: '声名鹊起',
  dominant: '一方霸主',
  eternal: '万古长青',
};

export const SectLevelDescriptions: Record<SectLevel, string> = {
  founding: '茅屋竹篱，三五弟子。勉强立足，百废待兴',
  known: '青砖灰瓦，香火渐盛。周边村镇皆知，有稳定收入',
  famous: '朱墙碧瓦，云雾缭绕。一方势力，正邪皆闻',
  dominant: '金顶玉阶，灵光冲天。统领百里，诸侯之姿',
  eternal: '仙宫悬浮，紫气东来。传承万载，不朽道统',
};

export const SectLevelOrder: SectLevel[] = ['founding', 'known', 'famous', 'dominant', 'eternal'];

export interface SectLevelRequirements {
  reputation: number;
  spiritStones: number;
  discipleCount?: number;
  level2Buildings?: number;
  level3Buildings?: number;
  allLevel2?: boolean;
  goldenDisciple?: boolean;  // 至少1名金丹期
  nascentDisciple?: boolean; // 至少1名元婴期
  spiritDisciple?: boolean;  // 至少1名化神期
  elderCount?: number;       // 长老数量要求
  promotionCost: number;     // 晋升消耗灵石
}

export const SectLevelRequirementsMap: Record<SectLevel, SectLevelRequirements> = {
  founding: { 
    reputation: 0, 
    spiritStones: 0, 
    promotionCost: 0,
  },
  known: { 
    reputation: 100, 
    spiritStones: 500, 
    discipleCount: 10,
    promotionCost: 300,
  },
  famous: { 
    reputation: 300, 
    spiritStones: 2000, 
    level2Buildings: 2, 
    goldenDisciple: true,
    promotionCost: 1000,
  },
  dominant: { 
    reputation: 800, 
    spiritStones: 5000, 
    level3Buildings: 1, 
    nascentDisciple: true,
    elderCount: 3,
    promotionCost: 3000,
  },
  eternal: { 
    reputation: 2000, 
    spiritStones: 20000, 
    allLevel2: true, 
    spiritDisciple: true,
    elderCount: 5,
    promotionCost: 10000,
  },
};

// 各等级解锁的建筑类型
export const SectLevelUnlockBuildings: Record<SectLevel, string[]> = {
  founding: ['mountain_gate', 'lecture_hall', 'servant_hall', 'outer_residence', 'secret_library'],
  known: ['inner_residence', 'pill_hall'],
  famous: ['core_residence', 'sutra_hall', 'artifact_hall', 'array_hall'],
  dominant: ['cave_mansion', 'spirit_beast_garden'],
  eternal: ['skyscraper_tower'],
};

// 各等级解锁的功能
export const SectLevelUnlockFeatures: Record<SectLevel, string[]> = {
  founding: ['基础修炼', '弟子劳作'],
  known: ['公开招募弟子', '择优录取'],
  famous: ['秘境探索（初级）', '驻守凡人城池'],
  dominant: ['秘境探索（中高级）', '宗门外交'],
  eternal: ['飞升试炼', '上古秘境探索'],
};

// 各等级的弟子上限（null表示无上限）
export const SectLevelDiscipleCap: Record<SectLevel, number | null> = {
  founding: 20,
  known: 40,
  famous: 100,
  dominant: 200,
  eternal: null,
};

// 各等级的声望上限（null表示无上限）
export const SectLevelReputationCap: Record<SectLevel, number | null> = {
  founding: 100,
  known: 300,
  famous: 800,
  dominant: 2000,
  eternal: null,
};

// 声望增长配置
export const ReputationGrowthConfig = {
  baseGrowth: 1,           // 基础每月增长
  discipleWeight: 0.3,     // 每名弟子增加的系数（百分比）
  combatWeight: 0.0001,    // 每点战力增加的系数
  maxMultiplier: 2.0,      // 最大系数加成（200%）
};

export interface GameDate {
  year: number;
  month: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  content: string;
  read: boolean;
  timestamp: GameDate;
  actionable?: boolean;
  actionLabel?: string;
}

export interface MonthlyReport {
  date: GameDate;
  spiritStoneIncome: { source: string; amount: number }[];
  spiritStoneExpense: { source: string; amount: number }[];
  breakthroughs: { discipleId: string; discipleName: string; from: string; to: string; success: boolean }[];
  promotions: { discipleId: string; discipleName: string; from: string; to: string }[];
  newDisciples: { id: string; name: string; status: string }[];
  events: string[];
  reputationChange: number;
}

// ===== 天下宗门（其他宗门） =====

// 宗门阵营
export type SectAlignment = 'righteous' | 'demonic' | 'neutral';
// 与本宗的关系
export type SectRelation = 'ally' | 'friendly' | 'neutral' | 'wary' | 'hostile';

// 外交状态（玩家可手动设置）
export type DiplomaticStatus = 'neutral' | 'ally' | 'rival' | 'vassal';

export const DiplomaticStatusNames: Record<DiplomaticStatus, string> = {
  neutral: '中立',
  ally: '同盟',
  rival: '宿敌',
  vassal: '附庸',
};

export interface OtherSect {
  id: string;
  name: string;
  level: SectLevel;          // 宗门等级
  alignment: SectAlignment;  // 阵营：正/魔/中立
  relation: SectRelation;    // 与本宗的关系
  combatPower: number;       // 战力
  discipleCount: number;     // 弟子数
  distance: number;          // 距离（里）
  specialty: string;         // 特色（如：丹道、剑修、阵法）
  description: string;       // 简介
  image?: string;            // 图片路径
  favorability: number;      // 好感度 0-100（展示用 = baseFavorability + karmaFavorApplied，已钳制）
  baseFavorability: number;  // 基础好感度（不含正邪度修正，来自赠送/侮辱/同盟/讨伐等手动互动与天然关系）
  karmaFavorApplied: number; // 已因正邪度累计施加的好感修正（负数）。注意：是「总量一次性」而非每月累计
  diplomaticStatus: DiplomaticStatus;  // 外交状态
  tradeActive: boolean;      // 是否正在交易
  truceUntilYear: number | null; // 停战至哪一年（null 表示无停战）
  lastInteractionYear: number | null; // 上次与本宗互动的年份（null 表示未互动过）；每宗门每年只能互动一次
}

export const SectAlignmentNames: Record<SectAlignment, string> = {
  righteous: '正道',
  demonic: '魔道',
  neutral: '中立',
};

export const SectRelationNames: Record<SectRelation, string> = {
  ally: '盟友',
  friendly: '友好',
  neutral: '中立',
  wary: '戒备',
  hostile: '敌对',
};

// ===== 试炼系统 =====

// 试炼类型：驻扎凡人城镇 / 击杀妖物 / 探索秘境 / 探索游历
export type TrialType = 'town' | 'monster' | 'realm' | 'explore_outer' | 'explore_forest' | 'explore_ruins' | 'explore_secret';

export const TrialTypeNames: Record<TrialType, string> = {
  town: '驻扎城镇',
  monster: '击杀妖物',
  realm: '探索秘境',
  explore_outer: '宗门周边',
  explore_forest: '妖兽森林',
  explore_ruins: '古战场遗迹',
  explore_secret: '天外秘境',
};

export const TrialTypeIcons: Record<TrialType, string> = {
  town: 'temple',
  monster: 'sword',
  realm: 'crystal',
  explore_outer: 'compass',
  explore_forest: 'tree',
  explore_ruins: 'landmark',
  explore_secret: 'sparkles',
};

// 试炼难度
export type TrialDifficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export const TrialDifficultyNames: Record<TrialDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  extreme: '极限',
};

// 试炼状态
export type TrialStatus = 'available' | 'in_progress' | 'completed' | 'failed';

// 试炼奖励
export interface TrialReward {
  spiritStones?: number;       // 灵石
  reputation?: number;         // 声望
  herbs?: number;              // 灵草
  iron?: number;               // 灵铁
  paper?: number;              // 符纸
  specialMaterials?: { name: string; amount: number }[]; // 特殊材料（秘境掉落）
  contributionPoints?: number; // 弟子贡献点
  satisfaction?: number;       // 弟子满意度
  description: string;         // 奖励描述
}

// 试炼任务
export interface Trial {
  id: string;
  type: TrialType;
  name: string;
  description: string;
  difficulty: TrialDifficulty;
  requiredPower: number;       // 建议战力（弟子单人战力）
  durationMonths: number;      // 所需月数
  rewards: TrialReward;        // 成功奖励
  riskRate: number;            // 失败概率 0-1
  injuryRate: number;          // 受伤概率 0-1（失败时）
  status: TrialStatus;
  assignedDiscipleId: string | null;
  startYear: number;
  startMonth: number;
  progress: number;            // 0-100
  generatedYear: number;       // 生成年份（用于年度刷新）
}

// 弟子贡献值流水记录
export type ContributionLogType =
  | 'work'          // 工作产出（身份俸禄 + 建筑加成 + 手动调整）
  | 'deduct'        // 讲经堂/居所等消耗
  | 'library'       // 藏经阁推演功法
  | 'learn_secret'  // 学习秘籍扣费
  | 'trial_reward'  // 试炼奖励
  | 'tournament'    // 大比奖励
  | 'promotion'     // 晋升身份扣除
  | 'manual_adjust' // 玩家手动调整（预留）
  | 'other';

export interface ContributionLog {
  id: string;             // 记录ID
  discipleId: string;     // 弟子ID
  date: { year: number; month: number }; // 发生日期
  type: ContributionLogType;
  amount: number;         // 变动值（正数=增加，负数=减少）
  balance: number;        // 变动后余额
  description: string;    // 描述文本
}

/** 宗门历史事件类型 */
export type SectHistoryType =
  | 'building_upgrade'  // 建筑升级
  | 'sect_promote'      // 宗门晋升
  | 'war_victory'       // 战争胜利
  | 'war_defeat'        // 战争战败
  | 'disciple_death'    // 弟子寿终正寝
  | 'disciple_defect'   // 弟子叛逃
  | 'building_event'    // 建筑随机事件
  | 'disciple_choice';  // 分支选择事件

/** 建筑随机事件定义 */
export interface BuildingEvent {
  id: string;
  buildingType: string;
  title: string;
  description: string;
  type: 'auspicious' | 'disaster';
  effects: {
    outputMultiplier?: number;  // 产出倍率（1.5=增产50%，0.5=减产50%）
    satisfactionChange?: number; // 满意度变化
    spiritStoneChange?: number;  // 灵石变化
    reputationChange?: number;   // 声望变化
    pillReward?: { type: string; quantity: number }[]; // 丹药奖励
    cultivationBonus?: string; // 影响弟子
  };
  duration: number; // 持续月数
}

/** 分支选择事件 */
export interface ChoiceEvent {
  id: string;
  title: string;
  description: string;
  choices: ChoiceEventOption[];
}

export interface ChoiceEventOption {
  label: string;
  description: string;
  effects: {
    spiritStoneChange?: number;
    reputationChange?: number;
    karmaChange?: number;
    satisfactionChange?: number;
    notificationText: string;
  };
}

/** 连锁事件：选择事件后的后续延迟触发事件 */
export interface ChainEvent {
  id: string;
  triggerEventId: string;   // 触发源事件 ID（如 'spring_planting'）
  triggerChoice: string;    // 触发条件：玩家选择的 label 匹配
  delayMonths: number;      // 延迟月数后触发
  title: string;
  description: string;
  type: 'auspicious' | 'disaster';
  effects: {
    spiritStoneChange?: number;
    reputationChange?: number;
    karmaChange?: number;
    satisfactionChange?: number;
    notificationText: string;
  };
  /** 此连锁事件被触发后，是否从待触发队列中移除 */
  oneTime?: boolean;
}

/** 待触发的连锁事件（已计入延迟，等待激活） */
export interface PendingChainEvent {
  chainId: string;
  scheduledMonth: number;   // 计划触发季度（year * 4 + month）
  event: ChainEvent;
}

/** 探索遭遇事件（试炼过程中触发的选择事件） */
export interface ExplorationEncounter {
  id: string;
  trialId: string;
  regionId: string;
  name: string;
  description: string;
  choices: ExplorationEncounterChoice[];
}

export interface ExplorationEncounterChoice {
  label: string;
  description: string;
  successChance: number;
  effects: {
    success: {
      spiritStones?: number;
      reputation?: number;
      herb?: number;
      iron?: number;
      paper?: number;
      specialMaterials?: { name: string; amount: number }[];
      notificationText: string;
    };
    failure: {
      discipleInjury?: boolean;
      spiritStones?: number;
      notificationText: string;
    };
  };
}

export interface SectHistoryEntry {
  id: string;
  date: { year: number; month: number };
  type: SectHistoryType;
  title: string;
  description: string;
}

// ===== 宗门传承系统 =====

/** 宗门流派 */
export type SectSchool =
  | 'sword'       // 剑修流派 - 弟子战力+10%
  | 'pill'        // 丹修流派 - 炼丹产出+20%
  | 'array'       // 阵修流派 - 防御+15%
  | 'artifact'    // 器修流派 - 炼器产出+20%
  | 'balance'     // 均衡流派 - 全属性+5%
  ;

export const SectSchoolNames: Record<SectSchool, string> = {
  sword: '剑修流派',
  pill: '丹修流派',
  array: '阵修流派',
  artifact: '器修流派',
  balance: '均衡流派',
};

export const SectSchoolDescriptions: Record<SectSchool, string> = {
  sword: '专注剑道，弟子战力+10%，但炼丹效率-5%',
  pill: '精研丹道，炼丹产出+20%，丹药品质提升',
  array: '精通阵法，宗门防御+15%，护山大阵维护费-20%',
  artifact: '擅长炼器，炼器产出+20%，法器品质提升',
  balance: '均衡发展，全属性+5%，无负面效果',
};

/** 宗门天赋树节点 */
export interface SchoolTalent {
  id: string;
  name: string;
  description: string;
  /** 前置节点ID */
  prerequisites: string[];
  /** 消耗灵石 */
  spiritStoneCost: number;
  /** 效果描述 */
  effects: {
    /** 战力加成（百分比） */
    combatPowerBonus?: number;
    /** 修炼速度加成（百分比） */
    cultivationSpeedBonus?: number;
    /** 灵石产出加成（百分比） */
    spiritStoneOutputBonus?: number;
    /** 炼丹产出加成（百分比） */
    pillOutputBonus?: number;
    /** 炼器产出加成（百分比） */
    artifactOutputBonus?: number;
    /** 制符产出加成（百分比） */
    talismanOutputBonus?: number;
    /** 满意度加成 */
    satisfactionBonus?: number;
    /** 护山大阵防御加成（百分比） */
    defenseBonus?: number;
    /** 特殊能力（如'auto_refine'自动炼丹） */
    specialAbility?: string;
  };
}

/** 流派天赋树（每个流派有自己的天赋树） */
export const SCHOOL_TALENT_TREES: Record<SectSchool, SchoolTalent[]> = {
  sword: [
    { id: 'sword_1', name: '剑心通明', description: '弟子剑道悟性提升，战力+5%', prerequisites: [], spiritStoneCost: 200, effects: { combatPowerBonus: 5 } },
    { id: 'sword_2', name: '万剑归宗', description: '剑修弟子可施展群体剑技，战力+10%', prerequisites: ['sword_1'], spiritStoneCost: 500, effects: { combatPowerBonus: 10 } },
    { id: 'sword_3', name: '剑意冲霄', description: '剑修弟子战力+15%，且修炼速度+5%', prerequisites: ['sword_2'], spiritStoneCost: 1000, effects: { combatPowerBonus: 15, cultivationSpeedBonus: 5 } },
    { id: 'sword_4', name: '人剑合一', description: '剑修流派终极奥义，战力+25%', prerequisites: ['sword_3'], spiritStoneCost: 3000, effects: { combatPowerBonus: 25 } },
  ],
  pill: [
    { id: 'pill_1', name: '草木知性', description: '炼丹基础提升，炼丹产出+10%', prerequisites: [], spiritStoneCost: 200, effects: { pillOutputBonus: 10 } },
    { id: 'pill_2', name: '丹火纯青', description: '炼丹技艺精进，炼丹产出+15%', prerequisites: ['pill_1'], spiritStoneCost: 500, effects: { pillOutputBonus: 15 } },
    { id: 'pill_3', name: '丹道宗师', description: '宗师级炼丹术，炼丹产出+25%', prerequisites: ['pill_2'], spiritStoneCost: 1000, effects: { pillOutputBonus: 25 } },
    { id: 'pill_4', name: '仙丹妙法', description: '可炼制仙品丹药，炼丹产出+40%', prerequisites: ['pill_3'], spiritStoneCost: 3000, effects: { pillOutputBonus: 40 } },
  ],
  array: [
    { id: 'array_1', name: '阵基稳固', description: '阵法基础加固，防御+5%', prerequisites: [], spiritStoneCost: 200, effects: { defenseBonus: 5 } },
    { id: 'array_2', name: '八卦迷阵', description: '护山大阵增强，防御+10%', prerequisites: ['array_1'], spiritStoneCost: 500, effects: { defenseBonus: 10 } },
    { id: 'array_3', name: '周天星斗', description: '引星辰之力护宗，防御+20%', prerequisites: ['array_2'], spiritStoneCost: 1000, effects: { defenseBonus: 20 } },
    { id: 'array_4', name: '不灭仙阵', description: '护山大阵几乎不可攻破，防御+35%', prerequisites: ['array_3'], spiritStoneCost: 3000, effects: { defenseBonus: 35 } },
  ],
  artifact: [
    { id: 'artifact_1', name: '百炼成钢', description: '炼器基础提升，炼器产出+10%', prerequisites: [], spiritStoneCost: 200, effects: { artifactOutputBonus: 10 } },
    { id: 'artifact_2', name: '器魂觉醒', description: '炼器品质提升，炼器产出+15%', prerequisites: ['artifact_1'], spiritStoneCost: 500, effects: { artifactOutputBonus: 15 } },
    { id: 'artifact_3', name: '天工开物', description: '炼器大师，炼器产出+25%', prerequisites: ['artifact_2'], spiritStoneCost: 1000, effects: { artifactOutputBonus: 25 } },
    { id: 'artifact_4', name: '神器锻造', description: '可锻造仙品法器，炼器产出+40%', prerequisites: ['artifact_3'], spiritStoneCost: 3000, effects: { artifactOutputBonus: 40 } },
  ],
  balance: [
    { id: 'balance_1', name: '五行调和', description: '全属性+3%', prerequisites: [], spiritStoneCost: 200, effects: { combatPowerBonus: 3, cultivationSpeedBonus: 3, spiritStoneOutputBonus: 3 } },
    { id: 'balance_2', name: '阴阳相济', description: '全属性+5%', prerequisites: ['balance_1'], spiritStoneCost: 500, effects: { combatPowerBonus: 5, cultivationSpeedBonus: 5, spiritStoneOutputBonus: 5 } },
    { id: 'balance_3', name: '天人合一', description: '全属性+8%', prerequisites: ['balance_2'], spiritStoneCost: 1000, effects: { combatPowerBonus: 8, cultivationSpeedBonus: 8, spiritStoneOutputBonus: 8 } },
    { id: 'balance_4', name: '大道自然', description: '全属性+12%，且满意度+5', prerequisites: ['balance_3'], spiritStoneCost: 3000, effects: { combatPowerBonus: 12, cultivationSpeedBonus: 12, spiritStoneOutputBonus: 12, satisfactionBonus: 5 } },
  ],
};

// ===== 宗门气运 =====

/** 天灾类型 */
export type CalamityType =
  | 'heavenly_thunder'   // 天劫雷暴 - 弟子受伤
  | 'beast_tide'         // 兽潮来袭 - 战斗事件
  | 'spirit_vein_dry'    // 灵脉枯竭 - 产出减半
  | 'secret_realm_open'  // 秘境开启 - 探索机遇
  | 'demon_incursion'    // 魔道入侵 - 强制战斗
  ;

export const CalamityTypeNames: Record<CalamityType, string> = {
  heavenly_thunder: '天劫雷暴',
  beast_tide: '兽潮来袭',
  spirit_vein_dry: '灵脉枯竭',
  secret_realm_open: '秘境开启',
  demon_incursion: '魔道入侵',
};

export interface CalamityEvent {
  id: string;
  type: CalamityType;
  title: string;
  description: string;
  /** 预警事件（提前N个月触发，给玩家准备时间） */
  warningMonths: number;
  warningTitle: string;
  warningDescription: string;
  /** 预警开始年份（运行时填充，用于计算剩余预警月数） */
  warningStartYear?: number;
  /** 预警开始月份 */
  warningStartMonth?: number;
  effects: {
    spiritStoneChange?: number;
    reputationChange?: number;
    satisfactionChange?: number;
    /** 产出减倍率（0.5=减半） */
    outputMultiplier?: number;
    /** 弟子受伤概率 */
    discipleInjuryChance?: number;
    /** 持续月数 */
    durationMonths: number;
  };
}

// 仓库物品自动交易规则（按 ShopItem.id 存储，键对应 shop.ts 的 SHOP_ITEMS[i].id：'pill:qi_gathering_pill' / 'beast:spirit_fox' / 'material:shou_yuan_hua' 等）
export interface AutoTradeRule {
  enabled: boolean;        // 总开关
  buyBelow: number;        // 库存 < 该值时每月尝试自动买入；填 0 或负数 = 关闭自动买
  sellAbove: number;       // 库存 > 该值时每月尝试自动卖出；填 0 或负数 = 关闭自动卖
  monthlyBuyQty: number;   // 每月自动买入数量上限（默认 1，不低于 1）
  monthlySellQty: number;  // 每月自动卖出数量上限（默认 1，不低于 1）
}