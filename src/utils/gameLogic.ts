import type { Disciple, HiddenTalents, Realm, DiscipleStatus, PromotionRules, RealmStage, DeducingBook, DiscipleBackpackItem, Personality, BackgroundStory, DisciplePreference } from '@/types/disciple';
import type { SectSchool } from '@/types/game';
import { SCHOOL_TALENT_TREES } from '@/types/game';
import type { CombatPowerBreakdown, SectCombatSummary } from '@/types/combat';
import { RealmOrder, RealmStageOrder, DiscipleStatusNames, BreakthroughData, RealmNames, PersonalityNames, PersonalityDescriptions, PERSONALITY_CULTIVATION_MULT, PERSONALITY_SATISFACTION_MOD, PERSONALITY_DEFECTION_MULT, PERSONALITY_FRIEND_MULT, BackgroundStoryNames, BackgroundStoryDescriptions, BACKGROUND_EFFECTS } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { RESIDENCE_TYPES_WITH_CAVE } from '@/types/building';
import { BUILDING_CONFIGS, INITIAL_BUILDING_TYPES, getRootBoneEffectiveness, BookTierNames, BOOK_TIER_BONUSES } from '@/data/buildings';
import type { BookConfig, BookTier, BookType, BookAttribute } from '@/data/buildings';
import { getRandomConstitution } from '@/data/constitutions';
import { generateId, generateDiscipleName, randomInt, randomFloat, clamp } from '@/utils/random';
import { generateTalentDisplay, calculateLifespan, calculateCultivationSpeed, generateSpiritRoots, calculateSpiritRootBonus } from '@/utils/calculations';
import { canLearnBook, generateRandomBook } from '@/utils/bookGenerator';
import type { MonthlyReport, GameDate, Notification, SectHistoryEntry, SectHistoryType, BuildingEvent, ChoiceEvent, ChainEvent, PendingChainEvent, CalamityEvent } from '@/types/game';
import { computeBuildingOutput, computeMaintenance, recomputeCultivationSpeed, computeMonthlyContribution } from '@/domain/balance';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';
import { PILL_CONFIGS } from '@/data/pills';
import type { PillInventory, PillType } from '@/types/pill';
import type { ArtifactInventory, ArtifactType } from '@/types/artifact';
import type { TalismanInventory, TalismanType } from '@/types/talisman';
import type { BeastInventory, BeastType } from '@/types/beast';
import { SPECIAL_MATERIALS, BASIC_MATERIALS } from '@/data/specialMaterials';
import type { CraftingTask, CraftingResult, ItemQuality, Recipe } from '@/types/crafting';
import { QualityMultipliers, QualityDifficulty } from '@/types/crafting';
import { RECIPE_MAP } from '@/data/recipes';

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
  elder: 'cave_mansion',
  core: 'core_residence',
  inner: 'inner_residence',
  outer: 'outer_residence',
};

