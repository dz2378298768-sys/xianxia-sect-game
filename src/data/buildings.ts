import type { BuildingConfig, BuildingType, BuildingCategory } from '@/types/building';

export interface BuildingDiscipleEffect {
  type: 'contribution' | 'cultivation' | 'defense' | 'morale' | 'none';
  description: string;
  value?: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  mountain_gate: {
    type: 'mountain_gate',
    name: '山门',
    maxLevel: 10,
    baseOutput: { spiritStones: 3, reputation: 1 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 300 },
      { spiritStones: 800 },
      { spiritStones: 1500 },
      { spiritStones: 2500 },
      { spiritStones: 4000 },
      { spiritStones: 6000 },
      { spiritStones: 8500 },
      { spiritStones: 12000 },
      { spiritStones: 20000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '宗门门面，每级满员时+5%防御战力；升至10级化为护山大阵，宗门固若金汤。驻守弟子每月获得贡献点。',
    discipleEffect: {
      type: 'defense',
      description: '每级满员+5%战力，10级满员+50%（护山大阵）；驻守弟子每月获得5贡献点',
      value: '+5%/级(满员)/+10容量/级',
    },
  },
  lecture_hall: {
    type: 'lecture_hall',
    name: '讲经堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10, reputation: 1 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 250 },
      { spiritStones: 700 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    description: '弟子花费5贡献点进入听讲获得修炼加成；修炼效率加成：Lv1+20%, Lv2+35%, Lv3+55%',
    discipleEffect: {
      type: 'cultivation',
      description: '听讲弟子获得修炼速度加成（Lv1+20%, Lv2+35%, Lv3+55%），每月消耗5贡献',
      value: '修炼+20%~55%/-5贡献/月',
    },
  },
  servant_hall: {
    type: 'servant_hall',
    name: '杂役堂',
    maxLevel: 5,
    baseOutput: { spiritStones: 40, herbs: 6, iron: 2, paper: 2 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 400 },
      { spiritStones: 1000 },
      { spiritStones: 2500 },
      { spiritStones: 5000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '宗门杂役之所；弟子在此采集灵草、开采灵铁、制作符纸，为各堂提供原料。',
    discipleEffect: {
      type: 'contribution',
      description: '灵草+6/灵铁+2/符纸+2 每月',
      value: '灵石+灵材产出',
    },
  },
  secret_library: {
    type: 'secret_library',
    name: '藏经阁',
    maxLevel: 4,
    baseOutput: { spiritStones: 20, reputation: 2 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 500 },
      { spiritStones: 1500 },
      { spiritStones: 4000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '共分四层，收录功法与战技；每层对应一个境界。金丹期以上弟子可在此推演功法，每月获得贡献。',
    discipleEffect: {
      type: 'cultivation',
      description: '弟子可学习功法(1本)和战技(1本)；金丹以上可推演功法获贡献',
      value: '功法+战技/推演',
    },
  },
  pill_hall: {
    type: 'pill_hall',
    name: '丹堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 25,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 400 },
      { spiritStones: 1200 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'pills',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 10,
    unlockRequirement: { buildings: [{ type: 'servant_hall', level: 2 }] },
    description: '炼制丹药之所；每名弟子炼丹效率+10%，使用丹炉消耗10贡献点/次',
    discipleEffect: {
      type: 'none',
      description: '炼丹效率+10%/人，使用丹炉-10贡献/次',
      value: '丹药产出',
    },
  },
  sutra_hall: {
    type: 'sutra_hall',
    name: '炼器堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 400 },
      { spiritStones: 1200 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'artifacts',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 10,
    unlockRequirement: { buildings: [{ type: 'pill_hall', level: 1 }] },
    description: '炼制武器之所；每名弟子炼器效率+10%，使用锻造台消耗10贡献点/次',
    discipleEffect: {
      type: 'none',
      description: '炼器效率+10%/人，使用锻造台-10贡献/次',
      value: '法器产出',
    },
  },
  artifact_hall: {
    type: 'artifact_hall',
    name: '符堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 20,
    buildCost: { spiritStones: 600 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 300 },
      { spiritStones: 900 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'talismans',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 8,
    unlockRequirement: { buildings: [{ type: 'sutra_hall', level: 1 }] },
    description: '绘制符箓之所；每名弟子制符效率+10%，使用符台消耗8贡献点/次',
    discipleEffect: {
      type: 'none',
      description: '制符效率+10%/人，使用符台-8贡献/次',
      value: '符箓产出',
    },
  },
  array_hall: {
    type: 'array_hall',
    name: '阵堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 20, reputation: 1 },
    baseMaintenanceCost: 20,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 350 },
      { spiritStones: 1000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 2 }] },
    description: '阵法加成之所；+10%全宗防御，参与布阵消耗5贡献点/次',
    discipleEffect: {
      type: 'defense',
      description: '+10%全宗防御，参与布阵-5贡献/次',
      value: '防御+10%',
    },
  },
  spirit_beast_garden: {
    type: 'spirit_beast_garden',
    name: '灵兽原',
    maxLevel: 3,
    baseOutput: { spiritStones: 30, beasts: 1 },
    baseMaintenanceCost: 40,
    buildCost: { spiritStones: 1000 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 500 },
      { spiritStones: 1500 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'beasts',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 8,
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 2 }] },
    description: '豢养灵兽之所；弟子在此驯养灵兽获取贡献，灵兽每月消耗灵草。玩家可购买或捕捉灵兽入原培养。',
    discipleEffect: {
      type: 'morale',
      description: '弟子驯养灵兽获得贡献；灵兽每月消耗灵草',
      value: '贡献/灵兽培养',
    },
  },
  skyscraper_tower: {
    type: 'skyscraper_tower',
    name: '通天塔',
    maxLevel: 9,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 0,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 5000 },
      { spiritStones: 8000 },
      { spiritStones: 12000 },
      { spiritStones: 18000 },
      { spiritStones: 25000 },
      { spiritStones: 35000 },
      { spiritStones: 50000 },
      { spiritStones: 70000 },
      { spiritStones: 100000 },
    ],
    discipleCapacity: 0,
    category: 'special',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'eternal' },
    description: '通往仙界的通天塔；收集9枚碎片可飞升',
    discipleEffect: {
      type: 'morale',
      description: '飞升道具',
      value: '结局建筑',
    },
  },
  outer_residence: {
    type: 'outer_residence',
    name: '外门居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 200 },
      { spiritStones: 600 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '外门弟子居住之所；Lv1=10人，每级+10人，无上限',
    discipleEffect: {
      type: 'cultivation',
      description: '外门弟子修炼+10%',
      value: '10人/级，无上限',
    },
  },
  inner_residence: {
    type: 'inner_residence',
    name: '内门居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 300 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 300 },
      { spiritStones: 800 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'inner',
    description: '内门弟子居住之所；Lv1=10人，每级+10人，无上限',
    discipleEffect: {
      type: 'cultivation',
      description: '内门弟子修炼+20%',
      value: '10人/级，无上限',
    },
  },
  core_residence: {
    type: 'core_residence',
    name: '核心居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 20,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 400 },
      { spiritStones: 1000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'core',
    description: '核心弟子居住之所；Lv1=10人，每级+10人，无上限',
    discipleEffect: {
      type: 'cultivation',
      description: '核心弟子修炼+30%',
      value: '10人/级，无上限',
    },
  },
  cave_mansion: {
    type: 'cave_mansion',
    name: '洞府',
    maxLevel: 1,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 20,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [],
    discipleCapacity: 1,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'elder',
    description: '长老专属洞府；修炼速度+30%',
    discipleEffect: {
      type: 'cultivation',
      description: '长老修炼+30%',
      value: '修炼+30%',
    },
  },
};

export const INITIAL_BUILDING_TYPES: BuildingType[] = [
  'mountain_gate',
  'lecture_hall',
  'servant_hall',
];

// 藏经阁配置 - 功法和战技
export type BookType = 'technique' | 'battle'; // 功法/战技
export type BookTier = 'qi' | 'foundation' | 'golden' | 'nascent'; // 炼气/筑基/金丹/元婴
export type BookAttribute = 'gold' | 'wood' | 'water' | 'fire' | 'earth' | 'thunder' | 'wind' | 'ice' | 'universal'; // 属性

export const BookAttributeNames: Record<BookAttribute, string> = {
  gold: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土',
  thunder: '雷',
  wind: '风',
  ice: '冰',
  universal: '通用',
};

export interface BookConfig {
  id: string;
  type: BookType;
  tier: BookTier;
  attribute: BookAttribute; // 功法属性
  name: string;
  description: string;
  cultivationBonus: number;     // 修炼速度加成（功法用）
  combatBonus: number;          // 战斗力加成（两者都用）
  quality: number;              // 品质 0-100，决定加成高低
  learnDays: number;            // 学习所需月数
}

export const BookTierNames: Record<BookTier, string> = {
  qi: '炼气',
  foundation: '筑基',
  golden: '金丹',
  nascent: '元婴',
};

export const BookTypeNames: Record<BookType, string> = {
  technique: '功法',
  battle: '战技',
};

// 各层功法/战技学习消耗（贡献点/本）和购买价格（灵石/本）
export const BOOK_TIER_COSTS: Record<BookTier, { learnCost: number; buyPrice: number }> = {
  qi: { learnCost: 100, buyPrice: 500 },
  foundation: { learnCost: 300, buyPrice: 1500 },
  golden: { learnCost: 800, buyPrice: 4000 },
  nascent: { learnCost: 2000, buyPrice: 10000 },
};

// 各层功法基础修炼速度加成（功法用）和战力加成（战技用）
export const BOOK_TIER_BONUSES: Record<BookTier, { cultivation: number; combat: number }> = {
  qi: { cultivation: 10, combat: 15 },
  foundation: { cultivation: 20, combat: 25 },
  golden: { cultivation: 35, combat: 40 },
  nascent: { cultivation: 50, combat: 60 },
};

// 根骨决定功法/战技/居所/讲经堂/秘籍等一切「修炼增幅」的发挥比例（2026-08-04 非线性，强化天赋差异）
//   根骨 20 → 0.15（差天赋仅发挥 15% buff 效果——学了功法也基本没用）
//   根骨 40 → 0.40
//   根骨 50 → 0.57 （普通弟子：buff 只能拿到 ~57%）
//   根骨 60 → 0.73
//   根骨 80 → 1.00 （刚好 100%）
//   根骨 100→ 1.25 （溢出，强天赋能「超额发挥」功法效果）
export function getRootBoneEffectiveness(rootBone: number): number {
  // 曲线：0.15 + ((rb-20)/80)^1.3 × 1.1
  const t = Math.max(0, (rootBone - 20) / 80);
  return Math.round((0.15 + Math.pow(t, 1.3) * 1.1) * 100) / 100;
}

// 初始通用功法/战技定义（每层1本通用功法 + 1本通用战技）
export const INITIAL_LIBRARY_BOOKS: { tier: BookTier; type: BookType; name: string; description: string; cultivationBonus: number; combatBonus: number }[] = [
  { tier: 'qi', type: 'technique', name: '引气诀', description: '炼气期通用功法，引导天地灵气入体', cultivationBonus: 10, combatBonus: 0 },
  { tier: 'qi', type: 'battle', name: '基础剑术', description: '炼气期通用战技，最基础的剑法', cultivationBonus: 0, combatBonus: 15 },
  { tier: 'foundation', type: 'technique', name: '凝元功', description: '筑基期通用功法，凝聚天地元气', cultivationBonus: 20, combatBonus: 0 },
  { tier: 'foundation', type: 'battle', name: '御风剑法', description: '筑基期通用战技，御风行剑', cultivationBonus: 0, combatBonus: 25 },
  { tier: 'golden', type: 'technique', name: '金丹心经', description: '金丹期通用功法，凝练金丹之道', cultivationBonus: 35, combatBonus: 0 },
  { tier: 'golden', type: 'battle', name: '天罡战诀', description: '金丹期通用战技，天罡战气', cultivationBonus: 0, combatBonus: 40 },
  { tier: 'nascent', type: 'technique', name: '元婴化神录', description: '元婴期通用功法，元婴化神之道', cultivationBonus: 50, combatBonus: 0 },
  { tier: 'nascent', type: 'battle', name: '太虚神诀', description: '元婴期通用战技，太虚神力', cultivationBonus: 0, combatBonus: 60 },
];

// 讲经堂配置
export const LECTURE_CONFIG = {
  // 听讲消耗
  lectureCost: 5,      // 每次听讲消耗贡献点
  baseLectureBonus: 10, // 基础修炼速度加成（百分比）
  lectureDuration: 1,   // 加成持续月数

  // 讲师要求
  lecturerMinStatus: 'inner',  // 至少内门弟子才能担任讲师

  // 讲师收益
  lecturerBonusPerStudent: 5,  // 每个听讲学生给讲师带来的贡献点
};
