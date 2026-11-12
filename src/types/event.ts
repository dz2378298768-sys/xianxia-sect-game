import type { Building, BuildingType } from '@/types/building';
import type { Disciple, DiscipleStatus, Realm } from '@/types/disciple';
import type { SectLevel } from '@/types/game';
import type { OtherSect } from '@/types/game';
import type { PillInventory, PillType } from '@/types/pill';
import type { ArtifactInventory, ArtifactType } from '@/types/artifact';
import type { TalismanInventory, TalismanType } from '@/types/talisman';
import type { BeastInventory } from '@/types/beast';
import type { BookConfig } from '@/data/buildings';

export type GameEventCategory = 'disciple' | 'sect' | 'world' | 'opportunity' | 'story';
export type GameEventRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export const EventCategoryNames: Record<GameEventCategory, string> = {
  disciple: '弟子',
  sect: '宗门',
  world: '天下',
  opportunity: '机遇',
  story: '剧情',
};

export const EventRarityNames: Record<GameEventRarity, string> = {
  common: '寻常',
  uncommon: '少见',
  rare: '罕见',
  legendary: '传说',
};

export const EventRarityWeights: Record<GameEventRarity, number> = {
  common: 100,
  uncommon: 45,
  rare: 15,
  legendary: 4,
};

export interface EventCondition {
  minYear?: number;
  minSectLevel?: SectLevel;
  minReputation?: number;
  minDisciples?: number;
  minSpiritStones?: number;
  maxSpiritStones?: number;
  minRealm?: Realm;                 // 至少 1 名达到该境界的弟子
  needsBuilding?: BuildingType;
  requiresElderCount?: number;
  requiresAlly?: boolean;
  requiresVassal?: boolean;
  requiresDemonicHostile?: boolean;
  minRealmProgress?: number;        // 至少 1 名弟子修为进度达到该值
  maxSpiritRootQuality?: number;    // 至少 1 名弟子灵根纯度低于该值
  maxSatisfaction?: number;         // 至少 1 名弟子满意度低于该值
  minPills?: number;                // 仓库至少拥有该数量丹药
  hasDiscipleCapacity?: boolean;    // 宗门弟子未达上限
  cooldownMonths?: number;          // 默认 12
  oncePerGame?: boolean;
}

export interface EventEffect {
  // 资源（会按宗门等级系数缩放）
  spiritStones?: number;
  herbs?: number;
  iron?: number;
  paper?: number;
  contribution?: number;
  // 不缩放
  reputation?: number;
  karma?: number;
  specialMaterial?: { name: string; amount: number };
  // 弟子效果：作用于目标弟子
  satisfaction?: number;
  realmProgress?: number;
  spiritRootQuality?: number;       // 目标弟子灵根纯度增减
  // 全体/群体效果
  allSatisfaction?: number;
  allRealmProgress?: number;
  allEldersSatisfaction?: number;
  randomDisciplesSatisfaction?: { count: number; amount: number };
  // 宗门外交：随机其他宗门好感
  favorability?: number;
  // 仓库物品
  addPill?: { type: PillType; qty: number };
  addArtifact?: { type: ArtifactType; qty: number };
  addTalisman?: { type: TalismanType; qty: number };
  addBeast?: { type: import('@/types/beast').BeastType; qty: number };
  loseRandomPill?: number;
  gainRandomPill?: number;
  unlockRecipe?: { kind: 'pill' | 'artifact' | 'talisman'; type: string };
  // 特殊行为
  removeDisciple?: boolean;
  addDisciple?: { talentBonus: number };
  learnRandomTechnique?: boolean;
  eventFlag?: string;
}

export interface EventGamble {
  chance: number;
  successEffects: EventEffect[];
  successText: string;
  failureEffects: EventEffect[];
  failureText: string;
}

export interface EventChoice {
  id: string;
  label: string;
  hint?: string;
  cost?: { spiritStones?: number; pill?: PillType };
  effects: EventEffect[];
  resultText: string;
  gamble?: EventGamble;
}

export type EventTargetMode = 'random' | 'highestRealm' | 'lowestSatisfaction' | 'randomOuter' | 'randomElder';

export interface GameEventConfig {
  id: string;
  title: string;
  category: GameEventCategory;
  rarity: GameEventRarity;
  weight?: number;
  conditions?: EventCondition;
  description: string;
  targetDisciple?: EventTargetMode;
  /** 默认选项：玩家超时未处理时自动执行（缺省取 choices[0]） */
  defaultChoiceId?: string;
  choices: EventChoice[];
}

export interface PendingEvent {
  eventId: string;
  triggeredAt: { year: number; month: number };
  targetDiscipleId?: string;
  expiresAt: number; // 绝对月份 year*12 + (month-1)
}

export interface EventHistoryEntry {
  eventId: string;
  title: string;
  choiceId: string;
  choiceLabel: string;
  year: number;
  month: number;
  resultText: string;
}

/** 事件引擎所需的最小状态视图（纯函数入参） */
export interface EventStateView {
  year: number;
  month: number;
  sectLevel: SectLevel;
  reputation: number;
  karma: number;
  spiritStones: number;
  herbInventory: number;
  ironInventory: number;
  paperInventory: number;
  specialMaterials: Record<string, number>;
  disciples: Disciple[];
  buildings: Building[];
  otherSects: OtherSect[];
  pillInventory: PillInventory[];
  artifactInventory: ArtifactInventory[];
  talismanInventory: TalismanInventory[];
  beastInventory: BeastInventory[];
  unlockedPillRecipes: PillType[];
  unlockedArtifactRecipes: ArtifactType[];
  unlockedTalismanRecipes: TalismanType[];
  libraryBooks: BookConfig[];
  pendingEvents: PendingEvent[];
  eventHistory: EventHistoryEntry[];
  eventCooldowns: Record<string, number>;
}

/** 事件结算产出的状态补丁 */
export interface EventPatch {
  spiritStones?: number;
  reputation?: number;
  karma?: number;
  herbInventory?: number;
  ironInventory?: number;
  paperInventory?: number;
  specialMaterials?: Record<string, number>;
  disciples?: Disciple[];
  buildings?: Building[];
  otherSects?: OtherSect[];
  pillInventory?: PillInventory[];
  artifactInventory?: ArtifactInventory[];
  talismanInventory?: TalismanInventory[];
  beastInventory?: BeastInventory[];
  unlockedPillRecipes?: PillType[];
  unlockedArtifactRecipes?: ArtifactType[];
  unlockedTalismanRecipes?: TalismanType[];
  removeDiscipleIds?: string[];
  addDiscipleRequest?: { talentBonus: number };
}

export interface EventResolution {
  patch: EventPatch;
  resultText: string;
  success?: boolean;
  flags?: string[];
}

export const EventRarityColors: Record<GameEventRarity, string> = {
  common: '#e8e2d0',
  uncommon: '#7dd87d',
  rare: '#c084fc',
  legendary: '#f0c96b',
};

/** 宗门等级资源缩放系数：草创 1.0，每升一级 +0.5 */
export function getLevelMultiplier(sectLevel: SectLevel): number {
  const order = ['founding', 'known', 'famous', 'dominant', 'eternal'];
  const idx = Math.max(0, order.indexOf(sectLevel));
  return 1 + idx * 0.5;
}

export function getAbsMonth(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function getTargetStatus(target: EventTargetMode | undefined): DiscipleStatus | undefined {
  if (target === 'randomOuter') return 'outer';
  if (target === 'randomElder') return 'elder';
  return undefined;
}
