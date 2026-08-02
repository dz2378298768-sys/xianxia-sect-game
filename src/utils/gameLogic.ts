import type { Disciple, HiddenTalents, Realm, DiscipleStatus, PromotionRules } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames, BreakthroughData } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { RESIDENCE_TYPES_WITH_CAVE } from '@/types/building';
import { BUILDING_CONFIGS, INITIAL_BUILDING_TYPES, getRootBoneEffectiveness } from '@/data/buildings';
import type { BookConfig, BookTier } from '@/data/buildings';
import { getRandomConstitution } from '@/data/constitutions';
import { generateId, generateDiscipleName, randomInt, randomFloat, clamp } from '@/utils/random';
import { generateTalentDisplay, calculateLifespan, calculateCultivationSpeed, generateSpiritRoots, calculateSpiritRootBonus } from '@/utils/calculations';
import { canLearnBook } from '@/utils/bookGenerator';
import type { MonthlyReport, GameDate, Notification } from '@/types/game';
import { computeBuildingOutput, computeMaintenance, recomputeCultivationSpeed, computeMonthlyContribution } from '@/domain/balance';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';

export function autoAssignBuilding(disciple: Disciple, buildings: Building[]): { buildingId: string | null; newBuildings: Building[] } {
  const statusOrder: DiscipleStatus[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];
  const discipleIndex = statusOrder.indexOf(disciple.status as DiscipleStatus);
  const realmIndex = RealmOrder.indexOf(disciple.realm);

  const availableBuildings = buildings.filter(b => {
    if (b.status !== 'active') return false;
    if (b.discipleCapacity <= 0) return false;
    if (b.assignedDisciples.length >= b.discipleCapacity) return false;

    // 跳过居所类建筑（居所由专门的函数分配）
    if (RESIDENCE_TYPES_WITH_CAVE.includes(b.type)) return false;

    // 跳过藏经阁（学习场所，弟子通过 learnBook 主动学习，不参与自动工作分配）
    if (b.type === 'secret_library') return false;

    // 检查准入条件
    if (b.minDiscipleStatus) {
      const buildingMinIndex = statusOrder.indexOf(b.minDiscipleStatus);
      if (discipleIndex < buildingMinIndex) return false;
    }

    return true;
  });

  if (availableBuildings.length === 0) {
    return { buildingId: null, newBuildings: buildings };
  }

  // 生产工作堂集合：弟子应优先填入这些堂口为宗门生产物资，
  // 而非堆在山门(防御驻守)或讲经堂(听讲)等非生产场所。
  const WORK_HALL_TYPES = new Set([
    'servant_hall', 'pill_hall', 'sutra_hall', 'artifact_hall', 'array_hall', 'spirit_beast_garden',
  ]);

  // 按建筑类型计算单名弟子的天赋匹配度（越高越适合在该堂工作）
  const talentScoreFor = (type: string): number => {
    const { rootBone, spiritRhythm, daoFate } = disciple.hiddenTalents;
    switch (type) {
      case 'servant_hall':        return spiritRhythm * 0.8 + 20;
      case 'pill_hall':           return spiritRhythm * 1.5;
      case 'sutra_hall':          return spiritRhythm * 1.0 + rootBone * 0.6;
      case 'artifact_hall':       return spiritRhythm * 0.8 + daoFate * 0.7;
      case 'array_hall':          return rootBone * 0.6 + spiritRhythm * 0.4 + 15;
      case 'spirit_beast_garden': return daoFate * 1.0 + rootBone * 0.3;
      case 'mountain_gate':       return daoFate * 0.5 + 10;
      case 'lecture_hall':        return spiritRhythm * 0.6 + rootBone * 0.4 + 15;
      default:                    return 30;
    }
  };

  const buildingScores: { building: Building; score: number }[] = availableBuildings.map(building => {
    // 1. 天赋匹配度（主因素）：弟子应进入其天赋最能发挥的堂口
    const talent = talentScoreFor(building.type);

    // 2. 生产优先级：生产工作堂 ×1.3，非生产(山门/讲经) ×1.0，避免弟子堆在非生产场所
    const productionPriority = WORK_HALL_TYPES.has(building.type) ? 1.3 : 1.0;

    // 3. 空缺系数：越空的堂越优先(0.5 + 空闲比例)，鼓励弟子分散到多座生产堂，
    //    而非全部堆进同一座得分最高的堂。空堂=1.5，半满=1.0，将满=0.6。
    const freeRatio = building.discipleCapacity > 0
      ? (building.discipleCapacity - building.assignedDisciples.length) / building.discipleCapacity
      : 0;
    const fillFactor = 0.5 + freeRatio;

    // 4. 修为加成：高境界弟子权重略高（经验更丰富）
    const realmBonus = 1 + realmIndex * 0.15;

    // 贡献优先级：弟子贡献越低，越倾向去高贡献产出的工作建筑赚贡献
    // 高贡献建筑（如丹堂/炼器堂）monthlyContributionCost 高，意味着贡献产出高
    const buildingContributionYield = building.monthlyContributionCost ?? 0;
    const discipleNeedContribution = disciple.contributionPoints < 100 ? 1 : 0; // 贡献不足100视为需要赚贡献
    const contributionPriority = 1 + discipleNeedContribution * (buildingContributionYield / 20);

    const score = talent * productionPriority * fillFactor * realmBonus * contributionPriority;
    return { building, score };
  });

  buildingScores.sort((a, b) => b.score - a.score);

  const bestBuilding = buildingScores[0].building;

  const newBuildings = buildings.map(b =>
    b.id === bestBuilding.id
      ? { ...b, assignedDisciples: [...b.assignedDisciples, disciple.id] }
      : b
  );

  return { buildingId: bestBuilding.id, newBuildings };
}

