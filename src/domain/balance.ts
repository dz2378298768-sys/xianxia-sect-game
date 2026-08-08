// 数值平衡引擎（纯函数）—— 用 TDD 重新设计，替换 gameLogic.ts 中混乱的数值公式。
//
// 设计原则：
//  1. 升级建筑（工人不变）时产出不应下降（核心不变量）。
//  2. 天赋乘数只反映工人质量，与建筑容量解耦。
//  3. 每名工人贡献固定份额产出，受当前容量上限封顶；扩容只允许加入更多工人，不稀释现有工人。
//  4. 空建筑不产出（无幽灵产出）。
import { BUILDING_CONFIGS } from '@/data/buildings';
import { MAINTENANCE_COST_TABLE } from '@/utils/gameLogic';
import { CONSTITUTIONS } from '@/data/constitutions';
import { calculateSpiritRootBonus, calculateLifespan } from '@/utils/calculations';
import { RealmOrder } from '@/types/disciple';
import type { OutputBreakdown } from '@/utils/gameLogic';
import type { Disciple, DiscipleStatus } from '@/types/disciple';

/** 建筑产出计算的输入（从 Building 实例映射而来，便于测试） */
export interface BuildingOutputInput {
  id: string;
  type: string;
  level: number;
  status: string;
  capacity: number; // 当前容量（随等级增长）
  managerId?: string | null;
  baseOutput: {
    spiritStones?: number;
    herbs?: number;
    iron?: number;
    paper?: number;
    reputation?: number;
    pills?: number;
    artifacts?: number;
    talismans?: number;
    beasts?: number;
  };
}

export interface BuildingOutputResult {
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
}

const ZERO_BREAKDOWN: OutputBreakdown = {
  levelBonus: 0,
  managerBonus: 0,
  talentBonus: 0,
  capacityRatio: 0,
  workerCount: 0,
  totalMultiplier: 0,
};

// 管理者身份加成
const MANAGER_STATUS_BONUS: Partial<Record<DiscipleStatus, number>> = {
  inner: 0.3,
  core: 0.5,
  elder: 0.8,
};

// 按建筑类型计算单名工人的天赋得分
function workerTalentScore(type: string, t: { rootBone: number; spiritRhythm: number; daoFate: number }): number {
  const { rootBone, spiritRhythm, daoFate } = t;
  switch (type) {
    case 'servant_hall':       return spiritRhythm * 0.8 + 20;
    case 'pill_hall':          return spiritRhythm * 1.5;
    case 'sutra_hall':         return spiritRhythm * 1.0 + rootBone * 0.6;
    case 'artifact_hall':      return spiritRhythm * 0.8 + daoFate * 0.7;
    case 'secret_library':     return (rootBone + spiritRhythm + daoFate) / 3 * 0.8 + 25;
    case 'array_hall':         return rootBone * 0.6 + spiritRhythm * 0.4 + 15;
    case 'spirit_beast_garden':return daoFate * 1.0 + rootBone * 0.3;
    case 'mountain_gate':      return daoFate * 0.5 + 10;
    case 'lecture_hall':       return spiritRhythm * 0.6 + rootBone * 0.4 + 15;
    default:                   return 30;
  }
}

/**
 * 重新设计的建筑产出公式：
 *
 *   totalMultiplier = levelMultiplier × managerBonus × qualityFactor × staffFactor
 *
 *   levelMultiplier = 1 + (level - 1) × 0.5
 *   qualityFactor   = (工人平均天赋得分) / 50        —— 只反映工人质量，与容量无关
 *   staffFactor     = min(工人数, 当前容量) / 设计容量  —— 每名工人贡献固定份额，扩容不稀释
 *
 * 设计容量取自 BUILDING_CONFIGS[type].discipleCapacity（L1 基准）。
 * 工人不含管理者；管理者提供身份加成但不计入工人产能。
 */
