import type { Disciple, HiddenTalents, Realm, DiscipleStatus, PromotionRules } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames, BreakthroughData } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { BUILDING_CONFIGS, INITIAL_BUILDING_TYPES } from '@/data/buildings';
import { getRandomConstitution } from '@/data/constitutions';
import { generateId, generateDiscipleName, randomInt, randomFloat, clamp } from '@/utils/random';
import { generateTalentDisplay, calculateLifespan, calculateCultivationSpeed, generateSpiritRoots, calculateSpiritRootBonus } from '@/utils/calculations';
import type { MonthlyReport, GameDate, Notification } from '@/types/game';

export function autoAssignBuilding(disciple: Disciple, buildings: Building[]): { buildingId: string | null; newBuildings: Building[] } {
  const statusOrder: DiscipleStatus[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];
  const discipleIndex = statusOrder.indexOf(disciple.status as DiscipleStatus);
  
  const availableBuildings = buildings.filter(b => {
    if (b.status !== 'active') return false;
    if (b.discipleCapacity <= 0) return false;
    if (b.assignedDisciples.length >= b.discipleCapacity) return false;
    
    // 跳过居所类建筑（居所由专门的函数分配）
    if (b.type === 'servant_residence' || b.type === 'outer_residence' || 
        b.type === 'inner_residence' || b.type === 'core_residence' ||
        b.type === 'cave_mansion') return false;
    
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
  
  const buildingScores: { building: Building; score: number }[] = availableBuildings.map(building => {
    let score = 0;
    const { rootBone, spiritRhythm, daoFate } = disciple.hiddenTalents;
    
    // 根据建筑类型和弟子天赋计算匹配度分数
    switch (building.type) {
      case 'servant_hall':
        // 杂艺堂：灵韵影响种植劳作
        score = spiritRhythm * 0.8 + 20; // 基础分20
        break;
      case 'pill_hall':
        // 丹堂：灵韵是炼丹核心天赋，最高权重
        score = spiritRhythm * 1.5;
        break;
      case 'sutra_hall':
        // 炼器堂：灵韵+根骨
        score = spiritRhythm * 1.0 + rootBone * 0.6;
        break;
      case 'artifact_hall':
        // 符堂：灵韵+道缘
        score = spiritRhythm * 0.8 + daoFate * 0.7;
        break;
      case 'secret_library':
        // 藏经阁：均衡全面
        score = (rootBone + spiritRhythm + daoFate) / 3 * 0.8 + 20;
        break;
      case 'array_hall':
        // 阵堂：根骨+灵韵
        score = rootBone * 0.6 + spiritRhythm * 0.4 + 15;
        break;
      case 'spirit_beast_garden':
        // 灵兽园：道缘影响驯养
        score = daoFate * 1.0 + rootBone * 0.3;
        break;
      default:
        score = 30;
    }
    
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

const RESIDENCE_TYPES = ['core_residence', 'inner_residence', 'outer_residence', 'servant_residence'] as const;
const RESIDENCE_STATUS_MAP: Record<string, typeof RESIDENCE_TYPES[number]> = {
  elder: 'core_residence',
  core: 'core_residence',
  inner: 'inner_residence',
  outer: 'outer_residence',
  servant: 'servant_residence',
};

export function autoAssignResidence(disciple: Disciple, buildings: Building[]): { buildingId: string | null; newBuildings: Building[] } {
  const targetType = RESIDENCE_STATUS_MAP[disciple.status] || 'servant_residence';
  const targetIndex = RESIDENCE_TYPES.indexOf(targetType);
  
  for (let i = targetIndex; i < RESIDENCE_TYPES.length; i++) {
    const type = RESIDENCE_TYPES[i];
    const available = buildings.find(b => 
      b.type === type && 
      b.status === 'active' && 
      b.assignedDisciples.length < b.discipleCapacity
    );
    
    if (available) {
      const newBuildings = buildings.map(b => 
        b.id === available.id
          ? { ...b, assignedDisciples: [...b.assignedDisciples, disciple.id] }
          : b
      );
      return { buildingId: available.id, newBuildings };
    }
  }
  
  return { buildingId: null, newBuildings: buildings };
}

export function getResidenceUpgradeCost(building: Building): { spiritStones: number; reputation: number } | null {
  const baseCosts: Record<string, { spiritStones: number }> = {
    servant_residence: { spiritStones: 100 },
    outer_residence: { spiritStones: 200 },
    inner_residence: { spiritStones: 500 },
    core_residence: { spiritStones: 1000 },
  };

  const base = baseCosts[building.type];
  if (!base) return null;

  const multiplier = Math.pow(1.5, building.level - 1);
  return {
    spiritStones: Math.floor(base.spiritStones * multiplier),
    reputation: 0,
  };
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
  const spiritRootBonus = calculateSpiritRootBonus(spiritRoots);
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
  const baseCultivationSpeed = calculateCultivationSpeed(hiddenTalents.rootBone, realmIndex);
  const cultivationSpeed = baseCultivationSpeed * (1 + spiritRootBonus / 100) * (1 + (constitution.effects.cultivationBonus || 0) / 100);
  
  return {
    id: generateId(),
    name: generateDiscipleName(),
    age: status === 'mortal' ? randomInt(12, 18) : randomInt(16, 30),
    maxAge,
    status,
    realm,
    realmProgress: realm === 'mortal' ? 100 : randomInt(0, 50),
    cultivationSpeed,
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
  };
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
  
  // 初始1个杂役居所
  for (let i = 0; i < 1; i++) {
    const config = BUILDING_CONFIGS['servant_residence'];
    buildings.push({
      id: `servant_residence_${i}`,
      type: 'servant_residence',
      name: '杂役居所',
      level: 1,
      maxLevel: config.maxLevel,
      status: 'active',
      baseOutput: { ...config.baseOutput },
      baseMaintenanceCost: config.baseMaintenanceCost,
      upgradeCosts: [],
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
  }
  
  // 初始1个外门居所（默认关闭，避免灵石消耗）
  for (let i = 0; i < 1; i++) {
    const config = BUILDING_CONFIGS['outer_residence'];
    buildings.push({
      id: `outer_residence_${i}`,
      type: 'outer_residence',
      name: '外门居所',
      level: 1,
      maxLevel: config.maxLevel,
      status: 'closed',
      baseOutput: { ...config.baseOutput },
      baseMaintenanceCost: config.baseMaintenanceCost,
      upgradeCosts: [],
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
  }
  
  return buildings;
}

export function getDefaultPromotionRules(): PromotionRules {
  return {
    recruitment: {
      minRootBone: 40,        // 默认根骨要求
      minSpiritRhythm: 40,    // 默认灵根要求
      minConstitution: 40,     // 默认体质要求
      minDaoFate: 40,         // 默认道心要求
      exceptionalThreshold: 60, // 破例招收阈值
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
  const levelMultiplier = 1 + (building.level - 1) * 0.75;
  return Math.floor(building.baseMaintenanceCost * levelMultiplier);
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
  reputation: number;
  pills: number;
  artifacts: number;
  talismans: number;
  breakdown: OutputBreakdown;
} {
  const zeroBreakdown: OutputBreakdown = {
    levelBonus: 0,
    managerBonus: 0,
    talentBonus: 0,
    capacityRatio: 0,
    workerCount: 0,
    totalMultiplier: 0,
  };
  
  if (building.status !== 'active') {
    return { spiritStones: 0, herbs: 0, reputation: 0, pills: 0, artifacts: 0, talismans: 0, breakdown: zeroBreakdown };
  }
  
  const levelMultiplier = 1 + (building.level - 1) * 0.5;
  
  let managerName: string | undefined;
  const managerBonus = (() => {
    if (!building.managerId) return 1;
    const manager = disciples.find(d => d.id === building.managerId);
    if (!manager) return 1;
    managerName = manager.name;
    const statusBonus: Record<string, number> = {
      inner: 0.3,
      core: 0.5,
      elder: 0.8,
    };
    return 1 + (statusBonus[manager.status] || 0);
  })();
  
  const workerDisciples = disciples.filter(d => d.id !== building.managerId);
  
  let talentMultiplier = 0;
  if (workerDisciples.length > 0) {
    const totalTalentScore = workerDisciples.reduce((sum, d) => {
      const { rootBone, spiritRhythm, daoFate } = d.hiddenTalents;
      let score = 0;
      switch (building.type) {
        case 'servant_hall':
          score = spiritRhythm * 0.8 + 20;
          break;
        case 'pill_hall':
          score = spiritRhythm * 1.5;
          break;
        case 'sutra_hall':
          score = spiritRhythm * 1.0 + rootBone * 0.6;
          break;
        case 'artifact_hall':
          score = spiritRhythm * 0.8 + daoFate * 0.7;
          break;
        case 'secret_library':
          score = (rootBone + spiritRhythm + daoFate) / 3 * 0.8 + 25;
          break;
        case 'array_hall':
          score = rootBone * 0.6 + spiritRhythm * 0.4 + 15;
          break;
        case 'spirit_beast_garden':
          score = daoFate * 1.0 + rootBone * 0.3;
          break;
        case 'mountain_gate':
          score = daoFate * 0.5 + 10;
          break;
        case 'lecture_hall':
          score = spiritRhythm * 0.6 + rootBone * 0.4 + 15;
          break;
        default:
          score = 30;
      }
      return sum + score;
    }, 0);
    
    const baseTalentScore = 50 * building.discipleCapacity;
    talentMultiplier = totalTalentScore / baseTalentScore;
  }
  
  const capacityRatio = building.discipleCapacity > 0
    ? Math.min(workerDisciples.length / building.discipleCapacity, 1)
    : 1;
  
  // 确保即使没有弟子也至少有基础产出（0.3的基础倍率）
  const effectiveTalentMultiplier = talentMultiplier > 0 ? talentMultiplier : 0.3;
  
  const totalMultiplier = levelMultiplier * (0.3 + capacityRatio * 0.7) * effectiveTalentMultiplier * managerBonus;
  
  const breakdown: OutputBreakdown = {
    levelBonus: (levelMultiplier - 1) * 100,
    managerBonus: (managerBonus - 1) * 100,
    managerName,
    talentBonus: (talentMultiplier - 1) * 100,
    capacityRatio: capacityRatio * 100,
    workerCount: workerDisciples.length,
    totalMultiplier: totalMultiplier * 100,
  };
  
  return {
    spiritStones: Math.floor((building.baseOutput.spiritStones || 0) * totalMultiplier),
    herbs: Math.floor((building.baseOutput.herbs || 0) * totalMultiplier),
    // 只有 primaryOutput 为 reputation 的建筑才产出声望
    reputation: (building.baseOutput.reputation || 0) > 0
      ? Math.floor((building.baseOutput.reputation || 0) * totalMultiplier)
      : 0,
    pills: Math.floor((building.baseOutput.pills || 0) * totalMultiplier),
    artifacts: Math.floor((building.baseOutput.artifacts || 0) * totalMultiplier),
    talismans: Math.floor((building.baseOutput.talismans || 0) * totalMultiplier),
    breakdown,
  };
}

export function canAttemptBreakthrough(disciple: Disciple): boolean {
  if (disciple.realmProgress < 100) return false;
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
    const regressPercent = disciple.realm === 'nascent' || disciple.realm === 'spirit' 
      ? breakthroughData.regressPercent 
      : 5;
    const newProgress = Math.max(0, 100 - regressPercent * 10);
    return {
      success: false,
      newRealm: disciple.realm,
      newProgress,
    };
  }
}

export function processMonthlyCultivation(disciple: Disciple): Disciple {
  if (disciple.status === 'mortal' || disciple.status === 'servant') {
    if (disciple.realm === 'mortal' && disciple.realmProgress < 100) {
      return {
        ...disciple,
        realmProgress: Math.min(100, disciple.realmProgress + disciple.cultivationSpeed * 2),
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
  
  // 功法修炼速度加成（按熟练度计算）
  if (disciple.learnedTechnique) {
    const techniqueBonus = disciple.learnedTechnique.isLearned 
      ? disciple.learnedTechnique.cultivationBonus 
      : disciple.learnedTechnique.cultivationBonus * (disciple.learnedTechnique.progress / 100);
    speed *= (1 + techniqueBonus / 100);
  }
  
  // 旧秘籍系统加成
  for (const secret of disciple.learnedSecrets) {
    speed *= (1 + secret.cultivationBonus / 100);
  }
  
  const newProgress = Math.min(100, disciple.realmProgress + speed);
  
  return {
    ...disciple,
    realmProgress: newProgress,
  };
}

export function processMonthlyWork(disciple: Disciple, building: Building | null): number {
  if (!building || building.status !== 'active') return 0;

  const { rootBone, spiritRhythm, daoFate } = disciple.hiddenTalents;

  // 山门：固定5贡献点
  if (building.type === 'mountain_gate') {
    return 5;
  }

  // 杂役堂：固定10贡献点
  if (building.type === 'servant_hall') {
    return 10;
  }

  // 根据身份的基础贡献
  let baseContribution = 5;
  if (disciple.status === 'outer') baseContribution = 8;
  if (disciple.status === 'inner') baseContribution = 15;
  if (disciple.status === 'core') baseContribution = 25;

  // 根据建筑类型计算天赋加成
  let talentBonus = 0;
  switch (building.type) {
    case 'pill_hall':
      // 丹堂：灵韵是炼丹的核心天赋
      talentBonus = spiritRhythm * 1.2;
      break;
    case 'sutra_hall':
      // 炼器堂：灵韵+根骨共同影响
      talentBonus = spiritRhythm * 0.8 + rootBone * 0.4;
      break;
    case 'artifact_hall':
      // 符堂：灵韵+道缘
      talentBonus = spiritRhythm * 0.7 + daoFate * 0.5;
      break;
    case 'secret_library':
      // 藏经阁：全面均衡
      talentBonus = (rootBone + spiritRhythm + daoFate) / 3 * 0.7;
      break;
    case 'array_hall':
      // 阵堂：根骨+灵韵
      talentBonus = rootBone * 0.6 + spiritRhythm * 0.4;
      break;
    case 'spirit_beast_garden':
      // 灵兽园：道缘影响驯养
      talentBonus = daoFate * 0.8 + rootBone * 0.2;
      break;
    default:
      talentBonus = spiritRhythm * 0.5;
  }

  // 计算最终贡献 = 基础 * (1 + 天赋加成%)
  // 天赋80时约为1.64倍，天赋50时约为1.4倍，天赋20时约为1.16倍
  const multiplier = 1 + talentBonus / 100;

  return Math.floor(baseContribution * multiplier);
}

// 计算讲经堂修炼加成（基于讲师修炼效率）
export function calculateLectureBonus(lecturer: Disciple | null): number {
  const { LECTURE_CONFIG } = require('@/data/buildings');

  if (!lecturer) {
    return LECTURE_CONFIG.baseLectureBonus; // 无讲师时只有基础加成
  }

  // 讲师修炼效率越高，加成越高
  // 基础10%，讲师每点修炼速度增加0.5%加成
  const lecturerBonus = Math.floor(lecturer.cultivationSpeed * 0.5);
  return LECTURE_CONFIG.baseLectureBonus + lecturerBonus;
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
  
  // 功法战力加成（按熟练度计算）
  let techniqueBonus = 0;
  if (disciple.learnedTechnique && disciple.learnedTechnique.isLearned) {
    techniqueBonus += disciple.learnedTechnique.combatBonus;
  } else if (disciple.learnedTechnique) {
    // 未学成，按进度获得部分加成
    techniqueBonus += disciple.learnedTechnique.combatBonus * (disciple.learnedTechnique.progress / 100);
  }
  
  // 战技战力加成（按熟练度计算）
  let battleBonus = 0;
  for (const battle of disciple.learnedBattles) {
    if (battle.isLearned) {
      battleBonus += battle.combatBonus;
    } else {
      battleBonus += battle.combatBonus * (battle.progress / 100);
    }
  }
  
  const totalBookBonus = secretBonus + techniqueBonus + battleBonus;
  
  return Math.floor(basePower * (1 + totalBookBonus / 100));
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