const RESIDENCE_STATUS_MAP: Record<string, BuildingType> = {
  elder: 'core_residence',
  core: 'core_residence',
  inner: 'inner_residence',
  outer: 'outer_residence',
};

export function autoAssignResidence(disciple: Disciple, buildings: Building[]): { buildingId: string | null; newBuildings: Building[] } {
  // 杂役弟子不分配居所
  if (disciple.status === 'servant' || disciple.status === 'mortal') {
    return { buildingId: null, newBuildings: buildings };
  }

  // 局部有序数组：core→inner→outer（降序），用于"从弟子身份对应居所往低级居所回退查找空位"
  // 注意：导出常量 RESIDENCE_TYPES 顺序为 outer→inner→core（升序），语义不同，故此处保留局部有序数组
  const RESIDENCE_ORDERED: BuildingType[] = ['core_residence', 'inner_residence', 'outer_residence'];

  const targetType = RESIDENCE_STATUS_MAP[disciple.status];
  if (!targetType) {
    return { buildingId: null, newBuildings: buildings };
  }
  const targetIndex = RESIDENCE_ORDERED.indexOf(targetType);

  // 只从居所类建筑中移除弟子，不影响工作建筑
  let buildingsWithoutDisciple = buildings.map(b => ({
    ...b,
    assignedDisciples: RESIDENCE_TYPES_WITH_CAVE.includes(b.type)
      ? b.assignedDisciples.filter(id => id !== disciple.id)
      : b.assignedDisciples,
  }));

  for (let i = targetIndex; i < RESIDENCE_ORDERED.length; i++) {
    const type = RESIDENCE_ORDERED[i];
    let available = buildingsWithoutDisciple.find(b =>
      b.type === type &&
      b.status === 'active' &&
      b.assignedDisciples.length < b.discipleCapacity
    );

    if (!available && i === targetIndex) {
      const closedResidence = buildingsWithoutDisciple.find(b =>
        b.type === type && b.status === 'closed'
      );
      if (closedResidence) {
        buildingsWithoutDisciple = buildingsWithoutDisciple.map(b =>
          b.id === closedResidence.id ? { ...b, status: 'active' } : b
        );
        available = buildingsWithoutDisciple.find(b => b.id === closedResidence.id);
      }
    }

    if (available) {
      const newBuildings = buildingsWithoutDisciple.map(b =>
        b.id === available.id
          ? { ...b, assignedDisciples: [...b.assignedDisciples, disciple.id] }
          : b
      );
      return { buildingId: available.id, newBuildings };
    }
  }

  return { buildingId: null, newBuildings: buildingsWithoutDisciple };
}

/**
 * 每月自动任命堂主：为每座工作堂口选出堂内身份最高的弟子担任堂主。
 *
 * 任命优先级：身份(elder>core>inner>outer>servant>mortal) > 境界 > 贡献点。
 * 每月重算：高身份弟子加入后自动顶替原堂主，原堂主卸任。
 * 一名弟子至多管理一座堂；居所/藏经阁不任命堂主。
 *
 * 玩家无需手动分配堂主。
 */
