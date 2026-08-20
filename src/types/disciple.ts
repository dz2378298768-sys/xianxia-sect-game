import type { ArtifactType } from '@/types/artifact';
import type { TalismanType } from '@/types/talisman';
import type { BeastType } from '@/types/beast';
import type { PillType } from '@/types/pill';

/** 弟子性格特质 */
export type Personality =
  | 'diligent'    // 勤勉 - 修炼速度+5%
  | 'lazy'        // 懒散 - 修炼速度-5%
  | 'aggressive'  // 好斗 - 战力+5%，满意度易波动
  | 'peaceful'    // 平和 - 满意度更稳定
  | 'greedy'      // 贪婪 - 对灵石奖励更敏感
  | 'generous'    // 慷慨 - 对门派贡献更积极
  | 'loner'       // 孤僻 - 更容易叛逃
  | 'friendly'    // 友善 - 更容易交朋友
  ;

export const PersonalityNames: Record<Personality, string> = {
  diligent: '勤勉',
  lazy: '懒散',
  aggressive: '好斗',
  peaceful: '平和',
  greedy: '贪婪',
  generous: '慷慨',
  loner: '孤僻',
  friendly: '友善',
};

export const PersonalityDescriptions: Record<Personality, string> = {
  diligent: '修炼刻苦，修为增长更快',
  lazy: '天性散漫，修炼效率略低',
  aggressive: '好勇斗狠，战力更强但易与人冲突',
  peaceful: '心性平和，满意度稳定',
  greedy: '对灵石极为敏感，奖励更有效',
  generous: '乐于奉献，宗门贡献更积极',
 loner: '独来独往，不满时容易离去',
  friendly: '善于交际，容易结交好友',
};

/** 性格对修炼速度的倍率修正 */
export const PERSONALITY_CULTIVATION_MULT: Record<Personality, number> = {
  diligent: 1.05,
  lazy: 0.95,
  aggressive: 1.0,
  peaceful: 1.0,
  greedy: 1.0,
  generous: 1.0,
  loner: 1.0,
  friendly: 1.0,
};

/** 性格对满意度变化的修正 */
export const PERSONALITY_SATISFACTION_MOD: Record<Personality, number> = {
  diligent: 1.0,
  lazy: 1.0,
  aggressive: 1.2,   // 好斗：满意度变化更剧烈
  peaceful: 0.8,     // 平和：满意度更稳定
  greedy: 1.3,       // 贪婪：对灵石奖励更敏感
  generous: 0.9,
  loner: 1.1,
  friendly: 0.9,
};

/** 性格对叛逃概率的修正倍率 */
export const PERSONALITY_DEFECTION_MULT: Record<Personality, number> = {
  diligent: 0.7,
  lazy: 1.3,
  aggressive: 1.1,
  peaceful: 0.6,
  greedy: 1.2,
  generous: 0.8,
  loner: 1.5,
  friendly: 0.7,
};

/** 性格对交友概率的修正倍率 */
export const PERSONALITY_FRIEND_MULT: Record<Personality, number> = {
  diligent: 1.0,
  lazy: 1.0,
  aggressive: 0.7,
  peaceful: 1.2,
  greedy: 0.8,
  generous: 1.3,
  loner: 0.4,
  friendly: 1.5,
};

/** 背景故事类型 */
export type BackgroundStory =
  | 'common_folk'       // 凡人出身
  | 'cultivation_family' // 修仙世家
  | 'wandering_scholar'  // 游历散修
  | 'sect_orphan'        // 宗门遗孤
  | 'fallen_noble'       // 没落贵族
  | 'ancient_heritage'   // 远古传承
  | 'beast_tamer'        // 御兽世家
  | 'artifact_artisan'   // 炼器世家
  ;

export const BackgroundStoryNames: Record<BackgroundStory, string> = {
  common_folk: '凡人出身',
  cultivation_family: '修仙世家',
  wandering_scholar: '游历散修',
  sect_orphan: '宗门遗孤',
  fallen_noble: '没落贵族',
  ancient_heritage: '远古传承',
  beast_tamer: '御兽世家',
  artifact_artisan: '炼器世家',
};

