export type BuildingType =
  | 'mountain_gate'
  | 'lecture_hall'
  | 'servant_hall'
  | 'pill_hall'
  | 'sutra_hall'
  | 'artifact_hall'
  | 'secret_library'
  | 'array_hall'
  | 'spirit_beast_garden'
  | 'skyscraper_tower'
  | 'outer_residence'
  | 'inner_residence'
  | 'core_residence'
  | 'cave_mansion';

// 居所类建筑判定集合（单一来源，消除散落字面量）
// 不含 cave_mansion：用于"按居所升级公式计算"的场景（洞府 maxLevel=1，不走该分支）
export const RESIDENCE_TYPES: readonly BuildingType[] = ['outer_residence', 'inner_residence', 'core_residence'] as const;

// 含 cave_mansion：用于"是否为居所（不任命堂主/不分配工作）"的场景
export const RESIDENCE_TYPES_WITH_CAVE: readonly BuildingType[] = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'] as const;

export function isResidenceType(type: string): boolean {
  return (RESIDENCE_TYPES_WITH_CAVE as readonly string[]).includes(type);
}

export const BuildingTypeNames: Record<BuildingType, string> = {
  mountain_gate: '山门',
  lecture_hall: '讲经堂',
  servant_hall: '杂役堂',
  pill_hall: '丹堂',
  sutra_hall: '炼器堂',
  artifact_hall: '符堂',
  secret_library: '藏经阁',
  array_hall: '阵堂',
  spirit_beast_garden: '灵兽原',
  skyscraper_tower: '通天塔',
  outer_residence: '外门居所',
  inner_residence: '内门居所',
  core_residence: '核心居所',
  cave_mansion: '洞府',
};

export type BuildingStatus = 'locked' | 'active' | 'closed';

// 建筑类型分类
export type BuildingCategory = 'service' | 'production' | 'special';

export interface BuildingOutput {
  spiritStones?: number;
  contribution?: number;
  herbs?: number;       // 灵草（丹堂原料）
  iron?: number;        // 灵铁（炼器堂原料）
  paper?: number;       // 符纸（符堂原料）
  reputation?: number;
  pills?: number;       // 丹药产出
  artifacts?: number;   // 法器产出
  talismans?: number;   // 符箓产出
  beasts?: number;      // 灵兽产出（灵兽原专属）
}

export interface BuildingUpgradeCost {
  spiritStones: number;
  contribution?: number;
  reputation?: number;
}

export interface BuildingDiscipleEffect {
  type: 'contribution' | 'cultivation' | 'defense' | 'morale' | 'none';
  description: string;
  value?: string;
}

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  maxLevel: number;
  baseOutput: BuildingOutput;
  baseMaintenanceCost: number;
  upgradeCosts: BuildingUpgradeCost[];
  discipleCapacity: number;
  description: string;
  category: BuildingCategory;
  primaryOutput: keyof BuildingOutput;
  buildCost?: BuildingUpgradeCost;
  minDiscipleStatus?: 'servant' | 'outer' | 'inner' | 'core' | 'elder';
  monthlyContributionCost?: number;
  unlockRequirement?: {
    sectLevel?: string;
    reputation?: number;
    buildings?: { type: BuildingType; level: number }[];
  };
  discipleEffect?: BuildingDiscipleEffect;
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  level: number;
  maxLevel: number;
  status: BuildingStatus;
  baseOutput: BuildingOutput;
  baseMaintenanceCost: number;
  upgradeCosts: BuildingUpgradeCost[];
  elderBonus: number;
  discipleCapacity: number;
  assignedDisciples: string[];
  managerId: string | null;
  managerLocked?: boolean;  // 玩家手动指派的堂主：每月自动分配不再替换/移动，也不移出 assignedDisciples
  description: string;
  category: BuildingCategory;
  primaryOutput: keyof BuildingOutput;
  buildCost?: BuildingUpgradeCost;
  minDiscipleStatus?: 'servant' | 'outer' | 'inner' | 'core' | 'elder';
  monthlyContributionCost?: number;
  unlockRequirement?: {
    sectLevel?: string;
    reputation?: number;
    buildings?: { type: BuildingType; level: number }[];
  };
  discipleEffect?: BuildingDiscipleEffect;
  // 生产目标：玩家可调整工作建筑生产哪种成品
  // 丹堂→PillType，炼器堂→ArtifactType，符堂→TalismanType
  // 多槽位：1级1槽、2级2槽、3级3槽（最多3槽，建筑等级决定可同时生产的种类数）
  productionTargets?: ProductionTarget[];
  // 贡献度配置（玩家手动可调，undefined 时使用默认值计算）
  contributionSettings?: {
    // 每月每名弟子通过工作获得的贡献（正值，默认按建筑配置）
    monthlyGainPerDisciple?: number;
    // 每月每名弟子在该建筑消耗/扣除的贡献（如居所占用费、讲经堂听课费等）
    monthlyCostPerDisciple?: number;
  };
}

export interface ProductionTarget {
  pillType?: import('@/types/pill').PillType;
  artifactType?: import('@/types/artifact').ArtifactType;
  talismanType?: import('@/types/talisman').TalismanType;
}

// 建筑等级 → 可用生产槽数量（最多3）
export const MAX_PRODUCTION_SLOTS = 3;
export function getAvailableSlots(level: number): number {
  return Math.min(MAX_PRODUCTION_SLOTS, Math.max(0, level));
}