export function autoAssignManagers(
  disciples: Disciple[],
  buildings: Building[],
): { disciples: Disciple[]; buildings: Building[] } {
  const RESIDENCE_TYPES_SET = new Set<string>(RESIDENCE_TYPES_WITH_CAVE);
  const SKIP_TYPES = new Set(['secret_library']); // 学习场所不任命堂主

  const statusRank: Record<DiscipleStatus, number> = {
    mortal: 0, servant: 1, outer: 2, inner: 3, core: 4, elder: 5,
  };

  // 堂主任命规则：必须金丹期（golden）及以上
  const goldenIndex = RealmOrder.indexOf('golden');

  // 每月重算：先清空所有弟子的 managingBuilding，再逐堂重新任命
  let newDisciples = disciples.map(d => ({ ...d, managingBuilding: null as string | null }));
  const managedDiscipleIds = new Set<string>();

  const newBuildings = buildings.map(b => {
    if (b.status !== 'active') return { ...b, managerId: null };
    if (b.discipleCapacity <= 0) return { ...b, managerId: null };
    if (RESIDENCE_TYPES_SET.has(b.type)) return { ...b, managerId: null };
    if (SKIP_TYPES.has(b.type)) return { ...b, managerId: null };

    // 候选 = 当前在堂内 + 修为金丹期及以上的弟子
    const candidates = newDisciples.filter(d =>
      b.assignedDisciples.includes(d.id) &&
      RealmOrder.indexOf(d.realm) >= goldenIndex,
    );
    if (candidates.length === 0) return { ...b, managerId: null };

    // 排序：身份 > 境界 > 贡献点
    candidates.sort((a, c) => {
      const sr = (statusRank[c.status] || 0) - (statusRank[a.status] || 0);
      if (sr !== 0) return sr;
      const rr = RealmOrder.indexOf(c.realm) - RealmOrder.indexOf(a.realm);
      if (rr !== 0) return rr;
      return (c.contributionPoints || 0) - (a.contributionPoints || 0);
    });

    // 一名弟子至多管理一座堂：优先选尚未管理他堂的候选
    const chosen = candidates.find(c => !managedDiscipleIds.has(c.id));
    if (!chosen) return { ...b, managerId: null };

    managedDiscipleIds.add(chosen.id);
    newDisciples = newDisciples.map(d =>
      d.id === chosen.id ? { ...d, managingBuilding: b.id } : d
    );

    return { ...b, managerId: chosen.id };
  });

  return { disciples: newDisciples, buildings: newBuildings };
}

/**
 * 每月重新分配：为没有工作的弟子分配建筑，为居所不匹配的弟子重新分配居所
 * 同时处理新入门弟子和晋升后弟子未分配的问题
 */
export function monthlyReassign(
  disciples: Disciple[],
  buildings: Building[],
): { disciples: Disciple[]; buildings: Building[] } {
  let currentBuildings = buildings.map(b => ({ ...b, assignedDisciples: [...b.assignedDisciples] }));
  let currentDisciples = disciples.map(d => ({ ...d }));

  const RESIDENCE_TYPES_SET = new Set<string>(RESIDENCE_TYPES_WITH_CAVE);

  for (const disciple of currentDisciples) {
    // 跳过凡人和长老
    if (disciple.status === 'mortal' || disciple.status === 'elder') continue;

    // 1. 检查工作建筑：是否已分配、建筑是否存在、建筑是否活跃、是否满员
    const workBuilding = currentBuildings.find(b => b.assignedDisciples.includes(disciple.id) && !RESIDENCE_TYPES_SET.has(b.type));
    const hasValidWork = workBuilding && workBuilding.status === 'active';

    if (!hasValidWork) {
      // 从无效工作建筑中移除
      if (workBuilding) {
        currentBuildings = currentBuildings.map(b =>
          b.id === workBuilding.id
            ? { ...b, assignedDisciples: b.assignedDisciples.filter(id => id !== disciple.id) }
            : b
        );
      }
      // 尝试重新分配工作
      const result = autoAssignBuilding(disciple, currentBuildings);
      if (result.buildingId) {
        currentBuildings = result.newBuildings;
        disciple.assignedBuilding = result.buildingId;
      } else {
        disciple.assignedBuilding = null;
      }
    }

    // 2. 检查居所：杂役弟子不需要居所，跳过
    if (disciple.status === 'servant') continue;

    const currentResidence = currentBuildings.find(b =>
      RESIDENCE_TYPES_SET.has(b.type) && b.assignedDisciples.includes(disciple.id)
    );
    const requiredResidenceType: Record<string, string> = {
      outer: 'outer_residence',
      inner: 'inner_residence',
      core: 'core_residence',
    };
    const requiredType = requiredResidenceType[disciple.status];
    if (!requiredType) continue;
    const residenceOrder = ['outer_residence', 'inner_residence', 'core_residence'];
    const requiredIdx = residenceOrder.indexOf(requiredType);
    const actualIdx = currentResidence ? residenceOrder.indexOf(currentResidence.type) : -1;

    // 居所不匹配或没有居所，尝试重新分配
    if (actualIdx < requiredIdx) {
      const result = autoAssignResidence(disciple, currentBuildings);
      currentBuildings = result.newBuildings;
    }
  }

  return { disciples: currentDisciples, buildings: currentBuildings };
}

export function getResidenceUpgradeCost(building: Building): { spiritStones: number; contribution: number; reputation: number } | null {
  const config = BUILDING_CONFIGS[building.type];
  if (!config) return null;

  // 预定义内的等级直接查配置表
  if (config.upgradeCosts && config.upgradeCosts.length > 0 && building.level <= config.upgradeCosts.length) {
    const cost = config.upgradeCosts[building.level - 1];
    if (cost) {
      return {
        spiritStones: cost.spiritStones,
        contribution: cost.contribution || 0,
        reputation: 0,
      };
    }
  }

  // 超过预定义等级后使用公式递增
  const level = building.level;
  const spiritStones = Math.round(200 * Math.pow(level, 1.6));
  const contribution = Math.round(100 * Math.pow(level, 1.5));
  return { spiritStones, contribution, reputation: 0 };
}