export const BackgroundStoryDescriptions: Record<BackgroundStory, string> = {
  common_folk: '出身普通凡人家庭，因机缘踏入修仙之路。',
  cultivation_family: '生于修仙世家，从小耳濡目染，基础扎实。',
  wandering_scholar: '曾独自游历天下，见多识广，阅历丰富。',
  sect_orphan: '幼年被宗门收养，将宗门视为自己的家。',
  fallen_noble: '祖上曾是大能，家族没落，身怀祖传秘法残篇。',
  ancient_heritage: '偶然获得远古传承，身怀异宝，前途不可限量。',
  beast_tamer: '御兽世家出身，天生与灵兽亲近，驯兽天赋异禀。',
  artifact_artisan: '炼器世家出身，对法器炼制有着独到的见解。',
};

/** 背景故事对属性的影响 */
export interface BackgroundEffects {
  rootBoneBonus?: number;
  spiritRhythmBonus?: number;
  constitutionBonus?: number;
  daoFateBonus?: number;
  cultivationSpeedBonus?: number;
  combatPowerBonus?: number;
  description: string;
}

export const BACKGROUND_EFFECTS: Record<BackgroundStory, BackgroundEffects> = {
  common_folk: { description: '无特殊加成' },
  cultivation_family: { rootBoneBonus: 5, spiritRhythmBonus: 5, description: '根骨+5，灵韵+5' },
  wandering_scholar: { daoFateBonus: 10, description: '命数+10' },
  sect_orphan: { cultivationSpeedBonus: 3, description: '修炼速度+3%' },
  fallen_noble: { rootBoneBonus: 8, description: '根骨+8' },
  ancient_heritage: { daoFateBonus: 15, cultivationSpeedBonus: 5, description: '命数+15，修炼速度+5%' },
  beast_tamer: { constitutionBonus: 8, description: '体质+8' },
  artifact_artisan: { spiritRhythmBonus: 8, description: '灵韵+8' },
};

/** 喜好类型 */
export interface DisciplePreference {
  /** 喜欢的丹药类型（有偏好时服用效果提升） */
  likedPillTypes?: PillType[];
  /** 喜欢的功法类型 */
  likedTechniqueTypes?: string[];
  /** 厌恶的丹药类型（服用效果降低） */
  dislikedPillTypes?: PillType[];
  /** 厌恶的功法类型 */
  dislikedTechniqueTypes?: string[];
}

// 弟子背包物品：记录弟子个人持有的丹药/法器/符箓/灵兽
export interface DiscipleBackpackItem {
  kind: 'pill' | 'artifact' | 'talisman' | 'beast';
  itemType: string;   // PillType | ArtifactType | TalismanType | BeastType
  quantity: number;
}

export type DiscipleStatus = 'mortal' | 'servant' | 'outer' | 'inner' | 'core' | 'elder';

export const DiscipleStatusNames: Record<DiscipleStatus, string> = {
  mortal: '凡人',
  servant: '杂役弟子',
  outer: '外门弟子',
  inner: '内门弟子',
  core: '核心弟子',
  elder: '长老',
};

export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden' | 'nascent' | 'spirit';

export const RealmNames: Record<Realm, string> = {
  mortal: '凡人',
  qi: '炼气期',
  foundation: '筑基期',
  golden: '金丹期',
  nascent: '元婴期',
  spirit: '化神期',
};

export const RealmOrder: Realm[] = ['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit'];

// 境界阶段：每个境界拆分为前/中/后期三格
export type RealmStage = 'early' | 'mid' | 'late';

export const RealmStageNames: Record<RealmStage, string> = {
  early: '前期',
  mid: '中期',
  late: '后期',
};

export const RealmStageOrder: RealmStage[] = ['early', 'mid', 'late'];

// 境界显示：凡人无阶段，其他境界显示为「炼气期·前期」
export function getRealmDisplay(d: { realm: Realm; realmStage: RealmStage }): string {
  if (d.realm === 'mortal') return '凡人';
  return `${RealmNames[d.realm]}·${RealmStageNames[d.realmStage]}`;
}

// 灵根类型
export type SpiritRootType = 'gold' | 'wood' | 'water' | 'fire' | 'earth' | 'thunder' | 'wind' | 'ice' | 'light' | 'dark';

export const SpiritRootNames: Record<SpiritRootType, string> = {
  gold: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土',
  thunder: '雷',
  wind: '风',
  ice: '冰',
  light: '光',
  dark: '暗',
};

