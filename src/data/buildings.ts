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
    baseOutput: { reputation: 2 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
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
    description: '宗门门面与防御中枢。建筑：每月固定+2声望（不随等级与人数放大），维护约5灵石起；弟子：驻守每月+5贡献（另按道缘加成），满员时每级+5%防御战力，10级满员+50%（护山大阵）。',
    discipleEffect: {
      type: 'defense',
      description: '驻守+5贡献/月；满员每级+5%防御（Lv10+50%）',
      value: '声望+2/月（固定）；防御+5%~50%',
    },
  },
  lecture_hall: {
    type: 'lecture_hall',
    name: '讲经堂',
    maxLevel: 3,
    baseOutput: { reputation: 1 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 250 },
      { spiritStones: 700 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    description: '讲学传道之所。建筑：每月固定+1声望，维护约5灵石起；弟子：听讲每月消耗5贡献，获得修炼速度+20%/35%/55%（随等级提升）。',
    discipleEffect: {
      type: 'cultivation',
      description: '听讲-5贡献/月，修炼+20%~55%',
      value: '修炼+20%~55%',
    },
  },
  servant_hall: {
    type: 'servant_hall',
    name: '杂役堂',
    maxLevel: 10,
    baseOutput: { spiritStones: 40, herbs: 10, iron: 6, paper: 4 },
    baseMaintenanceCost: 15,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 400 },
      { spiritStones: 1000 },
      { spiritStones: 2500 },
      { spiritStones: 5000 },
      { spiritStones: 9000 },
      { spiritStones: 15000 },
      { spiritStones: 25000 },
      { spiritStones: 40000 },
      { spiritStones: 60000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'servant',
    description: '宗门后勤与原料产地。建筑：每月灵石+40、灵草+10、玄铁+6、灵纸+4（随等级与在岗人数提升），维护约5灵石起；弟子：在岗每月+5贡献（另按灵韵加成）。是丹堂/炼器堂/符堂的主要基础材料来源。',
    discipleEffect: {
      type: 'contribution',
      description: '在岗+5贡献/月；产出灵草/玄铁/灵纸',
      value: '灵石40/灵草10/玄铁6/灵纸4（Lv1满员）',
    },
  },
  secret_library: {
    type: 'secret_library',
    name: '藏经阁',
    maxLevel: 4,
    baseOutput: { reputation: 2 },
    baseMaintenanceCost: 45,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [
      { spiritStones: 500 },
      { spiritStones: 1500 },
      { spiritStones: 4000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '藏功载道之所，共四层对应四境。建筑：每月固定+2声望，维护约15灵石起；弟子：学习功法/战技消耗贡献（100~2000），金丹以上推演功法可反哺贡献。',
    discipleEffect: {
      type: 'cultivation',
      description: '学书-100~2000贡献；金丹推演+贡献',
      value: '功法/战技/推演',
    },
  },
  pill_hall: {
    type: 'pill_hall',
    name: '丹堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 5 },
    baseMaintenanceCost: 60,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [
      { spiritStones: 600 },
      { spiritStones: 1500 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'pills',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 10,
    unlockRequirement: { buildings: [{ type: 'servant_hall', level: 2 }] },
    description: '炼制丹药之所。建筑：每月代工灵石+5，维护约20灵石起；生产丹药消耗灵草与弟子贡献（按丹方），成品可用于突破/延寿或出售。弟子：在岗每月+8贡献（另按灵韵加成）。',
    discipleEffect: {
      type: 'none',
      description: '在岗+8贡献/月；炼丹消耗灵草+贡献',
      value: '丹药产出',
    },
  },
  forge_hall: {
    type: 'forge_hall',
    name: '炼器堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 5 },
    baseMaintenanceCost: 75,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [
      { spiritStones: 800 },
      { spiritStones: 2000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'artifacts',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 10,
    unlockRequirement: { buildings: [{ type: 'pill_hall', level: 1 }] },
    description: '炼制法器之所。建筑：每月代工灵石+5，维护约25灵石起；炼器消耗玄铁与弟子贡献（按图谱），成品可装备弟子提升战力或出售。弟子：在岗每月+8贡献（另按根骨加成）。',
    discipleEffect: {
      type: 'none',
      description: '在岗+8贡献/月；炼器消耗玄铁+贡献',
      value: '法器产出',
    },
  },
  talisman_hall: {
    type: 'talisman_hall',
    name: '符堂',
    maxLevel: 3,
    baseOutput: { spiritStones: 5 },
    baseMaintenanceCost: 45,
    buildCost: { spiritStones: 600 },
    upgradeCosts: [
      { spiritStones: 700 },
      { spiritStones: 1800 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'talismans',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 8,
    unlockRequirement: { buildings: [{ type: 'forge_hall', level: 1 }] },
    description: '绘制符箓之所。建筑：每月代工灵石+5，维护约15灵石起；制符消耗灵纸与弟子贡献（按符谱），成品可用于战斗或出售。弟子：在岗每月+8贡献（另按道缘加成）。',
    discipleEffect: {
      type: 'none',
      description: '在岗+8贡献/月；制符消耗灵纸+贡献',
      value: '符箓产出',
    },
  },
  array_hall: {
    type: 'array_hall',
    name: '阵堂',
    maxLevel: 3,
    baseOutput: { reputation: 1 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 800 },
    upgradeCosts: [
      { spiritStones: 900 },
      { spiritStones: 2200 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 5,
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 2 }] },
    description: '护宗阵法之所。建筑：每月固定+1声望，维护约10灵石起；弟子：陪炼布阵每月+7贡献（另按根骨/灵韵加成）；阵堂启用时全宗防御+10%，每升1级额外+5%（Lv3+20%）。',
    discipleEffect: {
      type: 'defense',
      description: '在岗+7贡献/月；全宗防御+10%~20%',
      value: '防御+10%/级，Lv3+20%',
    },
  },
  spirit_beast_garden: {
    type: 'spirit_beast_garden',
    name: '灵兽原',
    maxLevel: 3,
    baseOutput: { beasts: 1 },
    baseMaintenanceCost: 60,
    buildCost: { spiritStones: 1000 },
    upgradeCosts: [
      { spiritStones: 1200 },
      { spiritStones: 3000 },
    ],
    discipleCapacity: 10,
    category: 'production',
    primaryOutput: 'beasts',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 8,
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 2 }] },
    description: '豢养灵兽之所。建筑：每月产出1只灵兽（随等级与在岗提升），维护约20灵石起；每只灵兽每月消耗2灵草，断粮会流失。弟子：驯养每月+7贡献（另按道缘加成）。',
    discipleEffect: {
      type: 'morale',
      description: '在岗+7贡献/月；灵兽出战/陪伴',
      value: '灵兽+1/月，每只耗2灵草',
    },
  },
  skyscraper_tower: {
    type: 'skyscraper_tower',
    name: '通天塔',
    maxLevel: 1,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 0,
    buildCost: { spiritStones: 0 },
    upgradeCosts: [],
    discipleCapacity: 0,
    category: 'special',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    unlockRequirement: { sectLevel: 'eternal' },
    description: '通往仙界的通天塔；战力达 20 万的弟子可挑战通天塔，胜利则飞升仙界，游戏胜利',
    discipleEffect: {
      type: 'morale',
      description: '飞升道具',
      value: '结局建筑',
    },
  },
  training_ground: {
    type: 'training_ground',
    name: '演武场',
    maxLevel: 3,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 40,
    buildCost: { spiritStones: 300 },
    upgradeCosts: [
      { spiritStones: 400 },
      { spiritStones: 1000 },
    ],
    discipleCapacity: 5,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    monthlyContributionCost: 20,
    unlockRequirement: { buildings: [{ type: 'mountain_gate', level: 2 }] },
    description: '弟子切磋修炼之所。建筑：无资源产出，维护约13灵石起；弟子：每月消耗贡献换取战力经验——Lv1 5人/20贡/5经验，Lv2 8人/18贡/7经验，Lv3 12人/15贡/10经验；每满100经验战力+5%。',
    discipleEffect: {
      type: 'none',
      description: '耗20/18/15贡献 → +5/7/10战力经验',
      value: '战力修炼（随等级增效）',
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
      { spiritStones: 200 },
      { spiritStones: 600 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'outer',
    description: '外门弟子居住之所。建筑：无资源产出，维护约3灵石起；弟子：入住后修炼+10%，Lv1可住10人，每级+10人（无上限）。',
    discipleEffect: {
      type: 'cultivation',
      description: '入住修炼+10%',
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
      { spiritStones: 300 },
      { spiritStones: 800 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'inner',
    description: '内门弟子居住之所。建筑：无资源产出，维护约5灵石起；弟子：入住后修炼+20%，Lv1可住10人，每级+10人（无上限）。',
    discipleEffect: {
      type: 'cultivation',
      description: '入住修炼+20%',
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
      { spiritStones: 400 },
      { spiritStones: 1000 },
    ],
    discipleCapacity: 10,
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'core',
    description: '核心弟子居住之所。建筑：无资源产出，维护约7灵石起；弟子：入住后修炼+30%，Lv1可住10人，每级+10人（无上限）。',
    discipleEffect: {
      type: 'cultivation',
      description: '入住修炼+30%',
      value: '10人/级，无上限',
    },
  },
  cave_mansion: {
    type: 'cave_mansion',
    name: '洞府',
    maxLevel: 5,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 500 },
    upgradeCosts: [
      { spiritStones: 800 },    // Lv1→Lv2
      { spiritStones: 1800 },   // Lv2→Lv3
      { spiritStones: 3600 },   // Lv3→Lv4
      { spiritStones: 6400 },   // Lv4→Lv5
    ],
    discipleCapacity: 1,  // Lv1=1，每级+2：Lv2=3, Lv3=5, Lv4=7, Lv5=9
    category: 'service',
    primaryOutput: 'spiritStones',
    minDiscipleStatus: 'elder',
    description: '长老专属居所。建筑：无资源产出，维护约10灵石起；弟子：入住长老修炼+35%~+55%（每级+5%），Lv1可住1人、每级+2人（最高9人）；住满后其他符合条件的长老可挑战夺取。',
    discipleEffect: {
      type: 'cultivation',
      description: '入住修炼+35%~+55%',
      value: '1+2人/级，最高9人',
    },
  },
  enshrinement_hall: {
    type: 'enshrinement_hall',
    name: '英灵祠',
    maxLevel: 3,
    baseOutput: { spiritStones: 0 },
    baseMaintenanceCost: 30,
    buildCost: { spiritStones: 1500 },
    upgradeCosts: [
      { spiritStones: 1500 },
      { spiritStones: 3500 },
    ],
    discipleCapacity: 0, // 不驻守弟子，避免堂主/分配逻辑
    category: 'special',
    primaryOutput: 'spiritStones',
    unlockRequirement: {
      buildings: [{ type: 'mountain_gate', level: 2 }],
      reputation: 200,
    },
    description: '供奉寿终有功弟子之祠。建筑：无资源产出，维护约10灵石起，Lv1可供奉2位、每级+2位；全宗每月获得英灵庇佑（声望与修炼加成，按生前功绩分档）。弟子：无需驻守。',
    discipleEffect: {
      type: 'cultivation',
      description: '每位英灵：声望+1~3/月，全宗修炼+1%~3%',
      value: '2位/级，无需驻守',
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
  // 曲线：0.15 + ((rb-20)/80)^1.8 × 0.95
  // 根骨 20→0.15, 40→0.23, 60→0.42, 80→0.70, 100→1.05
  const t = Math.max(0, (rootBone - 20) / 80);
  return Math.round((0.15 + Math.pow(t, 1.8) * 0.95) * 100) / 100;
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