// 居所容量公式：每级10人（Lv1=10, Lv2=20, Lv3=30...）无上限
export function getResidenceCapacityByLevel(_type: string, level: number): number {
  return level * 10;
}

// 建筑维护费按等级递增表
export const MAINTENANCE_COST_TABLE: Record<string, number[]> = {
  mountain_gate: [15, 30, 60],
  lecture_hall: [10, 25, 50],
  servant_hall: [10, 10, 10, 10],
  outer_residence: [10, 20, 40],
  inner_residence: [15, 30, 60],
  core_residence: [20, 40, 80],
  secret_library: [30, 60, 120, 200],
  pill_hall: [25, 55, 110],
  sutra_hall: [30, 65, 130],
  artifact_hall: [20, 45, 90],
  array_hall: [20, 45, 90],
  spirit_beast_garden: [40, 85, 170],
  cave_mansion: [20],
  guardian_array: [1000],
  skyscraper_tower: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export function getMaintenanceCostByLevel(type: string, level: number): number {
  const table = MAINTENANCE_COST_TABLE[type];
  if (!table) return 0;
  if (level <= table.length) {
    return table[level - 1] || 0;
  }
  // 超过表范围：以末两级差值线性递增
  const last = table[table.length - 1];
  const prev = table.length >= 2 ? table[table.length - 2] : last;
  const step = Math.max(last - prev, 1);
  return last + step * (level - table.length);
}

export function getResidenceLevelForStatus(status: DiscipleStatus): number {
  const map: Record<DiscipleStatus, number> = {
    mortal: 0,
    servant: 1,
    outer: 2,
    inner: 3,
    core: 4,
    elder: 5,
  };
  return map[status] || 0;
}

export function createInitialDisciple(status: DiscipleStatus = 'servant', realm: Realm = 'mortal'): Disciple {
  const spiritRoots = generateSpiritRoots();
  const constitution = getRandomConstitution();
  
  const hiddenTalents: HiddenTalents = {
    rootBone: randomInt(20, 80),
    spiritRhythm: randomInt(20, 80),
    constitution: randomInt(20, 80),
    daoFate: randomInt(20, 80),
    spiritRoots,
  };
  
  const talentDisplay = generateTalentDisplay(hiddenTalents);
  const realmIndex = RealmOrder.indexOf(realm);
  const baseLifespan = 60 + Math.floor(hiddenTalents.constitution * 0.4) + (constitution.effects.lifespanBonus || 0);
  const maxAge = calculateLifespan(baseLifespan, realmIndex);

  const disciple: Disciple = {
    id: generateId(),
    name: generateDiscipleName(),
    age: status === 'mortal' ? randomInt(12, 18) : randomInt(16, 30),
    maxAge,
    status,
    realm,
    realmProgress: realm === 'mortal' ? getRealmBreakthroughRequired('mortal') : randomInt(0, Math.floor(getRealmBreakthroughRequired(realm) * 0.5)),
    cultivationSpeed: 0, // 由 recomputeCultivationSpeed 按当前境界/根骨/灵根/体质重算
    hiddenTalents,
    talentDisplay,
    contributionPoints: randomInt(0, 30),
    assignedBuilding: status === 'servant' ? 'servant_hall' : null,
    managingBuilding: null,
    joinDate: { year: 1, month: 1 },
    breakthroughAttempts: 0,
    breakthroughBonus: 0,
    isBreakingThrough: false,
    isAttendingLecture: false,
    isLecturing: false,
    isLearningSecret: false,
    learnedSecrets: [],
    learnedTechnique: null,
    learnedBattles: [],
    learningBook: null,
    buffs: [],
    avatarSeed: randomInt(1, 1000),
    constitutionId: constitution.id,
    // 满意度系统 - 初始100%
    satisfaction: 100,
    maxSatisfactionLossWork: 0,
    maxSatisfactionLossResidence: 0,
    // 战斗属性 - 基础值根据根骨、体质和境界计算
    attack: Math.floor(10 + hiddenTalents.rootBone * 0.5 + realmIndex * 20 + (constitution.effects.attackBonus || 0)),
    defense: Math.floor(5 + hiddenTalents.constitution * 0.3 + realmIndex * 15 + (constitution.effects.defenseBonus || 0)),
    dodge: Math.floor(2 + hiddenTalents.daoFate * 0.1 + realmIndex * 2 + (constitution.effects.dodgeBonus || 0)),
    crit: Math.floor(2 + hiddenTalents.spiritRhythm * 0.05 + realmIndex * 1 + (constitution.effects.critBonus || 0)),
    maxHp: Math.floor(100 + hiddenTalents.constitution * 5 + realmIndex * 50 + (constitution.effects.hpBonus || 0)),
    // 人物经历
    master: null,
    friends: [],
    tournamentHistory: [],
  };

  // 凡人基础速度由 0 改为 30（在引擎内），使其能累积修为突破到炼气。
  disciple.cultivationSpeed = recomputeCultivationSpeed(disciple);
  return disciple;
}

export function createInitialBuildings(): Building[] {
  const buildings: Building[] = [];
  
  INITIAL_BUILDING_TYPES.forEach((type, index) => {
    const config = BUILDING_CONFIGS[type];
    buildings.push({
      id: `${type}_${index}`,
      type,
      name: config.name,
      level: 1,
      maxLevel: config.maxLevel,
      status: 'active',
      baseOutput: { ...config.baseOutput },
      baseMaintenanceCost: config.baseMaintenanceCost,
      upgradeCosts: config.upgradeCosts,
      elderBonus: 0,
      discipleCapacity: config.discipleCapacity,
      assignedDisciples: [],
      managerId: null,
      description: config.description,
      category: config.category,
      primaryOutput: config.primaryOutput,
      buildCost: config.buildCost,
      minDiscipleStatus: config.minDiscipleStatus,
      monthlyContributionCost: config.monthlyContributionCost,
      unlockRequirement: config.unlockRequirement,
    });
  });

  // 初始藏经阁
  const libraryConfig = BUILDING_CONFIGS['secret_library'];
  buildings.push({
    id: 'secret_library_0',
    type: 'secret_library',
    name: '藏经阁',
    level: 1,
    maxLevel: libraryConfig.maxLevel,
    status: 'active',
    baseOutput: { ...libraryConfig.baseOutput },
    baseMaintenanceCost: libraryConfig.baseMaintenanceCost,
    upgradeCosts: libraryConfig.upgradeCosts,
    elderBonus: 0,
    discipleCapacity: libraryConfig.discipleCapacity,
    assignedDisciples: [],
    managerId: null,
    description: libraryConfig.description,
    category: libraryConfig.category,
    primaryOutput: libraryConfig.primaryOutput,
    buildCost: libraryConfig.buildCost,
    minDiscipleStatus: libraryConfig.minDiscipleStatus,
    monthlyContributionCost: libraryConfig.monthlyContributionCost,
    unlockRequirement: libraryConfig.unlockRequirement,
  });
  
  // 初始1个外门居所（默认关闭，避免灵石消耗）
  const outerResConfig = BUILDING_CONFIGS['outer_residence'];
  buildings.push({
    id: 'outer_residence_0',
    type: 'outer_residence',
    name: '外门居所',
    level: 1,
    maxLevel: outerResConfig.maxLevel,
    status: 'closed',
    baseOutput: { ...outerResConfig.baseOutput },
    baseMaintenanceCost: outerResConfig.baseMaintenanceCost,
    upgradeCosts: outerResConfig.upgradeCosts,
    elderBonus: 0,
    discipleCapacity: getResidenceCapacityByLevel('outer_residence', 1),
    assignedDisciples: [],
    managerId: null,
    description: outerResConfig.description,
    category: outerResConfig.category,
    primaryOutput: outerResConfig.primaryOutput,
    buildCost: outerResConfig.buildCost,
    minDiscipleStatus: outerResConfig.minDiscipleStatus,
    monthlyContributionCost: outerResConfig.monthlyContributionCost,
    unlockRequirement: outerResConfig.unlockRequirement,
  });
  
  return buildings;
}

export function getDefaultPromotionRules(): PromotionRules {
  return {
    recruitment: {
      minRootBone: 60,        // 默认根骨要求
      minSpiritRhythm: 60,    // 默认灵根要求
      minConstitution: 60,     // 默认体质要求
      minDaoFate: 60,         // 默认道心要求
      exceptionalThreshold: 80, // 破例招收阈值（任一属性达标即可）
    },
    servantToOuter: {
      minContribution: 50,
      minRootBone: 40,
      enableExceptional: false,  // 关闭破格录取
      exceptionalThreshold: 80,
    },
    outerToInner: {
      minRealm: 'foundation',
      minContribution: 100,
      minSkill: 30,
    },
    innerToCore: {
      minRealm: 'golden',
      minContribution: 500,
      requireElderRecommendation: true,
    },
    coreToElder: {
      minRealm: 'nascent',
      minContribution: 1000,
    },
  };
}

export function calculateBuildingMaintenance(building: Building): number {
  // 委托给数值引擎（单一来源：按建筑类型+等级查表，消除旧实现的双重计费）。
  return computeMaintenance(building.type, building.level);
}

export interface OutputBreakdown {
  levelBonus: number;
  managerBonus: number;
  managerName?: string;
  talentBonus: number;
  capacityRatio: number;
  workerCount: number;
  totalMultiplier: number;
}

export function calculateBuildingOutput(building: Building, disciples: Disciple[]): {
  spiritStones: number;
  herbs: number;
  iron: number;
  paper: number;
  reputation: number;
  pills: number;
  artifacts: number;
  talismans: number;
  beasts: number;
  breakdown: OutputBreakdown;
} {
  // 委托给数值引擎。新公式修复了"升级即降产"：
  //  天赋乘数按工人数量归一（不再按建筑容量），扩容不稀释现有工人；
  //  每名工人贡献固定份额，受当前容量封顶。
  return computeBuildingOutput(
    {
      id: building.id,
      type: building.type,
      level: building.level,
      status: building.status,
      capacity: building.discipleCapacity,
      managerId: building.managerId,
      baseOutput: building.baseOutput,
    },
    disciples,
  );
}

// 各境界突破所需累计修为
// 拉大境界差距：抑制"3 年到金丹"。新表下根骨50凡人弟子约需 5.5 年到金丹。
export const REALM_BREAKTHROUGH_REQUIRED: Record<string, number> = {
  mortal: 100,      // 凡人→炼气
  qi: 1200,         // 炼气→筑基（旧 500）
  foundation: 5000,  // 筑基→金丹（旧 2000）
  golden: 18000,     // 金丹→元婴（旧 8000）
  nascent: 60000,    // 元婴→化神（旧 25000）
  spirit: 999999,    // 化神（已满级）
};

export function getRealmBreakthroughRequired(realm: Realm): number {
  return REALM_BREAKTHROUGH_REQUIRED[realm] || 100;
}

export function canAttemptBreakthrough(disciple: Disciple): boolean {
  const required = getRealmBreakthroughRequired(disciple.realm);
  if (disciple.realmProgress < required) return false;
  if (disciple.realm === 'spirit') return false;
  if (disciple.isBreakingThrough) return false;
  return true;
}

export function attemptBreakthrough(disciple: Disciple, hasPill: boolean = false): {
  success: boolean;
  newRealm: Realm;
  newProgress: number;
} {
  const currentIndex = RealmOrder.indexOf(disciple.realm);
  const nextRealm = RealmOrder[currentIndex + 1];
  
  if (!nextRealm) {
    return { success: false, newRealm: disciple.realm, newProgress: disciple.realmProgress };
  }
  
  const breakthroughData = BreakthroughData[nextRealm];
  let successRate = breakthroughData.baseSuccessRate;
  successRate += disciple.breakthroughAttempts * breakthroughData.failureBonus;
  successRate += disciple.breakthroughBonus;
  
  if (hasPill) {
    successRate += breakthroughData.pillBonus;
  }
  
  const talentBonus = (disciple.hiddenTalents.rootBone - 50) * 0.2;
  successRate += talentBonus;
  
  successRate = clamp(successRate, 5, 95);
  
  const roll = randomFloat(0, 100);
  const success = roll < successRate;
  
  if (success) {
    return {
      success: true,
      newRealm: nextRealm,
      newProgress: 0,
    };
  } else {
    // 失败后进度回退
    const regressAmount = disciple.realmProgress * (breakthroughData.regressPercent / 100);
    const newProgress = Math.max(0, disciple.realmProgress - regressAmount);
    return {
      success: false,
      newRealm: disciple.realm,
      newProgress,
    };
  }
}

export function processMonthlyCultivation(disciple: Disciple): Disciple {
  if (disciple.status === 'mortal' || disciple.status === 'servant') {
    if (disciple.realm === 'mortal') {
      const required = getRealmBreakthroughRequired('mortal');
      return {
        ...disciple,
        realmProgress: Math.min(required, disciple.realmProgress + disciple.cultivationSpeed * 2),
      };
    }
    return disciple;
  }
  
  if (disciple.isBreakingThrough) {
    return disciple;
  }
  
  let speed = disciple.cultivationSpeed;
  for (const buff of disciple.buffs) {
    if (buff.type === 'cultivation') {
      speed *= (1 + buff.value / 100);
    }
  }
  
  // 功法修炼速度加成（按熟练度计算，根骨决定发挥比例）
  if (disciple.learnedTechnique) {
    const rootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents.rootBone);
    const techniqueBonus = disciple.learnedTechnique.isLearned 
      ? disciple.learnedTechnique.cultivationBonus * rootBoneEff
      : disciple.learnedTechnique.cultivationBonus * (disciple.learnedTechnique.progress / 100) * rootBoneEff;
    speed *= (1 + techniqueBonus / 100);
  }
  
  // 旧秘籍系统加成
  for (const secret of disciple.learnedSecrets) {
    speed *= (1 + secret.cultivationBonus / 100);
  }
  
  const required = getRealmBreakthroughRequired(disciple.realm);
  const newProgress = Math.min(required, disciple.realmProgress + speed);
  
  return {
    ...disciple,
    realmProgress: newProgress,
  };
}

