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
  promotionContribution?: number; // 晋升消耗贡献点
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
  favorability: number;      // 好感度 0-100
  diplomaticStatus: DiplomaticStatus;  // 外交状态
  tradeActive: boolean;      // 是否正在交易
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

// 试炼类型：驻扎凡人城镇 / 击杀妖物 / 探索秘境
export type TrialType = 'town' | 'monster' | 'realm';

export const TrialTypeNames: Record<TrialType, string> = {
  town: '驻扎城镇',
  monster: '击杀妖物',
  realm: '探索秘境',
};

export const TrialTypeIcons: Record<TrialType, string> = {
  town: 'temple',
  monster: 'sword',
  realm: 'crystal',
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