export function computeBuildingOutput(
  building: BuildingOutputInput,
  disciples: Disciple[],
): BuildingOutputResult {
  if (building.status !== 'active') {
    return { spiritStones: 0, herbs: 0, iron: 0, paper: 0, reputation: 0, pills: 0, artifacts: 0, talismans: 0, beasts: 0, breakdown: ZERO_BREAKDOWN };
  }

  const levelMultiplier = 1 + (building.level - 1) * 0.5
    // 杂役堂 Lv6+ 额外加成：使满级(Lv10)产出倍率 = 6.0 = 2× Lv5(3.0)；Lv1-5 保持不变
    + (building.type === 'servant_hall' && building.level > 5 ? (building.level - 5) * 0.1 : 0);

  // 管理者加成
  let managerName: string | undefined;
  let managerBonus = 1;
  if (building.managerId) {
    const manager = disciples.find(d => d.id === building.managerId);
    if (manager) {
      managerName = manager.name;
      managerBonus = 1 + (MANAGER_STATUS_BONUS[manager.status] || 0);
    }
  }

  // 工人 = 分配弟子中除去管理者
  const workers = disciples.filter(d => d.id !== building.managerId);

  // 设计容量：取 L1 基准；无容量建筑（护山大阵/通天塔）不依赖工人
  const designCapacity = BUILDING_CONFIGS[building.type as keyof typeof BUILDING_CONFIGS]?.discipleCapacity ?? 0;

  // 工人质量因子（与容量解耦）
  const totalTalentScore = workers.reduce(
    (sum, d) => sum + workerTalentScore(building.type, d.hiddenTalents),
    0,
  );
  const qualityFactor = workers.length > 0 ? totalTalentScore / workers.length / 50 : 0;

  // 在岗人数因子：每名工人贡献一份，受当前容量封顶，以设计容量归一
  const effectiveWorkers = Math.min(workers.length, building.capacity);
  const staffFactor = designCapacity > 0 ? effectiveWorkers / designCapacity : 0;

  const totalMultiplier = levelMultiplier * managerBonus * qualityFactor * staffFactor;

  const capacityRatio = building.capacity > 0
    ? Math.min(workers.length / building.capacity, 1) * 100
    : 0;

  const breakdown: OutputBreakdown = {
    levelBonus: (levelMultiplier - 1) * 100,
    managerBonus: (managerBonus - 1) * 100,
    managerName,
    talentBonus: (qualityFactor - 1) * 100,
    capacityRatio,
    workerCount: workers.length,
    totalMultiplier: totalMultiplier * 100,
  };

  const mul = (v: number | undefined) => Math.floor((v || 0) * totalMultiplier);

  return {
    spiritStones: mul(building.baseOutput.spiritStones),
    herbs: mul(building.baseOutput.herbs),
    iron: mul(building.baseOutput.iron),
    paper: mul(building.baseOutput.paper),
    reputation: (building.baseOutput.reputation || 0) > 0 ? mul(building.baseOutput.reputation) : 0,
    pills: mul(building.baseOutput.pills),
    artifacts: mul(building.baseOutput.artifacts),
    talismans: mul(building.baseOutput.talismans),
    beasts: mul(building.baseOutput.beasts),
    breakdown,
  };
}

/**
 * 建筑维护费（单一来源）。
 *
 * 直接查 MAINTENANCE_COST_TABLE，按等级取值；超出表范围按末两级差值线性外推。
 *
 * 替换旧实现的两处混乱：
 *  - 旧 calculateBuildingMaintenance 把 baseMaintenanceCost 再 ×(1+(level-1)*0.75)，造成双重计费；
 *  - 旧 upgradeBuilding 又把 baseMaintenanceCost 覆写为表值，使 level 信息被计入两次。
 *
 * 新实现：表即真相，无任何二次乘法。杂役堂各级恒为 10，丹堂 L2=55（而非 96）。
 */
export function computeMaintenance(type: string, level: number): number {
  const table = MAINTENANCE_COST_TABLE[type];
  if (!table || table.length === 0) return 0;
  if (level <= table.length) {
    return table[level - 1] || 0;
  }
  // 超过表范围：以末两级差值线性递增
  const last = table[table.length - 1];
  const prev = table.length >= 2 ? table[table.length - 2] : last;
  const step = Math.max(last - prev, 1);
  return last + step * (level - table.length);
}