export const SpiritRootColors: Record<SpiritRootType, string> = {
  gold: 'text-yellow-400',
  wood: 'text-green-400',
  water: 'text-blue-400',
  fire: 'text-red-400',
  earth: 'text-amber-600',
  thunder: 'text-purple-400',
  wind: 'text-cyan-400',
  ice: 'text-cyan-200',
  light: 'text-yellow-200',
  dark: 'text-gray-400',
};

// 灵根品质
export type SpiritRootQuality = 'waste' | 'common' | 'good' | 'excellent' | 'heavenly';

export const SpiritRootQualityNames: Record<SpiritRootQuality, string> = {
  waste: '废灵根',
  common: '凡灵根',
  good: '地灵根',
  excellent: '天灵根',
  heavenly: '仙灵根',
};

export interface SpiritRoot {
  type: SpiritRootType;
  quality: number; // 0-100 灵根纯度
}

export interface HiddenTalents {
  rootBone: number; // 保留旧字段作为兼容
  spiritRhythm: number;
  constitution: number; // 体质
  daoFate: number;
  spiritRoots: SpiritRoot[]; // 灵根列表
}

export interface TalentDisplay {
  rootBoneDesc: string;
  spiritRhythmDesc: string;
  constitutionDesc: string;
  daoFateDesc: string;
  nickname: string;
  spiritRootDesc: string; // 灵根描述
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  type: 'breakthrough' | 'cultivation' | 'production' | 'lecture';
  value: number;
  duration: number;
  remainingMonths: number;
}

// 秘籍类型
export type SecretType = 'basic' | 'intermediate' | 'advanced' | 'master';

export interface LearnedSecret {
  type: SecretType;
  name: string;
  cultivationBonus: number;
  learnedAt: { year: number; month: number };
}

// 藏经阁书籍学习状态
export type LearningBook = {
  bookId: string;
  name: string;
  type: 'technique' | 'battle';
  tier: 'qi' | 'foundation' | 'golden' | 'nascent';
  attribute?: string; // 属性
  cultivationBonus: number;
  combatBonus: number;
  progress: number;  // 学习进度0-100
  totalDays: number;  // 总需要月数
  isLearned: boolean;  // 是否学成
};

// 藏经阁推演中任务：完成后会生成一本新 BookConfig 加入藏经阁 libraryBooks
export type DeducingBook = {
  name: string;              // 推演中的书名（完成后正式使用）
  type: 'technique' | 'battle';
  tier: 'qi' | 'foundation' | 'golden' | 'nascent';
  attribute: string;         // 属性（匹配弟子灵根）
  progress: number;          // 推演进度 0-100
  totalMonths: number;       // 总需要月数（根据品阶）
  // 预设的成品属性（推演一开始就 roll 好，进度走完直接入库）
  cultivationBonus: number;  // 修炼加成
  combatBonus: number;       // 战力加成
  quality: number;           // 品质 0-100（仙品 ≥90 极品 ≥80 上品 ≥60 中品 ≥40 下品 <40）
};

// 弟子大比历史记录
export interface DiscipleTournamentRecord {
  year: number;
  scope: 'sect' | 'inter-sect';   // 山门大比 / 宗门大比
  frequency: string;               // 年度/五年/十年
  rank: number;                    // 名次（1=冠军，0=未入三甲）
  rewards: string[];               // 获得的奖励描述
}