export function processMonthlyWork(disciple: Disciple, building: Building | null): number {
  // 委托给数值引擎：所有生产建筑都给正贡献加成，杜绝"进入反扣"。
  return computeMonthlyContribution(disciple, building);
}

// 讲经堂修炼加成表（按建筑等级）
const LECTURE_HALL_BONUS_BY_LEVEL: Record<number, number> = {
  1: 20,   // Lv1: +20%
  2: 35,   // Lv2: +35%
  3: 55,   // Lv3: +55%
};

export function calculateLectureBonus(lecturer: Disciple | null, lectureHallLevel: number = 1): number {
  const baseBonus = LECTURE_HALL_BONUS_BY_LEVEL[lectureHallLevel] || 20;

  if (!lecturer) {
    return baseBonus;
  }

  // 讲师修炼效率越高，额外加成越高
  const lecturerBonus = Math.floor(lecturer.cultivationSpeed * 0.1);
  return baseBonus + lecturerBonus;
}

export function generateMonthlyReport(
  date: GameDate,
  spiritStoneIncome: { source: string; amount: number }[],
  spiritStoneExpense: { source: string; amount: number }[],
  breakthroughs: { discipleId: string; discipleName: string; from: string; to: string; success: boolean }[],
  promotions: { discipleId: string; discipleName: string; from: string; to: string }[],
  newDisciples: { id: string; name: string; status: string }[],
  reputationChange: number
): MonthlyReport {
  return {
    date,
    spiritStoneIncome,
    spiritStoneExpense,
    breakthroughs,
    promotions,
    newDisciples,
    events: [],
    reputationChange,
  };
}

