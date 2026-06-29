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
    promotionCost: 3000,
  },
  eternal: { 
    reputation: 2000, 
    spiritStones: 20000, 
    allLevel2: true, 
    spiritDisciple: true,
    promotionCost: 10000,
  },
};

// 各等级解锁的建筑类型
export const SectLevelUnlockBuildings: Record<SectLevel, string[]> = {
  founding: ['mountain_gate', 'lecture_hall', 'servant_hall', 'residence'],
  known: ['pill_hall', 'secret_library'],
  famous: ['artifact_hall'],
  dominant: ['guardian_array', 'spirit_beast_garden'],
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