// 各境界基础修炼速度（修为/月）—— 按普通天赋（根骨50/三灵根60品质/凡人体质）设计：
//   凡人 6 月/阶段，炼气 6 月/阶段，筑基 12 月/阶段，金丹 18 月/阶段，元婴 24 月/阶段
// 索引对应 RealmOrder: 0=mortal, 1=qi, 2=foundation, 3=golden, 4=nascent, 5=spirit
const REALM_BASE_CULTIVATION_SPEED: number[] = [5, 45, 110, 170, 260, 380];

/** 满意度惩罚下限：速度永远不会因低满意度变成负值或归零 */
export const SATISFACTION_FLOOR = 0.2;

/**
 * 重新计算弟子当前境界的修炼速度。
 *
 * 强化天赋差异（2026-08-04 调整）：
 *  - 根骨系数由线性 0.4~1.0 改为 0.25~1.3 的非线性曲线（根骨20仅25%，根骨80达130%）
 *  - 灵根加成 countBonus 翻倍、品质加成放大，进一步拉开灵根差距
 *  - 体质加成按稀有度阶梯放大（common±x1, uncommon×1.2, rare×1.5, epic×2, legendary×3）
 *
 * 公式：基础速度 × 根骨系数 × (1 + 灵根加成%) × (1 + 体质修炼加成%)
 */
export function recomputeCultivationSpeed(disciple: Disciple): number {
  const realmIndex = RealmOrder.indexOf(disciple.realm);
  const baseSpeed = REALM_BASE_CULTIVATION_SPEED[Math.min(Math.max(realmIndex, 0), REALM_BASE_CULTIVATION_SPEED.length - 1)];

  // 根骨：非线性强化差异
  // 低根骨（20→0.25，40→0.50，60→0.80，80→1.05，100→1.30）
  const rootBone = disciple.hiddenTalents.rootBone;
  const rootBoneMultiplier = 0.25 + Math.pow(rootBone / 100, 2.2) * 1.05;

  // 灵根加成（计算函数本身已在 calculations.ts 中强化：countBonus ×2, qualityBonus ×2）
  const spiritRootBonus = calculateSpiritRootBonus(disciple.hiddenTalents.spiritRoots);

  const constitution = CONSTITUTIONS.find(c => c.id === disciple.constitutionId);
  let constitutionBonus = constitution?.effects.cultivationBonus || 0;
  // 稀有度阶梯放大体质加成
  if (constitution) {
    const rarityMult: Record<string, number> = {
      common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3,
    };
    constitutionBonus = Math.round(constitutionBonus * (rarityMult[constitution.rarity] || 1));
  }

  const speed = baseSpeed * rootBoneMultiplier * (1 + spiritRootBonus / 100) * (1 + constitutionBonus / 100);
  return Math.floor(speed);
}

/**
 * 应用满意度惩罚到修炼速度。
 *
 * 修复 Bug B：旧公式 speed × (1 - (100 - satisfaction) × 0.02) 在 satisfaction < 50 时
 * 会让乘数变负，导致修炼速度为负、realmProgress 倒退。
 *
 * 新实现：乘数 clamp 到 [SATISFACTION_FLOOR, 1.0]，每点满意度低于 100 扣 2%，
 * 但最低保留 20% 效率，绝不出现负值或归零。
 */
export function applySatisfactionPenalty(speed: number, satisfaction: number): number {
  const rawMultiplier = 1 - (100 - satisfaction) * 0.02;
  const multiplier = Math.min(1, Math.max(SATISFACTION_FLOOR, rawMultiplier));
  return Math.floor(speed * multiplier);
}

/**
 * 按弟子当前境界重算寿命上限。
 *
 * 修复 Bug：旧实现突破后只更新 realm，maxAge 仍停留在初始境界的寿命，
 * 导致金丹弟子仍按炼气 80 岁老死。境界寿命表 REALM_BASE_LIFESPAN 随境界递增
 * （80/80/110/260/560/1060），突破后应按新境界重算。
 *
 * 公式与 createInitialDisciple 一致：境界寿命 + 体质加成。
 */