export function processMonthlyLearning(disciple: Disciple): Disciple {
  if (!disciple.learningBook) return disciple;
  
  const book = disciple.learningBook;
  const progressPerMonth = 100 / book.totalDays;
  const newProgress = Math.min(100, book.progress + progressPerMonth);
  
  const updatedBook = {
    ...book,
    progress: newProgress,
    isLearned: newProgress >= 100,
  };
  
  // 如果学完了，放入对应的已学列表
  if (newProgress >= 100) {
    if (updatedBook.type === 'technique') {
      return {
        ...disciple,
        learningBook: null,
        learnedTechnique: updatedBook,
        isLearningSecret: false,
      };
    } else {
      return {
        ...disciple,
        learningBook: null,
        learnedBattles: [...disciple.learnedBattles, updatedBook],
        isLearningSecret: false,
      };
    }
  }
  
  // 还在学习中，更新当前学习的书的进度
  return {
    ...disciple,
    learningBook: updatedBook,
  };
}

// 境界 → 藏经阁功法层级映射（凡人/化神无对应层级，不自动学）
const REALM_TO_BOOK_TIER: Record<Realm, BookTier | null> = {
  mortal: null,
  qi: 'qi',
  foundation: 'foundation',
  golden: 'golden',
  nascent: 'nascent',
  spirit: null,
};

