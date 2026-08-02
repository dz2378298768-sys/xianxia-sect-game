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
    maxLevel: 3,
    baseOutput: { spiritStones: 3, reputation: 1 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 300, contribution: 200 },
      { spiritStones: 800, contribution: 500 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '宗门门面，弟子驻守可获得贡献点；满员时加成10%宗门战力，每升一级增加10名可容纳弟子并提升10%战力上限',
    discipleEffect: {
      type: 'defense',
      description: '满员时宗门获得10%战力加成；驻守弟子每月获得5贡献点',
      value: '+100战力/+10%/+10容量',
    },
  },
  lecture_hall: {
    type: 'lecture_hall',
    name: '讲经堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 250, contribution: 150 },
      { spiritStones: 700, contribution: 400 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    description: '弟子花费5贡献点进入听讲获得修炼加成；修炼效率加成：Lv1+20%, Lv2+35%, Lv3+55%',
    discipleEffect: {
      type: 'cultivation',
      description: '听讲弟子获得修炼速度加成（Lv1+20%, Lv2+35%, Lv3+55%）',
      value: '修炼+20%~55%/-5贡献/月',
    },
  },
  servant_hall: {
    type: 'servant_hall',
    name: '杂役堂',
    maxLevel: 4,
    baseOutput: { spiritStones: 40, herbs: 6, iron: 2, paper: 2 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 400, contribution: 100 },
      { spiritStones: 1000, contribution: 300 },
      { spiritStones: 2500, contribution: 800 },
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
    baseOutput: { spiritStones: 20 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 500, contribution: 300 },
      { spiritStones: 1500, contribution: 800 },
      { spiritStones: 4000, contribution: 2000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '共分四层，收录功法与战技；每层对应一个境界，初始各1本通用功法+1本通用战技',
    discipleEffect: {
      type: 'cultivation',
      description: '弟子可学习功法(1本)和战技(1本)',
      value: '功法+战技',
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
      { spiritStones: 400, contribution: 200 },
      { spiritStones: 1200, contribution: 600 },
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
      { spiritStones: 400, contribution: 200 },
      { spiritStones: 1200, contribution: 600 },
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
      { spiritStones: 300, contribution: 150 },
      { spiritStones: 900, contribution: 400 },
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
      { spiritStones: 350, contribution: 200 },
      { spiritStones: 1000, contribution: 500 },
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
      { spiritStones: 500, contribution: 300 },
      { spiritStones: 1500, contribution: 800 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'beasts',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 8,
    unlockRequirement: { reputation: 200 },
    description: '豢养灵兽之所；弟子在此驯养灵兽，每月可产灵兽幼崽。',
    discipleEffect: {
      type: 'morale',
      description: '灵兽产量+10%/人',
      value: '每月产出灵兽',
    },
  },
  guardian_array: {
    type: 'guardian_array',
    name: '护山大阵',
    maxLevel: 1,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 1000,
    buildCost: { spiritStones: 3000 },
    upgradeCosts: [],
    discipleCapacity: 0,
    category: 'special',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 3 }] },
    description: '守护宗门的大阵；开启时+50%防御，每月消耗1000灵石',
    discipleEffect: {
      type: 'defense',
      description: '开启时+50%防御',
      value: '防御+50%',
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
      { spiritStones: 200, contribution: 100 },
      { spiritStones: 600, contribution: 300 },
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
      { spiritStones: 300, contribution: 150 },
      { spiritStones: 800, contribution: 400 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'inner',
    unlockRequirement: { sectLevel: 'known' },
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
      { spiritStones: 400, contribution: 200 },
      { spiritStones: 1000, contribution: 500 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'core',
    unlockRequirement: { sectLevel: 'famous' },
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
    buildCost: { spiritStones: 500, contribution: 400 },
    upgradeCosts: [],
    discipleCapacity: 1,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'elder',
    unlockRequirement: { sectLevel: 'dominant' },
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

// 根骨决定功法/战技效果发挥比例
export function getRootBoneEffectiveness(rootBone: number): number {
  if (rootBone >= 80) return 1.0;
  if (rootBone >= 60) return 0.8;
  if (rootBone >= 40) return 0.6;
  return 0.4;
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