export function recomputeLifespan(disciple: Disciple): number {
  const realmIndex = RealmOrder.indexOf(disciple.realm);
  const constitution = CONSTITUTIONS.find(c => c.id === disciple.constitutionId);
  const baseLifespan = 60 + Math.floor(disciple.hiddenTalents.constitution * 0.4) + (constitution?.effects.lifespanBonus || 0);
  return calculateLifespan(baseLifespan, realmIndex);
}

// 按身份的月贡献收入（俸禄制：收入-支出=基础净值）
const STATUS_CONTRIBUTION_INCOME: Partial<Record<DiscipleStatus, number>> = {
  servant: 0, outer: 20, inner: 40, core: 80, elder: 100,
};
const STATUS_CONTRIBUTION_EXPENSE: Partial<Record<DiscipleStatus, number>> = {
  servant: 0, outer: 10, inner: 25, core: 50, elder: 80,
};

/** 各生产建筑的贡献加成基础值（正=获得，负=消耗） */
export const BUILDING_CONTRIBUTION_BONUS: Record<string, number> = {
  mountain_gate: 5,        // 山门驻守
  servant_hall: 5,         // 杂役堂基础
  lecture_hall: -5,        // 讲经堂：听讲消耗贡献
  pill_hall: 8,            // 丹堂
  sutra_hall: 8,           // 炼器堂
  artifact_hall: 8,        // 符堂
  array_hall: 7,           // 阵堂
  spirit_beast_garden: 7,  // 灵兽原
  secret_library: 0,       // 藏经阁：无额外贡献（推演功法在 nextMonth 中单独处理）
};

/** 按建筑类型，弟子主属性对贡献的额外加成（鼓励按天赋选堂口） */
function buildingTalentContribution(type: string, t: { rootBone: number; spiritRhythm: number; daoFate: number }): number {
  const { rootBone, spiritRhythm, daoFate } = t;
  switch (type) {
    case 'servant_hall':        return Math.floor(spiritRhythm / 20);
    case 'pill_hall':           return Math.floor(spiritRhythm / 20);
    case 'sutra_hall':          return Math.floor(rootBone / 25);
    case 'artifact_hall':       return Math.floor(daoFate / 25);
    case 'array_hall':          return Math.floor((rootBone + spiritRhythm) / 40);
    case 'spirit_beast_garden': return Math.floor(daoFate / 25);
    case 'mountain_gate':       return Math.floor(daoFate / 30);
    case 'lecture_hall':        return Math.floor(spiritRhythm / 30);
    default:                    return 0;
  }
}

/**
 * 计算弟子每月贡献点净收入。
 *
 * 修复旧实现只有山门/杂役堂给 buildingBonus、其余生产堂口一律 0 的问题：
 *  outer 在生产堂口仅赚基础 +10，远低于杂役堂 +17，玩家误以为"进入反扣"。
 *
 * 新实现：所有生产建筑都有正贡献加成，且加成与该堂主属性挂钩，
 * 鼓励弟子按天赋进入对应堂口（既赚贡献又为宗门生产物资）。
 */
export function computeMonthlyContribution(
  disciple: Disciple,
  building: { type: string; status: string } | null,
): number {
  const income = STATUS_CONTRIBUTION_INCOME[disciple.status] || 0;
  const expense = STATUS_CONTRIBUTION_EXPENSE[disciple.status] || 0;
  const base = income - expense;

  let buildingBonus = 0;
  if (building && building.status === 'active') {
    buildingBonus = BUILDING_CONTRIBUTION_BONUS[building.type] || 0;
    buildingBonus += buildingTalentContribution(building.type, disciple.hiddenTalents);
  }

  // 贡献可以为负（如讲经堂听讲消耗），但不低于0
  const total = base + buildingBonus;
  return Math.max(0, total);
}
