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
  | 'guardian_array'
  | 'skyscraper_tower'
  | 'servant_residence'
  | 'outer_residence'
  | 'inner_residence'
  | 'core_residence'
  | 'cave_mansion';

export const BuildingTypeNames: Record<BuildingType, string> = {
  mountain_gate: '山门',
  lecture_hall: '讲经堂',
  servant_hall: '杂役堂',
  pill_hall: '丹堂',
  sutra_hall: '炼器堂',
  artifact_hall: '符堂',
  secret_library: '藏经阁',
  array_hall: '阵堂',
  spirit_beast_garden: '灵兽园',
  guardian_array: '护山大阵',
  skyscraper_tower: '通天塔',
  servant_residence: '杂役居所',
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
  herbs?: number;
  reputation?: number;
  pills?: number;      // 丹药产出
  artifacts?: number;   // 法器产出
  talismans?: number;  // 符箓产出
}

export interface BuildingUpgradeCost {
  spiritStones: number;
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