export function autoAssignResidence(disciple: Disciple, buildings: Building[]): { buildingId: string | null; newBuildings: Building[] } {
  // 杂役弟子不分配居所
  if (disciple.status === 'servant' || disciple.status === 'mortal') {
    return { buildingId: null, newBuildings: buildings };
  }

  // 局部有序数组：cave_mansion→core→inner→outer（降序），用于"从弟子身份对应居所往低级居所回退查找空位"
  // 注意：导出常量 RESIDENCE_TYPES 顺序为 outer→inner→core（升序），语义不同，故此处保留局部有序数组
  const RESIDENCE_ORDERED: BuildingType[] = ['cave_mansion', 'core_residence', 'inner_residence', 'outer_residence'];

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

  // 先保留玩家手动锁定的 manager（managerLocked 为 true）：
  //  - managerId 与 managingBuilding 关系直接沿用，不再被覆盖。
  //  - 若堂主不在 assignedDisciples 中，加入 assignedDisciples（确保归属此堂生产）。
  let newBuildings = buildings.map(b => ({ ...b, assignedDisciples: [...b.assignedDisciples] }));
  let newDisciples = disciples.map(d => ({ ...d }));
  const managedDiscipleIds = new Set<string>();

  // ========== 先处理锁定的堂主 ==========
  for (const b of newBuildings) {
    if (b.managerLocked && b.managerId) {
      const m = newDisciples.find(d => d.id === b.managerId);
      if (!m || RealmOrder.indexOf(m.realm) < goldenIndex) {
        // 修为已不足，解除锁定并降级为自动
        b.managerLocked = false;
      } else {
        // 登记该弟子已担任此堂主：managingBuilding 设为此建筑，加入 assignedDisciples，移出他堂
        if (!b.assignedDisciples.includes(b.managerId)) {
          if (b.assignedDisciples.length < b.discipleCapacity) {
            b.assignedDisciples.push(b.managerId);
          } else {
            // 容量不足：仍锁定，但无法将堂主加入 assignedDisciples——跳过以免覆盖他堂
          }
        }
        // 从其他堂 assignedDisciples 移出（防止他同时出现在两堂），但保留居所
        for (const other of newBuildings) {
          if (other.id === b.id) continue;
          if (RESIDENCE_TYPES_SET.has(other.type)) continue;
          if (other.assignedDisciples.includes(b.managerId)) {
            other.assignedDisciples = other.assignedDisciples.filter(id => id !== b.managerId);
          }
        }
        m.managingBuilding = b.id;
        managedDiscipleIds.add(b.managerId);
      }
    }
  }

  // ========== 再处理未锁定的堂主 ==========
  newBuildings = newBuildings.map(b => {
    if (b.status !== 'active') return { ...b, managerId: b.managerLocked ? b.managerId : null };
    if (b.discipleCapacity <= 0) return { ...b, managerId: b.managerLocked ? b.managerId : null };
    if (RESIDENCE_TYPES_SET.has(b.type)) return { ...b, managerId: b.managerLocked ? b.managerId : null };
    if (SKIP_TYPES.has(b.type)) return { ...b, managerId: b.managerLocked ? b.managerId : null };
    if (b.managerLocked) return b; // 已在上面处理

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

  // 对非当前管理的弟子，清空 managingBuilding（保留锁定堂的）
  newDisciples = newDisciples.map(d => {
    if (d.managingBuilding && !managedDiscipleIds.has(d.id)) {
      return { ...d, managingBuilding: null };
    }
    return d;
  });

  return { disciples: newDisciples, buildings: newBuildings };
}

/**
 * 每月重新分配：为没有工作的弟子分配建筑，为居所不匹配的弟子重新分配居所
 * 同时处理新入门弟子和晋升后弟子未分配的问题。
 *
 * 玩家分配保护：
 *  - 若 Disciple.assignedBuilding 非空，视为玩家手动指定；除非该建筑已关闭/不存在/身份不匹配/满员，
 *    否则坚持让该弟子留在 assignedBuilding。
 *  - 堂主 (managingBuilding 非空)：若在其管理堂 assignedDisciples 中就保留。
 */
export function monthlyReassign(
  disciples: Disciple[],
  buildings: Building[],
): { disciples: Disciple[]; buildings: Building[] } {
  let currentBuildings = buildings.map(b => ({ ...b, assignedDisciples: [...b.assignedDisciples] }));
  let currentDisciples = disciples.map(d => ({ ...d }));

  const RESIDENCE_TYPES_SET = new Set<string>(RESIDENCE_TYPES_WITH_CAVE);
  const statusOrder: DiscipleStatus[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];

  for (const disciple of currentDisciples) {
    // 跳过凡人和长老
    if (disciple.status === 'mortal' || disciple.status === 'elder') continue;

    // ========== 玩家手动分配：assignedBuilding 优先 ==========
    let assignedOk = false;
    if (disciple.assignedBuilding) {
      const target = currentBuildings.find(b => b.id === disciple.assignedBuilding);
      if (target && target.status === 'active' && !RESIDENCE_TYPES_SET.has(target.type)) {
        // 身份门槛
        const minIdx = target.minDiscipleStatus ? statusOrder.indexOf(target.minDiscipleStatus) : 0;
        const myIdx = statusOrder.indexOf(disciple.status as DiscipleStatus);
        if (myIdx >= minIdx) {
          // 若不在 assignedDisciples 中且未满，加入
          if (!target.assignedDisciples.includes(disciple.id) &&
              target.assignedDisciples.length < target.discipleCapacity) {
            target.assignedDisciples.push(disciple.id);
          }
          // 若此时仍不在该堂（可能满员），就不强行，继续下一个逻辑
          if (target.assignedDisciples.includes(disciple.id)) {
            assignedOk = true;
          }
        }
      }
      if (!assignedOk) {
        // assignedBuilding 无效：清零
        disciple.assignedBuilding = null;
      }
    }

    // ========== 堂主：保证留在管理堂（未被手动 assignedBuilding 覆盖） ==========
    if (!assignedOk && disciple.managingBuilding) {
      const mgrTarget = currentBuildings.find(b => b.id === disciple.managingBuilding);
      if (mgrTarget && mgrTarget.status === 'active' && !RESIDENCE_TYPES_SET.has(mgrTarget.type)) {
        if (!mgrTarget.assignedDisciples.includes(disciple.id) &&
            mgrTarget.assignedDisciples.length < mgrTarget.discipleCapacity) {
          mgrTarget.assignedDisciples.push(disciple.id);
        }
        if (mgrTarget.assignedDisciples.includes(disciple.id)) {
          disciple.assignedBuilding = mgrTarget.id;
          assignedOk = true;
        }
      }
    }

    if (assignedOk) {
      // 已是有效分配：不需要再分配工作，直接跳到居所检查
    } else {
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
      } else {
        // 已在工作堂：同步 assignedBuilding
        disciple.assignedBuilding = workBuilding!.id;
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
      elder: 'cave_mansion',
    };
    const requiredType = requiredResidenceType[disciple.status];
    if (!requiredType) continue;
    const residenceOrder = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'];
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

export function getResidenceUpgradeCost(building: Building): { spiritStones: number; reputation: number } | null {
  const config = BUILDING_CONFIGS[building.type];
  if (!config) return null;

  // 预定义内的等级直接查配置表
  if (config.upgradeCosts && config.upgradeCosts.length > 0 && building.level <= config.upgradeCosts.length) {
    const cost = config.upgradeCosts[building.level - 1];
    if (cost) {
      return {
        spiritStones: cost.spiritStones,
        reputation: 0,
      };
    }
  }

  // 超过预定义等级后使用公式递增
  const level = building.level;
  const spiritStones = Math.round(200 * Math.pow(level, 1.6));
  return { spiritStones, reputation: 0 };
}

// 居所容量公式：
//  - 普通居所：每级10人（Lv1=10, Lv2=20, Lv3=30...）无上限
//  - 洞府（cave_mansion）：Lv1=1 人，每级+2 人（Lv2=3, Lv3=5, Lv4=7, Lv5=9），最高 5 级
export function getResidenceCapacityByLevel(type: string, level: number): number {
  if (type === 'cave_mansion') {
    if (level <= 0) return 0;
    const cappedLevel = Math.min(level, 5);
    return 1 + (cappedLevel - 1) * 2;
  }
  return level * 10;
}

// 洞府专属升级费用（因其 maxLevel=5，不参与普通居所通用 3 级递增表）
export function getCaveMansionUpgradeCost(currentLevel: number): { spiritStones: number } | null {
  const COSTS: Record<number, number> = {
    1: 800,   // Lv1 → Lv2
    2: 1800,  // Lv2 → Lv3
    3: 3600,  // Lv3 → Lv4
    4: 6400,  // Lv4 → Lv5
  };
  const cost = COSTS[currentLevel];
  return cost ? { spiritStones: cost } : null;
}

// 建筑维护费按等级递增表
export const MAINTENANCE_COST_TABLE: Record<string, number[]> = {
  mountain_gate: [15, 30, 60, 100, 150, 220, 300, 400, 550, 750],
  lecture_hall: [10, 25, 50],
  servant_hall: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  outer_residence: [10, 20, 40],
  inner_residence: [15, 30, 60],
  core_residence: [20, 40, 80],
  secret_library: [30, 60, 120, 200],
  pill_hall: [25, 55, 110],
  sutra_hall: [30, 65, 130],
  artifact_hall: [20, 45, 90],
  array_hall: [20, 45, 90],
  spirit_beast_garden: [40, 85, 170],
  cave_mansion: [30, 60, 120, 240, 400],
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

const ALL_PERSONALITIES: Personality[] = ['diligent', 'lazy', 'aggressive', 'peaceful', 'greedy', 'generous', 'loner', 'friendly'];
const ALL_BACKGROUNDS: BackgroundStory[] = ['common_folk', 'cultivation_family', 'wandering_scholar', 'sect_orphan', 'fallen_noble', 'ancient_heritage', 'beast_tamer', 'artifact_artisan'];

/** 随机生成弟子性格 */
export function generatePersonality(random: () => number = Math.random): Personality {
  return ALL_PERSONALITIES[Math.floor(random() * ALL_PERSONALITIES.length)];
}

/** 随机生成弟子背景故事 */
export function generateBackground(random: () => number = Math.random): BackgroundStory {
  return ALL_BACKGROUNDS[Math.floor(random() * ALL_BACKGROUNDS.length)];
}

/** 生成弟子喜好（基于背景和性格推荐） */
export function generatePreferences(personality: Personality, background: BackgroundStory): DisciplePreference {
  const prefs: DisciplePreference = {};
  // 炼器世家出身的弟子喜欢法器
  if (background === 'artifact_artisan') {
    prefs.likedTechniqueTypes = ['artifact'];
  }
  // 远古传承的弟子对丹药更敏感
  if (background === 'ancient_heritage') {
    prefs.likedPillTypes = ['qi_gathering_pill', 'foundation_pill'];
  }
  // 贪婪弟子喜欢高价值丹药
  if (personality === 'greedy') {
    prefs.likedPillTypes = [...(prefs.likedPillTypes || []), 'golden_pill', 'nascent_pill'];
  }
  return prefs;
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
    realmStage: 'early',
    // 2026-08-04：凡人初始进度从"直接满"改为 0，使其需 6 个月修炼后才能突破
    // 其他境界仍按原设计保留 0~50% 随机初始进度（模拟已有修炼经历的弟子）
    realmProgress: realm === 'mortal'
      ? 0
      : randomInt(0, Math.floor(getStageBreakthroughRequired(realm, 'early') * 0.5)),
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
    deducingBook: null,
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
    daoPartner: null,
    rival: null,
    apprenticeIds: [],
    tournamentHistory: [],
    // 自动推演默认关闭，避免藏经阁爆库
    disableAutoDeduce: true,
  };

  // 生成弟子个性化数据
  const personality = generatePersonality();
  const background = generateBackground();
  disciple.personality = personality;
  disciple.background = background;
  disciple.preferences = generatePreferences(personality, background);

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

// 各境界突破所需累计修为（2026-08-04 重新校准）
// 按普通天赋设计节奏（仅基础修炼，无任何 buff/居所/功法/讲经堂/秘籍时）：
//   凡人 6 月、炼气 6 月/阶段、筑基 12 月/阶段、金丹 18 月/阶段、元婴 24 月/阶段
// 50% 弟子在寿命耗尽前到不了化神：通过放大天赋差异（根骨/灵根非线性）+ buff 加法抑制叠加实现
export const REALM_BREAKTHROUGH_REQUIRED: Record<string, number> = {
  mortal: 54,       // 凡人→炼气（单阶段=54，base 5 × 0.9根骨效率 × 2凡人加速 × 6 月）
  qi: 730,          // 炼气→筑基（3 阶段 × 243/阶段）base 45 × 0.9 × 6 月 = 243
  foundation: 3600, // 筑基→金丹（3 阶段 × 1200/阶段）base 110 × 0.9 × 12 月 ≈ 1188 取 1200
  golden: 11400,    // 金丹→元婴（3 阶段 × 3800/阶段）base 170 × 0.9 × 18 月 ≈ 2754 + 讲经堂/功法约 40% 放大后取 3800
  nascent: 37800,   // 元婴→化神（3 阶段 × 12600/阶段）base 260 × 0.9 × 24 月 ≈ 5616 + 多层buff取 12600
  spirit: 999999,   // 化神（已满级）
};

export function getRealmBreakthroughRequired(realm: Realm): number {
  return REALM_BREAKTHROUGH_REQUIRED[realm] || 100;
}

// 当前境界阶段突破所需修为：将整境界总需求均分为三格
export function getStageBreakthroughRequired(realm: Realm, stage: RealmStage): number {
  return Math.ceil(REALM_BREAKTHROUGH_REQUIRED[realm] / 3);
}

export function canAttemptBreakthrough(disciple: Disciple): boolean {
  const required = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
  if (disciple.realmProgress < required) return false;
  // 化神期后期为最高阶，无法继续突破
  if (disciple.realm === 'spirit' && disciple.realmStage === 'late') return false;
  if (disciple.isBreakingThrough) return false;
  return true;
}

export function attemptBreakthrough(disciple: Disciple, hasPill: boolean = false, pillBonus: number = 0): {
  success: boolean;
  newRealm: Realm;
  newStage: RealmStage;
  newProgress: number;
} {
  const currentStageIdx = RealmStageOrder.indexOf(disciple.realmStage);
  const isRealmAdvance = disciple.realmStage === 'late';

  // 计算突破后的目标境界与阶段
  let newRealm: Realm = disciple.realm;
  let newStage: RealmStage = disciple.realmStage;
  if (isRealmAdvance) {
    const currentIndex = RealmOrder.indexOf(disciple.realm);
    const nextRealm = RealmOrder[currentIndex + 1];
    if (!nextRealm) {
      return { success: false, newRealm: disciple.realm, newStage: disciple.realmStage, newProgress: disciple.realmProgress };
    }
    newRealm = nextRealm;
    newStage = 'early';
  } else {
    newStage = RealmStageOrder[currentStageIdx + 1] || disciple.realmStage;
  }

  // 成功率：跨境界突破取下一境界数据；同境界进阶取当前境界数据（更温和）
  const breakthroughData = BreakthroughData[isRealmAdvance ? newRealm : disciple.realm];
  let successRate = breakthroughData.baseSuccessRate;
  successRate += disciple.breakthroughAttempts * breakthroughData.failureBonus;
  successRate += disciple.breakthroughBonus;

  // 丹药仅在跨境界突破时生效，使用丹药配置中的 breakthroughBonus
  if (hasPill && isRealmAdvance) {
    successRate += pillBonus > 0 ? pillBonus : breakthroughData.pillBonus;
  }

  const talentBonus = (disciple.hiddenTalents.rootBone - 50) * 0.2;
  successRate += talentBonus;

  successRate = clamp(successRate, 5, 95);

  const roll = randomFloat(0, 100);
  const success = roll < successRate;

  if (success) {
    return {
      success: true,
      newRealm,
      newStage,
      newProgress: 0,
    };
  } else {
    // 失败后进度回退
    const regressAmount = disciple.realmProgress * (breakthroughData.regressPercent / 100);
    const newProgress = Math.max(0, disciple.realmProgress - regressAmount);
    return {
      success: false,
      newRealm: disciple.realm,
      newStage: disciple.realmStage,
      newProgress,
    };
  }
}

export function processMonthlyCultivation(disciple: Disciple): Disciple {
  if (disciple.status === 'mortal' || disciple.status === 'servant') {
    if (disciple.realm === 'mortal') {
      const required = getStageBreakthroughRequired('mortal', disciple.realmStage);
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

  // 2026-08-04 重写：所有百分比加成先累加，再一次性乘到 base。
  // 旧实现逐项乘法（1+a)(1+b)(1+c)... 在多 buff 下指数放大，导致极端弟子修炼过快。
  // 新实现：合并加成 = Σ(buff值 + 功法值 + Σ秘籍值)，最终 speed = base × (1 + 合并加成/100)。
  // 同时通过 getRootBoneEffectiveness 非线性放大根骨差异（天赋好才能发挥功法/居所/讲经堂 100% 效果）。
  const rootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents.rootBone);

  let totalBonusPercent = 0;

  // (1) 居所/洞府/讲经堂等月度 buff：根骨决定发挥比例
  for (const buff of disciple.buffs) {
    if (buff.type === 'cultivation') {
      totalBonusPercent += buff.value * rootBoneEff;
    }
  }

  // (2) 功法修炼速度加成：根骨决定发挥比例
  if (disciple.learnedTechnique) {
    const techniqueBonus = disciple.learnedTechnique.isLearned
      ? disciple.learnedTechnique.cultivationBonus
      : disciple.learnedTechnique.cultivationBonus * (disciple.learnedTechnique.progress / 100);
    totalBonusPercent += techniqueBonus * rootBoneEff;
  }

  // (3) 旧秘籍系统加成：同样受根骨发挥比例约束
  for (const secret of disciple.learnedSecrets) {
    totalBonusPercent += secret.cultivationBonus * rootBoneEff;
  }

  // clamp：避免负加成（极端 buff 时）导致进度倒退；最高加成上限 250%（= 3.5 倍速度，约当 2 本高阶功法 + 讲经堂满配 + 洞府）
  const clampedBonus = Math.max(-50, Math.min(250, totalBonusPercent));

  const speed = disciple.cultivationSpeed * (1 + clampedBonus / 100);

  const required = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
  const newProgress = Math.min(required, disciple.realmProgress + Math.floor(speed));

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
 * 突破后自动去藏经阁学习更优秀的功法/战技（可替换低级）。
 *
 * 行为：
 *  - 已在学习中则不打断。
 *  - 优先选 功法 (technique)，按 cultivationBonus 最高者；
 *  - 若功法没有更优，再看战技 (battle) 有更优（或未满槽）则挑最好的学，
 *    已满两本时淘汰最弱那本（由调用方 forget）。
 *
 * 返回：{ disciple, learned?: { type: 'technique' | 'battle', book: BookConfig } }
 *  - learned 存在时：调用方需要处理贡献扣费、战技槽淘汰等额外动作（本函数是纯工具，不扣贡献）
 */
export function autoLearnTechniqueOnBreakthrough(
  disciple: Disciple,
  libraryBooks: BookConfig[],
): Disciple {
  const res = pickUpgradeBook(disciple, libraryBooks);
  if (!res) return disciple;
  return {
    ...disciple,
    learningBook: res.learningBook,
    isLearningSecret: true,
    learnedTechnique: res.forgetTechnique ? null : disciple.learnedTechnique,
    learnedBattles: res.forgetBattleBookId
      ? disciple.learnedBattles.filter(b => b.bookId !== res.forgetBattleBookId)
      : disciple.learnedBattles,
  };
}

/**
 * 挑一本可升级的功法/战技（供自动学习使用）。
 * 不会扣贡献；返回构造好的 LearningBook 与需要忘掉的旧书 id。
 * 找不到更优则返回 null。
 */
export function pickUpgradeBook(
  disciple: Disciple,
  libraryBooks: BookConfig[],
): {
  learningBook: NonNullable<Disciple['learningBook']>;
  pickType: 'technique' | 'battle';
  pickBook: BookConfig;
  forgetTechnique: boolean;
  forgetBattleBookId?: string;
} | null {
  // 已在学习中，不打断当前学习
  if (disciple.learningBook) return null;

  const targetTier = REALM_TO_BOOK_TIER[disciple.realm];
  if (!targetTier) return null;

  // ========== 功法 ==========
  const techCandidates = libraryBooks.filter(b =>
    b.type === 'technique' &&
    b.tier === targetTier &&
    canLearnBook(disciple.hiddenTalents.spiritRoots || [], b),
  );
  if (techCandidates.length > 0) {
    techCandidates.sort((a, b) => b.cultivationBonus - a.cultivationBonus || b.combatBonus - a.combatBonus);
    const bestTech = techCandidates[0];
    const curTech = disciple.learnedTechnique;
    if (!curTech || curTech.cultivationBonus < bestTech.cultivationBonus) {
      return {
        pickType: 'technique',
        pickBook: bestTech,
        // 旧功法暂留：学成时由 processMonthlyLearning 用新功法覆盖 learnedTechnique，
        // 避免开始学习的瞬间清空旧功法，造成突破后几天的功法加成空窗期。
        forgetTechnique: false,
        learningBook: {
          bookId: bestTech.id, name: bestTech.name, type: 'technique', tier: bestTech.tier,
          attribute: bestTech.attribute, cultivationBonus: bestTech.cultivationBonus,
          combatBonus: bestTech.combatBonus, progress: 0, totalDays: bestTech.learnDays, isLearned: false,
        },
      };
    }
  }

  // ========== 战技 ==========
  const battleCandidates = libraryBooks.filter(b =>
    b.type === 'battle' &&
    b.tier === targetTier &&
    canLearnBook(disciple.hiddenTalents.spiritRoots || [], b),
  );
  if (battleCandidates.length > 0) {
    battleCandidates.sort((a, b) => b.combatBonus - a.combatBonus);
    const bestBattle = battleCandidates[0];
    const battles = disciple.learnedBattles || [];
    if (battles.length < 2) {
      // 未满 2 本且没有更差的 → 直接学
      return {
        pickType: 'battle',
        pickBook: bestBattle,
        forgetTechnique: false,
        learningBook: {
          bookId: bestBattle.id, name: bestBattle.name, type: 'battle', tier: bestBattle.tier,
          attribute: bestBattle.attribute, cultivationBonus: bestBattle.cultivationBonus,
          combatBonus: bestBattle.combatBonus, progress: 0, totalDays: bestBattle.learnDays, isLearned: false,
        },
      };
    }
    // 满 2 本：比最弱的强就换
    const sorted = [...battles].sort((a, b) => a.combatBonus - b.combatBonus);
    const weakest = sorted[0];
    if (weakest && bestBattle.combatBonus > weakest.combatBonus) {
      return {
        pickType: 'battle',
        pickBook: bestBattle,
        forgetTechnique: false,
        forgetBattleBookId: weakest.bookId,
        learningBook: {
          bookId: bestBattle.id, name: bestBattle.name, type: 'battle', tier: bestBattle.tier,
          attribute: bestBattle.attribute, cultivationBonus: bestBattle.cultivationBonus,
          combatBonus: bestBattle.combatBonus, progress: 0, totalDays: bestBattle.learnDays, isLearned: false,
        },
      };
    }
  }

  return null;
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

// 通天塔战力：弟子战力达到此值方可挑战，挑战成功即飞升
export const SKYSCRAPER_TOWER_COMBAT_POWER = 200000;

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

// ===== 战力构成明细（带回源） =====

/** 计算弟子战力构成明细 */
export function calculateDiscipleCombatPowerBreakdown(disciple: Disciple): CombatPowerBreakdown {
  const realmPower = RealmCombatPower[disciple.realm] || 10;

  const talentBonus =
    disciple.hiddenTalents.rootBone * 0.5 +
    disciple.hiddenTalents.spiritRhythm * 0.3 +
    disciple.hiddenTalents.daoFate * 0.2;

  const statusBonusMap: Record<string, number> = {
    mortal: 0, servant: 0.5, outer: 1.0, inner: 1.5, core: 2.0, elder: 3.0,
  };
  const statusMultiplier = 1 + (statusBonusMap[disciple.status] || 0);
  const basePower = realmPower * (1 + talentBonus / 100) * statusMultiplier;

  // 秘籍（旧系统）
  let secretBonus = 0;
  for (const secret of disciple.learnedSecrets) {
    secretBonus += secret.cultivationBonus * 0.5;
  }

  // 功法
  const combatRootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents.rootBone);
  let techniqueBonus = 0;
  if (disciple.learnedTechnique && disciple.learnedTechnique.isLearned) {
    techniqueBonus += disciple.learnedTechnique.combatBonus * combatRootBoneEff;
  } else if (disciple.learnedTechnique) {
    techniqueBonus += disciple.learnedTechnique.combatBonus * (disciple.learnedTechnique.progress / 100) * combatRootBoneEff;
  }

  // 战技
  let battleBonus = 0;
  for (const battle of disciple.learnedBattles) {
    if (battle.isLearned) {
      battleBonus += battle.combatBonus * combatRootBoneEff;
    } else {
      battleBonus += battle.combatBonus * (battle.progress / 100) * combatRootBoneEff;
    }
  }
  const bookBonusTotal = secretBonus + techniqueBonus + battleBonus;

  // 装备
  let artifactBonus = 0;
  if (disciple.equippedArtifact) {
    const cfg = ARTIFACT_CONFIGS[disciple.equippedArtifact];
    if (cfg?.combatPowerBonus) artifactBonus = cfg.combatPowerBonus;
  }
  let talismanBonus = 0;
  if (disciple.equippedTalisman) {
    const cfg = TALISMAN_CONFIGS[disciple.equippedTalisman];
    if (cfg?.defenseBonus) talismanBonus = cfg.defenseBonus * 0.5;
  }
  let beastBonus = 0;
  if (disciple.equippedBeast) {
    const cfg = BEAST_CONFIGS[disciple.equippedBeast];
    if (cfg?.combatPowerBonus) beastBonus = cfg.combatPowerBonus;
  }
  const equipmentBonus = artifactBonus + talismanBonus + beastBonus;
  const total = Math.floor(basePower * (1 + bookBonusTotal / 100) + equipmentBonus);

  return {
    realmBase: realmPower,
    talentBonus,
    statusMultiplier,
    basePower,
    secretBonus,
    techniqueBonus,
    battleBonus,
    bookBonusTotal,
    artifactBonus,
    talismanBonus,
    beastBonus,
    equipmentBonus,
    total,
  };
}

/** 计算宗门战力汇总 */
export function computeSectCombatSummary(
  disciples: Disciple[],
  buildings: Building[],
): SectCombatSummary {
  // 弟子战力
  const disciplePowers = disciples.map(d => ({
    disciple: d,
    power: calculateDiscipleCombatPower(d),
  }));
  const basePower = disciplePowers.reduce((s, x) => s + x.power, 0);

  // 建筑加成
  const bonuses: { name: string; multiplier: number; description: string }[] = [];
  const mountainGate = buildings.find(b => b.type === 'mountain_gate' && b.status === 'active');
  const isMountainGateFull = mountainGate && mountainGate.assignedDisciples.length >= mountainGate.discipleCapacity;
  if (isMountainGateFull && mountainGate) {
    const gateBonus = mountainGate.level * 0.05;
    bonuses.push({
      name: mountainGate.level >= 10 ? '护山大阵' : '山门满员',
      multiplier: gateBonus,
      description: `山门Lv.${mountainGate.level}，战力+${(gateBonus * 100).toFixed(0)}%`,
    });
  }
  const skyscraperTower = buildings.find(b => b.type === 'skyscraper_tower' && b.status === 'active');
  if (skyscraperTower) {
    const levelBonus = skyscraperTower.level * 0.02;
    bonuses.push({
      name: '通天塔',
      multiplier: levelBonus,
      description: `通天塔Lv.${skyscraperTower.level}，战力+${(levelBonus * 100).toFixed(0)}%`,
    });
  }
  const totalBonus = bonuses.reduce((s, b) => s + b.multiplier, 0);
  const totalPower = Math.floor(basePower * (1 + totalBonus));

  // 按身份分组
  const statusGroups = new Map<string, { count: number; power: number }>();
  for (const { disciple: d, power: p } of disciplePowers) {
    const key = DiscipleStatusNames[d.status] || d.status;
    const g = statusGroups.get(key) || { count: 0, power: 0 };
    g.count++;
    g.power += p;
    statusGroups.set(key, g);
  }
  const byStatus = [...statusGroups.entries()]
    .map(([status, v]) => ({ status, count: v.count, power: Math.floor(v.power) }))
    .sort((a, b) => b.power - a.power);

  // 按境界分组
  const realmGroups = new Map<string, { count: number; power: number }>();
  for (const { disciple: d, power: p } of disciplePowers) {
    const key = RealmNames[d.realm] || d.realm;
    const g = realmGroups.get(key) || { count: 0, power: 0 };
    g.count++;
    g.power += p;
    realmGroups.set(key, g);
  }
  const byRealm = [...realmGroups.entries()]
    .map(([realm, v]) => ({ realm, count: v.count, power: Math.floor(v.power) }))
    .sort((a, b) => b.power - a.power);

  // 最强弟子 Top5
  const topDisciples = disciplePowers
    .sort((a, b) => b.power - a.power)
    .slice(0, 5)
    .map(({ disciple: d, power }) => ({
      id: d.id,
      name: d.name,
      status: DiscipleStatusNames[d.status],
      realm: RealmNames[d.realm],
      power,
    }));

  return {
    totalPower,
    basePower,
    discipleCount: disciples.length,
    byStatus,
    byRealm,
    buildingBonuses: bonuses,
    topDisciples,
  };
}

// ===== 宗门流派/天赋树加成计算 =====

/** 流派基础加成 */
const SCHOOL_BASE_BONUSES: Record<SectSchool, Record<string, number>> = {
  sword: { combatPowerBonus: 10 },
  pill: { pillOutputBonus: 20 },
  array: { defenseBonus: 15 },
  artifact: { artifactOutputBonus: 20 },
  balance: { combatPowerBonus: 5, cultivationSpeedBonus: 5, spiritStoneOutputBonus: 5, pillOutputBonus: 5, artifactOutputBonus: 5, talismanOutputBonus: 5, defenseBonus: 5 },
};

/** 获取流派+天赋树的总加成百分比 */
export function getSchoolTalentBonuses(
  sectSchool: SectSchool | null,
  unlockedTalents: string[],
): Record<string, number> {
  const bonuses: Record<string, number> = {};
  if (!sectSchool) return bonuses;
  // 流派基础加成
  const base = SCHOOL_BASE_BONUSES[sectSchool];
  if (base) {
    for (const [key, val] of Object.entries(base)) {
      bonuses[key] = (bonuses[key] ?? 0) + val;
    }
  }
  // 天赋树加成
  const tree = SCHOOL_TALENT_TREES[sectSchool];
  if (tree) {
    for (const talent of tree) {
      if (unlockedTalents.includes(talent.id)) {
        for (const [key, val] of Object.entries(talent.effects)) {
          if (typeof val === 'number') {
            bonuses[key] = (bonuses[key] ?? 0) + val;
          }
        }
      }
    }
  }
  return bonuses;
}

// 计算宗门总战力
export function calculateSectCombatPower(
  disciples: Disciple[],
  buildings: Building[],
  schoolBonuses?: Record<string, number>,
): {
  totalPower: number;
  mountainGateBonus: boolean;
  basePower: number;
  bonuses: { name: string; multiplier: number; description: string }[];
} {
  const basePower = disciples.reduce((sum, d) => sum + calculateDiscipleCombatPower(d), 0);
  
  const bonuses: { name: string; multiplier: number; description: string }[] = [];
  
  // 山门加成：每级满员 +5% 战力，10级满员 +50%（相当于护山大阵）
  const mountainGate = buildings.find(b => b.type === 'mountain_gate' && b.status === 'active');
  const isMountainGateFull = mountainGate &&
    mountainGate.assignedDisciples.length >= mountainGate.discipleCapacity;

  if (isMountainGateFull && mountainGate) {
    const gateBonus = mountainGate.level * 0.05;
    const isGrandArray = mountainGate.level >= 10;
    bonuses.push({
      name: isGrandArray ? '护山大阵' : '山门满员',
      multiplier: gateBonus,
      description: isGrandArray
        ? `山门10级满员化为护山大阵，战力+${(gateBonus * 100).toFixed(0)}%`
        : `山门Lv.${mountainGate.level}满员，战力+${(gateBonus * 100).toFixed(0)}%`,
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
  
  // 宗门流派/天赋树战力加成
  if (schoolBonuses?.combatPowerBonus) {
    const schoolCombatBonus = schoolBonuses.combatPowerBonus / 100;
    bonuses.push({
      name: '宗门流派',
      multiplier: schoolCombatBonus,
      description: `宗门流派/天赋树，战力+${schoolBonuses.combatPowerBonus.toFixed(0)}%`,
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

// ===== 藏经阁推演功法系统 =====

// 弟子境界可推演的最高品阶（藏经阁 4 层封顶元婴）
// 炼气→qi 筑基→foundation 金丹→golden 元婴→nascent 化神→nascent
const REALM_TO_DEDUCE_TIER: Record<Realm, BookTier> = {
  mortal: 'qi',
  qi: 'qi',
  foundation: 'foundation',
  golden: 'golden',
  nascent: 'nascent',
  spirit: 'nascent',
};

// 推演时长（月数）：炼气2 筑基3 金丹4 元婴5
const TIER_DEDUCE_MONTHS: Record<BookTier, number> = {
  qi: 2,
  foundation: 3,
  golden: 4,
  nascent: 5,
};

/**
 * 取得弟子在给定藏经阁等级下能推演的最高品阶
 * 受藏经阁等级上限限制（level 1→qi, 2→foundation, 3→golden, 4→nascent）
 */
export function getMaxDeduceTier(realm: Realm, libraryLevel: number): BookTier {
  const realmTier = REALM_TO_DEDUCE_TIER[realm];
  const tiers: BookTier[] = ['qi', 'foundation', 'golden', 'nascent'];
  const libraryMaxTier = tiers[Math.min(Math.max(1, libraryLevel) - 1, 3)];
  const rIdx = tiers.indexOf(realmTier);
  const lIdx = tiers.indexOf(libraryMaxTier);
  return tiers[Math.min(rIdx, lIdx)];
}

/**
 * 从弟子灵根中挑出最强属性（或 universal），作为推演书籍的属性倾向
 */
export function pickDiscipleStrongestAttribute(disciple: Disciple): BookAttribute {
  const roots = disciple.hiddenTalents.spiritRoots || [];
  if (roots.length === 0) return 'universal';
  // 按灵根纯度 quality 降序取最强；无灵根返回通用
  const best = [...roots].sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
  if (!best || !best.type) return 'universal';
  // SpiritRootType 比 BookAttribute 多 light/dark，这里做兜底
  const attrSet: readonly BookAttribute[] = ['gold', 'wood', 'water', 'fire', 'earth', 'thunder', 'wind', 'ice', 'universal'] as const;
  return (attrSet.includes(best.type as any) ? best.type : 'universal') as BookAttribute;
}

/**
 * 创建一个推演任务（startDeducingBook 的底层纯函数）
 * @param disciple 弟子（决定属性偏好与品质基础）
 * @param type 'technique' | 'battle'
 * @param tier 推演品阶（由 getMaxDeduceTier 决定）
 * @param libraryLevel 藏经阁等级（影响品质加成）
 */
export function createDeducingBook(
  disciple: Disciple,
  type: BookType,
  tier: BookTier,
  libraryLevel: number,
): DeducingBook {
  const daoFate = disciple.hiddenTalents.daoFate || 50;        // 道缘决定品质
  const wisdom = disciple.hiddenTalents.spiritRhythm || 50;    // 灵韵作为悟性代理（spiritRhythm≈慧根/灵性）
  // 品质基础值 = 道缘 60% + 灵韵 40%，再叠加藏经阁等级 +5/级
  const baseQuality = daoFate * 0.6 + wisdom * 0.4;
  let quality = Math.round(baseQuality + (libraryLevel - 1) * 5 + randomInt(-8, 10));
  quality = clamp(quality, 5, 100);

  const base = BOOK_TIER_BONUSES[tier];
  // 品质系数 <40 → 0.7  40-60 → 1.0  60-80 → 1.3  ≥80 → 1.7  ≥90 → 2.1
  const qMul = quality >= 90 ? 2.1 : quality >= 80 ? 1.7 : quality >= 60 ? 1.3 : quality >= 40 ? 1.0 : 0.7;
  const cultivationBonus = Math.max(1, Math.round((type === 'technique' ? base.cultivation : base.cultivation * 0.3) * qMul));
  const combatBonus = Math.max(1, Math.round((type === 'battle' ? base.combat : base.combat * 0.3) * qMul));

  const attribute: BookAttribute = pickDiscipleStrongestAttribute(disciple);
  const totalMonths = TIER_DEDUCE_MONTHS[tier];

  // 先 roll 一本正式 BookConfig 拿到最终的 name/description；然后用数值填 DeducingBook
  const prototype = generateRandomBook(tier, type, attribute);
  return {
    name: prototype.name,
    type,
    tier,
    attribute,
    progress: 0,
    totalMonths,
    cultivationBonus,
    combatBonus,
    quality,
  };
}

/**
 * 推演完成：把 DeducingBook 变成正式入库的 BookConfig（放入 libraryBooks）
 * 注意：属性/数值已经在 createDeducingBook 时roll 好，这里只是组装成入库结构。
 *       也可直接复用 generateRandomBook(tier, type, attr) 做默认，再覆盖关键数值，
 *       这里选择用原型 + 覆盖，保留推演时 roll 好的品质与加成。
 */
export function finalizeDeducingBook(done: DeducingBook, authorName: string): BookConfig {
  const attr = done.attribute as BookAttribute;
  const prototype = generateRandomBook(done.tier, done.type, attr);
  return {
    ...prototype,
    id: `deduced_${generateId()}`,
    name: done.name,
    type: done.type,
    tier: done.tier,
    attribute: attr,
    cultivationBonus: done.cultivationBonus,
    combatBonus: done.combatBonus,
    quality: done.quality,
    description: `${prototype.description.replace(/[。！？]?\s*$/, '')}；由「${authorName}」于藏经阁推演所得。`,
  };
}

/**
 * 计算推演每月进度增加值（>100 即完成）
 * 基础 = 100 / totalMonths；受悟性×0.6 + 道缘×0.4 归一化加成（最大 +50%）、藏经阁等级 +10%/级
 */
export function calculateMonthlyDeductionProgress(
  disciple: Disciple,
  totalMonths: number,
  libraryLevel: number,
): number {
  const base = 100 / totalMonths;
  const wisdom = disciple.hiddenTalents.spiritRhythm || 50;   // 灵韵 ≈ 悟性代理
  const daoFate = disciple.hiddenTalents.daoFate || 50;
  const talentFactor = 1 + (0.6 * (wisdom - 50) + 0.4 * (daoFate - 50)) / 100; // 0.5 ~ 1.5
  const levelFactor = 1 + (libraryLevel - 1) * 0.1; // 1.0 ~ 1.3
  return base * talentFactor * levelFactor;
}


// ============================================================================
// 弟子自然流失：寿命死亡 + 叛逃
// ============================================================================

/** 身份→月灵石收入（用于叛逃带走"1-3倍月收入"的计算，与维护费成比例） */
const STATUS_MONTHLY_INCOME_LS: Record<DiscipleStatus, number> = {
  mortal: 0,
  servant: 3,
  outer: 10,
  inner: 25,
  core: 60,
  elder: 120,
};

/** 单次叛逃/死亡事件汇总结果：给调用方（nextMonth）统一合并库存、通知、历史 */
export interface DiscipleDepartureResult {
  /** 仍然存活的弟子（过滤掉已故/叛逃） */
  survivors: Disciple[];
  /** 寿终正寝数量 */
  deadCount: number;
  /** 叛逃/还俗数量 */
  defectedCount: number;
  /** 叛逃弟子合计带走的灵石（直接从 spiritStones 扣） */
  stoneLossFromDefection: number;
  /** 累计需要写入宗门事件 feed 的通知 */
  notifications: Notification[];
  /** 累计需要写入宗门历史的条目 */
  sectHistories: SectHistoryEntry[];
  /** 处理遗产/离职时，对仓库的修改（mutate 传入的库存累加器，也返回一份报告便于排错） */
  inventoryReport: {
    /** 归还法器库存变动 {type: qty增量} */
    artifacts: Record<string, number>;
    /** 归还符箓 */
    talismans: Record<string, number>;
    /** 归还灵兽 */
    beasts: Record<string, number>;
    /** 归还丹药 */
    pills: Record<string, number>;
    /** 归还原材料 material:xxx */
    specialMaterials: Record<string, number>;
    herbs: number;
    iron: number;
    paper: number;
  };
}

/** 为 depart 事件创建一条宗门历史记录 */
function makeDepartureHistory(
  type: SectHistoryType, date: GameDate, disciple: Disciple, detail: string,
): SectHistoryEntry {
  const title = type === 'disciple_death'
    ? `${disciple.name}·寿终正寝`
    : `${disciple.name}·叛出山门`;
  return {
    id: generateId(),
    date,
    type,
    title,
    description: `${disciple.name}（${DiscipleStatusNames[disciple.status]}·${RealmNames[disciple.realm]}）${detail}。享年 ${Math.floor(disciple.age)} 岁。`,
  };
}

/**
 * 寻找继承候选人（优先级：师傅→道侣→同门好友→无继承人）
 * 注意：师傅/好友/道侣现在用的是「名字」字段，通过 name 反查弟子 id；
 *       这与当前 Disciple 类型定义一致（master: string|null, friends: string[]）。
 */
function findHeirId(decedent: Disciple, survivors: Disciple[]): string | null {
  const byName = (n: string | null | undefined): Disciple | undefined =>
    n ? survivors.find(d => d.name === n) : undefined;
  // 1) 师傅
  const master = byName(decedent.master);
  if (master) return master.id;
  // 2) 同门好友（取第一个能找到的）
  for (const fn of decedent.friends || []) {
    const f = byName(fn);
    if (f) return f.id;
  }
  return null;
}

/**
 * 给一个弟子（继承人 or 仓库 if null）装上一件装备/物品。
 * 继承人优先空槽位；继承人槽位满 or 无继承人 → 归还宗门仓库。
 * 返回对仓库/库存的修改量（正数=加，负数=扣；最终由调用方合并）。
 */
function transferEquipToHeirOrWarehouse(
  heir: Disciple | undefined,
  inventoryReport: DiscipleDepartureResult['inventoryReport'],
) {
  // 注：这是一个 closure 工厂。内部会在真正给物品时决定给继承人 or 仓库。
  return {
    equipArtifact(type: ArtifactType | null | undefined) {
      if (!type) return;
      if (heir && !heir.equippedArtifact) {
        heir.equippedArtifact = type;
        return;
      }
      inventoryReport.artifacts[type] = (inventoryReport.artifacts[type] || 0) + 1;
    },
    equipTalisman(type: TalismanType | null | undefined) {
      if (!type) return;
      if (heir && !heir.equippedTalisman) {
        heir.equippedTalisman = type;
        return;
      }
      inventoryReport.talismans[type] = (inventoryReport.talismans[type] || 0) + 1;
    },
    equipBeast(type: BeastType | null | undefined) {
      if (!type) return;
      if (heir && !heir.equippedBeast) {
        heir.equippedBeast = type;
        return;
      }
      inventoryReport.beasts[type] = (inventoryReport.beasts[type] || 0) + 1;
    },
    /** 处理弟子背包（pill/artifact/talisman/beast 及特殊原材料） */
    backpackItem(item: DiscipleBackpackItem) {
      if (heir && item.kind === 'pill') {
        // 丹药直接加进继承人突破加成（不进背包，简单处理避免背包爆仓）
        heir.breakthroughBonus = (heir.breakthroughBonus || 0) + item.quantity * 2;
        return;
      }
      // 其余全归仓库
      if (item.kind === 'pill') {
        inventoryReport.pills[item.itemType] = (inventoryReport.pills[item.itemType] || 0) + item.quantity;
      } else if (item.kind === 'artifact') {
        inventoryReport.artifacts[item.itemType] = (inventoryReport.artifacts[item.itemType] || 0) + item.quantity;
      } else if (item.kind === 'talisman') {
        inventoryReport.talismans[item.itemType] = (inventoryReport.talismans[item.itemType] || 0) + item.quantity;
      } else if (item.kind === 'beast') {
        inventoryReport.beasts[item.itemType] = (inventoryReport.beasts[item.itemType] || 0) + item.quantity;
      }
    },
    /** 处理 material:前缀的特殊原材料条目（backpack 里也可能用前缀写法） */
    rawMaterial(materialKey: string, qty: number) {
      // 三种基础材料
      if (materialKey === 'herb' || materialKey === 'spirit_herb') {
        inventoryReport.herbs += qty; return;
      }
      if (materialKey === 'iron' || materialKey === 'spirit_iron') {
        inventoryReport.iron += qty; return;
      }
      if (materialKey === 'paper' || materialKey === 'spirit_paper') {
        inventoryReport.paper += qty; return;
      }
      // 特殊材料：支持 material:xxx 写法和裸写 xxx
      const key = materialKey.startsWith('material:') ? materialKey.slice(9) : materialKey;
      if (SPECIAL_MATERIALS[key]) {
        inventoryReport.specialMaterials[key] = (inventoryReport.specialMaterials[key] || 0) + qty;
      } else {
        // 未知材料 → 当作灵草兜底
        inventoryReport.herbs += qty;
      }
    },
  };
}

/**
 * 计算师徒修炼加成
 */
export function getMasterDiscipleCultivationBonus(disciple: Disciple, allDisciples: Disciple[]): number {
  if (!disciple.master) return 0;
  const master = allDisciples.find(d => d.name === disciple.master);
  if (!master) return 0;
  const bonusMap: Record<string, number> = {
    qi: 0.05, foundation: 0.10, golden: 0.15, nascent: 0.20, spirit: 0.30,
  };
  return bonusMap[master.realm] || 0;
}

/**
 * 每月生成弟子关系网
 */
export function generateDiscipleRelationships(
  disciples: Disciple[],
  random: () => number = Math.random,
): { type: 'friend' | 'dao_partner' | 'rival'; a: Disciple; b: Disciple }[] {
  const results: { type: 'friend' | 'dao_partner' | 'rival'; a: Disciple; b: Disciple }[] = [];
  const active = disciples.filter(d => d.status !== 'mortal');
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]; const b = active[j];
      if (a.friends.includes(b.name) || a.rival === b.name || a.daoPartner === b.name) continue;
      if (random() > 0.03) continue;
      const realmGap = Math.abs(RealmOrder.indexOf(a.realm) - RealmOrder.indexOf(b.realm));
      if (realmGap <= 1 && random() < 0.5) {
        if (random() < 0.2 && !a.daoPartner && !b.daoPartner) {
          results.push({ type: 'dao_partner', a, b });
        } else {
          results.push({ type: 'friend', a, b });
        }
      } else if (realmGap >= 2 && random() < 0.3) {
        results.push({ type: 'rival', a, b });
      }
    }
  }
  return results;
}

/**
 * 生成建筑随机事件
 */
export function generateBuildingEvents(
  buildings: Building[],
  random: () => number = Math.random,
): BuildingEvent[] {
  const events: BuildingEvent[] = [];
  const BUILDING_EVENT_POOL: Record<string, BuildingEvent[]> = {
    pill_refining: [
      { id: 'pill_vision', buildingType: 'pill_refining', type: 'auspicious',
        title: '丹成异象', description: '丹堂炉火通明，一颗丹药生出霞光异象，品质大幅提升！',
        effects: { outputMultiplier: 2.0, satisfactionChange: 3, spiritStoneChange: 50 }, duration: 1 },
      { id: 'pill_explosion', buildingType: 'pill_refining', type: 'disaster',
        title: '丹炉炸裂', description: '丹堂火候失控，炉鼎炸裂，药材损失惨重。',
        effects: { outputMultiplier: 0.3, satisfactionChange: -5, spiritStoneChange: -30 }, duration: 1 },
      { id: 'pill_recipe_discovery', buildingType: 'pill_refining', type: 'auspicious',
        title: '古方重现', description: '炼丹长老翻阅古籍，发现一张失传的古丹方，尝试炼制后惊喜连连！',
        effects: { outputMultiplier: 1.5, satisfactionChange: 4, reputationChange: 5 }, duration: 2 },
      { id: 'pill_toxin', buildingType: 'pill_refining', type: 'disaster',
        title: '丹毒泄露', description: '一批丹药中含有剧毒杂质，多名弟子中毒，需紧急处理。',
        effects: { satisfactionChange: -8, spiritStoneChange: -50, reputationChange: -5 }, duration: 1 },
    ],
    spiritual_field: [
      { id: 'field_bloom', buildingType: 'spiritual_field', type: 'auspicious',
        title: '灵草疯长', description: '灵田灵气充沛，灵草一夜之间疯长，产量大增！',
        effects: { outputMultiplier: 1.8, satisfactionChange: 2 }, duration: 2 },
      { id: 'field_wilt', buildingType: 'spiritual_field', type: 'disaster',
        title: '灵草枯萎', description: '灵田灵气紊乱，大片灵草枯萎，损失惨重。',
        effects: { outputMultiplier: 0.4, satisfactionChange: -4, spiritStoneChange: -20 }, duration: 2 },
      { id: 'field_rain', buildingType: 'spiritual_field', type: 'auspicious',
        title: '灵雨降瑞', description: '天降灵雨，灵田中的灵草沐浴甘霖，生机勃勃。',
        effects: { outputMultiplier: 1.4, satisfactionChange: 3, spiritStoneChange: 20 }, duration: 1 },
      { id: 'field_pest', buildingType: 'spiritual_field', type: 'disaster',
        title: '虫灾肆虐', description: '灵田中突然出现大量噬灵虫，疯狂啃食灵草根系。',
        effects: { outputMultiplier: 0.5, satisfactionChange: -6, spiritStoneChange: -40 }, duration: 2 },
    ],
    secret_library: [
      { id: 'library_epiphany', buildingType: 'secret_library', type: 'auspicious',
        title: '藏经阁顿悟', description: '藏经阁灵光闪烁，一名弟子在翻阅古籍时顿悟，修炼进度大增！',
        effects: { satisfactionChange: 5 }, duration: 1 },
      { id: 'library_mold', buildingType: 'secret_library', type: 'disaster',
        title: '古籍受潮', description: '雨季连绵，藏经阁部分古籍受潮损坏，修复需耗灵石。',
        effects: { spiritStoneChange: -50, satisfactionChange: -2 }, duration: 1 },
      { id: 'library_discovery', buildingType: 'secret_library', type: 'auspicious',
        title: '暗格发现', description: '弟子在整理书架时发现一处暗格，里面藏有一卷上古功法残篇！',
        effects: { satisfactionChange: 8, reputationChange: 10 }, duration: 1 },
      { id: 'library_bookworm', buildingType: 'secret_library', type: 'disaster',
        title: '书虫为患', description: '藏经阁中发现大量噬书虫，啃食了不少珍贵典籍。',
        effects: { spiritStoneChange: -30, satisfactionChange: -3, reputationChange: -3 }, duration: 1 },
    ],
    outer_residence: [
      { id: 'residence_peace', buildingType: 'outer_residence', type: 'auspicious',
        title: '居所祥和', description: '弟子居所灵气环绕，众人心境平和，满意度上升。',
        effects: { satisfactionChange: 5 }, duration: 1 },
      { id: 'residence_demon', buildingType: 'outer_residence', type: 'disaster',
        title: '走火入魔', description: '一名弟子修炼时走火入魔，居所受损，其他弟子受惊。',
        effects: { satisfactionChange: -8, spiritStoneChange: -20 }, duration: 1 },
      { id: 'residence_feast', buildingType: 'outer_residence', type: 'auspicious',
        title: '同门联谊', description: '外门弟子自发组织了一场联谊会，众人关系融洽，士气高涨。',
        effects: { satisfactionChange: 6, spiritStoneChange: -10 }, duration: 1 },
      { id: 'residence_quarrel', buildingType: 'outer_residence', type: 'disaster',
        title: '矛盾激化', description: '两名外门弟子因琐事大打出手，多人受伤，居所一片狼藉。',
        effects: { satisfactionChange: -10, spiritStoneChange: -25 }, duration: 1 },
    ],
    // 也支持 inner_residence / core_residence 共用居所事件
    inner_residence: [
      { id: 'inner_peace', buildingType: 'inner_residence', type: 'auspicious',
        title: '内门祥和', description: '内门居所灵气充沛，弟子修炼效率提升。',
        effects: { satisfactionChange: 5 }, duration: 1 },
      { id: 'inner_conflict', buildingType: 'inner_residence', type: 'disaster',
        title: '内门争执', description: '两名内门弟子因修炼资源争执，居所氛围紧张。',
        effects: { satisfactionChange: -6, spiritStoneChange: -15 }, duration: 1 },
      { id: 'inner_insight', buildingType: 'inner_residence', type: 'auspicious',
        title: '论道悟道', description: '内门弟子夜间论道，互相切磋印证，多人在讨论中有所领悟。',
        effects: { satisfactionChange: 7, cultivationBonus: 'inner', spiritStoneChange: 10 }, duration: 1 },
    ],
    core_residence: [
      { id: 'core_breakthrough', buildingType: 'core_residence', type: 'auspicious',
        title: '核心突破', description: '一名核心弟子在居所闭关多日后成功突破境界，宗门上下欢欣鼓舞！',
        effects: { satisfactionChange: 8, reputationChange: 8 }, duration: 1 },
      { id: 'core_departure', buildingType: 'core_residence', type: 'disaster',
        title: '核心出走', description: '一名核心弟子因不满宗门待遇，留下一封信后悄然离去。',
        effects: { satisfactionChange: -10, reputationChange: -5 }, duration: 1 },
    ],
    cave_mansion: [
      { id: 'cave_epiphany', buildingType: 'cave_mansion', type: 'auspicious',
        title: '洞府顿悟', description: '长老在洞府闭关时触动天地法则，修为大进！',
        effects: { satisfactionChange: 5, reputationChange: 8 }, duration: 1 },
      { id: 'cave_visitor', buildingType: 'cave_mansion', type: 'disaster',
        title: '不速之客', description: '一名散修误闯长老洞府，引发阵法反击，洞府受损。',
        effects: { spiritStoneChange: -30, satisfactionChange: -3 }, duration: 1 },
    ],
    mountain_gate: [
      { id: 'gate_guard', buildingType: 'mountain_gate', type: 'auspicious',
        title: '山门显威', description: '山门阵法灵光闪耀，震慑宵小，宗门威望提升。',
        effects: { reputationChange: 10, satisfactionChange: 2 }, duration: 1 },
      { id: 'gate_intrusion', buildingType: 'mountain_gate', type: 'disaster',
        title: '山门被袭', description: '一伙散修趁夜偷袭山门，守门弟子受伤，山门受损。',
        effects: { spiritStoneChange: -40, satisfactionChange: -4 }, duration: 1 },
      { id: 'gate_guest', buildingType: 'mountain_gate', type: 'auspicious',
        title: '贵客临门', description: '一位德高望重的前辈路过山门，对宗门赞赏有加，留下指点。',
        effects: { reputationChange: 15, satisfactionChange: 5 }, duration: 1 },
      { id: 'gate_escape', buildingType: 'mountain_gate', type: 'disaster',
        title: '囚犯脱逃', description: '一名被囚禁的妖修趁守卫松懈时挣脱束缚，打伤守卫后逃窜。',
        effects: { spiritStoneChange: -30, satisfactionChange: -6, reputationChange: -5 }, duration: 1 },
    ],
    servant_hall: [
      { id: 'servant_diligent', buildingType: 'servant_hall', type: 'auspicious',
        title: '杂役勤勉', description: '杂役弟子们勤勉工作，杂役堂产出大幅提升！',
        effects: { outputMultiplier: 1.5, satisfactionChange: 3, spiritStoneChange: 30 }, duration: 2 },
      { id: 'servant_lazy', buildingType: 'servant_hall', type: 'disaster',
        title: '杂役怠工', description: '杂役弟子们懈怠懒散，产出下降，需加强管理。',
        effects: { outputMultiplier: 0.5, satisfactionChange: -5, spiritStoneChange: -15 }, duration: 2 },
      { id: 'servant_talent', buildingType: 'servant_hall', type: 'auspicious',
        title: '璞玉发现', description: '一名杂役弟子在劳作时无意中展露惊人天赋，是可造之材！',
        effects: { satisfactionChange: 4, spiritStoneChange: 10 }, duration: 1 },
      { id: 'servant_injury', buildingType: 'servant_hall', type: 'disaster',
        title: '劳作事故', description: '杂役堂搬运重物时发生事故，多名杂役弟子受伤。',
        effects: { satisfactionChange: -7, spiritStoneChange: -20 }, duration: 1 },
    ],
    lecture_hall: [
      { id: 'lecture_inspire', buildingType: 'lecture_hall', type: 'auspicious',
        title: '讲经入神', description: '讲经堂长老讲道深入浅出，众弟子如痴如醉，修炼进度大增。',
        effects: { satisfactionChange: 6, cultivationBonus: 'all' }, duration: 1 },
      { id: 'lecture_dispute', buildingType: 'lecture_hall', type: 'disaster',
        title: '讲经争执', description: '两名弟子在讲经堂因功法见解不同发生争执，扰乱秩序。',
        effects: { satisfactionChange: -4, spiritStoneChange: -10 }, duration: 1 },
      { id: 'lecture_master', buildingType: 'lecture_hall', type: 'auspicious',
        title: '名师出山', description: '一位隐居多年的宗门前辈突然现身讲经堂，亲自开坛讲法！',
        effects: { satisfactionChange: 10, reputationChange: 12, spiritStoneChange: 30 }, duration: 1 },
    ],
    formation_hall: [
      { id: 'formation_breakthrough', buildingType: 'formation_hall', type: 'auspicious',
        title: '阵法突破', description: '阵堂长老在阵法研究中取得突破，宗门护山大阵威力大增！',
        effects: { reputationChange: 10, satisfactionChange: 3, spiritStoneChange: 20 }, duration: 2 },
      { id: 'formation_collapse', buildingType: 'formation_hall', type: 'disaster',
        title: '阵法反噬', description: '阵堂试验新阵法时失控，灵气暴走，阵堂受损严重。',
        effects: { spiritStoneChange: -60, satisfactionChange: -5, reputationChange: -3 }, duration: 2 },
    ],
    artifact_hall: [
      { id: 'artifact_masterpiece', buildingType: 'artifact_hall', type: 'auspicious',
        title: '神兵出世', description: '炼器堂成功炼制出一件极品法器，器成之日霞光万丈！',
        effects: { reputationChange: 15, satisfactionChange: 5, spiritStoneChange: 50 }, duration: 1 },
      { id: 'artifact_failure', buildingType: 'artifact_hall', type: 'disaster',
        title: '炼器失败', description: '炼器堂在炼制高阶法器时失败，材料尽毁，炉鼎受损。',
        effects: { spiritStoneChange: -50, satisfactionChange: -4 }, duration: 1 },
    ],
    talisman_hall: [
      { id: 'talisman_inspire', buildingType: 'talisman_hall', type: 'auspicious',
        title: '符道灵感', description: '符堂弟子在绘制符箓时灵光一闪，创出一种新的符箓画法！',
        effects: { outputMultiplier: 1.6, satisfactionChange: 4, spiritStoneChange: 25 }, duration: 1 },
      { id: 'talisman_backfire', buildingType: 'talisman_hall', type: 'disaster',
        title: '符箓反噬', description: '符堂弟子绘制高阶符箓时灵力失控，符箓爆炸，多人受伤。',
        effects: { spiritStoneChange: -35, satisfactionChange: -6 }, duration: 1 },
    ],
    beast_ground: [
      { id: 'beast_evolve', buildingType: 'beast_ground', type: 'auspicious',
        title: '灵兽进阶', description: '灵兽园中的一只灵兽突然进阶，血脉觉醒，实力大增！',
        effects: { satisfactionChange: 5, reputationChange: 8 }, duration: 1 },
      { id: 'beast_rampage', buildingType: 'beast_ground', type: 'disaster',
        title: '灵兽暴走', description: '灵兽园中的灵兽受惊暴走，冲破围栏，造成混乱。',
        effects: { spiritStoneChange: -30, satisfactionChange: -7 }, duration: 1 },
      { id: 'beast_birth', buildingType: 'beast_ground', type: 'auspicious',
        title: '灵兽繁衍', description: '灵兽园中的灵兽产下幼崽，新生命带来勃勃生机。',
        effects: { satisfactionChange: 6, spiritStoneChange: 20 }, duration: 1 },
    ],
    skyscraper_tower: [
      { id: 'tower_vision', buildingType: 'skyscraper_tower', type: 'auspicious',
        title: '通天显兆', description: '通天塔顶霞光万道，隐隐有天音传来，预示着飞升之路即将开启。',
        effects: { reputationChange: 20, satisfactionChange: 8 }, duration: 1 },
      { id: 'tower_tremor', buildingType: 'skyscraper_tower', type: 'disaster',
        title: '通天震动', description: '通天塔突然剧烈震动，塔身出现裂纹，似有封印松动。',
        effects: { spiritStoneChange: -100, satisfactionChange: -5, reputationChange: -5 }, duration: 2 },
    ],
  };
  for (const building of buildings) {
    if (building.status !== 'active') continue;
    const pool = BUILDING_EVENT_POOL[building.type];
    if (!pool) continue;
    if (random() > 0.08) continue;
    const event = pool[Math.floor(random() * pool.length)];
    events.push({ ...event, id: `${event.id}_${building.id}` });
  }
  return events;
}

/**
 * 生成分支选择事件
 */
export function generateChoiceEvent(
  gameDate: GameDate, reputation: number, spiritStones: number,
  random: () => number = Math.random,
): ChoiceEvent | null {
  if (random() > 0.35) return null;

  // 季节事件（春季/夏季/秋季/冬季各有特色）
  const month = gameDate.month;
  const seasonalEvents: ChoiceEvent[] = [
    { id: 'spring_planting', title: '春耕大典',
      description: '春回大地，灵田即将播种。长老建议举办一场春耕大典，祈求今年灵草丰收。',
      choices: [
        { label: '举办大典', description: '耗费灵石举办典礼，提振士气。',
          effects: { spiritStoneChange: -80, satisfactionChange: 5, notificationText: '春耕大典顺利举行，弟子们干劲十足，满意度+5。' } },
        { label: '一切从简', description: '不搞形式，直接播种。',
          effects: { notificationText: '灵田完成播种，一切如常。' } },
      ] },
    { id: 'summer_tournament', title: '夏日论武',
      description: '盛夏酷暑，弟子们提议举办一场夏日论武大会，切磋技艺，活跃气氛。',
      choices: [
        { label: '举办论武', description: '组织弟子比试，胜者有奖。',
          effects: { spiritStoneChange: -50, satisfactionChange: 6, notificationText: '夏日论武热闹非凡，胜者获得奖励，满意度+6。' } },
        { label: '静心修炼', description: '夏日正适合闭关静修，不宜喧哗。',
          effects: { satisfactionChange: 2, notificationText: '弟子们静心修炼，进步平稳。' } },
      ] },
    { id: 'autumn_harvest', title: '秋收祭典',
      description: '金秋时节，灵草丰收在即。有弟子提议举办秋收祭典感谢天地。',
      choices: [
        { label: '隆重祭典', description: '大办祭典，宴请周边宗门。',
          effects: { spiritStoneChange: -100, reputationChange: 15, satisfactionChange: 4, notificationText: '秋收祭典宾客满堂，宗门声望+15。' } },
        { label: '低调庆祝', description: '宗门内部简单庆祝即可。',
          effects: { satisfactionChange: 3, notificationText: '内部庆祝温馨融洽，满意+3。' } },
      ] },
    { id: 'winter_defense', title: '冬防部署',
      description: '寒冬将至，山门需要加固防御、储备物资，以应对可能出现的妖兽袭扰。',
      choices: [
        { label: '全面加固', description: '投入灵石加固防御，储备物资。',
          effects: { spiritStoneChange: -120, satisfactionChange: 3, notificationText: '宗门防御加固完成，弟子们安心过冬。' } },
        { label: '维持现状', description: '现有防御足以应对一般威胁。',
          effects: { notificationText: '冬季安然度过，未发生重大事件。' } },
      ] },
  ];

  // 根据月份加权选择季节事件
  const seasonPool: ChoiceEvent[] = [];
  if (month >= 3 && month <= 5) seasonPool.push(seasonalEvents[0]); // 春季
  if (month >= 6 && month <= 8) seasonPool.push(seasonalEvents[1]); // 夏季
  if (month >= 9 && month <= 11) seasonPool.push(seasonalEvents[2]); // 秋季
  if (month <= 2 || month === 12) seasonPool.push(seasonalEvents[3]); // 冬季

  const pool: ChoiceEvent[] = [
    ...seasonPool,
    { id: 'treasure_fall', title: '天降异宝',
      description: '一道流星划过天际，落在宗门后山。弟子来报，疑似天外陨铁或某种异宝。你打算如何处理？',
      choices: [
        { label: '据为己有', description: '将此宝收入宗门仓库，提升宗门底蕴。',
          effects: { spiritStoneChange: 200, karmaChange: -5, notificationText: '你将异宝收入宗门，宗门灵石+200，但正邪度-5。' } },
        { label: '拱手让出', description: '大方展示此宝，广邀周边修士共赏，博取名声。',
          effects: { reputationChange: 30, karmaChange: 5, notificationText: '你公开展示异宝，名声大振，声望+30，正邪度+5。' } },
      ] },
    { id: 'wandering_monk', title: '云游散修',
      description: '一名衣衫褴褛的散修前来投靠，自称曾是一方大能，但因仇家追杀流落至此。',
      choices: [
        { label: '收留庇护', description: '广结善缘，收留这位散修。',
          effects: { reputationChange: 15, karmaChange: 5, notificationText: '你收留了散修，他感激不尽，宗门声望+15。' } },
        { label: '婉言谢绝', description: '多一事不如少一事，赠予盘缠让其离去。',
          effects: { spiritStoneChange: -50, notificationText: '你赠予散修50灵石盘缠，对方叹息离去。' } },
      ] },
    { id: 'demon_attack', title: '邪修滋事',
      description: '一群邪修在宗门附近滋事，劫掠过往凡人。弟子们请示是否出手干预。',
      choices: [
        { label: '出手除魔', description: '派出弟子剿灭邪修，维护一方平安。',
          effects: { reputationChange: 25, karmaChange: 8, satisfactionChange: 3, notificationText: '你派出弟子剿灭邪修，百姓赞颂，声望+25。' } },
        { label: '明哲保身', description: '宗门事务繁忙，不宜多生事端。',
          effects: { karmaChange: -3, satisfactionChange: -2, notificationText: '你选择袖手旁观，弟子略有微词。' } },
      ] },
    { id: 'spirit_vein', title: '灵脉异动',
      description: '在矿洞深处发现一条新的灵脉分支，但开采需要大量灵石投入。',
      choices: [
        { label: '全力开采', description: '投入灵石开辟新矿脉，长期收益可观。',
          effects: { spiritStoneChange: -200, reputationChange: 10, notificationText: '你投入200灵石开辟新矿脉，未来收益可期。' } },
        { label: '暂缓开发', description: '当前资源紧张，先标记位置以后再说。',
          effects: { notificationText: '你命人记录了灵脉位置，留待日后开发。' } },
      ] },
    { id: 'disaster_aid', title: '灾民求助',
      description: '附近城镇遭遇妖灾，大量难民逃到山门前求助。弟子们等待你的决断。',
      choices: [
        { label: '开仓赈济', description: '打开粮仓，收留难民。',
          effects: { spiritStoneChange: -100, reputationChange: 20, karmaChange: 8, satisfactionChange: 3, notificationText: '你收留难民，善名远播，声望+20。' } },
        { label: '遣散难民', description: '宗门资源有限，赠予一些干粮后请他们另寻他处。',
          effects: { spiritStoneChange: -20, karmaChange: -3, notificationText: '你分发了一些干粮后遣散了难民。' } },
      ] },
    { id: 'inner_competition', title: '弟子内卷',
      description: '内门弟子之间竞争日益激烈，有长老提议完善弟子排名制度，激励修炼。',
      choices: [
        { label: '设立排名榜', description: '公开排名，奖励优秀弟子。',
          effects: { spiritStoneChange: -60, satisfactionChange: 4, notificationText: '排名榜设立后，弟子修炼热情高涨，满意度+4。' } },
        { label: '保持现状', description: '修炼之道贵在自觉，不宜过度竞争。',
          effects: { satisfactionChange: -1, notificationText: '弟子们略微失望，修炼氛围维持原状。' } },
      ] },
  ];
  return pool[Math.floor(random() * pool.length)];
}

/**
 * 连锁事件配置表：定义哪些选择事件的分支会触发后续连锁事件
 */
const CHAIN_EVENT_CONFIGS: ChainEvent[] = [
  // 春耕大典 → 灵草丰收
  { id: 'chain_spring_harvest', triggerEventId: 'spring_planting', triggerChoice: '举办大典', delayMonths: 3,
    title: '灵草丰收', description: '春耕大典的祈福灵验了！今年灵田的灵草长势喜人，收成远超预期。',
    type: 'auspicious', effects: { spiritStoneChange: 150, reputationChange: 8, satisfactionChange: 3, notificationText: '灵草大丰收，宗门获得额外灵石+150，声望+8。' }, oneTime: true },
  // 夏日论武 → 发现天才弟子
  { id: 'chain_tournament_talent', triggerEventId: 'summer_tournament', triggerChoice: '举办论武', delayMonths: 1,
    title: '论武发现天才', description: '夏日论武中，一名外门弟子表现出色，竟是隐藏的练武奇才！',
    type: 'auspicious', effects: { satisfactionChange: 8, reputationChange: 5, notificationText: '你在论武中发现一名天才弟子，满意度+8，声望+5。' }, oneTime: true },
  // 秋收祭典 → 邻宗结盟
  { id: 'chain_autumn_alliance', triggerEventId: 'autumn_harvest', triggerChoice: '隆重祭典', delayMonths: 2,
    title: '邻宗结盟意向', description: '秋收祭典上宴请的宗门对你印象极佳，派使者前来商议结盟事宜。',
    type: 'auspicious', effects: { reputationChange: 20, karmaChange: 3, notificationText: '邻宗主动示好，声望+20，正邪度+3。' }, oneTime: true },
  // 冬防部署 → 发现遗迹
  { id: 'chain_winter_ruins', triggerEventId: 'winter_defense', triggerChoice: '全面加固', delayMonths: 2,
    title: '防御工事发现遗迹', description: '弟子们在加固山门防御时，意外挖出一处古代遗迹入口！',
    type: 'auspicious', effects: { reputationChange: 10, satisfactionChange: 5, notificationText: '发现古代遗迹，声望+10，满意度+5。' }, oneTime: true },
  // 天降异宝（据为己有）→ 引来觊觎
  { id: 'chain_treasure_covet', triggerEventId: 'treasure_fall', triggerChoice: '据为己有', delayMonths: 2,
    title: '异宝消息走漏', description: '宗门得到异宝的消息走漏，引来各方觊觎，周边开始出现可疑修士。',
    type: 'disaster', effects: { reputationChange: -5, satisfactionChange: -3, notificationText: '异宝消息走漏，声望-5，满意度-3，需警惕觊觎者。' }, oneTime: true },
  // 天降异宝（拱手让出）→ 名望大涨
  { id: 'chain_treasure_fame', triggerEventId: 'treasure_fall', triggerChoice: '拱手让出', delayMonths: 1,
    title: '仁义之名远播', description: '你慷慨展示异宝的举动传遍四方，天下修士称赞你的仁义之风。',
    type: 'auspicious', effects: { reputationChange: 25, karmaChange: 5, notificationText: '仁义之名远播，声望+25，正邪度+5。' }, oneTime: true },
  // 云游散修（收留）→ 贡献秘法
  { id: 'chain_wanderer_secret', triggerEventId: 'wandering_monk', triggerChoice: '收留庇护', delayMonths: 3,
    title: '散修献上秘法', description: '被你收留的散修伤势痊愈，为表感激献上一部失传的秘法功法。',
    type: 'auspicious', effects: { reputationChange: 10, satisfactionChange: 5, notificationText: '散修献上秘法，宗门底蕴增加，声望+10，满意度+5。' }, oneTime: true },
  // 邪修滋事（出手除魔）→ 邪修报复
  { id: 'chain_demon_retaliation', triggerEventId: 'demon_attack', triggerChoice: '出手除魔', delayMonths: 2,
    title: '邪修报复', description: '上次剿灭的邪修同伙前来报复，趁夜袭击了宗门的外围设施。',
    type: 'disaster', effects: { spiritStoneChange: -60, satisfactionChange: -5, notificationText: '邪修报复袭击，灵石损失60，满意度-5。' }, oneTime: true },
  // 灵脉异动（全力开采）→ 矿难
  { id: 'chain_mine_collapse', triggerEventId: 'spirit_vein', triggerChoice: '全力开采', delayMonths: 1,
    title: '矿洞塌方', description: '新矿脉开采过于急进，矿洞结构不稳发生塌方，几名矿工受伤。',
    type: 'disaster', effects: { spiritStoneChange: -40, satisfactionChange: -4, notificationText: '矿洞塌方，灵石损失40，满意度-4。' }, oneTime: true },
  // 灾民求助（开仓赈济）→ 感恩来投
  { id: 'chain_refugee_grateful', triggerEventId: 'disaster_aid', triggerChoice: '开仓赈济', delayMonths: 2,
    title: '灾民感恩来投', description: '被你收留的灾民中，有几个拥有修炼天赋的年轻人恳请加入宗门。',
    type: 'auspicious', effects: { satisfactionChange: 5, reputationChange: 10, notificationText: '有天赋的灾民请求加入宗门，满意度+5，声望+10。' }, oneTime: true },
  // 弟子内卷（设立排名榜）→ 修炼热潮
  { id: 'chain_ranking_boost', triggerEventId: 'inner_competition', triggerChoice: '设立排名榜', delayMonths: 1,
    title: '修炼热潮', description: '排名榜设立后，弟子们修炼热情空前高涨，宗门上下掀起一股修炼热潮。',
    type: 'auspicious', effects: { satisfactionChange: 5, reputationChange: 3, notificationText: '修炼热潮席卷宗门，满意度+5，声望+3。' }, oneTime: true },
];

/**
 * 根据已解决的分支选择事件，生成待触发的连锁事件
 */
export function generateChainEvents(
  resolvedChoiceEventId: string,
  chosenLabel: string,
  currentMonth: number, // year * 12 + month
): PendingChainEvent[] {
  const pending: PendingChainEvent[] = [];
  for (const cfg of CHAIN_EVENT_CONFIGS) {
    if (cfg.triggerEventId === resolvedChoiceEventId && cfg.triggerChoice === chosenLabel) {
      pending.push({
        chainId: cfg.id,
        scheduledMonth: currentMonth + cfg.delayMonths,
        event: { ...cfg },
      });
    }
  }
  return pending;
}

/**
 * 检查并激活到期的连锁事件
 */
export function processPendingChainEvents(
  pendingEvents: PendingChainEvent[],
  currentMonth: number,
): { activated: ChainEvent[]; remaining: PendingChainEvent[] } {
  const activated: ChainEvent[] = [];
  const remaining: PendingChainEvent[] = [];
  for (const pe of pendingEvents) {
    if (pe.scheduledMonth <= currentMonth) {
      activated.push(pe.event);
    } else {
      remaining.push(pe);
    }
  }
  return { activated, remaining };
}

/**
 * 市场物价波动系统
 * 
 * 每月自动微调商店物品价格，波动范围 ±20%
 * 受以下因素影响：
 *   - 基准价格（shop.ts 中的 price）
 *   - 上次波动值（平滑过渡）
 *   - 随机因子
 *   - 宗门声望影响（高声望→折扣）
 *   - 随机事件影响（如"灵草丰收季"降价）
 */

/** 价格波动配置 */
export interface PriceFluctuationConfig {
  basePrice: number;
  currentMultiplier: number;   // 当前价格倍率（0.8 ~ 1.2）
  trend: number;               // 趋势方向（-0.02 ~ 0.02，每月微调）
}

/** 生成新的月度价格波动 */
export function generatePriceFluctuations(
  currentMultipliers: Record<string, number>,
  reputation: number,
  random: () => number = Math.random,
): Record<string, number> {
  const newMultipliers: Record<string, number> = {};
  
  for (const [itemId, currentMult] of Object.entries(currentMultipliers)) {
    // 随机漂移
    const drift = (random() - 0.5) * 0.06; // -0.03 ~ 0.03
    
    // 均值回归：向 1.0 缓慢回归
    const reversion = (1.0 - currentMult) * 0.1;
    
    // 声望影响：高声望享折扣（最高 -5%）
    const reputationBonus = Math.max(-0.05, Math.min(0, reputation * 0.0001));
    
    // 合成新倍率
    let newMult = currentMult + drift + reversion + reputationBonus;
    
    // 钳制到 [0.8, 1.2]
    newMult = Math.max(0.8, Math.min(1.2, newMult));
    
    newMultipliers[itemId] = Math.round(newMult * 1000) / 1000;
  }
  
  return newMultipliers;
}

/**
 * 商店物品最终价格计算
 */
export function calculateShopPrice(
  basePrice: number,
  priceMultiplier: number,
): number {
  return Math.floor(basePrice * priceMultiplier);
}

/**
 * 宗门气运系统
 */

/** 气运变化事件配置 */
const FORTUNE_EVENTS: { id: string; delta: number; condition: string }[] = [
  { id: 'fortune_good_deed', delta: 5, condition: '行善' },
  { id: 'fortune_evil_deed', delta: -5, condition: '作恶' },
  { id: 'fortune_tournament_win', delta: 10, condition: '大比夺冠' },
  { id: 'fortune_disciple_defect', delta: -8, condition: '弟子叛逃' },
  { id: 'fortune_disciple_death', delta: -3, condition: '弟子寿终' },
  { id: 'fortune_building_upgrade', delta: 2, condition: '建筑升级' },
  { id: 'fortune_sect_promote', delta: 15, condition: '宗门晋升' },
];

/**
 * 更新宗门气运
 */
export function updateSectFortune(
  currentFortune: number,
  events: { type: string; delta: number }[],
): number {
  let newFortune = currentFortune;
  for (const evt of events) {
    newFortune += evt.delta;
  }
  return Math.max(-100, Math.min(100, newFortune));
}

/**
 * 检查是否触发天灾
 * 每10-20年触发一次，气运越低概率越高
 */
export function checkCalamityTrigger(
  year: number,
  lastCalamityYear: number,
  sectFortune: number,
  random: () => number = Math.random,
): boolean {
  const yearsSinceLastCalamity = year - lastCalamityYear;
  if (yearsSinceLastCalamity < 10) return false;
  // 基础概率 + 气运影响（气运越低越容易触发）
  const baseChance = 0.08;
  const fortuneModifier = (50 - sectFortune) / 500; // 气运-100时+30%，+100时-10%
  const chance = baseChance + fortuneModifier;
  return random() < chance;
}

/**
 * 生成天灾事件
 */
const CALAMITY_CONFIGS: CalamityEvent[] = [
  { id: 'calamity_thunder', type: 'heavenly_thunder', title: '天劫雷暴', description: '九天神雷降临，宗门建筑受损，多名弟子被雷击受伤。', warningMonths: 3, warningTitle: '天象异变', warningDescription: '天空中乌云密布，隐隐有雷光闪烁，似有天劫将至。', effects: { spiritStoneChange: -200, satisfactionChange: -10, discipleInjuryChance: 0.3, durationMonths: 1 } },
  { id: 'calamity_beast', type: 'beast_tide', title: '兽潮来袭', description: '大量妖兽从山林中涌出，疯狂冲击宗门防线！', warningMonths: 2, warningTitle: '妖兽异动', warningDescription: '探子来报，附近山林中妖兽活动异常频繁，恐有兽潮。', effects: { spiritStoneChange: -300, reputationChange: -15, satisfactionChange: -8, discipleInjuryChance: 0.2, durationMonths: 2 } },
  { id: 'calamity_vein', type: 'spirit_vein_dry', title: '灵脉枯竭', description: '宗门地下的灵脉突然枯竭，所有建筑产出大幅下降。', warningMonths: 4, warningTitle: '灵脉异动', warningDescription: '宗门灵脉灵气波动异常，似乎有枯竭的征兆。', effects: { outputMultiplier: 0.5, satisfactionChange: -15, durationMonths: 6 } },
  { id: 'calamity_secret', type: 'secret_realm_open', title: '秘境开启', description: '宗门附近突然出现一座上古秘境入口，蕴含无数机缘！', warningMonths: 1, warningTitle: '地动山摇', warningDescription: '宗门附近大地震动，隐隐有霞光从地底透出。', effects: { reputationChange: 20, spiritStoneChange: 500, satisfactionChange: 10, durationMonths: 3 } },
  { id: 'calamity_demon', type: 'demon_incursion', title: '魔道入侵', description: '一群魔道修士大举入侵，宗门上下陷入苦战！', warningMonths: 2, warningTitle: '魔道集结', warningDescription: '探子发现大量魔道修士在宗门附近集结，意图不轨。', effects: { spiritStoneChange: -500, reputationChange: -20, satisfactionChange: -12, discipleInjuryChance: 0.4, durationMonths: 2 } },
];

export function generateCalamity(sectFortune: number, random: () => number = Math.random): CalamityEvent {
  // 气运低时偏向负面天灾，气运高时偏向正面机遇
  const negativeChance = 0.5 + (50 - sectFortune) / 200; // -100时100%, +100时25%
  const calamities = CALAMITY_CONFIGS.filter(c => {
    if (c.type === 'secret_realm_open') return random() > negativeChance;
    return true;
  });
  return calamities[Math.floor(random() * calamities.length)];
}

/**
 * 大额支出途径：护山大阵维护费
 * 按山门等级和宗门等级计算
 */
export function calculateMountainGuardCost(
  mountainGateLevel: number,
  sectLevelIndex: number, // 0=founding, 1=known, etc.
): number {
  return Math.floor(50 + mountainGateLevel * 20 + sectLevelIndex * 30);
}

/**
 * 大额支出途径：宗门扩张费用
 * 每次扩张消耗灵石，扩张后增加建筑位
 */
export function calculateExpansionCost(
  currentExpansionCount: number,
): number {
  // 首次扩张500，后续每次递增
  return 500 + currentExpansionCount * 300;
}

/**
 * 大额支出途径：弟子福利发放
 * 按弟子身份发放灵石，提升满意度
 */
export function calculateDiscipleWelfareCost(
  discipleCount: number,
  generosityLevel: number, // 1=普通, 2=丰厚, 3=优厚
): { cost: number; satisfactionGain: number } {
  const costPerDisciple = generosityLevel * 10;
  const satisfactionGain = generosityLevel * 2;
  return {
    cost: discipleCount * costPerDisciple,
    satisfactionGain,
  };
}

/**
 * 检查宗门灭亡条件
 */
export function checkSectCollapse(
  spiritStones: number, disciples: Disciple[], reputation: number,
  monthsConsecutiveNegative: number,
): { collapsed: boolean; reason: string } {
  if (disciples.filter(d => d.status !== 'mortal').length === 0)
    return { collapsed: true, reason: '宗门弟子全数离去，道统断绝。' };
  if (monthsConsecutiveNegative >= 12 && spiritStones < -5000)
    return { collapsed: true, reason: `宗门连续 ${monthsConsecutiveNegative} 个月灵石赤字，负债累累，宗门解散。` };
  if (reputation <= -500)
    return { collapsed: true, reason: '宗门声名狼藉，为正道所不容，被联合剿灭。' };
  return { collapsed: false, reason: '' };
}

/**
 * 师徒传承系统：师傅寿终时触发衣钵继承
 */
export function processMasterInheritance(
  master: Disciple, allDisciples: Disciple[],
  createNotification: (type: 'info' | 'success' | 'warning' | 'danger', title: string, content: string, date: GameDate) => Notification,
  date: GameDate, random: () => number = Math.random,
): { notifications: Notification[]; updatedDisciples: Disciple[] } {
  const notifications: Notification[] = [];
  const updatedDisciples: Disciple[] = [];
  const apprentices = allDisciples.filter(d => d.master === master.name);
  if (apprentices.length === 0) return { notifications, updatedDisciples };
  const apprentice = apprentices.reduce((best, d) => d.contributionPoints > best.contributionPoints ? d : best);
  if (master.learnedTechnique && random() < 0.5) {
    apprentice.learnedTechnique = master.learnedTechnique;
    notifications.push(createNotification('success', '衣钵传承', `${apprentice.name}继承了师傅${master.name}的功法「${master.learnedTechnique.name}」。`, date));
  }
  if (master.equippedArtifact && random() < 0.4) {
    apprentice.equippedArtifact = master.equippedArtifact;
    notifications.push(createNotification('success', '衣钵传承', `${apprentice.name}继承了师傅${master.name}的法器。`, date));
  }
  const inheritedContribution = Math.floor(master.contributionPoints * 0.5);
  if (inheritedContribution > 0) {
    apprentice.contributionPoints += inheritedContribution;
    notifications.push(createNotification('info', '衣钵传承', `${apprentice.name}继承了师傅${master.name}的 ${inheritedContribution} 点贡献。`, date));
  }
  updatedDisciples.push(apprentice);
  return { notifications, updatedDisciples };
}

/**
 * 每月涌现事件统一入口
 */
export interface MonthlyProcessResult {
  notifications: Notification[];
  sectHistories: SectHistoryEntry[];
  spiritStoneChange: number;
  reputationChange: number;
  karmaChange: number;
  buildingEvents: BuildingEvent[];
  choiceEvent: ChoiceEvent | null;
  collapsed: boolean;
  collapseReason: string;
  updatedDisciples: Disciple[];
}

export function processMonthlyEmergentEvents(
  disciples: Disciple[], buildings: Building[],
  spiritStones: number, reputation: number, karma: number,
  monthsConsecutiveNegative: number, gameDate: GameDate,
  createNotification: (type: 'info' | 'success' | 'warning' | 'danger', title: string, content: string, date: GameDate) => Notification,
  random: () => number = Math.random,
): MonthlyProcessResult {
  const notifications: Notification[] = [];
  const sectHistories: SectHistoryEntry[] = [];
  let spiritStoneChange = 0, reputationChange = 0, karmaChange = 0;
  let updatedDisciples: Disciple[] = [];

  // 1. 关系网生成
  const newRelations = generateDiscipleRelationships(disciples, random);
  for (const rel of newRelations) {
    const a = rel.a; const b = rel.b;
    if (rel.type === 'friend') {
      a.friends.push(b.name); b.friends.push(a.name);
      notifications.push(createNotification('info', '结交好友', `${a.name}与${b.name}结为好友。`, gameDate));
    } else if (rel.type === 'dao_partner') {
      a.daoPartner = b.name; b.daoPartner = a.name;
      notifications.push(createNotification('success', '喜结道侣', `${a.name}与${b.name}结为道侣，双修可增益修为。`, gameDate));
    } else if (rel.type === 'rival') {
      a.rival = b.name; b.rival = a.name;
      notifications.push(createNotification('warning', '结为宿敌', `${a.name}与${b.name}成为宿敌，需留意内部矛盾。`, gameDate));
    }
    updatedDisciples.push(a); updatedDisciples.push(b);
  }

  // 2. 建筑随机事件
  const buildingEvents = generateBuildingEvents(buildings, random);
  for (const event of buildingEvents) {
    notifications.push(createNotification(
      event.type === 'auspicious' ? 'success' : 'danger',
      `【${event.title}】`, event.description, gameDate,
    ));
    sectHistories.push({ id: generateId(), date: gameDate, type: 'building_event', title: event.title, description: event.description });
    if (event.effects.spiritStoneChange) spiritStoneChange += event.effects.spiritStoneChange;
    if (event.effects.reputationChange) reputationChange += event.effects.reputationChange;
    if (event.effects.satisfactionChange) {
      const target = disciples[Math.floor(random() * disciples.length)];
      if (target) { target.satisfaction = clamp(target.satisfaction + event.effects.satisfactionChange, 0, 100); updatedDisciples.push(target); }
    }
  }

  // 3. 分支选择事件
  const choiceEvent = generateChoiceEvent(gameDate, reputation, spiritStones, random);

  // 4. 灭亡检查
  const { collapsed, reason } = checkSectCollapse(spiritStones, disciples, reputation, monthsConsecutiveNegative);

  return { notifications, sectHistories, spiritStoneChange, reputationChange, karmaChange, buildingEvents, choiceEvent, collapsed, collapseReason: reason, updatedDisciples };
}

/**
 * 处理弟子死亡与叛逃，返回统一结构让 nextMonth 合并库存、事件、宗门历史。
 *
 * 规则：
 * - 寿终：age >= maxAge（年龄按年数存储，每月 + 1/12）
 * - 叛逃：满意度连续 N 月 < 阈值 → 按身份概率触发；叛逃时按 1–3 倍身份月收入带走灵石
 * - 死亡时遗产：师傅→道侣→同门好友 →全部归仓库
 * - 叛逃时：背包/装备不带走（按用户选"少量灵石"），仅扣灵石
 *
 * 注意：本函数会**就地修改**传入 disciples 数组中仍然存活的弟子对象
 *       （仅修改继承人的装备/突破加成字段），这对 nextMonth 的 mutate 流程是安全的
 *       （调用方本身已接受 updatedDisciples.map 返回的是新对象）。
 *       为避免突变影响，这里对继承人做浅拷贝 patch。
 */
export function processDiscipleDepartures(
  inputDisciples: Disciple[],
  { year, month }: GameDate,
  createNotification: (
    kind: 'success' | 'warning' | 'danger' | 'info',
    title: string,
    description: string,
    date?: GameDate,
  ) => Notification,
): DiscipleDepartureResult {
  const date = { year, month };
  const result: DiscipleDepartureResult = {
    survivors: [],
    deadCount: 0,
    defectedCount: 0,
    stoneLossFromDefection: 0,
    notifications: [],
    sectHistories: [],
    inventoryReport: {
      artifacts: {},
      talismans: {},
      beasts: {},
      pills: {},
      specialMaterials: {},
      herbs: 0,
      iron: 0,
      paper: 0,
    },
  };

  const totalDisciples = inputDisciples.length;

  // 先做第一轮筛选：同时更新 lowSatisfactionMonths
  const living: Disciple[] = [];
  for (let i = 0; i < totalDisciples; i++) {
    // ⚠️ 不突变原输入弟子——统一浅拷贝，只把"存活下来的"浅拷贝推到 living
    const d0 = inputDisciples[i];
    const d: Disciple = { ...d0, backpack: d0.backpack ? [...d0.backpack] : d0.backpack };

    // 1) 寿命判定：age 按年存储（每月 + 1/12），≥maxAge 即寿终
    if (d.age >= d.maxAge) {
      result.deadCount += 1;
      // 继承人稍后在第二轮处理
      (d as any).__departureReason = 'death';
      result.survivors.push(d as any);
      continue;
    }

    // 2) 满意度判定：满意度 < 30 时 lowSatisfactionMonths++，否则回落
    const lowThr = 30;
    if (d.satisfaction < lowThr) {
      d.lowSatisfactionMonths = (d.lowSatisfactionMonths ?? 0) + 1;
    } else {
      d.lowSatisfactionMonths = Math.max(0, (d.lowSatisfactionMonths ?? 0) - 1);
    }

    // 3) 叛逃：连续 3 月低满意度，按身份概率触发
    const low = d.lowSatisfactionMonths ?? 0;
    const defectProbMap: Record<DiscipleStatus, number> = {
      mortal: 0, servant: 0.12, outer: 0.08, inner: 0.05, core: 0.03, elder: 0.02,
    };
    if (low >= 3 && Math.random() < (defectProbMap[d.status as DiscipleStatus] ?? 0.05)) {
      result.defectedCount += 1;
      const income = STATUS_MONTHLY_INCOME_LS[d.status as DiscipleStatus] ?? 5;
      const takeout = Math.max(1, income) * randomInt(1, 3);
      result.stoneLossFromDefection += takeout;
      (d as any).__departureReason = 'defect';
      (d as any).__defectTakeout = takeout;
      result.survivors.push(d as any);
      continue;
    }

    // 4) 满意度过 60 → 清历史（快速回归信任）
    if (d.satisfaction > 60) d.lowSatisfactionMonths = 0;

    living.push(d);
  }

  // 第二轮：处理 死亡/叛逃 的遗产/灵石/事件
  // 先把 survivors 拆成"真正存活"和"已 departure"
  const trueSurvivors: Disciple[] = [];
  const departures: Array<Disciple & {
    __departureReason: 'death' | 'defect';
    __defectTakeout?: number;
  }> = [];
  for (const s of result.survivors as any) {
    if (s.__departureReason) departures.push(s); else trueSurvivors.push(s);
  }
  // living 里全是未 departure 的，合并进 trueSurvivors（trueSurvivors 此时应是空）
  if (trueSurvivors.length > 0) {
    // 理论上不会触发（departure 走了就 push survivor，没 departure push living），防御性合并
    trueSurvivors.push(...living);
  } else {
    result.survivors = living;
  }

  // 处理 departures
  for (const dep of departures) {
    const reason = dep.__departureReason;

    // ---------- 继承人 ----------
    let heir: Disciple | undefined;
    if (reason === 'death') {
      // 候选人：在全部"真正存活"的弟子中找（living 就是活着的集合）
      const heirId = findHeirId(dep, living);
      if (heirId) {
        // 浅拷贝继承人，防止后续影响其他索引（调用方在 nextMonth 会重新 map，这里修改是暂时的）
        const idx = living.findIndex(x => x.id === heirId);
        if (idx >= 0) {
          living[idx] = { ...living[idx] };
          heir = living[idx];
        }
      }
    }

    const transfer = transferEquipToHeirOrWarehouse(heir, result.inventoryReport);

    // 装备三槽（只有死亡才传，叛逃不抢装备）
    if (reason === 'death') {
      transfer.equipArtifact(dep.equippedArtifact as ArtifactType | undefined);
      transfer.equipTalisman(dep.equippedTalisman as TalismanType | undefined);
      transfer.equipBeast(dep.equippedBeast as BeastType | undefined);
    } else {
      // 叛逃：装备全归仓库（按用户选择"净身出户+少量灵石"）
      if (dep.equippedArtifact) result.inventoryReport.artifacts[dep.equippedArtifact] =
        (result.inventoryReport.artifacts[dep.equippedArtifact] || 0) + 1;
      if (dep.equippedTalisman) result.inventoryReport.talismans[dep.equippedTalisman] =
        (result.inventoryReport.talismans[dep.equippedTalisman] || 0) + 1;
      if (dep.equippedBeast) result.inventoryReport.beasts[dep.equippedBeast] =
        (result.inventoryReport.beasts[dep.equippedBeast] || 0) + 1;
    }

    // 背包
    if (dep.backpack) {
      for (const bi of dep.backpack) {
        // 兼容 backpack 中包含 material:xxx（原材料用 kind + itemType = material:xxx）
        if ((bi.kind as string) === 'material' || (bi.itemType && bi.itemType.startsWith('material:'))) {
          transfer.rawMaterial(bi.itemType, bi.quantity);
        } else {
          transfer.backpackItem(bi);
        }
      }
    }

    // ---------- 事件通知 + 宗门历史 ----------
    if (reason === 'death') {
      let detail = `享年 ${Math.floor(dep.age)} 岁`;
      if (heir) {
        detail += `，衣钵由 ${heir.name} 继承`;
      } else {
        detail += `，遗产归入宗门库房`;
      }
      result.notifications.push(createNotification(
        'warning', '弟子仙逝',
        `${dep.name}（${DiscipleStatusNames[dep.status as DiscipleStatus]}·${RealmNames[dep.realm]}）寿终正寝，${detail}。`,
        date,
      ));
      result.sectHistories.push(makeDepartureHistory('disciple_death', date, dep, detail));

      // 师傅寿终时触发衣钵继承
      const inheritanceResult = processMasterInheritance(dep, result.survivors, createNotification, date, Math.random);
      result.notifications.push(...inheritanceResult.notifications);
      // 更新继承人的状态
      for (const updated of inheritanceResult.updatedDisciples) {
        const idx = (result.survivors as any[]).findIndex((s: any) => s.id === updated.id);
        if (idx >= 0) (result.survivors as any[])[idx] = updated;
      }
    } else {
      const takeout = dep.__defectTakeout ?? 0;
      const detail = `因长期不满叛出山门，带走 ${takeout} 灵石`;
      result.notifications.push(createNotification(
        'danger', '弟子叛逃',
        `${dep.name}（${DiscipleStatusNames[dep.status as DiscipleStatus]}·${RealmNames[dep.realm]}）${detail}。`,
        date,
      ));
      result.sectHistories.push(makeDepartureHistory('disciple_defect', date, dep, detail));
    }
  }

  return result;
}

/** 把 processDiscipleDepartures 得到的 inventoryReport 合并到各库存累加器（直接 mutate） */
export function mergeDepartureInventories(
  report: DiscipleDepartureResult['inventoryReport'],
  target: {
    pillInventory: PillInventory[];
    artifactInventory: ArtifactInventory[];
    talismanInventory: TalismanInventory[];
    beastInventory: BeastInventory[];
    specialMaterials: Record<string, number>;
    herbInventory: number;
    ironInventory: number;
    paperInventory: number;
  },
): void {
  for (const [k, v] of Object.entries(report.pills)) {
    if (!v) continue;
    const row = target.pillInventory.find(p => p.type === k as PillType);
    if (row) row.quantity += v; else target.pillInventory.push({ type: k as PillType, quantity: v });
  }
  for (const [k, v] of Object.entries(report.artifacts)) {
    if (!v) continue;
    const row = target.artifactInventory.find(p => p.type === k as any);
    if (row) row.quantity += v; else target.artifactInventory.push({ type: k as any, quantity: v });
  }
  for (const [k, v] of Object.entries(report.talismans)) {
    if (!v) continue;
    const row = target.talismanInventory.find(p => p.type === k as any);
    if (row) row.quantity += v; else target.talismanInventory.push({ type: k as any, quantity: v });
  }
  for (const [k, v] of Object.entries(report.beasts)) {
    if (!v) continue;
    const row = target.beastInventory.find(p => p.type === k as any);
    if (row) row.quantity += v; else target.beastInventory.push({ type: k as any, quantity: v });
  }
  for (const [k, v] of Object.entries(report.specialMaterials)) {
    if (!v) continue;
    target.specialMaterials[k] = (target.specialMaterials[k] || 0) + v;
  }
  target.herbInventory = Math.max(0, target.herbInventory + report.herbs);
  target.ironInventory = Math.max(0, target.ironInventory + report.iron);
  target.paperInventory = Math.max(0, target.paperInventory + report.paper);
}

// ============================================================
// 炼制系统（炼丹/炼器/制符）
// ============================================================

/** 根据材料库存判断是否可炼制 */
export function canAffordRecipe(
  recipe: Recipe,
  inventory: {
    herbInventory: number;
    ironInventory: number;
    paperInventory: number;
    specialMaterials: Record<string, number>;
  },
): boolean {
  for (const mat of recipe.baseMaterials) {
    const needed = mat.amount;
    if (BASIC_MATERIALS.has(mat.name)) {
      if (mat.name === '灵草' && inventory.herbInventory < needed) return false;
      if (mat.name === '玄铁' && inventory.ironInventory < needed) return false;
      if (mat.name === '灵铁' && inventory.ironInventory < needed) return false;
      if (mat.name === '灵纸' && inventory.paperInventory < needed) return false;
      if (mat.name === '符纸' && inventory.paperInventory < needed) return false;
      if (mat.name === '矿石' && inventory.ironInventory < needed) return false;
    } else {
      const have = inventory.specialMaterials[mat.name] ?? 0;
      if (have < needed) return false;
    }
  }
  return true;
}

/** 消耗配方材料 */
export function consumeRecipeMaterials(
  recipe: Recipe,
  inventory: {
    herbInventory: number;
    ironInventory: number;
    paperInventory: number;
    specialMaterials: Record<string, number>;
  },
): void {
  for (const mat of recipe.baseMaterials) {
    if (BASIC_MATERIALS.has(mat.name)) {
      if (mat.name === '灵草') inventory.herbInventory -= mat.amount;
      else if (mat.name === '玄铁' || mat.name === '灵铁' || mat.name === '矿石') inventory.ironInventory -= mat.amount;
      else if (mat.name === '灵纸' || mat.name === '符纸') inventory.paperInventory -= mat.amount;
    } else {
      inventory.specialMaterials[mat.name] = (inventory.specialMaterials[mat.name] ?? 0) - mat.amount;
    }
  }
  // 消耗可选辅料（如果有投入）
  if (recipe.optionalMaterials) {
    for (const mat of recipe.optionalMaterials) {
      if (!mat.optional) continue;
      // 可选辅料由调用方决定是否消耗，这里不做自动消耗
    }
  }
}

/** 计算炼制品质
 *  @param discipleTalent 弟子对应天赋值（0-100）
 *  @param buildingLevel 建筑等级（1-10）
 *  @param hasOptionalMaterials 是否投入了可选辅料
 *  @param targetQuality 目标品质
 *  @param random 随机函数
 */
export function calculateCraftingQuality(
  discipleTalent: number,
  buildingLevel: number,
  hasOptionalMaterials: boolean,
  random: () => number = Math.random,
): ItemQuality {
  // 基础分：天赋（0-50分）+ 建筑等级（0-20分）
  const baseScore = (discipleTalent / 100) * 50 + (buildingLevel / 10) * 20;
  // 辅料加成
  const materialBonus = hasOptionalMaterials ? 15 : 0;
  // 随机波动
  const roll = random() * 25;

  const totalScore = baseScore + materialBonus + roll;

  if (totalScore >= 85) return 'immortal';
  if (totalScore >= 60) return 'perfect';
  if (totalScore >= 35) return 'fine';
  return 'mortal';
}

/** 获取弟子对应炼制类别的天赋值 */
export function getDiscipleCraftingTalent(disciple: Disciple, category: 'pill' | 'artifact' | 'talisman'): number {
  const { spiritRhythm, rootBone, daoFate } = disciple.hiddenTalents;
  switch (category) {
    case 'pill': return spiritRhythm * 0.7 + rootBone * 0.3;
    case 'artifact': return rootBone * 0.6 + daoFate * 0.4;
    case 'talisman': return spiritRhythm * 0.5 + daoFate * 0.5;
  }
}

/** 月度炼制进度处理
 *  返回：完成的炼制任务列表
 */
export function processMonthlyCrafting(
  tasks: CraftingTask[],
  inventory: {
    herbInventory: number;
    ironInventory: number;
    paperInventory: number;
    specialMaterials: Record<string, number>;
  },
  disciples: Disciple[],
  buildings: { type: string; level: number }[],
  random: () => number = Math.random,
): { completedTasks: CraftingResult[]; updatedTasks: CraftingTask[] } {
  const completedTasks: CraftingResult[] = [];
  const updatedTasks: CraftingTask[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') {
      updatedTasks.push(task);
      continue;
    }

    // 检查材料是否足够（开始炼制时已扣材料，如果中途材料不足则暂停）
    const recipe = RECIPE_MAP[task.recipeId];
    if (!recipe) {
      // 配方不存在，标记完成但无产出
      updatedTasks.push({ ...task, status: 'completed', elapsedDays: task.totalDays });
      continue;
    }

    // 推进进度
    task.elapsedDays += 1;

    if (task.elapsedDays >= task.totalDays) {
      // 炼制完成
      const disciple = disciples.find(d => d.id === task.discipleId);
      const buildingLevel = buildings
        .filter(b => b.type === 'pill_hall' || b.type === 'artifact_hall' || b.type === 'talisman_hall')
        .reduce((max, b) => Math.max(max, b.level), 1);

      const talent = disciple
        ? getDiscipleCraftingTalent(disciple, task.category)
        : 30;

      const quality = task.resultQuality ?? calculateCraftingQuality(
        talent,
        buildingLevel,
        false, // 简化处理：可选辅料由调用方管理
        random,
      );

      // 暴击判定：5%概率额外产出50%
      const isCritical = random() < 0.05;
      const actualQuantity = isCritical ? Math.ceil(task.quantity * 1.5) : task.quantity;

      completedTasks.push({
        taskId: task.id,
        recipeId: task.recipeId,
        category: task.category,
        itemType: task.itemType,
        quality,
        quantity: actualQuantity,
        isCritical,
      });

      updatedTasks.push({ ...task, status: 'completed', resultQuality: quality });
    } else {
      updatedTasks.push(task);
    }
  }

  return { completedTasks, updatedTasks };
}

/** 创建炼制任务（同时扣材料） */
export function createCraftingTask(
  recipeId: string,
  category: 'pill' | 'artifact' | 'talisman',
  itemType: string,
  discipleId: string | null,
  quantity: number,
  inventory: {
    herbInventory: number;
    ironInventory: number;
    paperInventory: number;
    specialMaterials: Record<string, number>;
  },
  random: () => string = generateId,
): CraftingTask | null {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe) return null;

  // 检查材料
  if (!canAffordRecipe(recipe, inventory)) return null;

  // 扣材料
  consumeRecipeMaterials(recipe, inventory);

  return {
    id: random(),
    recipeId,
    category,
    itemType,
    discipleId,
    targetQuality: 'mortal',
    elapsedDays: 0,
    totalDays: recipe.baseCraftTime,
    quantity,
    autoRefill: false,
    status: 'in_progress',
  };
}