/**
 * 突破后自动去藏经阁学习更优秀的功法（功法可被替换）。
 *
 * 行为：
 *  - 已在学习中则不打断。
 *  - 取弟子新境界对应层级的功法(type=technique)，按灵根可学筛选，
 *    选 cultivationBonus 最高者（同值取 combatBonus 高者）。
 *  - 若当前已学功法不弱于候选，则不替换。
 *  - 否则开始学习新功法（免费，不扣贡献）；学成时由 processMonthlyLearning
 *    自动替换 learnedTechnique，实现"每次突破挑选更优秀功法"。
 *
 * 注：手动 learnBook 仍受"已有功法不可再学"限制；本函数专用于突破后自动升级功法。
 */
export function autoLearnTechniqueOnBreakthrough(
  disciple: Disciple,
  libraryBooks: BookConfig[],
): Disciple {
  // 已在学习中，不打断当前学习
  if (disciple.learningBook) return disciple;

  const targetTier = REALM_TO_BOOK_TIER[disciple.realm];
  if (!targetTier) return disciple;

  // 候选 = 藏经阁中该层级的功法，且弟子灵根可学
  const candidates = libraryBooks.filter(b =>
    b.type === 'technique' &&
    b.tier === targetTier &&
    canLearnBook(disciple.hiddenTalents.spiritRoots || [], b),
  );
  if (candidates.length === 0) return disciple;

  // 挑选更优秀：cultivationBonus 高者优先，同值取 combatBonus 高者
  candidates.sort((a, b) => b.cultivationBonus - a.cultivationBonus || b.combatBonus - a.combatBonus);
  const best = candidates[0];

  // 当前已学功法不弱于候选 → 无需替换
  const current = disciple.learnedTechnique;
  if (current && current.cultivationBonus >= best.cultivationBonus) {
    return disciple;
  }

  // 开始学习新功法（学成时由 processMonthlyLearning 替换旧功法）
  return {
    ...disciple,
    learningBook: {
      bookId: best.id,
      name: best.name,
      type: 'technique',
      tier: best.tier,
      attribute: best.attribute,
      cultivationBonus: best.cultivationBonus,
      combatBonus: best.combatBonus,
      progress: 0,
      totalDays: best.learnDays,
      isLearned: false,
    },
    isLearningSecret: true,
  };
}

export function createNotification(
  type: Notification['type'],
  title: string,
  content: string,
  date: GameDate
): Notification {
  return {
    id: generateId(),
    type,
    title,
    content,
    read: false,
    timestamp: date,
  };
}

// 境界战力基础值
const RealmCombatPower: Record<string, number> = {
  mortal: 10,
  qi: 50,
  foundation: 200,
  golden: 800,
  nascent: 3200,
  spirit: 12800,
};

