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
    baseOutput: { spiritStones: 3 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 300 },
      { spiritStones: 1000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'reputation',
    minDiscipleStatus: 'servant',
    description: '宗门门面，弟子驻守可获得贡献点；人数满十时加成10%宗门战力，每升一级增加10名可容纳弟子并提升10%战力上限',
    discipleEffect: {
      type: 'defense',
      description: '满员时宗门获得10%战力加成；每升一级增加10名容量和10%战力上限；驻守弟子每月获得5贡献点',
      value: '+10%战力(满员)/+10容量/+10%上限',
    },
  },
  lecture_hall: {
    type: 'lecture_hall',
    name: '讲经堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 10 },
    baseMaintenanceCost: 12,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 200 },
      { spiritStones: 800 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    description: '弟子花费5贡献点进入听讲获得修炼加成；讲师修炼效率越高，加成越高；升级仅增加可容纳弟子人数',
    discipleEffect: {
      type: 'cultivation',
      description: '听讲弟子获得修炼速度加成（基础10%，讲师等级越高加成越高）；讲师每人5贡献点',
      value: '修炼+10%~30%/贡献+5/人',
    },
  },
  servant_hall: {
    type: 'servant_hall',
    name: '杂役堂',
    maxLevel: 4,
    baseOutput: {
      spiritStones: 60,
      herbs: 12,
    },
    baseMaintenanceCost: 18,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 500 },
      { spiritStones: 1500 },
      { spiritStones: 4000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '百工杂役之所，含灵田种植、凡俗经营；灵韵越高产出越丰，杂役弟子可在此工作赚取贡献',
    discipleEffect: {
      type: 'contribution',
      description: '弟子每月获得贡献点(基础5+灵韵加成)，可晋升为外门弟子',
      value: '贡献+5~15/月',
    },
  },
  pill_hall: {
    type: 'pill_hall',
    name: '丹堂',
    maxLevel: 3,
    baseOutput: {
      pills: 1,
      spiritStones: 25,
    },
    baseMaintenanceCost: 25,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [
      { spiritStones: 0 },
      { spiritStones: 600 },
      { spiritStones: 1800 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'pills',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'known' },
    description: '炼制丹药之所；灵韵越高产出丹药品质越好，管理者可提升炼丹效率',
    discipleEffect: {
      type: 'none',
      description: '专注炼制丹药，弟子可学习炼丹技能',
      value: '无直接收益',
    },
  },
  sutra_hall: {
    type: 'sutra_hall',
    name: '炼器堂',
    maxLevel: 3,
    baseOutput: {
      artifacts: 1,
      spiritStones: 35,
    },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [
      { spiritStones: 800 },
      { spiritStones: 2000 },
      { spiritStones: 5000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'artifacts',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'known' },
    description: '炼制法器灵宝之所；灵韵与根骨影响产出品质，管理者可提升炼器效率',
    discipleEffect: {
      type: 'none',
      description: '专注炼制法器，弟子可学习炼器技能',
      value: '无直接收益',
    },
  },
  artifact_hall: {
    type: 'artifact_hall',
    name: '符堂',
    maxLevel: 3,
    baseOutput: {
      talismans: 1,
      spiritStones: 30,
    },
    baseMaintenanceCost: 22,
    buildCost: { spiritStones: 1000 },
    upgradeCosts: [
      { spiritStones: 600 },
      { spiritStones: 1500 },
      { spiritStones: 4000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'talismans',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'famous' },
    description: '绘制符箓之术；灵韵与道缘决定符箓威力，管理者可提升制符效率',
    discipleEffect: {
      type: 'none',
      description: '专注绘制符箓，弟子可学习制符技能',
      value: '无直接收益',
    },
  },
  secret_library: {
    type: 'secret_library',
    name: '藏经阁',
    maxLevel: 4,
    baseOutput: { spiritStones: 20 },
    baseMaintenanceCost: 35,
    buildCost: { spiritStones: 800 },
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
    unlockRequirement: { sectLevel: 'founding' },
    description: '藏经阁共分四层，收录功法与战技；弟子可在此学习修炼，提升修为与战力',
    discipleEffect: {
      type: 'cultivation',
      description: '弟子可学习功法(1本)和战技(2本)，提升修炼速度与战力',
      value: '功法+战技',
    },
  },
  array_hall: {
    type: 'array_hall',
    name: '阵堂',
    maxLevel: 3,
    baseOutput: { reputation: 0, spiritStones: 20 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 1500 },
    upgradeCosts: [
      { spiritStones: 1200 },
      { spiritStones: 3000 },
      { spiritStones: 7000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'reputation',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'famous' },
    description: '维护护山大阵；根骨与灵韵决定布阵能力，管理者可提升布阵效率',
    discipleEffect: {
      type: 'defense',
      description: '布阵弟子获得布阵技能加成，宗门防御+5%',
      value: '防御+5%',
    },
  },
  spirit_beast_garden: {
    type: 'spirit_beast_garden',
    name: '灵兽园',
    maxLevel: 3,
    baseOutput: { spiritStones: 45 },
    baseMaintenanceCost: 40,
    buildCost: { spiritStones: 2500 },
    upgradeCosts: [
      { spiritStones: 1500 },
      { spiritStones: 3500 },
      { spiritStones: 8000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'famous' },
    description: '豢养灵兽；道缘影响驯养效果，管理者可提升灵兽产出',
    discipleEffect: {
      type: 'morale',
      description: '弟子与灵兽亲和，心情愉悦，修炼速度+3%',
      value: '修炼+3%',
    },
  },
  guardian_array: {
    type: 'guardian_array',
    name: '护山大阵',
    maxLevel: 3,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 50,
    buildCost: { spiritStones: 3000 },
    upgradeCosts: [
      { spiritStones: 2000 },
      { spiritStones: 5000 },
      { spiritStones: 10000 },
    ],
    discipleCapacity: 0,
    category: 'special',
    primaryOutput: 'reputation',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'eternal' },
    description: '守护宗门的大阵；抵御外敌入侵，提升宗门安全',
    discipleEffect: {
      type: 'defense',
      description: '宗门防御大幅提升，外敌入侵概率-50%',
      value: '入侵-50%',
    },
  },
  skyscraper_tower: {
    type: 'skyscraper_tower',
    name: '通天塔',
    maxLevel: 9,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 100,
    buildCost: { spiritStones: 8000 },
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
    primaryOutput: 'reputation',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'eternal' },
    description: '通往仙界的通天塔；传说登顶可飞升',
    discipleEffect: {
      type: 'morale',
      description: '宗门弟子斗志昂扬，全体修炼速度+10%，境界突破成功率+5%',
      value: '修炼+10%/+5%突破',
    },
  },
  servant_residence: {
    type: 'servant_residence',
    name: '杂役居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0, reputation: 0 },
    baseMaintenanceCost: 10,
    buildCost: { spiritStones: 50 },
    upgradeCosts: [],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '杂役弟子居住之所，条件简陋但能遮风挡雨；升级每级增加10可居住人数',
    discipleEffect: {
      type: 'cultivation',
      description: '杂役弟子修炼速度+0%；升级增加10可居住人数',
      value: '修炼+0%/+10人',
    },
  },
  outer_residence: {
    type: 'outer_residence',
    name: '外门居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0, reputation: 0 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 100 },
    upgradeCosts: [],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '外门弟子居住之所，灵气较为充裕；升级每级增加10可居住人数',
    discipleEffect: {
      type: 'cultivation',
      description: '外门弟子修炼速度+10%；升级增加10可居住人数',
      value: '修炼+10%/+10人',
    },
  },
  inner_residence: {
    type: 'inner_residence',
    name: '内门居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0, reputation: 0 },
    baseMaintenanceCost: 25,
    buildCost: { spiritStones: 300 },
    upgradeCosts: [],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'inner',
    unlockRequirement: { sectLevel: 'known' },
    description: '内门弟子居住之所，灵气充沛，配有独立修炼室；升级每级增加10可居住人数',
    discipleEffect: {
      type: 'cultivation',
      description: '内门弟子修炼速度+20%；升级增加10可居住人数',
      value: '修炼+20%/+10人',
    },
  },
  core_residence: {
    type: 'core_residence',
    name: '核心居所',
    maxLevel: 999,
    baseOutput: { spiritStones: 0, reputation: 0 },
    baseMaintenanceCost: 40,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'core',
    unlockRequirement: { sectLevel: 'famous' },
    description: '核心弟子居住之所，洞天福地，灵气浓郁；升级每级增加10可居住人数',
    discipleEffect: {
      type: 'cultivation',
      description: '核心弟子修炼速度+30%；升级增加10可居住人数',
      value: '修炼+30%/+10人',
    },
  },
  cave_mansion: {
    type: 'cave_mansion',
    name: '洞府',
    maxLevel: 3,
    baseOutput: { spiritStones: 5, reputation: 0 },
    baseMaintenanceCost: 20,
    buildCost: { spiritStones: 1000 },
    upgradeCosts: [
      { spiritStones: 2000 },
      { spiritStones: 5000 },
      { spiritStones: 10000 },
    ],
    discipleCapacity: 1,
    category: 'special',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'elder',
    unlockRequirement: { sectLevel: 'eternal' },
    description: '长老专属洞府；修炼圣地，灵气浓郁，长老可花费贡献点购买',
    discipleEffect: {
      type: 'cultivation',
      description: '居住长老修炼速度+50%，突破成功率+10%',
      value: '修炼+50%/+10%突破',
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
export type BookTier = 'foundation' | 'golden' | 'nascent' | 'spirit'; // 筑基/金丹/元婴/化神
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
  foundation: '筑基',
  golden: '金丹',
  nascent: '元婴',
  spirit: '化神',
};

export const BookTypeNames: Record<BookType, string> = {
  technique: '功法',
  battle: '战技',
};

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