export interface Disciple {
  id: string;
  name: string;
  age: number;
  maxAge: number;
  status: DiscipleStatus;
  realm: Realm;
  realmStage: RealmStage;   // 境界阶段：前/中/后期
  realmProgress: number;    // 当前阶段突破进度
  cultivationSpeed: number;
  hiddenTalents: HiddenTalents;
  talentDisplay: TalentDisplay;
  contributionPoints: number;
  assignedBuilding: string | null;
  managingBuilding: string | null;  // 管理的建筑ID
  joinDate: { year: number; month: number };
  breakthroughAttempts: number;
  breakthroughBonus: number;
  isBreakingThrough: boolean;
  isAttendingLecture: boolean;  // 是否在听讲
  isLecturing: boolean;  // 是否在讲经
  isLearningSecret: boolean;  // 是否在学习秘籍
  learnedSecrets: LearnedSecret[];  // 已学秘籍（旧系统，保留兼容）
  learnedTechnique: LearningBook | null;  // 已学功法（1本）
  learnedBattles: LearningBook[];  // 已学战技（最多2本）
  learningBook: LearningBook | null;  // 当前正在学习的书
  deducingBook: DeducingBook | null;  // 当前正在推演的书（藏经阁），完成后会作为新秘籍加入藏经阁
  buffs: Buff[];
  avatarSeed: number;
  constitutionId: string;  // 体质ID
  // 满意度系统
  satisfaction: number;  // 满意度 0-100
  maxSatisfactionLossWork: number;  // 无工作最大满意度损失上限（最大20）
  maxSatisfactionLossResidence: number;  // 居所不匹配最大满意度损失上限（最大40）
  // 试炼派遣：当前正在执行的试炼ID（null=未派遣）
  onTrialId?: string | null;
  // 战斗属性
  attack: number;  // 攻击
  defense: number;  // 防御
  dodge: number;  // 闪避
  crit: number;  // 暴击率
  maxHp: number;  // 最大生命值
  // 装备槽（三槽）
  equippedArtifact?: ArtifactType | null;   // 法器
  equippedTalisman?: TalismanType | null;   // 符箓
  equippedBeast?: BeastType | null;         // 灵兽
  // 弟子背包：个人持有的丹药/法器/符箓/灵兽
  backpack?: DiscipleBackpackItem[];
  // 人物经历
  master: string | null;        // 师傅名称
  friends: string[];            // 好友名称列表
  daoPartner: string | null;    // 道侣名称（新增）
  rival: string | null;         // 宿敌名称（新增）
  apprenticeIds: string[];      // 弟子ID列表（由 master 字段关联，新增）
  tournamentHistory: DiscipleTournamentRecord[];  // 大比历史记录
  // 自然流失追踪：连续低满意度月数（用于叛逃判定，老存档自动填0）
  lowSatisfactionMonths?: number;
  // 弟子个性化
  personality?: Personality;        // 性格特质
  background?: BackgroundStory;     // 背景故事
  preferences?: DisciplePreference; // 喜好偏好
  // 藏经阁自动推演开关
  disableAutoDeduce?: boolean;      // true=不自动推演（默认false即允许自动推演，但新增弟子默认关）
}

export interface PromotionRules {
  // 弟子招收规则
  recruitment: {
    minRootBone: number;        // 根骨最低要求（0-100）
    minSpiritRhythm: number;     // 灵根最低要求（0-100）
    minConstitution: number;     // 体质最低要求（0-100）
    minDaoFate: number;         // 道心最低要求（0-100）
    exceptionalThreshold: number; // 破例招收阈值（任一属性超过此值可破例招收）
  };
  servantToOuter: {
    minContribution: number;
    minRootBone: number;
    enableExceptional: boolean;
    exceptionalThreshold: number;
  };
  outerToInner: {
    minRealm: Realm;
    minContribution: number;
    minSkill: number;
  };
  innerToCore: {
    minRealm: Realm;
    minContribution: number;
  };
  coreToElder: {
    minRealm: Realm;
    minContribution: number;
  };
}

export interface BreakthroughInfo {
  realm: Realm;
  baseSuccessRate: number;
  failureBonus: number;
  pillBonus: number;
  regressPercent: number;
}

export const BreakthroughData: Record<Realm, BreakthroughInfo> = {
  mortal: { realm: 'mortal', baseSuccessRate: 100, failureBonus: 0, pillBonus: 0, regressPercent: 0 },
  qi: { realm: 'qi', baseSuccessRate: 100, failureBonus: 0, pillBonus: 0, regressPercent: 0 },
  foundation: { realm: 'foundation', baseSuccessRate: 80, failureBonus: 5, pillBonus: 15, regressPercent: 5 },
  golden: { realm: 'golden', baseSuccessRate: 60, failureBonus: 8, pillBonus: 20, regressPercent: 5 },
  nascent: { realm: 'nascent', baseSuccessRate: 40, failureBonus: 10, pillBonus: 25, regressPercent: 8 },
  spirit: { realm: 'spirit', baseSuccessRate: 20, failureBonus: 12, pillBonus: 30, regressPercent: 8 },
};