// 计算弟子战力
export function calculateDiscipleCombatPower(disciple: Disciple): number {
  // 境界基础战力
  const realmPower = RealmCombatPower[disciple.realm] || 10;
  
  // 天赋加成：根骨决定防御、灵韵决定攻击、道缘决定暴击
  const talentBonus = 
    disciple.hiddenTalents.rootBone * 0.5 +
    disciple.hiddenTalents.spiritRhythm * 0.3 +
    disciple.hiddenTalents.daoFate * 0.2;
  
  // 身份加成
  const statusBonus: Record<string, number> = {
    mortal: 0,
    servant: 0.5,
    outer: 1.0,
    inner: 1.5,
    core: 2.0,
    elder: 3.0,
  };
  const statusMultiplier = 1 + (statusBonus[disciple.status] || 0);
  
  // 计算最终战力
  const basePower = realmPower * (1 + talentBonus / 100) * statusMultiplier;
  
  // 秘籍加成（旧系统）
  let secretBonus = 0;
  for (const secret of disciple.learnedSecrets) {
    secretBonus += secret.cultivationBonus * 0.5;
  }
  
  // 功法战力加成（按熟练度计算，根骨决定发挥比例）
  const combatRootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents.rootBone);
  let techniqueBonus = 0;
  if (disciple.learnedTechnique && disciple.learnedTechnique.isLearned) {
    techniqueBonus += disciple.learnedTechnique.combatBonus * combatRootBoneEff;
  } else if (disciple.learnedTechnique) {
    // 未学成，按进度获得部分加成
    techniqueBonus += disciple.learnedTechnique.combatBonus * (disciple.learnedTechnique.progress / 100) * combatRootBoneEff;
  }
  
  // 战技战力加成（按熟练度计算，根骨决定发挥比例）
  let battleBonus = 0;
  for (const battle of disciple.learnedBattles) {
    if (battle.isLearned) {
      battleBonus += battle.combatBonus * combatRootBoneEff;
    } else {
      battleBonus += battle.combatBonus * (battle.progress / 100) * combatRootBoneEff;
    }
  }
  
  const totalBookBonus = secretBonus + techniqueBonus + battleBonus;

  // 装备加成
  let equipmentBonus = 0;
  if (disciple.equippedArtifact) {
    const cfg = ARTIFACT_CONFIGS[disciple.equippedArtifact];
    if (cfg?.combatPowerBonus) equipmentBonus += cfg.combatPowerBonus;
  }
  if (disciple.equippedTalisman) {
    const cfg = TALISMAN_CONFIGS[disciple.equippedTalisman];
    // 符箓 defenseBonus 转化为战力：每 1 防御 = 0.5 战力
    if (cfg?.defenseBonus) equipmentBonus += cfg.defenseBonus * 0.5;
  }
  if (disciple.equippedBeast) {
    const cfg = BEAST_CONFIGS[disciple.equippedBeast];
    if (cfg?.combatPowerBonus) equipmentBonus += cfg.combatPowerBonus;
  }

  return Math.floor(basePower * (1 + totalBookBonus / 100) + equipmentBonus);
}

// 计算宗门总战力
export function calculateSectCombatPower(disciples: Disciple[], buildings: Building[]): {
  totalPower: number;
  mountainGateBonus: boolean;
  basePower: number;
  bonuses: { name: string; multiplier: number; description: string }[];
} {
  const basePower = disciples.reduce((sum, d) => sum + calculateDiscipleCombatPower(d), 0);
  
  const bonuses: { name: string; multiplier: number; description: string }[] = [];
  
  // 山门满员加成
  const mountainGate = buildings.find(b => b.type === 'mountain_gate' && b.status === 'active');
  const isMountainGateFull = mountainGate && 
    mountainGate.assignedDisciples.length >= mountainGate.discipleCapacity;
  
  if (isMountainGateFull) {
    bonuses.push({
      name: '山门满员',
      multiplier: 0.1,
      description: '山门弟子满员，宗门战力+10%',
    });
  }
  
  // 护山大阵加成
  const guardianArray = buildings.find(b => b.type === 'guardian_array' && b.status === 'active');
  if (guardianArray) {
    const levelBonus = (guardianArray.level - 1) * 0.05;
    bonuses.push({
      name: '护山大阵',
      multiplier: levelBonus,
      description: `护山大阵Lv.${guardianArray.level}，战力+${(levelBonus * 100).toFixed(0)}%`,
    });
  }
  
  // 通天塔加成
  const skyscraperTower = buildings.find(b => b.type === 'skyscraper_tower' && b.status === 'active');
  if (skyscraperTower) {
    const levelBonus = skyscraperTower.level * 0.02;
    bonuses.push({
      name: '通天塔',
      multiplier: levelBonus,
      description: `通天塔Lv.${skyscraperTower.level}，战力+${(levelBonus * 100).toFixed(0)}%`,
    });
  }
  
  // 计算总加成
  const totalBonus = bonuses.reduce((sum, b) => sum + b.multiplier, 0);
  const totalPower = Math.floor(basePower * (1 + totalBonus));
  
  return {
    totalPower,
    mountainGateBonus: isMountainGateFull || false,
    basePower,
    bonuses,
  };
}
