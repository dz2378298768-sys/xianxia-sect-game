import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUIStore } from '@/store/uiStore';
import type { Disciple, PromotionRules } from '@/types/disciple';
import { DiscipleStatusNames, RealmNames, RealmOrder, getRealmDisplay } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { RESIDENCE_TYPES } from '@/types/building';
import { BUILDING_CONFIGS } from '@/data/buildings';
import type { BookConfig, BookTier } from '@/data/buildings';
import { generateInitialLibraryBooks, generateRandomBook, getBookPrice, canLearnBook } from '@/utils/bookGenerator';
import type { DiscipleStatus } from '@/types/disciple';
import type { PillInventory, PillType } from '@/types/pill';
import type { ArtifactInventory, ArtifactType } from '@/types/artifact';
import type { TalismanInventory, TalismanType } from '@/types/talisman';
import type { BeastInventory } from '@/types/beast';
import type { BeastType } from '@/types/beast';
import type { SectLevel, MonthlyReport, Notification, OtherSect, DiplomaticStatus, SectAlignment } from '@/types/game';
import {
  SectLevelNames, SectLevelRequirementsMap, SectLevelOrder,
  SectLevelDiscipleCap, SectLevelReputationCap, ReputationGrowthConfig,
} from '@/types/game';
import type { Trial, ContributionLog, ContributionLogType } from '@/types/game';
import {
  createInitialDisciple, createInitialBuildings, getDefaultPromotionRules, autoAssignBuilding,
  autoAssignResidence, getResidenceUpgradeCost, getResidenceCapacityByLevel, getCaveMansionUpgradeCost,
  monthlyReassign,
  autoAssignManagers, autoLearnTechniqueOnBreakthrough, pickUpgradeBook,
  getMaintenanceCostByLevel, calculateLectureBonus, SKYSCRAPER_TOWER_COMBAT_POWER,
} from '@/utils/gameLogic';
import {
  calculateBuildingMaintenance,
  calculateBuildingOutput,
  calculateSectCombatPower,
  calculateDiscipleCombatPower,
  processMonthlyCultivation,
  processMonthlyWork,
  processMonthlyLearning,
  canAttemptBreakthrough,
  attemptBreakthrough,
  generateMonthlyReport,
  createNotification,
} from '@/utils/gameLogic';
import { randomInt, generateId } from '@/utils/random';
import { recomputeCultivationSpeed, applySatisfactionPenalty, recomputeLifespan, computeMonthlyContribution } from '@/domain/balance';
import { generateOtherSects, refreshSectRelations, generateTrials } from '@/utils/worldGenerator';
import type { SiegeReportData } from '@/store/siegeReport';
import type { TournamentConfig, TournamentResult, TournamentFrequency, FrequencyTournamentConfig } from '@/types/tournament';
import { TournamentRewardTypeNames } from '@/types/tournament';
import {
  runTournament, shouldTournamentTrigger, getDefaultTournamentConfig,
} from '@/utils/tournament';
import {
  saveToSlot as saveToSlotUtil, loadFromSlot as loadFromSlotUtil,
} from '@/utils/saveSlots';
import { SHOP_ITEMS } from '@/data/shop';
import type { ShopItem } from '@/types/shop';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';

interface GameState {
  year: number;
  month: number;
  sectName: string;
  sectLevel: SectLevel;
  reputation: number;
  karma: number;  // 正邪度：-100（极恶）~ 100（极善），0=中立
  spiritStones: number;
  sectContribution: number;  // 宗门总贡献（用于宗门晋升等大宗门内部开销）
  disciples: Disciple[];
  buildings: Building[];
  pillInventory: PillInventory[];
  artifactInventory: ArtifactInventory[];
  talismanInventory: TalismanInventory[];
  beastInventory: BeastInventory[];
  unlockedPillRecipes: PillType[];        // 已解锁丹方（丹堂可生产）
  unlockedArtifactRecipes: ArtifactType[]; // 已解锁图谱（炼器堂可生产）
  unlockedTalismanRecipes: TalismanType[]; // 已解锁符谱（符堂可生产）
  promotionRules: PromotionRules;
  notifications: Notification[];
  monthlyReport: MonthlyReport | null;
  showReport: boolean;
  // 游戏胜利（飞升）状态
  gameWon: boolean;
  victoryInfo: { discipleName: string; year: number; month: number } | null;
  herbInventory: number;
  // 兑换码：一局使用一次
  redeemCodeUsed: boolean;
  // 广告灵石奖励：累计统计
  adRewardTotal: number;
  ironInventory: number;    // 灵铁（炼器堂原料）
  paperInventory: number;   // 符纸（符堂原料）
  specialMaterials: Record<string, number>; // 特殊材料库存（材料名→数量），如 { '寿元花': 3, '灵晶': 2 }
  contributionLogs: ContributionLog[]; // 贡献值流水（所有弟子，新记录在前）
  gameStarted: boolean;
  showMainMenu: boolean;
  libraryBooks: BookConfig[]; // 藏经阁拥有的书籍
  libraryCosts: Record<BookTier, number>; // 每层藏经阁学习消耗贡献点
  otherSects: OtherSect[]; // 天下其他宗门
  trials: Trial[]; // 试炼任务列表（每年刷新）
  followedDiscipleIds: string[]; // 关注的弟子ID列表
  // 大比系统
  sectTournamentConfig: TournamentConfig;        // 山门大比配置（三频率独立）
  interSectTournamentConfig: TournamentConfig;  // 宗门大比配置（三频率独立）
  lastSectTournamentResults: Record<TournamentFrequency, TournamentResult | null>;
  lastInterSectTournamentResults: Record<TournamentFrequency, TournamentResult | null>;
  lastSectTournamentYears: Record<TournamentFrequency, number>;
  lastInterSectTournamentYears: Record<TournamentFrequency, number>;
  spiritStoneHistory: { year: number; month: number; spiritStones: number; netIncome: number }[]; // 近24月灵石收支历史
  autoAppointElder: boolean; // 是否每月自动任命符合条件核心弟子为长老
  recruitCandidates: Disciple[];           // 招收弟子候选列表（一次招 3~5 人让玩家挑）
  recruitCostPerDisciple: number;          // 每个候选人的招收费用（统一费用）
  clearRecruitCandidates: () => void;      // 清空候选
  nextMonth: () => void;
  dismissReport: () => void;
  dismissVictory: () => void;
  startGame: () => void;
  // 兑换码：输入"xiuxian"获得1000灵石，一局一次
  useRedeemCode: (code: string) => { ok: boolean; reason?: string; reward?: number };
  // 看完广告后调用：+500灵石
  grantAdReward: () => { ok: boolean; amount: number };
  resetGame: () => void;
  newGame: (sectName?: string) => void;
  returnToMenu: () => void;
  markNotificationRead: (id: string) => void;
  assignDiscipleToBuilding: (discipleId: string, buildingId: string | null) => void;
  setBuildingManager: (buildingId: string, discipleId: string | null) => void;
  upgradeBuilding: (buildingId: string) => boolean;
  downgradeBuilding: (buildingId: string) => { success: boolean; refundSpiritStones: number; refundReputation: number; reason?: string };
  toggleBuilding: (buildingId: string) => void;
  recruitDisciple: () => { candidates: Disciple[]; costPerDisciple: number };  // 返回候选列表
  recruitConfirmDisciple: (candidate: Disciple) => { ok: boolean; reason?: string };  // 确认招收一名候选弟子
  kickDisciple: (discipleId: string) => { ok: boolean; reason?: string };  // 驱逐弟子出门
  getDiscipleById: (id: string) => Disciple | undefined;
  getBuildingById: (id: string) => Building | undefined;
  buildBuilding: (type: string) => boolean;
  updatePromotionRules: (rules: Partial<PromotionRules>) => void;
  learnBook: (discipleId: string, bookId: string) => boolean;
  forgetBook: (discipleId: string, bookType: 'technique' | 'battle', bookId: string) => boolean;
  buyRandomBook: (tier: BookTier) => BookConfig | null; // 购买随机书
  setLibraryCost: (tier: BookTier, cost: number) => void; // 设置藏经阁学习消耗
  buyCaveMansion: (elderId: string) => boolean; // 长老购买洞府
  canPromoteSect: () => { canPromote: boolean; nextLevel: SectLevel | null; reasons: string[] }; // 检查是否可以晋升
  promoteSect: () => boolean; // 晋升宗门
  refreshOtherSects: () => void; // 刷新其他宗门列表
  toggleFollowDisciple: (discipleId: string) => void; // 关注/取消关注弟子
  appointElder: (discipleId: string) => { success: boolean; reason?: string }; // 任命核心弟子为长老
  setAutoAppointElder: (enabled: boolean) => void; // 设置自动任命长老开关
  updateSectTournamentFreqConfig: (frequency: TournamentFrequency, config: Partial<FrequencyTournamentConfig>) => void;   // 更新山门大比指定频率配置
  updateInterSectTournamentFreqConfig: (frequency: TournamentFrequency, config: Partial<FrequencyTournamentConfig>) => void; // 更新宗门大比指定频率配置
  triggerSectTournament: (frequency: TournamentFrequency) => TournamentResult | null;       // 手动触发山门大比（指定频率），返回结果或 null（CD中）
  triggerInterSectTournament: (frequency: TournamentFrequency) => TournamentResult | null;  // 手动触发宗门大比（指定频率），返回结果或 null（CD中）
  // 宗门互动系统
  changeSectFavorability: (sectId: string, delta: number) => void;       // 增减好感度
  setSectDiplomaticStatus: (sectId: string, status: DiplomaticStatus) => void;  // 设置外交状态（同盟/宿敌/附庸/中立）
  toggleSectTrade: (sectId: string) => boolean;                          // 开启/关闭交易
  // 存档槽系统
  saveToSlot: (slotIndex: number) => void;                              // 保存当前游戏到指定槽位
  loadFromSlot: (slotIndex: number) => boolean;                         // 从槽位读取游戏（成功返回 true）
  buyShopItem: (itemId: string) => { success: boolean; reason?: string };
  sellShopItem: (itemId: string) => { success: boolean; reason?: string; gain?: number };
  setProductionTarget: (buildingId: string, slotIndex: number, target: NonNullable<Building['productionTargets']>[number]) => void;
  clearProductionTarget: (buildingId: string, slotIndex: number) => void;
  // 建筑贡献度设置（玩家手动调整每建筑获取/扣除的贡献）
  setBuildingContributionSettings: (
    buildingId: string,
    settings: NonNullable<Building['contributionSettings']>,
  ) => void;
  // 弟子花贡献兑换仓库中的物品（玩家手动输入贡献值）
  exchangeItemByDisciple: (
    discipleId: string,
    kind: 'pill' | 'artifact' | 'talisman' | 'beast',
    itemType: string,
    contributionCost: number,
  ) => { ok: boolean; reason?: string };
  // 玩家直接赠送物品给弟子（加满意度，默认按物品等级计算，可手动覆盖）
  giftItemToDisciple: (
    discipleId: string,
    kind: 'pill' | 'artifact' | 'talisman' | 'beast',
    itemType: string,
    satisfactionBonus?: number,
  ) => { ok: boolean; reason?: string };
  equipItem: (discipleId: string, slot: 'artifact' | 'talisman' | 'beast', type: string) => boolean;
  unequipItem: (discipleId: string, slot: 'artifact' | 'talisman' | 'beast') => void;
  // 试炼系统
  refreshTrials: () => void;  // 刷新试炼列表（按本宗战力生成）
  dispatchDiscipleToTrial: (trialId: string, discipleId: string) => { ok: boolean; reason?: string };  // 派遣弟子执行试炼
  cancelTrial: (trialId: string) => void;  // 取消试炼（弟子返回，无奖励）
  // 外交系统优化
  giftSpiritStonesToSect: (sectId: string, amount: number) => { ok: boolean; reason?: string };  // 赠送灵石加好感
  insultSect: (sectId: string) => void;  // 侮辱减好感
  requestAlliance: (sectId: string) => { ok: boolean; reason?: string };  // 请求同盟（需好感+战力）
  declareRivalry: (sectId: string) => { ok: boolean; reason?: string };  // 宣布宿敌（需好感低）
  subjugateSect: (sectId: string) => { ok: boolean; reason?: string };  // 讨伐附庸（需战力碾压+战胜）
  // 灵兽系统
  buyBeast: () => { ok: boolean; reason?: string };  // 购买随机灵兽（消耗灵石）
  captureBeast: (discipleId: string) => { ok: boolean; reason?: string };  // 派遣弟子捕捉灵兽
  // 手动提升弟子身份：每次晋升一级（servant→outer→inner→core→elder），检查身份/境界/贡献阈值，达标后扣贡献并写流水；破格提升（贡献不足但符合其他硬条件且玩家确认）不扣费（本实现不做破格，必须全达标）
  promoteDisciple: (discipleId: string) => { ok: boolean; reason?: string; newStatus?: DiscipleStatus; cost?: number };
  // 查询弟子是否可以晋升下一级（返回能否晋升、下一级身份、所需条件、缺失条件说明）
  canPromoteDisciple: (discipleId: string) => {
    canPromote: boolean; nextStatus: DiscipleStatus | null; reason: string;
    minContribution?: number; minRealm?: string; minRootBone?: number;
  };
  // 洞府挑战：挑战方（必须是长老，且未住在洞府）可以挑战洞府内任一居住长老，胜者保留洞府居住权
  challengeCaveMansion: (challengerId: string, defenderId: string) => {
    success: boolean; reason?: string; winnerId?: string; loserId?: string;
  };
  // 通天塔挑战：弟子战力达到 20 万方可挑战，胜利则飞升触发游戏胜利，失败则境界跌落一级
  challengeSkyscraperTower: (discipleId: string) => {
    success: boolean; reason?: string; ascended?: boolean;
  };
}

// 库存累加辅助：找到同类型则 +1，否则新增条目
function addItem<T extends string>(inv: { type: T; quantity: number }[], type: T): { type: T; quantity: number }[] {
  const existing = inv.find(i => i.type === type);
  if (existing) {
    return inv.map(i => i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...inv, { type, quantity: 1 }];
}

// 库存扣减 1 件：数量归零则移除条目（与 addItem 对称，供出售使用）
function removeItem<T extends string>(inv: { type: T; quantity: number }[], type: T): { type: T; quantity: number }[] {
  const existing = inv.find(i => i.type === type);
  if (!existing) return inv;
  if (existing.quantity <= 1) {
    return inv.filter(i => i.type !== type);
  }
  return inv.map(i => i.type === type ? { ...i, quantity: i.quantity - 1 } : i);
}

// 工作建筑按配方生产成品：返回每个槽位的产出明细数组
// - building: 当前建筑（含 productionTargets 与 assignedDisciples）
// - state: 用于校验配方是否已解锁（unlockedPillRecipes/...）
// - mats: 当前材料累加余额（来自 nextMonth 闭包，多建筑共享同一份）
//
// 多槽位：遍历 building.productionTargets 中所有非空目标，按槽位依次生产，
// 每个槽位独立消耗材料、独立产出成品；workerCount 按槽位平均分摊。
// 修正：检查并扣除配方中【所有】材料（基础材料 灵草/灵铁/符纸 + 特殊材料），
// 任一材料不足则该配方本月无法生产。
interface ProductionResult {
  pillType?: PillType; artifactType?: ArtifactType; talismanType?: TalismanType;
  quantity: number; herbsConsumed: number; ironConsumed: number; paperConsumed: number;
  specialConsumed: Record<string, number>; // 消耗的特殊材料 { 寿元花: 5, ... }
}
function produceWorkBuilding(
  building: Building,
  state: GameState,
  mats: { herbs: number; iron: number; paper: number },
  specialMats: Record<string, number>, // 当前特殊材料库存（会被就地扣减）
): ProductionResult[] {
  const targets = building.productionTargets?.filter(t => t && (t.pillType || t.artifactType || t.talismanType)) || [];
  if (targets.length === 0) return [];

  const results: ProductionResult[] = [];
  // 工人按槽位数均分（至少1人/槽）
  const perSlotWorkers = Math.max(1, Math.floor(building.assignedDisciples.length / targets.length));

  // 基础材料名归类：丹堂=灵草，炼器堂=玄铁/灵铁/矿石，符堂=灵纸/符纸
  const isHerbName = (n: string) => n === '灵草';
  const isIronName = (n: string) => n === '玄铁' || n === '灵铁' || n === '矿石';
  const isPaperName = (n: string) => n === '灵纸' || n === '符纸';

  for (const target of targets) {
    // 选取配方
    let recipe: { materials: { name: string; amount: number }[] } | null = null;
    let productionCap = 0; // 该建筑单次产出上限（受工人限制）

    if (building.type === 'pill_hall' && target.pillType) {
      if (!state.unlockedPillRecipes.includes(target.pillType)) continue;
      recipe = PILL_CONFIGS[target.pillType] ?? null;
      productionCap = perSlotWorkers;
    } else if (building.type === 'sutra_hall' && target.artifactType) {
      if (!state.unlockedArtifactRecipes.includes(target.artifactType)) continue;
      recipe = ARTIFACT_CONFIGS[target.artifactType] ?? null;
      productionCap = Math.max(1, Math.floor(perSlotWorkers / 2)); // 法器耗时，每2工人产1件
    } else if (building.type === 'artifact_hall' && target.talismanType) {
      if (!state.unlockedTalismanRecipes.includes(target.talismanType)) continue;
      recipe = TALISMAN_CONFIGS[target.talismanType] ?? null;
      productionCap = perSlotWorkers;
    }

    if (!recipe || recipe.materials.length === 0) continue;

    // 计算每种材料可支撑的最大产量，取最小值
    let maxUnits = productionCap;
    const materialNeeds: { name: string; amount: number; isBasic: 'herb' | 'iron' | 'paper' | null }[] = [];
    for (const m of recipe.materials) {
      const isBasic = isHerbName(m.name) ? 'herb' as const
        : isIronName(m.name) ? 'iron' as const
        : isPaperName(m.name) ? 'paper' as const
        : null;
      materialNeeds.push({ name: m.name, amount: m.amount, isBasic });
      if (isBasic === 'herb') {
        maxUnits = Math.min(maxUnits, Math.floor(mats.herbs / m.amount));
      } else if (isBasic === 'iron') {
        maxUnits = Math.min(maxUnits, Math.floor(mats.iron / m.amount));
      } else if (isBasic === 'paper') {
        maxUnits = Math.min(maxUnits, Math.floor(mats.paper / m.amount));
      } else {
        // 特殊材料
        const have = specialMats[m.name] ?? 0;
        maxUnits = Math.min(maxUnits, Math.floor(have / m.amount));
      }
    }
    if (maxUnits <= 0) continue;

    // 扣减材料并记录消耗
    let herbsConsumed = 0, ironConsumed = 0, paperConsumed = 0;
    const specialConsumed: Record<string, number> = {};
    for (const m of materialNeeds) {
      const total = m.amount * maxUnits;
      if (m.isBasic === 'herb') { herbsConsumed += total; mats.herbs -= total; }
      else if (m.isBasic === 'iron') { ironConsumed += total; mats.iron -= total; }
      else if (m.isBasic === 'paper') { paperConsumed += total; mats.paper -= total; }
      else { specialConsumed[m.name] = total; specialMats[m.name] = (specialMats[m.name] ?? 0) - total; }
    }

    results.push({
      pillType: target.pillType,
      artifactType: target.artifactType,
      talismanType: target.talismanType,
      quantity: maxUnits,
      herbsConsumed, ironConsumed, paperConsumed,
      specialConsumed,
    });
  }

  return results;
}

const createInitialState = () => {
  let buildings = createInitialBuildings();
  const disciples: Disciple[] = [];

  for (let i = 0; i < 10; i++) {
    const disciple = createInitialDisciple('servant', 'qi');
    disciples.push(disciple);
  }
  
  // 为初始弟子生成师承和好友关系
  // 前两位弟子互为好友
  if (disciples.length >= 2) {
    disciples[0].friends.push(disciples[1].name);
    disciples[1].friends.push(disciples[0].name);
  }
  // 后面的弟子从前面选一位师傅（师傅境界必须严格高于徒弟，否则不分配师傅）
  for (let i = 2; i < disciples.length; i++) {
    const candidate = disciples.slice(0, i).find(
      m => RealmOrder.indexOf(m.realm) > RealmOrder.indexOf(disciples[i].realm),
    );
    if (candidate) {
      disciples[i].master = candidate.name;
      if (!candidate.friends.includes(disciples[i].name)) {
        candidate.friends.push(disciples[i].name);
      }
    } else {
      disciples[i].master = null;
    }
    // 随机选一位好友
    const friendIdx = randomInt(0, i - 1);
    if (friendIdx !== i && !disciples[i].friends.includes(disciples[friendIdx].name)) {
      disciples[i].friends.push(disciples[friendIdx].name);
      if (!disciples[friendIdx].friends.includes(disciples[i].name)) {
        disciples[friendIdx].friends.push(disciples[i].name);
      }
    }
  }
  
  const servantHall = buildings.find(b => b.type === 'servant_hall');
  if (servantHall) {
    servantHall.assignedDisciples = disciples.slice(0, 10).map(d => d.id);
  }
  
  // 为初始弟子分配居所
  disciples.forEach(disciple => {
    const result = autoAssignResidence(disciple, buildings);
    buildings = result.newBuildings;
  });
  
  const libraryBooks = generateInitialLibraryBooks();
  const otherSects = generateOtherSects(8, 'founding');
  
  return {
    year: 1,
    month: 1,
    sectName: '修仙宗门',
    sectLevel: 'founding' as SectLevel,
    reputation: 10,
    karma: 0,
    spiritStones: 500,
    sectContribution: 0,
    disciples,
    buildings,
    // 仓库物品初始为0，需要解锁建筑后才能制作
    pillInventory: [],
    artifactInventory: [],
    talismanInventory: [],
    beastInventory: [],
    unlockedPillRecipes: ['foundation_pill', 'recovery_pill'] as PillType[],
    unlockedArtifactRecipes: ['flying_sword', 'defensive_shield'] as ArtifactType[],
    unlockedTalismanRecipes: ['fire_talisman', 'heal_talisman'] as TalismanType[],
    promotionRules: getDefaultPromotionRules(),
    notifications: [],
    monthlyReport: null,
    showReport: false,
    gameWon: false,
    victoryInfo: null,
    herbInventory: 20,
    redeemCodeUsed: false,
    adRewardTotal: 0,
    ironInventory: 10,
    paperInventory: 10,
    specialMaterials: {},
    contributionLogs: [],
    gameStarted: false,
    showMainMenu: true,
    libraryBooks,
    libraryCosts: {
      qi: 100,
      foundation: 300,
      golden: 800,
      nascent: 2000,
    },
    otherSects,
    trials: [],
    followedDiscipleIds: [],
    sectTournamentConfig: getDefaultTournamentConfig('sect'),
    interSectTournamentConfig: getDefaultTournamentConfig('inter-sect'),
    lastSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastInterSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
    lastInterSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
    spiritStoneHistory: [],
    autoAppointElder: false,
    recruitCandidates: [],
    recruitCostPerDisciple: 50,
  };
};

// 应用大比奖励：奖励发放给本宗冠军弟子（贡献/丹药）和宗门（灵石/声望）
function applyTournamentRewards(
  state: GameState,
  result: TournamentResult,
  freqConfig: FrequencyTournamentConfig,
) {
  let newSpiritStones = state.spiritStones;
  let newReputation = state.reputation;
  let newPillInventory = [...state.pillInventory];
  let newDisciples = state.disciples.map(d => ({ ...d }));
  // 贡献变化明细：调用方据此写 contributionLogs（避免此函数依赖闭包）
  const contributionChanges: { discipleId: string; amount: number; balance: number; description: string }[] = [];

  if (result.ourRank > 0) {
    const earnedRewards = freqConfig.rewards.filter(r => r.rank === result.ourRank as 1 | 2 | 3);
    // 找到本宗冠军弟子（若存在）
    const championDisciple = result.ourChampionName
      ? newDisciples.find(d => d.name === result.ourChampionName)
      : undefined;

    // 构建奖励描述文本
    const rewardDescs: string[] = [];
    earnedRewards.forEach(reward => {
      const desc = reward.type === 'pill'
        ? `${reward.pillType ?? '丹药'} ×${reward.amount}`
        : `${TournamentRewardTypeNames[reward.type]} +${reward.amount}`;
      rewardDescs.push(desc);
    });

    // 给冠军弟子记录大比历史
    if (championDisciple) {
      const freqName = result.frequency === 'yearly' ? '年度' : result.frequency === 'every5years' ? '五年' : '十年';
      const scopeName = result.scope === 'sect' ? '山门' : '宗门';
      championDisciple.tournamentHistory = [
        ...(championDisciple.tournamentHistory || []),
        {
          year: result.date.year,
          scope: result.scope,
          frequency: freqName,
          rank: result.ourRank,
          rewards: rewardDescs,
        },
      ];
    }

    earnedRewards.forEach(reward => {
      switch (reward.type) {
        case 'spiritStones':
          newSpiritStones += reward.amount;
          break;
        case 'reputation':
          newReputation += reward.amount;
          break;
        case 'contribution':
          // 贡献点发放给冠军弟子，并记录变化
          if (championDisciple) {
            championDisciple.contributionPoints += reward.amount;
            const freqName = result.frequency === 'yearly' ? '年度' : result.frequency === 'every5years' ? '五年' : '十年';
            const scopeName = result.scope === 'sect' ? '山门' : '宗门';
            contributionChanges.push({
              discipleId: championDisciple.id,
              amount: reward.amount,
              balance: championDisciple.contributionPoints,
              description: `${scopeName}${freqName}大比第${result.ourRank}名奖励 +${reward.amount} 贡献`,
            });
          }
          break;
        case 'pill':
          if (reward.pillType) {
            const existing = newPillInventory.find(p => p.type === reward.pillType);
            if (existing) {
              existing.quantity += reward.amount;
            } else {
              newPillInventory.push({ type: reward.pillType, quantity: reward.amount });
            }
          }
          break;
      }
    });
  }

  return { newSpiritStones, newReputation, newPillInventory, newDisciples, contributionChanges };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      
      startGame: () => {
        set({ gameStarted: true, showMainMenu: false });
      },
      
      resetGame: () => {
        set(createInitialState());
      },
      
      newGame: (sectName?: string) => {
        const trimmedName = sectName && sectName.trim() ? sectName.trim() : '修仙宗门';
        const newState = createInitialState();
        set({
          ...newState,
          sectName: trimmedName,
          showMainMenu: false,
          gameStarted: true,
          // 彩蛋：宗门名设定为 6666 时，初始灵石 10000、声望 1000
          ...(trimmedName === '6666' ? { spiritStones: 10000, reputation: 1000 } : {}),
        });
        // 需求3：新游戏开局展示灵石获取途径弹窗
        try { useUIStore.getState().setShowOpeningGuide(true); } catch { /* noop */ }
      },
      
      returnToMenu: () => {
        set({ showMainMenu: true });
      },

      useRedeemCode: (code: string) => {
        const state = get();
        if (!state.gameStarted) return { ok: false, reason: '游戏未开始' };
        if (state.redeemCodeUsed) return { ok: false, reason: '兑换码已使用过' };
        if (code.trim().toLowerCase() !== 'xiuxian') return { ok: false, reason: '兑换码无效' };
        const reward = 1000;
        const currentDate = { year: state.year, month: state.month };
        set({
          spiritStones: state.spiritStones + reward,
          redeemCodeUsed: true,
          notifications: [
            createNotification('success', '兑换成功', `输入兑换码获得 ${reward} 灵石`, currentDate),
            ...state.notifications,
          ].slice(0, 50),
        });
        return { ok: true, reward };
      },

      grantAdReward: () => {
        const state = get();
        if (!state.gameStarted) return { ok: false, amount: 0 };
        const amount = 500;
        const currentDate = { year: state.year, month: state.month };
        set({
          spiritStones: state.spiritStones + amount,
          adRewardTotal: state.adRewardTotal + amount,
          notifications: [
            createNotification('success', '广告奖励', `观看激励视频广告获得 ${amount} 灵石`, currentDate),
            ...state.notifications,
          ].slice(0, 50),
        });
        return { ok: true, amount };
      },

      nextMonth: () => {
        const state = get();
        let { year, month, spiritStones, reputation, herbInventory } = state;
        const { disciples, buildings, promotionRules, pillInventory, libraryBooks, libraryCosts } = state;
        
        const spiritStoneIncome: { source: string; amount: number }[] = [];
        const spiritStoneExpense: { source: string; amount: number }[] = [];
        const breakthroughEvents: { discipleId: string; discipleName: string; from: string; to: string; success: boolean }[] = [];
        const promotionEvents: { discipleId: string; discipleName: string; from: string; to: string }[] = [];
        const newDisciples: { id: string; name: string; status: string }[] = [];
        const newNotifications: Notification[] = [];
        
        const currentDate = { year, month };
        
        let totalSpiritStoneIncome = 0;
        let totalMaintenance = 0;
        let totalHerbIncome = 0;

        // 工作建筑生产累加器：以当前库存为基底，按配方消耗材料、产出成品
        let accHerbs = state.herbInventory;
        let accIron = state.ironInventory;
        let accPaper = state.paperInventory;
        // 特殊材料累加器：以当前库存为基底，按配方就地扣减
        const accSpecialMaterials: Record<string, number> = { ...state.specialMaterials };
        const accPillInventory: PillInventory[] = state.pillInventory.map(p => ({ ...p }));
        const accArtifactInventory: ArtifactInventory[] = state.artifactInventory.map(a => ({ ...a }));
        const accTalismanInventory: TalismanInventory[] = state.talismanInventory.map(t => ({ ...t }));

        // 灵兽库存：以当前库存为基底，累加本月灵兽原产出
        let newBeastInventory: BeastInventory[] = state.beastInventory.map(b => ({ ...b }));

        // 贡献值流水：先记录本月新增，月底再整体写回（最多保留 5000 条）
        const pendingContributionLogs: ContributionLog[] = [];
        const pushContributionLog = (
          discipleId: string, type: ContributionLogType, amount: number, balance: number, description: string,
        ) => {
          pendingContributionLogs.push({
            id: generateId(),
            discipleId, date: currentDate,
            type, amount, balance, description,
          });
        };

        // 提前声明后续会用到的变量（避免块级变量先用后声明）
        let currentBuildings = [...buildings];
        let finalDisciples: Disciple[] = [];
        let refreshedOtherSects = state.otherSects;
        
        // 声望自动增长（基于人数和战力）
        const sectCombatPower = calculateSectCombatPower(disciples, buildings);
        const discipleBonus = disciples.length * ReputationGrowthConfig.discipleWeight;
        const combatBonus = sectCombatPower.totalPower * ReputationGrowthConfig.combatWeight;
        const growthMultiplier = Math.min(1 + discipleBonus + combatBonus, ReputationGrowthConfig.maxMultiplier);
        const reputationChange = Math.floor(ReputationGrowthConfig.baseGrowth * growthMultiplier);

        // 建筑产出的声望累加器（讲经堂/藏书阁等）
        let buildingReputation = 0;

        buildings.forEach(building => {
          if (building.status !== 'active') return;

          const assignedDisciples = disciples.filter(d => building.assignedDisciples.includes(d.id));
          const output = calculateBuildingOutput(building, assignedDisciples);

          if (output.spiritStones > 0) {
            totalSpiritStoneIncome += output.spiritStones;
            spiritStoneIncome.push({ source: building.name, amount: output.spiritStones });
          }
          if (output.herbs > 0) {
            totalHerbIncome += output.herbs;
            accHerbs += output.herbs;
          }
          // 材料产出累加（杂役堂）
          if (output.iron > 0) accIron += output.iron;
          if (output.paper > 0) accPaper += output.paper;
          // 声望产出累加（讲经堂/藏书阁等）
          if (output.reputation > 0) buildingReputation += output.reputation;
          // 通天塔：无工人也能产出声望（每级+1），作为结局建筑的进度反馈
          if (building.type === 'skyscraper_tower') buildingReputation += building.level;

          // 灵兽产出：按品阶权重随机抽取种类累加到库存
          if (output.beasts && output.beasts > 0) {
            for (let i = 0; i < output.beasts; i++) {
              const roll = Math.random() * 100;
              let type: BeastType;
              if (roll < 60) {
                // tier 2: 灵狐 / 玄龟（60%）
                type = Math.random() < 0.5 ? 'spirit_fox' : 'mystic_turtle';
              } else if (roll < 90) {
                // tier 3: 火鸦 / 玉兔（30%）
                type = Math.random() < 0.5 ? 'fire_crow' : 'jade_rabbit';
              } else {
                // tier 4: 金鹏（10%）
                type = 'golden_roc';
              }
              const existing = newBeastInventory.find(b => b.type === type);
              if (existing) {
                existing.quantity += 1;
              } else {
                newBeastInventory.push({ type, quantity: 1 });
              }
            }
          }

          const maintenance = calculateBuildingMaintenance(building);
          totalMaintenance += maintenance;
          spiritStoneExpense.push({ source: `${building.name}维护`, amount: maintenance });

          // 工作建筑按配方生产成品：消耗材料、产出丹药/法器/符箓
          const prods = produceWorkBuilding(building, state, { herbs: accHerbs, iron: accIron, paper: accPaper }, accSpecialMaterials);
          for (const prod of prods) {
            if (prod.quantity <= 0) continue;
            if (prod.pillType) {
              const existing = accPillInventory.find(p => p.type === prod.pillType);
              if (existing) existing.quantity += prod.quantity;
              else accPillInventory.push({ type: prod.pillType, quantity: prod.quantity });
              accHerbs -= prod.herbsConsumed;
            } else if (prod.artifactType) {
              const existing = accArtifactInventory.find(a => a.type === prod.artifactType);
              if (existing) existing.quantity += prod.quantity;
              else accArtifactInventory.push({ type: prod.artifactType, quantity: prod.quantity });
              accIron -= prod.ironConsumed;
            } else if (prod.talismanType) {
              const existing = accTalismanInventory.find(t => t.type === prod.talismanType);
              if (existing) existing.quantity += prod.quantity;
              else accTalismanInventory.push({ type: prod.talismanType, quantity: prod.quantity });
              accPaper -= prod.paperConsumed;
            }
          }
        });

        // 灵兽原灵草消耗：每只灵兽每月消耗2灵草
        const beastGarden = currentBuildings.find(b => b.type === 'spirit_beast_garden' && b.status === 'active');
        if (beastGarden) {
          const totalBeasts = newBeastInventory.reduce((sum, b) => sum + b.quantity, 0);
          const herbCost = totalBeasts * 2;
          if (herbCost > 0 && accHerbs >= herbCost) {
            accHerbs -= herbCost;
            spiritStoneExpense.push({ source: '灵兽消耗灵草', amount: 0 });
          } else if (herbCost > 0) {
            // 灵草不足，灵兽可能流失
            const shortage = herbCost - accHerbs;
            accHerbs = 0;
            const lostBeasts = Math.floor(shortage / 2);
            if (lostBeasts > 0 && newBeastInventory.length > 0) {
              let remaining = lostBeasts;
              newBeastInventory = newBeastInventory.map(b => {
                if (remaining <= 0) return b;
                const lost = Math.min(b.quantity, remaining);
                remaining -= lost;
                return { ...b, quantity: b.quantity - lost };
              }).filter(b => b.quantity > 0);
              newNotifications.push(createNotification(
                'warning', '灵兽流失',
                `灵草不足，${lostBeasts} 只灵兽因饥饿逃离。`,
                { year, month },
              ));
            }
          }
        }

        // 附庸宗门上贡：每月给予玩家 10% 宗门收入灵石
        const vassalSects = refreshedOtherSects.filter(s => s.diplomaticStatus === 'vassal');
        if (vassalSects.length > 0) {
          const tributeTotal = vassalSects.reduce((sum, s) => {
            // 附庸上贡 = 对方战力 * 0.01 的灵石（模拟其10%收入）
            return sum + Math.floor(s.combatPower * 0.1);
          }, 0);
          if (tributeTotal > 0) {
            totalSpiritStoneIncome += tributeTotal;
            spiritStoneIncome.push({ source: '附庸上贡', amount: tributeTotal });
            newNotifications.push(createNotification(
              'success', '附庸上贡',
              `${vassalSects.length} 个附庸宗门上贡 ${tributeTotal} 灵石。`,
              { year, month },
            ));
          }
        }

        // 宿敌宗门进攻：每月有概率被宿敌攻击
        // 单月最多 1 次（从停战外的 rival 中随机抽 1 个判定），避免叠加扣费造成「莫名扣灵石」；
        // 触发后与该宗门进入 5 年停战。
        let rivalStoneLoss = 0;
        let rivalRepLoss = 0;
        let rivalRepGain = 0;
        let pendingSiegeReport: SiegeReportData | null = null;
        const rivalSects = refreshedOtherSects.filter(
          s => s.diplomaticStatus === 'rival' && (!s.truceUntilYear || s.truceUntilYear <= year),
        );
        if (rivalSects.length > 0) {
          // 单月仅抽 1 个 rival 进行判定（其他 rival 视为"未进攻"）
          const rival = rivalSects[Math.floor(Math.random() * rivalSects.length)];
          // 每月 10% 概率进攻
          if (Math.random() < 0.10) {
            const ourCombat = calculateSectCombatPower(finalDisciples, currentBuildings).totalPower;
            const rivalCombat = rival.combatPower;
            if (ourCombat >= rivalCombat) {
              const repGain = Math.floor(rival.combatPower * 0.001) + 1;
              rivalRepGain += repGain;
              newNotifications.push(createNotification(
                'success', '击退来犯',
                `「${rival.name}」来袭，本宗成功击退！声望 +${repGain}。5 年内双方不得再启战端。`,
                { year, month },
              ));
              pendingSiegeReport = {
                title: '击退来犯',
                description: `「${rival.name}」趁本月来袭，战力 ${rivalCombat} vs 本宗战力 ${ourCombat}。本宗成功击退，声望 +${repGain}，双方进入 5 年停战期。`,
                attackers: [rival.name],
                isPlayerVictory: true,
                stoneLoss: 0,
                repLoss: -repGain,  // 用负数表示获得声望（弹窗统一展示为变化值）
                deadDisciples: 0,
                date: { year, month },
                source: 'rival',
              };
            } else {
              const stoneLoss = Math.floor(rival.combatPower * 0.05);
              const repLoss = Math.floor(rival.combatPower * 0.002) + 3;
              rivalStoneLoss += stoneLoss;
              rivalRepLoss += repLoss;
              newNotifications.push(createNotification(
                'warning', '宗门被攻',
                `「${rival.name}」来犯，本宗不敌！损失 ${stoneLoss} 灵石、${repLoss} 声望。双方进入 5 年停战期。`,
                { year, month },
              ));
              pendingSiegeReport = {
                title: '宗门被攻',
                description: `「${rival.name}」趁本月来袭，战力 ${rivalCombat} vs 本宗战力 ${ourCombat}。本宗不敌，损失 ${stoneLoss} 灵石、${repLoss} 声望，双方进入 5 年停战期。`,
                attackers: [rival.name],
                isPlayerVictory: false,
                stoneLoss,
                repLoss,
                deadDisciples: 0,
                date: { year, month },
                source: 'rival',
              };
            }
            // 写入 5 年停战
            const truceYear = year + 5;
            refreshedOtherSects = refreshedOtherSects.map(s =>
              s.id === rival.id ? { ...s, truceUntilYear: truceYear } : s,
            );
          }
        }

        // 正邪度联合攻击：玩家正邪度过低（魔道）时，正道宗门联合讨伐。
        // 中立（karma ∈ [-15, +15]）不触发；-16 起按概率触发，-100 必触发。
        if (state.karma < -15) {
          // 概率随正邪度降低而提高：-15≈6%，-50≈37%，-100=100%（必触发）
          const jointAttackChance = Math.min(
            1,
            ((-state.karma) - 15) / 85 * 0.94 + 0.06,
          );
          if (Math.random() < jointAttackChance) {
            // 召集正道且非同盟/附庸、未停战的宗门；极度邪恶（-100）时扩大至所有非魔道宗门
            const coalition = refreshedOtherSects.filter(s =>
              (s.alignment === 'righteous' || (state.karma <= -100 && s.alignment === 'neutral')) &&
              s.diplomaticStatus !== 'ally' &&
              s.diplomaticStatus !== 'vassal' &&
              (!s.truceUntilYear || s.truceUntilYear <= year)
            );
            if (coalition.length >= 2) {
              const ourCombat = calculateSectCombatPower(finalDisciples, currentBuildings).totalPower;
              // 联合战力 = 各宗门战力之和 * 协同系数（0.7）
              const coalitionPower = Math.floor(
                coalition.reduce((sum, s) => sum + s.combatPower, 0) * 0.7
              );
              const coalitionLabel = coalition.slice(0, 3).map(s => `「${s.name}」`).join('、') +
                (coalition.length > 3 ? `等${coalition.length}家` : '');

              const truceYear = year + 5;

              if (ourCombat >= coalitionPower) {
                const repGain = Math.floor(coalitionPower * 0.002) + 10;
                rivalRepGain += repGain;
                newNotifications.push(createNotification(
                  'success', '击退正道联军',
                  `${coalitionLabel}正道宗门联合讨伐，本宗成功击退！声望 +${repGain}。联军 5 年内不得再启战端。`,
                  { year, month },
                ));
                pendingSiegeReport = {
                  title: '击退正道联军',
                  description: `${coalitionLabel}正道宗门联合讨伐，联军战力 ${coalitionPower} vs 本宗战力 ${ourCombat}。本宗成功击退，声望 +${repGain}，联军 5 年内不得再启战端。`,
                  attackers: coalition.map(s => s.name),
                  isPlayerVictory: true,
                  stoneLoss: 0,
                  repLoss: -repGain,
                  deadDisciples: 0,
                  date: { year, month },
                  source: 'coalition',
                };
              } else {
                const stoneLoss = Math.floor(coalitionPower * 0.08);
                const repLoss = Math.floor(coalitionPower * 0.003) + 10;
                rivalStoneLoss += stoneLoss;
                rivalRepLoss += repLoss;
                newNotifications.push(createNotification(
                  'danger', '正道联军破山',
                  `${coalitionLabel}正道宗门联合讨伐，本宗不敌！损失 ${stoneLoss} 灵石、${repLoss} 声望。联军 5 年内不得再启战端。`,
                  { year, month },
                ));
                pendingSiegeReport = {
                  title: '正道联军破山',
                  description: `${coalitionLabel}正道宗门联合讨伐，联军战力 ${coalitionPower} vs 本宗战力 ${ourCombat}。本宗不敌，损失 ${stoneLoss} 灵石、${repLoss} 声望，联军 5 年内不得再启战端。`,
                  attackers: coalition.map(s => s.name),
                  isPlayerVictory: false,
                  stoneLoss,
                  repLoss,
                  deadDisciples: 0,
                  date: { year, month },
                  source: 'coalition',
                };
              }
              // 联军全体进入 5 年停战
              const attackerIds = new Set(coalition.map(s => s.id));
              refreshedOtherSects = refreshedOtherSects.map(s =>
                attackerIds.has(s.id) ? { ...s, truceUntilYear: truceYear } : s,
              );
            }
          }
        }

        const servantCount = disciples.filter(d => d.status === 'servant').length;
        void servantCount;
        // 注：杂役零花钱已并入"弟子维护费"（按身份等级统一扣除），此处不再单独计费
        
        const updatedDisciples = disciples.map(disciple => {
          // 计算居所和洞府的修炼加成
          let bonusBuffs = [...disciple.buffs];
          
          // 居所加成
          const residence = buildings.find(b =>
            (b.type === 'outer_residence' ||
             b.type === 'inner_residence' || b.type === 'core_residence') &&
            b.assignedDisciples.includes(disciple.id)
          );
          if (residence) {
            const residenceBonusMap: Record<string, number> = {
              outer_residence: 10,
              inner_residence: 20,
              core_residence: 30,
            };
            const bonus = residenceBonusMap[residence.type] || 0;
            if (bonus > 0) {
              bonusBuffs.push({
                id: `residence_${residence.id}`,
                name: '居所加成',
                description: `居所修炼加成 +${bonus}%`,
                type: 'cultivation',
                value: bonus,
                duration: 1,
                remainingMonths: 1,
              });
            }
          }
          
          // 讲经堂加成
          const lectureHall = buildings.find(b =>
            b.type === 'lecture_hall' && b.assignedDisciples.includes(disciple.id)
          );
          if (lectureHall) {
            // 获取讲师
            const lecturer = disciples.find(d => d.id === lectureHall.managerId);
            const lectureBonus = calculateLectureBonus(lecturer || null, lectureHall.level);
            if (lectureBonus > 0) {
              bonusBuffs.push({
                id: `lecture_${lectureHall.id}`,
                name: '讲经堂加成',
                description: `听讲修炼加成 +${lectureBonus}%`,
                type: 'cultivation',
                value: lectureBonus,
                duration: 1,
                remainingMonths: 1,
              });
            }
          }

          const discipleWithBonus = { ...disciple, buffs: bonusBuffs };

          // 满意度影响修炼速度：每降低1%效率降低2%，但下限 20%（绝不出现负值/归零）。
          discipleWithBonus.cultivationSpeed = applySatisfactionPenalty(disciple.cultivationSpeed, disciple.satisfaction);
          
          let d2 = processMonthlyCultivation(discipleWithBonus);
          d2 = { ...d2, buffs: disciple.buffs, cultivationSpeed: disciple.cultivationSpeed }; // 恢复原始buffs和基础修炼速度
          
          // 处理每月学习进度
          d2 = processMonthlyLearning(d2);

          // AI 行为：未在学习中 + 有足够贡献 + 境界非 mortal/spirit，
          // 就挑更好的功法/战技学习（会自动淘汰低级旧书）
          if (!d2.learningBook) {
            // 用 pickUpgradeBook 选当前境界能学的最优（功法优先，再战技）
            const pick = pickUpgradeBook(d2, libraryBooks);
            if (pick) {
              const cost = libraryCosts[pick.pickBook.tier] || 0;
              if (d2.contributionPoints >= cost) {
                const before = d2.contributionPoints;
                let d2a: any = {
                  ...d2,
                  contributionPoints: d2.contributionPoints - cost,
                  learningBook: pick.learningBook,
                  isLearningSecret: true,
                };
                if (pick.forgetTechnique) d2a.learnedTechnique = null;
                if (pick.forgetBattleBookId) {
                  d2a.learnedBattles = d2.learnedBattles.filter((b: any) => b.bookId !== pick.forgetBattleBookId);
                }
                d2 = d2a;
                if (cost > 0) {
                  pushContributionLog(
                    d2.id, 'learn_secret', -cost, d2.contributionPoints,
                    pick.pickType === 'technique'
                      ? `学习功法「${pick.pickBook.name}」（自动升级），扣除 ${cost} 贡献`
                      : `学习战技「${pick.pickBook.name}」（自动升级），扣除 ${cost} 贡献`,
                  );
                }
              }
            }
          }

          // AI 行为：弟子用贡献自动兑换装备/丹药。
          // 策略：装备槽空 + 贡献够（contributionCost * 1.5，留盈余）→ 兑换对应装备；
          //       境界进度 ≥ 70% 即将突破 + 贡献够 → 兑换对应境界突破丹。
          // 每月最多兑换 1 件（与学习互斥，本月学过就不兑换）。
          if (!disciple.learningBook) {  // 本月没在学习（学习已在上面完成扣贡献）
            const realmTierPill: Record<string, string> = {
              qi: 'foundation_pill',
              foundation: 'golden_pill',
              golden: 'nascent_pill',
              nascent: 'spirit_pill',
            };
            const targetPillType = realmTierPill[d2.realm];
            // realmProgress 是 0-100 百分比，阈值直接用 70
            const needBreakthrough = targetPillType && d2.realmProgress >= 70;
            let exchange: null | {
              kind: 'pill' | 'artifact' | 'talisman' | 'beast';
              itemType: string;
              cost: number;
              itemName: string;
            } = null;

            const artifactList = Object.values(ARTIFACT_CONFIGS);
            const talismanList = Object.values(TALISMAN_CONFIGS);
            const beastList = Object.values(BEAST_CONFIGS);

            // 1) 法器：优先装备槽为空且有可兑换（便宜的先）
            if (!exchange && !d2.equippedArtifact) {
              artifactList.sort((a, b) => a.contributionCost - b.contributionCost);
              for (const cfg of artifactList) {
                if (d2.contributionPoints >= cfg.contributionCost * 1.5) {
                  const invEntry = accArtifactInventory.find(i => i.type === cfg.type);
                  if (invEntry && invEntry.quantity > 0) {
                    exchange = { kind: 'artifact', itemType: cfg.type, cost: cfg.contributionCost, itemName: cfg.name };
                    break;
                  }
                }
              }
            }
            // 2) 符箓（没装符箓时）
            if (!exchange && !d2.equippedTalisman) {
              talismanList.sort((a, b) => a.contributionCost - b.contributionCost);
              for (const cfg of talismanList) {
                if (d2.contributionPoints >= cfg.contributionCost * 1.5) {
                  const invEntry = accTalismanInventory.find(i => i.type === cfg.type);
                  if (invEntry && invEntry.quantity > 0) {
                    exchange = { kind: 'talisman', itemType: cfg.type, cost: cfg.contributionCost, itemName: cfg.name };
                    break;
                  }
                }
              }
            }
            // 3) 灵兽（没装灵兽时）
            if (!exchange && !d2.equippedBeast) {
              const beastArr = beastList.map(b => ({
                cfg: b,
                contribCost: Math.max(50, b.spiritStoneCost * 3),
              }));
              beastArr.sort((a, b) => a.contribCost - b.contribCost);
              for (const { cfg, contribCost } of beastArr) {
                if (d2.contributionPoints >= contribCost * 1.5) {
                  const invEntry = newBeastInventory.find(i => i.type === cfg.type);
                  if (invEntry && invEntry.quantity > 0) {
                    exchange = { kind: 'beast', itemType: cfg.type, cost: contribCost, itemName: cfg.name };
                    break;
                  }
                }
              }
            }
            // 4) 突破丹（即将突破）
            if (!exchange && needBreakthrough && targetPillType) {
              const cfg: any = (PILL_CONFIGS as any)[targetPillType];
              if (cfg) {
                const invEntry = accPillInventory.find(i => i.type === targetPillType);
                if (invEntry && invEntry.quantity > 0 && d2.contributionPoints >= cfg.contributionCost * 1.5) {
                  exchange = { kind: 'pill', itemType: targetPillType, cost: cfg.contributionCost, itemName: cfg.name };
                }
              }
            }

            if (exchange) {
              // 扣贡献
              const newBal = Math.max(0, d2.contributionPoints - exchange.cost);
              // 扣库存
              if (exchange.kind === 'pill') {
                const idx = accPillInventory.findIndex(i => i.type === exchange.itemType);
                if (idx >= 0) accPillInventory[idx] = { ...accPillInventory[idx], quantity: accPillInventory[idx].quantity - 1 };
              } else if (exchange.kind === 'artifact') {
                const idx = accArtifactInventory.findIndex(i => i.type === exchange.itemType);
                if (idx >= 0) accArtifactInventory[idx] = { ...accArtifactInventory[idx], quantity: accArtifactInventory[idx].quantity - 1 };
              } else if (exchange.kind === 'talisman') {
                const idx = accTalismanInventory.findIndex(i => i.type === exchange.itemType);
                if (idx >= 0) accTalismanInventory[idx] = { ...accTalismanInventory[idx], quantity: accTalismanInventory[idx].quantity - 1 };
              } else if (exchange.kind === 'beast') {
                const idx = newBeastInventory.findIndex(i => i.type === exchange.itemType);
                if (idx >= 0) newBeastInventory[idx] = { ...newBeastInventory[idx], quantity: newBeastInventory[idx].quantity - 1 };
              }
              // 给弟子装备/加 buff
              const patch: any = { contributionPoints: newBal, satisfaction: Math.min(100, d2.satisfaction + 2) };
              if (exchange.kind === 'artifact') patch.equippedArtifact = exchange.itemType;
              else if (exchange.kind === 'talisman') patch.equippedTalisman = exchange.itemType;
              else if (exchange.kind === 'beast') patch.equippedBeast = exchange.itemType;
              else if (exchange.kind === 'pill') patch.breakthroughBonus = (d2.breakthroughBonus || 0) + 2;
              d2 = { ...d2, ...patch };
              pushContributionLog(
                d2.id, 'deduct', -exchange.cost, newBal,
                `自动兑换「${exchange.itemName}」，扣除 ${exchange.cost} 贡献`,
              );
            }
          }

          const building = buildings.find(b => b.assignedDisciples.includes(d2.id));
          // 贡献点：先按默认公式计算，再叠加玩家为建筑设置的手动奖励/扣费
          const baseWorkContribution = computeMonthlyContribution(d2, building || null);
          // 手动调整：建筑 contributionSettings
          const settings = building?.contributionSettings;
          let workContribution = baseWorkContribution;
          if (settings) {
            if (typeof settings.monthlyGainPerDisciple === 'number') {
              workContribution += settings.monthlyGainPerDisciple;
            }
            if (typeof settings.monthlyCostPerDisciple === 'number') {
              workContribution -= settings.monthlyCostPerDisciple;
            }
          }
          const workBefore = d2.contributionPoints;
          d2 = { ...d2, contributionPoints: Math.max(0, d2.contributionPoints + workContribution) };
          if (workContribution !== 0) {
            const buildingName = building?.name || '无工作';
            pushContributionLog(
              d2.id, workContribution >= 0 ? 'work' : 'deduct', workContribution, d2.contributionPoints,
              `${buildingName}：${workContribution >= 0 ? '+' : ''}${workContribution} 贡献（基础${baseWorkContribution}${settings ? '含手动调整' : ''}）`,
            );
          }

          // 藏经阁推演功法：金丹期以上弟子在藏经阁工作，每月获得贡献
          if (building && building.type === 'secret_library' && building.status === 'active') {
            const realmOrder = ['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit'];
            const realmIdx = realmOrder.indexOf(d2.realm);
            if (realmIdx >= 3) {
              // 金丹期以上，推演贡献 = 基础值 + 道缘加成
              const deductionBase = 10 + Math.floor((d2.hiddenTalents.daoFate || 0) / 20);
              // 藏经阁等级影响推演效率
              const levelBonus = Math.floor(deductionBase * (building.level - 1) * 0.2);
              const totalDeduction = deductionBase + levelBonus;
              d2 = { ...d2, contributionPoints: d2.contributionPoints + totalDeduction };
              pushContributionLog(
                d2.id, 'library', totalDeduction, d2.contributionPoints,
                `藏经阁推演功法 +${totalDeduction} 贡献（基础${deductionBase}${levelBonus ? `+等级${levelBonus}` : ''}）`,
              );
            }
          }

          // 灵兽原灵草消耗：灵兽每月消耗灵草
          // 在建筑产出循环中统一扣减
          
          // 满意度系统计算
          // 检查是否有工作
          const hasWork = building !== undefined || d2.status === 'elder';
          const currentResidence = buildings.find(b =>
            (b.type === 'outer_residence' || b.type === 'inner_residence' ||
             b.type === 'core_residence' ||
             b.type === 'cave_mansion') && b.assignedDisciples.includes(d2.id)
          );

          // 计算居所等级需求（杂役弟子不需要居所）
          const requiredResidenceTypeMap: Record<string, string> = {
            outer: 'outer_residence',
            inner: 'inner_residence',
            core: 'core_residence',
            elder: 'cave_mansion',
          };
          const residenceTypeOrder = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'];
          const requiredType = requiredResidenceTypeMap[d2.status] || '';
          const requiredIndex = requiredType ? residenceTypeOrder.indexOf(requiredType) : -1;
          const actualType = currentResidence ? currentResidence.type : null;
          const actualIndex = actualType ? residenceTypeOrder.indexOf(actualType) : -1;
          
          // 计算满意度损失
          let satisfactionLoss = 0;
          
          // 无工作满意度损失：每月-1%，上限20%
          if (!hasWork) {
            d2.maxSatisfactionLossWork = Math.min(20, d2.maxSatisfactionLossWork + 1);
            satisfactionLoss += 1;
          } else {
            // 有工作时恢复
            d2.maxSatisfactionLossWork = Math.max(0, d2.maxSatisfactionLossWork - 1);
          }
          
          // 居所不匹配满意度损失
          if (actualIndex < requiredIndex) {
            const levelDiff = requiredIndex - actualIndex;
            // 差距越多，损失上限越高，最多40%
            const residenceLossMax = Math.min(40, levelDiff * 10);
            d2.maxSatisfactionLossResidence = Math.min(residenceLossMax, d2.maxSatisfactionLossResidence + 1);
            satisfactionLoss += 1;
          } else {
            // 居所匹配时恢复
            d2.maxSatisfactionLossResidence = Math.max(0, d2.maxSatisfactionLossResidence - 1);
          }
          
          // 更新满意度
          d2.satisfaction = Math.max(0, 100 - d2.maxSatisfactionLossWork - d2.maxSatisfactionLossResidence);

          // 满意度开始下降时通知（从100%降到99%时）
          if (d2.satisfaction < 100 && d2.satisfaction === 99 - d2.maxSatisfactionLossWork - d2.maxSatisfactionLossResidence + 1) {
            const reasons: string[] = [];
            if (!hasWork) reasons.push('无工作');
            if (actualIndex < requiredIndex) reasons.push('居所不匹配');
            if (reasons.length > 0) {
              newNotifications.push(
                createNotification(
                  'warning',
                  '弟子不满',
                  `${d2.name}满意度开始下降（${reasons.join('、')}）`,
                  currentDate
                )
              );
            }
          }

          // 满意度低于60%时，弟子可能离开
          if (d2.satisfaction <= 60 && Math.random() < 0.1) { // 10%概率离开
            // 添加离开通知
            newNotifications.push(
              createNotification(
                'danger',
                '弟子离去',
                `${d2.name}因对宗门不满而离开了山门`,
                currentDate
              )
            );
            // 标记为离开（稍后过滤掉）
            d2.status = 'mortal' as any; // 临时标记
          }
          
          if (canAttemptBreakthrough(d2)) {
            // 丹药仅在跨境界突破（late 阶段）时生效
            const isRealmAdvance = d2.realmStage === 'late';
            const pillForBreak: PillType | null = (() => {
              if (!isRealmAdvance) return null;
              const nextRealmIndex = RealmOrder.indexOf(d2.realm) + 1;
              const nextRealm = RealmOrder[nextRealmIndex];
              const pillMap: Record<string, PillType> = {
                foundation: 'foundation_pill',
                golden: 'golden_pill',
                nascent: 'nascent_pill',
                spirit: 'spirit_pill',
              };
              const pillType = pillMap[nextRealm];
              if (pillType) {
                const pill = accPillInventory.find(p => p.type === pillType);
                if (pill && pill.quantity > 0) return pillType;
              }
              return null;
            })();
            const hasPill = pillForBreak !== null;

            const result = attemptBreakthrough(d2, hasPill);

            breakthroughEvents.push({
              discipleId: d2.id,
              discipleName: d2.name,
              from: getRealmDisplay(d2),
              to: getRealmDisplay({ realm: result.newRealm, realmStage: result.newStage }),
              success: result.success,
            });

            if (result.success) {
              // 突破后境界/阶段提升，按新境界重算修炼速度（跨境界时寿命上限也重算）
              const realmChanged = result.newRealm !== d2.realm;
              const breakthroughed = { ...d2, realm: result.newRealm, realmStage: result.newStage };
              d2 = {
                ...d2,
                realm: result.newRealm,
                realmStage: result.newStage,
                realmProgress: result.newProgress,
                cultivationSpeed: recomputeCultivationSpeed(breakthroughed),
                maxAge: realmChanged ? recomputeLifespan(breakthroughed) : d2.maxAge,
                breakthroughAttempts: 0,
                breakthroughBonus: 0,
                isBreakingThrough: false,
              };
              // 仅跨境界突破后自动学习更高阶功法
              if (realmChanged) {
                d2 = autoLearnTechniqueOnBreakthrough(d2, libraryBooks);
              }

              if (hasPill && pillForBreak) {
                const idx = accPillInventory.findIndex(p => p.type === pillForBreak);
                if (idx >= 0) {
                  accPillInventory[idx] = { ...accPillInventory[idx], quantity: accPillInventory[idx].quantity - 1 };
                }
              }
            } else {
              d2 = {
                ...d2,
                realmProgress: result.newProgress,
                breakthroughAttempts: d2.breakthroughAttempts + 1,
                breakthroughBonus: d2.breakthroughBonus + 5,
                isBreakingThrough: false,
              };
            }
          }
          
          d2.buffs = d2.buffs
            .map(buff => ({ ...buff, remainingMonths: buff.remainingMonths - 1 }))
            .filter(buff => buff.remainingMonths > 0);

          d2 = { ...d2, age: d2.age + 1 / 12 };

          return d2;
        });
        
        // 过滤离开的弟子
        const leftDisciples = updatedDisciples.filter(d => d.status === 'mortal');
        const activeDisciples = updatedDisciples.filter(d => d.status !== 'mortal');

        currentBuildings = [...buildings];

        finalDisciples = activeDisciples.map(disciple => {
          let d = disciple;
          let alreadyPromoted = false; // 每月每弟子最多晋升一级，强制积累贡献

          // 杂役 → 外门
          if (d.status === 'servant' && !alreadyPromoted) {
            const canPromote = 
              d.contributionPoints >= promotionRules.servantToOuter.minContribution &&
              d.hiddenTalents.rootBone >= promotionRules.servantToOuter.minRootBone;
            const isExceptional = 
              promotionRules.servantToOuter.enableExceptional &&
              (d.hiddenTalents.rootBone >= promotionRules.servantToOuter.exceptionalThreshold);
            
            if (canPromote || isExceptional) {
              promotionEvents.push({
                discipleId: d.id,
                discipleName: d.name,
                from: DiscipleStatusNames[d.status],
                to: DiscipleStatusNames.outer,
              });
              // 只有贡献达标时才扣除贡献（破格提升不扣贡献）
              const cost = canPromote ? promotionRules.servantToOuter.minContribution : 0;
              if (cost > 0) {
                d = { ...d, contributionPoints: d.contributionPoints - cost };
                pushContributionLog(
                  d.id, 'promotion', -cost, d.contributionPoints,
                  `晋升外门弟子，扣除 ${cost} 贡献（杂役堂规则）`,
                );
              }
              // 从工作建筑中移除（居所由 autoAssignResidence 处理）
              currentBuildings = currentBuildings.map(b => ({
                ...b,
                assignedDisciples: (b.type === 'outer_residence' ||
                   b.type === 'inner_residence' || b.type === 'core_residence' || b.type === 'cave_mansion')
                  ? b.assignedDisciples
                  : b.assignedDisciples.filter(id => id !== d.id)
              }));
              // 自动分配岗位
              const { buildingId, newBuildings } = autoAssignBuilding(d, currentBuildings);
              currentBuildings = newBuildings;
              // 晋升后重新分配居所
              const residenceResult = autoAssignResidence(d, currentBuildings);
              currentBuildings = residenceResult.newBuildings;
              d = { ...d, status: 'outer', assignedBuilding: buildingId };
              alreadyPromoted = true;
              // 添加通知
              if (buildingId) {
                const assignedBuilding = currentBuildings.find(b => b.id === buildingId);
                newNotifications.push(
                  createNotification(
                    'info',
                    '弟子分配',
                    `${d.name}晋升为外门弟子，已自动分配至${assignedBuilding?.name || '某岗位'}${cost > 0 ? `（消耗${cost}贡献）` : '（破格提升）'}`,
                    currentDate
                  )
                );
              }
            }
          }
          
          // 外门 → 内门
          if (d.status === 'outer' && !alreadyPromoted) {
            const realmIndex = RealmOrder.indexOf(d.realm);
            const minRealmIndex = RealmOrder.indexOf(promotionRules.outerToInner.minRealm);
            const canPromote = 
              realmIndex >= minRealmIndex &&
              d.contributionPoints >= promotionRules.outerToInner.minContribution;
            
            if (canPromote) {
              const cost = promotionRules.outerToInner.minContribution;
              promotionEvents.push({
                discipleId: d.id,
                discipleName: d.name,
                from: DiscipleStatusNames[d.status],
                to: DiscipleStatusNames.inner,
              });
              // 晋升扣除贡献
              d = { ...d, contributionPoints: d.contributionPoints - cost };
              pushContributionLog(
                d.id, 'promotion', -cost, d.contributionPoints,
                `晋升内门弟子，扣除 ${cost} 贡献`,
              );
              // 从旧工作建筑中移除（居所由 autoAssignResidence 处理）
              currentBuildings = currentBuildings.map(b => ({
                ...b,
                assignedDisciples: (b.type === 'outer_residence' ||
                   b.type === 'inner_residence' || b.type === 'core_residence' || b.type === 'cave_mansion')
                  ? b.assignedDisciples
                  : b.assignedDisciples.filter(id => id !== d.id)
              }));
              // 重新分配工作建筑
              const innerWorkResult = autoAssignBuilding({ ...d, status: 'inner' }, currentBuildings);
              currentBuildings = innerWorkResult.newBuildings;
              // 晋升后重新分配居所
              const residenceResult = autoAssignResidence({ ...d, status: 'inner' }, currentBuildings);
              currentBuildings = residenceResult.newBuildings;
              d = { ...d, status: 'inner', assignedBuilding: innerWorkResult.buildingId };
              alreadyPromoted = true;
            }
          }
          
          // 内门 → 核心
          if (d.status === 'inner' && !alreadyPromoted) {
            const realmIndex = RealmOrder.indexOf(d.realm);
            const minRealmIndex = RealmOrder.indexOf(promotionRules.innerToCore.minRealm);
            const canPromote = 
              realmIndex >= minRealmIndex &&
              d.contributionPoints >= promotionRules.innerToCore.minContribution;
            
            if (canPromote) {
              const cost = promotionRules.innerToCore.minContribution;
              promotionEvents.push({
                discipleId: d.id,
                discipleName: d.name,
                from: DiscipleStatusNames[d.status],
                to: DiscipleStatusNames.core,
              });
              // 晋升扣除贡献
              d = { ...d, contributionPoints: d.contributionPoints - cost };
              pushContributionLog(
                d.id, 'promotion', -cost, d.contributionPoints,
                `晋升核心弟子，扣除 ${cost} 贡献`,
              );
              // 从旧工作建筑中移除
              currentBuildings = currentBuildings.map(b => ({
                ...b,
                assignedDisciples: (b.type === 'outer_residence' ||
                   b.type === 'inner_residence' || b.type === 'core_residence' || b.type === 'cave_mansion')
                  ? b.assignedDisciples
                  : b.assignedDisciples.filter(id => id !== d.id)
              }));
              // 重新分配工作建筑
              const coreWorkResult = autoAssignBuilding({ ...d, status: 'core' }, currentBuildings);
              currentBuildings = coreWorkResult.newBuildings;
              // 晋升后重新分配居所
              const residenceResult = autoAssignResidence({ ...d, status: 'core' }, currentBuildings);
              currentBuildings = residenceResult.newBuildings;
              d = { ...d, status: 'core', assignedBuilding: coreWorkResult.buildingId };
              alreadyPromoted = true;
            }
          }
          
          return d;
        });

        // 自动任命长老：若玩家开启 autoAppointElder，则将符合 coreToElder 条件的核心弟子自动转为长老
        // 长老晋升同样扣除贡献，写日志；长老每月最多晋升 3 人，避免集体一次性跳槽
        if (state.autoAppointElder) {
          const elderRule = promotionRules.coreToElder;
          const minElderRealmIdx = RealmOrder.indexOf(elderRule.minRealm);
          const coreCandidates = finalDisciples.filter(d =>
            d.status === 'core' &&
            RealmOrder.indexOf(d.realm) >= minElderRealmIdx &&
            d.contributionPoints >= elderRule.minContribution
          ).sort((a, c) => c.contributionPoints - a.contributionPoints).slice(0, 3);
          const promotedElderIds = new Set(coreCandidates.map(d => d.id));
          finalDisciples = finalDisciples.map(d => {
            if (!promotedElderIds.has(d.id)) return d;
            const cost = elderRule.minContribution;
            const newBal = d.contributionPoints - cost;
            pushContributionLog(
              d.id, 'promotion', -cost, newBal,
              `晋升长老，扣除 ${cost} 贡献`,
            );
            promotionEvents.push({
              discipleId: d.id,
              discipleName: d.name,
              from: DiscipleStatusNames[d.status],
              to: DiscipleStatusNames.elder,
            });
            // 从工作建筑移除
            currentBuildings = currentBuildings.map(b => ({
              ...b,
              assignedDisciples: b.assignedDisciples.filter(id => id !== d.id),
              managerId: b.managerId === d.id ? null : b.managerId,
            }));
            // 重分居所（长老→核心居所）
            const resRes = autoAssignResidence({ ...d, status: 'elder' }, currentBuildings);
            currentBuildings = resRes.newBuildings;
            return { ...d, contributionPoints: newBal, status: 'elder' as DiscipleStatus };
          });
        }

        const totalInnerCount = finalDisciples.filter(d => d.status === 'inner').length;
        const maxCoreCount = Math.floor(finalDisciples.filter(d => d.status === 'outer').length * 0.3);

        // ⚠️ 需求1：取消"每月自动招收弟子"。弟子仅由玩家在「弟子管理」面板手动招募，
        // 不再由系统随机拜师进入宗门。

        // 弟子每月维护费：按身份等级消耗灵石（凡人0、杂役1、外门2、内门4、核心6、长老10）
        const DISCIPLE_MAINTENANCE_COST: Record<string, number> = {
          mortal: 0,
          servant: 1,
          outer: 2,
          inner: 4,
          core: 6,
          elder: 10,
        };
        const discipleMaintenance = finalDisciples.reduce(
          (sum, d) => sum + (DISCIPLE_MAINTENANCE_COST[d.status] || 0),
          0,
        );
        if (discipleMaintenance > 0) {
          spiritStoneExpense.push({ source: '弟子维护费', amount: discipleMaintenance });
          totalMaintenance += discipleMaintenance;
        }

        // 每月重新分配：确保无工作弟子被分配到有空缺的建筑，居所不匹配的弟子重新匹配
        const reassignResult = monthlyReassign(finalDisciples, currentBuildings);
        finalDisciples = reassignResult.disciples;
        currentBuildings = reassignResult.buildings;

        // 每月自动任命堂主：为每座工作堂口选出堂内身份最高的弟子担任堂主（玩家无需手动分配）
        const managerResult = autoAssignManagers(finalDisciples, currentBuildings);
        finalDisciples = managerResult.disciples;
        currentBuildings = managerResult.buildings;

        spiritStones += totalSpiritStoneIncome - totalMaintenance - rivalStoneLoss;
        reputation += reputationChange + buildingReputation + rivalRepGain - rivalRepLoss;
        
        // 声望上限检查
        const repCap = SectLevelReputationCap[state.sectLevel];
        if (repCap !== null && reputation > repCap) {
          reputation = repCap;
        }
        
        if (spiritStones < 0) {
          newNotifications.push(
            createNotification('warning', '灵石告急', '宗门灵石已出现赤字，请尽快调整开支！', currentDate)
          );
        }
        
        // 正邪度每年自然回归中立 +1（需求：正邪度可每年1点回复）
        let karmaYearlyRecover = 0;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
          karmaYearlyRecover = 1;  // 跨年恢复 1 点正邪度
          if (state.karma < 100) {
            newNotifications.push(createNotification(
              'info', '正邪自然回归',
              `新的一年到來，宗门正邪度悄然回归中立 +1（当前 ${Math.min(100, state.karma + 1)}）。`,
              { year, month },
            ));
          }        }
        
        const report = generateMonthlyReport(
          { year, month },
          spiritStoneIncome,
          spiritStoneExpense,
          breakthroughEvents,
          promotionEvents,
          newDisciples,
          reputationChange
        );
        
        breakthroughEvents.forEach(bt => {
          if (bt.success) {
            newNotifications.push(
              createNotification('success', '突破成功', `${bt.discipleName} 成功突破至 ${bt.to}！`, currentDate)
            );
          } else {
            newNotifications.push(
              createNotification('info', '突破失败', `${bt.discipleName} 突破 ${bt.to} 失败，修为有所倒退。`, currentDate)
            );
          }
        });
        
        promotionEvents.forEach(p => {
          newNotifications.push(
            createNotification('info', '弟子晋升', `${p.discipleName} 晋升为 ${p.to}！`, currentDate)
          );
        });
        
        // 刷新天下宗门关系（每月关系可能微调）
        refreshedOtherSects = refreshSectRelations(state.otherSects);

        // 天下宗门自然发展：每月战力随时间增长
        // 高等级宗门增长更快；附庸宗门因被压制增长缓慢
        {
          const levelGrowthMul: Record<SectLevel, number> = {
            founding: 0.5,
            known: 0.8,
            famous: 1.2,
            dominant: 1.8,
            eternal: 2.5,
          };
          refreshedOtherSects = refreshedOtherSects.map(s => {
            const baseMul = levelGrowthMul[s.level] ?? 1.0;
            // 附庸宗门被压榨，增长效率仅 30%
            const vassalMul = s.diplomaticStatus === 'vassal' ? 0.3 : 1.0;
            // 同盟宗门交流密切，增长略快（+20%）
            const allyMul = s.diplomaticStatus === 'ally' ? 1.2 : 1.0;
            // 基础月增长：战力的 1.5% × 系数，下限 5
            const growth = Math.max(
              5,
              Math.floor(s.combatPower * 0.015 * baseMul * vassalMul * allyMul),
            );
            return { ...s, combatPower: s.combatPower + growth };
          });
        }

        // 大比自动触发（仅在每年1月检查，三频率独立判断）
        const FREQUENCIES: TournamentFrequency[] = ['yearly', 'every5years', 'every10years'];
        const sectTournamentResults = { ...state.lastSectTournamentResults };
        const interSectTournamentResults = { ...state.lastInterSectTournamentResults };
        const sectYears = { ...state.lastSectTournamentYears };
        const interSectYears = { ...state.lastInterSectTournamentYears };
        let finalSpiritStones = spiritStones;
        let finalReputation = reputation;
        let finalPillInventory = [...accPillInventory];
        const tournamentNotifs: Notification[] = [];

        if (month === 1) {
          // 山门大比（三个频率分别检查）
          for (const freq of FREQUENCIES) {
            const freqConfig = state.sectTournamentConfig[freq];
            if (shouldTournamentTrigger(freq, freqConfig, year, month, sectYears[freq])) {
              const result = runTournament({
                scope: 'sect',
                frequency: freq,
                config: freqConfig,
                disciples: finalDisciples,
                otherSects: refreshedOtherSects,
                date: { year, month },
              });
              sectTournamentResults[freq] = result;
              sectYears[freq] = year;
              const rewards = applyTournamentRewards(
                { ...state, spiritStones: finalSpiritStones, reputation: finalReputation, pillInventory: finalPillInventory, disciples: finalDisciples } as GameState,
                result,
                freqConfig,
              );
              finalSpiritStones = rewards.newSpiritStones;
              finalReputation = rewards.newReputation;
              finalPillInventory = rewards.newPillInventory;
              finalDisciples = rewards.newDisciples;
              // 大比贡献奖励流水
              for (const c of rewards.contributionChanges) {
                pendingContributionLogs.push({
                  id: generateId(), discipleId: c.discipleId, date: currentDate,
                  type: 'tournament', amount: c.amount, balance: c.balance, description: c.description,
                });
              }
              const freqName = freq === 'yearly' ? '年度' : freq === 'every5years' ? '五年' : '十年';
              tournamentNotifs.push(createNotification(
                result.ourRank > 0 ? 'success' : 'info',
                `山门${freqName}大比`,
                result.ourRank === 1
                  ? `${result.ourChampionName} 夺得山门${freqName}大比冠军！${result.rewardSummary.join('、')}`
                  : result.ourRank > 0
                    ? `山门${freqName}大比结束，本宗弟子获第${result.ourRank}名。${result.rewardSummary.join('、')}`
                    : `山门${freqName}大比结束，本宗弟子未入三甲。`,
                { year, month },
              ));
            }
          }
          // 宗门大比（三个频率分别检查）
          for (const freq of FREQUENCIES) {
            const freqConfig = state.interSectTournamentConfig[freq];
            if (shouldTournamentTrigger(freq, freqConfig, year, month, interSectYears[freq])) {
              const result = runTournament({
                scope: 'inter-sect',
                frequency: freq,
                config: freqConfig,
                disciples: finalDisciples,
                otherSects: refreshedOtherSects,
                date: { year, month },
              });
              interSectTournamentResults[freq] = result;
              interSectYears[freq] = year;
              const rewards = applyTournamentRewards(
                { ...state, spiritStones: finalSpiritStones, reputation: finalReputation, pillInventory: finalPillInventory, disciples: finalDisciples } as GameState,
                result,
                freqConfig,
              );
              finalSpiritStones = rewards.newSpiritStones;
              finalReputation = rewards.newReputation;
              finalPillInventory = rewards.newPillInventory;
              finalDisciples = rewards.newDisciples;
              // 大比贡献奖励流水
              for (const c of rewards.contributionChanges) {
                pendingContributionLogs.push({
                  id: generateId(), discipleId: c.discipleId, date: currentDate,
                  type: 'tournament', amount: c.amount, balance: c.balance, description: c.description,
                });
              }
              const freqName = freq === 'yearly' ? '年度' : freq === 'every5years' ? '五年' : '十年';
              tournamentNotifs.push(createNotification(
                result.ourRank > 0 ? 'success' : 'info',
                `宗门${freqName}大比`,
                result.ourRank === 1
                  ? `${result.ourChampionName} 夺得宗门${freqName}大比冠军，扬名天下！${result.rewardSummary.join('、')}`
                  : result.ourRank > 0
                    ? `宗门${freqName}大比结束，本宗弟子获第${result.ourRank}名。${result.rewardSummary.join('、')}`
                    : `宗门${freqName}大比结束，本宗弟子未入三甲，须勤加修炼。`,
                { year, month },
              ));
            }
          }
        }

        // ===== 试炼系统：每月推进进度 + 每年1月刷新任务列表 =====
        let finalTrials = [...state.trials];
        const trialNotifs: Notification[] = [];
        let trialSpiritStones = finalSpiritStones;
        let trialReputation = finalReputation;
        let trialHerbs = accHerbs;
        let trialIron = accIron;
        let trialPaper = accPaper;

        // 每年1月刷新可用试炼（保留进行中的），加入按境界分层的保底试炼
        if (month === 1) {
          const combatResult = calculateSectCombatPower(finalDisciples, currentBuildings);
          const newTrials = generateTrials(combatResult.totalPower, finalDisciples.length, year, true);
          // 保留进行中的旧试炼，替换已完成的/失败的/可用的
          const inProgress = finalTrials.filter(t => t.status === 'in_progress');
          finalTrials = [...inProgress, ...newTrials];
          if (newTrials.length > 0) {
            trialNotifs.push(createNotification(
              'info', '试炼刷新', `本年度共 ${newTrials.length} 项试炼任务可供派遣。`, { year, month },
            ));
          }
        } else {
          // 每月随机追加 1~3 个新试炼（也含境界分层保底，保证高境界弟子有试炼可做）
          if (Math.random() < 0.9) {
            const combatResult = calculateSectCombatPower(finalDisciples, currentBuildings);
            // 每月数量较少：2~5 个，其中开启境界保底
            const monthlyCount = randomInt(1, 3);
            const batch = generateTrials(
              combatResult.totalPower,
              Math.max(1, Math.floor(finalDisciples.length * 0.5)),
              year,
              true,
            ).slice(0, monthlyCount + 5).sort(() => Math.random() - 0.5).slice(0, monthlyCount);
            if (batch.length > 0) {
              // 清理掉一部分旧的 available 试炼（避免无限累积），保留进行中 + 最近30个可用
              const inProgress = finalTrials.filter(t => t.status === 'in_progress');
              const available = finalTrials.filter(t => t.status === 'available').slice(-30);
              finalTrials = [...inProgress, ...available, ...batch];
              trialNotifs.push(createNotification(
                'info', '月度新试炼', `本月出现 ${batch.length} 项新的试炼任务。`, { year, month },
              ));
            }
          }
        }

        // 推进进行中试炼的进度
        finalTrials = finalTrials.map(trial => {
          if (trial.status !== 'in_progress' || !trial.assignedDiscipleId) return trial;
          const progressInc = 100 / trial.durationMonths;
          const newProgress = Math.min(100, trial.progress + progressInc);

          if (newProgress >= 100) {
            // 试炼结束，结算
            const disciple = finalDisciples.find(d => d.id === trial.assignedDiscipleId);
            if (!disciple) {
              return { ...trial, status: 'failed' as const, progress: 100 };
            }
            // 成功判定：弟子战力 vs 建议战力影响成功率
            const disciplePower = calculateDiscipleCombatPower(disciple);
            const powerRatio = disciplePower / Math.max(1, trial.requiredPower);
            // 战力越高，失败率越低
            const adjustedRisk = Math.max(0.02, trial.riskRate * (1 / Math.max(0.5, powerRatio)));
            const isSuccess = Math.random() > adjustedRisk;

            if (isSuccess) {
              // 发放奖励
              const r = trial.rewards;
              if (r.spiritStones) trialSpiritStones += r.spiritStones;
              if (r.reputation) trialReputation += r.reputation;
              if (r.herbs) trialHerbs += r.herbs;
              if (r.iron) trialIron += r.iron;
              if (r.paper) trialPaper += r.paper;
              // 特殊材料掉落累加到 accSpecialMaterials
              if (r.specialMaterials && r.specialMaterials.length > 0) {
                for (const sm of r.specialMaterials) {
                  accSpecialMaterials[sm.name] = (accSpecialMaterials[sm.name] ?? 0) + sm.amount;
                }
              }
              if (r.contributionPoints || r.satisfaction) {
                finalDisciples = finalDisciples.map(d => {
                  if (d.id !== disciple.id) return d;
                  const patch: Partial<Disciple> = { onTrialId: null };
                  if (r.contributionPoints) {
                    const newBal = d.contributionPoints + r.contributionPoints;
                    patch.contributionPoints = newBal;
                    pushContributionLog(
                      d.id, 'trial_reward', r.contributionPoints, newBal,
                      `试炼「${trial.name}」成功奖励 +${r.contributionPoints} 贡献`,
                    );
                  }
                  if (r.satisfaction) patch.satisfaction = Math.min(100, d.satisfaction + r.satisfaction);
                  return { ...d, ...patch };
                });
              } else {
                finalDisciples = finalDisciples.map(d =>
                  d.id === disciple.id ? { ...d, onTrialId: null } : d,
                );
              }
              trialNotifs.push(createNotification(
                'success', '试炼成功',
                `${disciple.name} 完成「${trial.name}」！获得：${r.description}`,
                { year, month },
              ));
              return { ...trial, status: 'completed' as const, progress: 100 };
            } else {
              // 失败：可能受伤（修为倒退）
              const isInjured = Math.random() < trial.injuryRate;
              finalDisciples = finalDisciples.map(d => {
                if (d.id !== disciple.id) return d;
                const patch: Partial<Disciple> = { onTrialId: null };
                if (isInjured) {
                  // 受伤：修为倒退 10~30%
                  const rollback = Math.floor(d.realmProgress * (0.1 + Math.random() * 0.2));
                  patch.realmProgress = Math.max(0, d.realmProgress - rollback);
                  patch.satisfaction = Math.max(0, d.satisfaction - 10);
                }
                return { ...d, ...patch };
              });
              trialNotifs.push(createNotification(
                'warning', '试炼失败',
                `${disciple.name} 执行「${trial.name}」失败${isInjured ? '，弟子受伤修为倒退' : '，但全身而退'}。`,
                { year, month },
              ));
              return { ...trial, status: 'failed' as const, progress: 100 };
            }
          }
          return { ...trial, progress: newProgress };
        });

        finalSpiritStones = trialSpiritStones;
        finalReputation = trialReputation;
        accHerbs = trialHerbs;
        accIron = trialIron;
        accPaper = trialPaper;

        // 记录本月灵石收支历史（保留最近24条）
        const netIncome = totalSpiritStoneIncome - totalMaintenance;
        const newSpiritStoneHistory = [
          ...state.spiritStoneHistory,
          { year, month, spiritStones: finalSpiritStones, netIncome },
        ].slice(-24);

        // 贡献值流水：将本月新记录合并到状态头部，最多保留 5000 条（避免存档无限膨胀）
        const mergedContributionLogs = [...pendingContributionLogs, ...state.contributionLogs].slice(0, 5000);

        // 本月宗门总贡献池入账：按弟子身份抽成（每月每弟子固定流入，宗门晋升消耗）
        const statusSectContribRate: Record<string, number> = {
          servant: 1, outer: 3, inner: 8, core: 20, elder: 50,
        };
        const sectContribDelta = finalDisciples.reduce((sum, d) => {
          return sum + (statusSectContribRate[d.status] || 0);
        }, 0);

        set({
          year,
          month,
          sectLevel: state.sectLevel,
          reputation: finalReputation,
          spiritStones: finalSpiritStones,
          sectContribution: (state.sectContribution || 0) + sectContribDelta,
          herbInventory: Math.max(0, accHerbs),
          ironInventory: Math.max(0, accIron),
          paperInventory: Math.max(0, accPaper),
          specialMaterials: accSpecialMaterials,
          disciples: finalDisciples,
          buildings: [...currentBuildings],
          pillInventory: finalPillInventory,
          artifactInventory: accArtifactInventory,
          talismanInventory: accTalismanInventory,
          beastInventory: newBeastInventory,
          monthlyReport: report,
          showReport: true,
          notifications: [...trialNotifs, ...tournamentNotifs, ...newNotifications, ...state.notifications].slice(0, 50),
          otherSects: refreshedOtherSects,
          trials: finalTrials,
          lastSectTournamentResults: sectTournamentResults,
          lastInterSectTournamentResults: interSectTournamentResults,
          lastSectTournamentYears: sectYears,
          lastInterSectTournamentYears: interSectYears,
          spiritStoneHistory: newSpiritStoneHistory,
          contributionLogs: mergedContributionLogs,
          // 正邪度年度自然回复（每年+1，封顶+100）
          karma: Math.min(100, state.karma + karmaYearlyRecover),
        });
        // 围攻战报：推入 uiStore 触发弹窗（由 SiegeReportModal 渲染）
        if (pendingSiegeReport) {
          useUIStore.getState().setSiegeReport(pendingSiegeReport);
        }
      },
      
      dismissReport: () => {
        set({ showReport: false });
      },

      dismissVictory: () => {
        set({ gameWon: false });
      },
      
      markNotificationRead: (id: string) => {
        set(state => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      
      assignDiscipleToBuilding: (discipleId: string, buildingId: string | null) => {
        set(state => {
          // 如果是分配到新建筑，检查准入条件
          if (buildingId) {
            const building = state.buildings.find(b => b.id === buildingId);
            const disciple = state.disciples.find(d => d.id === discipleId);

            if (building && disciple) {
              // 检查准入条件
              if (building.minDiscipleStatus) {
                const statusOrder: DiscipleStatus[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];
                const buildingMinIndex = statusOrder.indexOf(building.minDiscipleStatus);
                const discipleIndex = statusOrder.indexOf(disciple.status as DiscipleStatus);

                if (discipleIndex < buildingMinIndex) {
                  return state; // 不允许分配，弟子身份太低
                }
              }

              // 检查容量
              if (building.assignedDisciples.length >= building.discipleCapacity) {
                return state; // 不允许分配，建筑已满
              }
            }
          }

          // 居所类建筑类型
          const residenceTypes = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'];

          // 只从工作建筑中移除弟子，保留居所分配
          const newBuildings = state.buildings.map(b => ({
            ...b,
            assignedDisciples: residenceTypes.includes(b.type)
              ? b.assignedDisciples
              : b.assignedDisciples.filter(id => id !== discipleId),
          }));

          const newDisciples = state.disciples.map(d =>
            d.id === discipleId ? { ...d, assignedBuilding: buildingId } : d
          );

          if (buildingId) {
            const buildingIndex = newBuildings.findIndex(b => b.id === buildingId);
            if (buildingIndex >= 0) {
              newBuildings[buildingIndex] = {
                ...newBuildings[buildingIndex],
                assignedDisciples: [...newBuildings[buildingIndex].assignedDisciples, discipleId],
              };
            }
          }

          return { buildings: newBuildings, disciples: newDisciples };
        });
      },

      setBuildingManager: (buildingId: string, discipleId: string | null) => {
        const state = get();
        // 堂主任命规则：必须金丹期（golden）及以上
        if (discipleId) {
          const candidate = state.disciples.find(d => d.id === discipleId);
          if (!candidate) return;
          const goldenIndex = RealmOrder.indexOf('golden');
          const candidateIndex = RealmOrder.indexOf(candidate.realm);
          if (candidateIndex < goldenIndex) return; // 修为不足，禁止任命
        }
        const RESIDENCE_TYPES_SET = new Set(['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion']);

        set(state => {
          // 1. 移除该弟子在其他建筑的管理身份（含锁定）
          let newBuildings = state.buildings.map(b => {
            if (discipleId && b.managerId === discipleId && b.id !== buildingId) {
              return { ...b, managerId: null, managerLocked: false };
            }
            return b;
          });

          // 2. 如果弟子原来在他堂（非居所）的 assignedDisciples 中，先记录要移除
          const crossRemoves: { buildingId: string; discipleId: string }[] = [];
          if (discipleId) {
            for (const b of newBuildings) {
              if (b.id === buildingId) continue;
              if (RESIDENCE_TYPES_SET.has(b.type)) continue;
              if (b.assignedDisciples.includes(discipleId)) {
                crossRemoves.push({ buildingId: b.id, discipleId });
              }
            }
          }

          // 3. 更新目标建筑的 manager 与 锁定标记，并把 manager 加入 assignedDisciples（未满）
          newBuildings = newBuildings.map(b => {
            if (b.id !== buildingId) return b;
            const next: any = {
              ...b,
              managerId: discipleId,
              managerLocked: discipleId !== null, // 玩家指派 = 锁定
            };
            if (discipleId &&
                !RESIDENCE_TYPES_SET.has(b.type) &&
                !b.assignedDisciples.includes(discipleId) &&
                b.assignedDisciples.length < b.discipleCapacity) {
              next.assignedDisciples = [...b.assignedDisciples, discipleId];
            }
            return next;
          });

          // 4. 应用 crossRemoves：把 manager 从其他堂剔除
          if (crossRemoves.length > 0) {
            newBuildings = newBuildings.map(b => {
              const hit = crossRemoves.find(r => r.buildingId === b.id);
              if (!hit) return b;
              return { ...b, assignedDisciples: b.assignedDisciples.filter(id => id !== hit.discipleId) };
            });
          }

          // 5. 更新弟子：设 managingBuilding，若已分配到该建筑就同步 assignedBuilding
          const newDisciples = state.disciples.map(d => {
            if (d.id === discipleId) {
              return {
                ...d,
                managingBuilding: buildingId,
                assignedBuilding:
                  discipleId !== null && !RESIDENCE_TYPES_SET.has(
                    state.buildings.find(b => b.id === buildingId)?.type || ''
                  )
                    ? buildingId
                    : d.assignedBuilding,
              };
            }
            // 其他弟子：如果本建筑的经理被替换了，就清掉他的 managingBuilding
            if (d.managingBuilding === buildingId && d.id !== discipleId) {
              return { ...d, managingBuilding: null };
            }
            return d;
          });

          return { buildings: newBuildings, disciples: newDisciples };
        });
      },

      upgradeBuilding: (buildingId: string): boolean => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return false;
        if (building.level >= building.maxLevel) return false;

        // 统一使用配置中的升级费用。洞府(cave_mansion)单独走升级费用函数
        let upgradeCost;
        const isCaveMansion = building.type === 'cave_mansion';
        const isResidence = RESIDENCE_TYPES.includes(building.type);
        if (isCaveMansion) {
          upgradeCost = getCaveMansionUpgradeCost(building.level);
          if (!upgradeCost) return false;
        } else if (isResidence) {
          upgradeCost = getResidenceUpgradeCost(building);
          if (!upgradeCost) return false;
        } else {
          upgradeCost = building.upgradeCosts[building.level - 1];
          if (!upgradeCost) return false;
        }

        // 资源校验（灵石 + 声望；贡献为弟子属性，不作为建筑升级门槛）
        if (state.spiritStones < upgradeCost.spiritStones) return false;
        const needReputation = upgradeCost.reputation ?? 0;
        if (state.reputation < needReputation) return false;

        // 计算升级后的新容量
        const newLevel = building.level + 1;
        let newCapacity = building.discipleCapacity;
        if (isCaveMansion || isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          // 非居所功能建筑升级也增加容量
          newCapacity = building.discipleCapacity + 10;
        }

        // 计算升级后的新维护费
        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones - upgradeCost.spiritStones,
          reputation: state.reputation - needReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return true;
      },

      downgradeBuilding: (buildingId: string): { success: boolean; refundSpiritStones: number; refundReputation: number; reason?: string } => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return { success: false, refundSpiritStones: 0, refundReputation: 0, reason: '建筑不存在' };
        if (building.level <= 1) return { success: false, refundSpiritStones: 0, refundReputation: 0, reason: '已是最低等级' };

        const isCaveMansion = building.type === 'cave_mansion';
        const isResidence = RESIDENCE_TYPES.includes(building.type);

        // 计算返还资源：从 (level-1) 升级到 level 时花费的全部资源
        let refundSpiritStones = 0;
        let refundReputation = 0;
        if (isCaveMansion) {
          const cost = getCaveMansionUpgradeCost(building.level - 1);
          if (cost) {
            refundSpiritStones = cost.spiritStones;
          }
        } else if (isResidence) {
          const prevLevelBuilding = { ...building, level: building.level - 1 };
          const cost = getResidenceUpgradeCost(prevLevelBuilding);
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundReputation = cost.reputation ?? 0;
          }
        } else {
          const cost = building.upgradeCosts[building.level - 2];
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundReputation = cost.reputation ?? 0;
          }
        }

        const newLevel = building.level - 1;
        let newCapacity = building.discipleCapacity;
        if (isCaveMansion || isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          newCapacity = Math.max(0, building.discipleCapacity - 10);
        }

        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones + refundSpiritStones,
          reputation: state.reputation + refundReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return { success: true, refundSpiritStones, refundReputation };
      },

      toggleBuilding: (buildingId: string) => {
        set(state => ({
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, status: b.status === 'active' ? 'closed' : 'active' }
              : b
          ),
        }));
      },

      // 驱逐弟子出门：从弟子列表、建筑岗位、堂主位置中移除
      kickDisciple: (discipleId) => {
        const state = get();
        const d = state.disciples.find(x => x.id === discipleId);
        if (!d) return { ok: false, reason: '弟子不存在' };
        // 从所有建筑中移除（包括经理）
        const newBuildings = state.buildings.map(b => ({
          ...b,
          assignedDisciples: b.assignedDisciples.filter(id => id !== discipleId),
          managerId: b.managerId === discipleId ? null : b.managerId,
        }));
        const newDisciples = state.disciples.filter(x => x.id !== discipleId);
        const kickNotif = createNotification(
          'warning',
          '弟子逐出',
          `${d.name} 已被逐出山门。`,
          { year: state.year, month: state.month },
        );
        set({
          disciples: newDisciples,
          buildings: newBuildings,
          karma: Math.max(-100, state.karma - 3),
          notifications: [kickNotif, ...state.notifications].slice(0, 50),
        });
        // 如果当前选中的是被驱逐的弟子，清空选择
        const ui = (window as any).__uiStoreUnsub ? null : null;  // placeholder
        return { ok: true };
      },
      
      recruitDisciple: () => {
        const state = get();
        // 按招收规则 + 费用生成 3~5 名候选弟子，返回数组供玩家挑选
        const rule = state.promotionRules.recruitment;
        const attrSum =
          Math.max(0, rule.minRootBone - 50) + Math.max(0, rule.minSpiritRhythm - 50) +
          Math.max(0, rule.minConstitution - 50) + Math.max(0, rule.minDaoFate - 50);
        const thresholdMult = 1 + attrSum / 50;
        const exceptionalBonus =
          (rule.exceptionalThreshold > 0 && rule.exceptionalThreshold <= 85) ? 1.5 : 1.0;
        const baseCost = Math.round(50 * thresholdMult * exceptionalBonus);
        const finalCostPerDisciple = Math.max(50, baseCost);

        // 尝试多次生成候选，返回 3~4 个符合门槛（含破格）的
        const candidates: Disciple[] = [];
        const maxTries = 20;
        const candidateCount = 4;
        for (let i = 0; i < maxTries && candidates.length < candidateCount; i++) {
          const c = createInitialDisciple('mortal', 'mortal');
          c.joinDate = { year: state.year, month: state.month };
          c.status = 'servant';
          c.realm = 'qi';
          c.contributionPoints = 0;
          const t = c.hiddenTalents;
          const meetsBase =
            t.rootBone >= rule.minRootBone && t.spiritRhythm >= rule.minSpiritRhythm &&
            t.constitution >= rule.minConstitution && t.daoFate >= rule.minDaoFate;
          const maxAttr = Math.max(t.rootBone, t.spiritRhythm, t.constitution, t.daoFate);
          const meetsExceptional = maxAttr >= rule.exceptionalThreshold;
          if (meetsBase || meetsExceptional) {
            candidates.push(c);
          }
        }
        // 保证至少有 3 个：合规不足则补随机
        while (candidates.length < 3) {
          const c = createInitialDisciple('mortal', 'mortal');
          c.joinDate = { year: state.year, month: state.month };
          c.status = 'servant';
          c.realm = 'qi';
          c.contributionPoints = 0;
          candidates.push(c);
        }
        // 暂存到 state 中，UI 从 state 里取候选
        set({
          recruitCandidates: candidates,
          recruitCostPerDisciple: finalCostPerDisciple,
        });
        return { candidates, costPerDisciple: finalCostPerDisciple };
      },

      // 确认招收候选弟子
      recruitConfirmDisciple: (candidate) => {
        const state = get();
        if (state.spiritStones < state.recruitCostPerDisciple) {
          return { ok: false, reason: `灵石不足（需${state.recruitCostPerDisciple}）` };
        }
        const newDisciple: Disciple = { ...candidate, id: generateId() };

        // 师承关系
        const potentialMasters = state.disciples.filter(
          d => d.id !== newDisciple.id && RealmOrder.indexOf(d.realm) > RealmOrder.indexOf(newDisciple.realm),
        );
        if (potentialMasters.length > 0) {
          const master = potentialMasters[randomInt(0, potentialMasters.length - 1)];
          newDisciple.master = master.name;
        }
        // 好友
        const potentialFriends = state.disciples.filter(
          d => d.id !== newDisciple.id && d.name !== newDisciple.master,
        );
        if (potentialFriends.length > 0) {
          const friendCount = Math.min(randomInt(1, 2), potentialFriends.length);
          const shuffled = [...potentialFriends].sort(() => Math.random() - 0.5);
          newDisciple.friends = shuffled.slice(0, friendCount).map(d => d.name);
        }

        let currentBuildings = state.buildings;
        const servantHall = currentBuildings.find(b => b.type === 'servant_hall');
        if (servantHall && servantHall.assignedDisciples.length < servantHall.discipleCapacity) {
          currentBuildings = currentBuildings.map(b =>
            b.id === servantHall.id
              ? { ...b, assignedDisciples: [...b.assignedDisciples, newDisciple.id] }
              : b
          );
          newDisciple.assignedBuilding = servantHall.id;
        }
        const { newBuildings } = autoAssignResidence(newDisciple, currentBuildings);
        const joinNotif = createNotification(
          'success', '新弟子加入',
          `${newDisciple.name} 已拜入山门，从杂役做起。`,
          { year: state.year, month: state.month },
        );
        set(state => ({
          disciples: [...state.disciples, newDisciple],
          buildings: newBuildings,
          spiritStones: state.spiritStones - state.recruitCostPerDisciple,
          recruitCandidates: state.recruitCandidates.filter(c => c.id !== candidate.id),
          notifications: [joinNotif, ...state.notifications].slice(0, 50),
        }));
        return { ok: true };
      },

      // 清空招收候选
      clearRecruitCandidates: () => {
        set({ recruitCandidates: [], recruitCostPerDisciple: 50 });
      },
      
      getDiscipleById: (id: string) => {
        return get().disciples.find(d => d.id === id);
      },
      
      getBuildingById: (id: string) => {
        return get().buildings.find(b => b.id === id);
      },
      
      buildBuilding: (type: string): boolean => {
        const state = get();
        const config = BUILDING_CONFIGS[type as BuildingType];
        if (!config) return false;

        const existingBuilding = state.buildings.find(b => b.type === type);
        if (existingBuilding) return false;

        const buildCost = config.buildCost;
        if (!buildCost) return false;

        if (state.spiritStones < buildCost.spiritStones) return false;

        // 居所/洞府使用容量表
        const isResidenceType = ['outer_residence', 'inner_residence', 'core_residence', 'cave_mansion'].includes(type);
        const initialCapacity = isResidenceType
          ? getResidenceCapacityByLevel(type, 1)
          : config.discipleCapacity;

        const newBuilding: Building = {
          id: `${type}_${Date.now()}`,
          type: type as BuildingType,
          name: config.name,
          level: 1,
          maxLevel: config.maxLevel,
          status: 'active',
          baseOutput: { ...config.baseOutput },
          baseMaintenanceCost: config.baseMaintenanceCost,
          upgradeCosts: config.upgradeCosts,
          elderBonus: 0,
          discipleCapacity: initialCapacity,
          assignedDisciples: [],
          managerId: null,
          description: config.description,
          category: config.category,
          primaryOutput: config.primaryOutput,
          buildCost: config.buildCost,
          minDiscipleStatus: config.minDiscipleStatus,
          monthlyContributionCost: config.monthlyContributionCost,
          unlockRequirement: config.unlockRequirement,
        };

        set(state => ({
          spiritStones: state.spiritStones - buildCost.spiritStones,
          buildings: [...state.buildings, newBuilding],
        }));

        return true;
      },

      updatePromotionRules: (rules: Partial<PromotionRules>) => {
        set(state => ({
          promotionRules: {
            ...state.promotionRules,
            ...rules,
          },
        }));
      },
      
      learnBook: (discipleId: string, bookId: string): boolean => {
        const state = get();
        
        const book = state.libraryBooks.find(b => b.id === bookId);
        if (!book) return false;
        
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return false;
        
        // 正在学习中，不能同时学多本
        if (disciple.learningBook) return false;
        
        // 境界检查
        const tierRealmMap: Record<string, string> = {
          qi: 'qi',
          foundation: 'foundation',
          golden: 'golden',
          nascent: 'nascent',
        };
        const requiredRealm = tierRealmMap[book.tier];
        if (!requiredRealm) return false;
        const discipleRealmIndex = RealmOrder.indexOf(disciple.realm);
        const requiredRealmIndex = RealmOrder.indexOf(requiredRealm as any);
        if (discipleRealmIndex < requiredRealmIndex) return false;
        
        // 灵根检查
        if (!canLearnBook(disciple.hiddenTalents.spiritRoots || [], book)) return false;
        
        // 贡献点检查
        const cost = state.libraryCosts[book.tier];
        if (disciple.contributionPoints < cost) return false;
        
        // 检查数量限制（支持自动 forget 低级功法/战技）
        let autoForget: { bookType: 'technique' | 'battle'; bookId: string } | null = null;
        if (book.type === 'technique') {
          if (disciple.learnedTechnique) {
            // 候选更好 → 自动 forget 旧的
            if (book.cultivationBonus > disciple.learnedTechnique.cultivationBonus) {
              autoForget = { bookType: 'technique', bookId: disciple.learnedTechnique.bookId };
            } else {
              // 不比旧的好 → 拒绝
              return false;
            }
          }
        }
        if (book.type === 'battle') {
          if (disciple.learnedBattles.length >= 2) {
            // 找 combatBonus 最低的一本，如果候选更好就 forget 它
            const sorted = [...disciple.learnedBattles].sort((a, b) => a.combatBonus - b.combatBonus);
            const weakest = sorted[0];
            if (book.combatBonus > weakest.combatBonus) {
              autoForget = { bookType: 'battle', bookId: weakest.bookId };
            } else {
              return false;
            }
          }
        }
        
        // 开始学习
        const newBalance = disciple.contributionPoints - cost;
        const updatedDisciples = state.disciples.map(d => {
          if (d.id !== discipleId) return d;
          let changed: any = {
            ...d,
            contributionPoints: newBalance,
            learningBook: {
              bookId: book.id,
              name: book.name,
              type: book.type,
              tier: book.tier,
              attribute: book.attribute,
              cultivationBonus: book.cultivationBonus,
              combatBonus: book.combatBonus,
              progress: 0,
              totalDays: book.learnDays,
              isLearned: false,
            },
            isLearningSecret: true,
          };
          // 自动 forget 低级
          if (autoForget) {
            if (autoForget.bookType === 'technique') {
              changed.learnedTechnique = null;
            } else {
              changed.learnedBattles = d.learnedBattles.filter(b => b.bookId !== autoForget!.bookId);
            }
          }
          return changed;
        });

        // 藏经阁学习秘籍扣贡献流水
        const currentDate = { year: state.year, month: state.month };
        const logEntry: ContributionLog = {
          id: generateId(),
          discipleId,
          date: currentDate,
          type: 'learn_secret',
          amount: -cost,
          balance: newBalance,
          description: `藏经阁学习「${book.name}」，扣除 ${cost} 贡献`,
        };

        set({
          disciples: updatedDisciples,
          contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000),
        });
        return true;
      },
      
      forgetBook: (discipleId: string, bookType: 'technique' | 'battle', bookId: string): boolean => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return false;
        
        const updatedDisciples = state.disciples.map(d => {
          if (d.id !== discipleId) return d;
          
          if (bookType === 'technique' && d.learnedTechnique?.bookId === bookId) {
            return {
              ...d,
              learnedTechnique: null,
            };
          }
          
          if (bookType === 'battle') {
            return {
              ...d,
              learnedBattles: d.learnedBattles.filter(b => b.bookId !== bookId),
            };
          }
          
          return d;
        });
        
        set({ disciples: updatedDisciples });
        return true;
      },
      
      buyRandomBook: (tier: BookTier): BookConfig | null => {
        const state = get();
        const price = getBookPrice(tier);
        
        if (state.spiritStones < price) return null;
        
        const newBook = generateRandomBook(tier, Math.random() < 0.4 ? 'technique' : 'battle');
        
        set({
          spiritStones: state.spiritStones - price,
          libraryBooks: [...state.libraryBooks, newBook],
        });
        
        return newBook;
      },
      
      setLibraryCost: (tier: BookTier, cost: number) => {
        const state = get();
        set({
          libraryCosts: {
            ...state.libraryCosts,
            [tier]: Math.max(0, cost),
          },
        });
      },
      
      buyCaveMansion: (elderId: string): boolean => {
        const state = get();
        const elder = state.disciples.find(d => d.id === elderId);
        if (!elder || elder.status !== 'elder') return false;

        // 长老不能同时拥有多处洞府居住权
        const alreadyInCave = state.buildings.some(b =>
          b.type === 'cave_mansion' && b.assignedDisciples.includes(elderId)
        );
        if (alreadyInCave) return false;

        // 查找活跃的洞府（每个宗门只有一处洞府建筑）
        let caveBuilding = state.buildings.find(b =>
          b.type === 'cave_mansion' && b.status === 'active'
        );

        let newBuildings = state.buildings;
        let spiritStonesCost = 0;

        if (!caveBuilding) {
          // 建造新洞府（首次）
          const caveConfig = BUILDING_CONFIGS['cave_mansion'];
          if (!caveConfig.buildCost) return false;
          if (state.spiritStones < caveConfig.buildCost.spiritStones) return false;

          spiritStonesCost = caveConfig.buildCost.spiritStones;

          const capacity = getResidenceCapacityByLevel('cave_mansion', 1);
          const newCave: Building = {
            id: `cave_mansion_${Date.now()}`,
            type: 'cave_mansion',
            name: '洞府',
            level: 1,
            maxLevel: caveConfig.maxLevel,
            status: 'active',
            baseOutput: caveConfig.baseOutput,
            baseMaintenanceCost: caveConfig.baseMaintenanceCost,
            upgradeCosts: caveConfig.upgradeCosts,
            elderBonus: 0,
            discipleCapacity: capacity,
            assignedDisciples: [elderId],
            managerId: elderId,
            description: caveConfig.description,
            category: caveConfig.category,
            primaryOutput: caveConfig.primaryOutput,
            buildCost: caveConfig.buildCost,
            minDiscipleStatus: caveConfig.minDiscipleStatus,
          };

          newBuildings = [...state.buildings, newCave];
        } else {
          // 洞府已存在：检查容量
          if (caveBuilding.assignedDisciples.length >= caveBuilding.discipleCapacity) {
            // 洞府已满，不能直接入住，需通过挑战获取
            return false;
          }

          // 有剩余容量，将长老加入洞府
          newBuildings = state.buildings.map(b => {
            if (b.id === caveBuilding!.id) {
              return {
                ...b,
                assignedDisciples: [...b.assignedDisciples, elderId],
                // 洞府的 managerId 由第一位入住长老担任；若已有则保留
                managerId: b.managerId ?? elderId,
              };
            }
            return b;
          });
        }

        // 长老购买洞府扣贡献流水（首次占用洞府贡献 1000，用于"获得洞府居住权"）
        const contributionCost = 1000;
        if (elder.contributionPoints < contributionCost && !caveBuilding) {
          // 首次建造洞府时仍需贡献，用于"仪式费用"
          return false;
        }
        const newBalance = Math.max(0, elder.contributionPoints - contributionCost);
        const newDisciples = state.disciples.map(d =>
          d.id === elderId ? { ...d, contributionPoints: newBalance } : d
        );

        const currentDate = { year: state.year, month: state.month };
        const logEntry: ContributionLog = {
          id: generateId(),
          discipleId: elderId,
          date: currentDate,
          type: 'deduct',
          amount: -contributionCost,
          balance: newBalance,
          description: caveBuilding
            ? `入住洞府，扣除 ${contributionCost} 贡献`
            : `建造并入住洞府，扣除 ${contributionCost} 贡献`,
        };

        set({
          buildings: newBuildings,
          disciples: newDisciples,
          spiritStones: state.spiritStones - spiritStonesCost,
          contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000),
        });

        return true;
      },

      // 洞府挑战：挑战方必须是长老且未住在洞府；被挑战方必须是洞府居住长老；胜者保留/获得洞府居住权
      challengeCaveMansion: (challengerId: string, defenderId: string): {
        success: boolean; reason?: string; winnerId?: string; loserId?: string;
      } => {
        const state = get();
        const challenger = state.disciples.find(d => d.id === challengerId);
        const defender = state.disciples.find(d => d.id === defenderId);
        if (!challenger || !defender) return { success: false, reason: '弟子不存在' };
        if (challenger.status !== 'elder') return { success: false, reason: '仅长老可挑战洞府' };
        if (defender.status !== 'elder') return { success: false, reason: '被挑战者必须为长老' };

        const cave = state.buildings.find(b => b.type === 'cave_mansion' && b.status === 'active');
        if (!cave) return { success: false, reason: '当前无活跃洞府' };
        if (!cave.assignedDisciples.includes(defenderId)) {
          return { success: false, reason: '被挑战长老未居住在洞府' };
        }
        if (cave.assignedDisciples.includes(challengerId)) {
          return { success: false, reason: '挑战方已居住在洞府' };
        }

        // 贡献门槛：1000 贡献
        const contributionCost = 1000;
        if (challenger.contributionPoints < contributionCost) {
          return { success: false, reason: `挑战需消耗 ${contributionCost} 贡献，当前不足` };
        }

        // 计算双方战力
        const cPower = calculateDiscipleCombatPower(challenger);
        const dPower = calculateDiscipleCombatPower(defender);

        // 胜率：战力越高胜率越高，但仍存在低战力翻盘的可能性（+/-20% 随机浮动）
        const baseWinRate = cPower / (cPower + dPower);
        const winRate = Math.min(0.95, Math.max(0.05, baseWinRate + (Math.random() - 0.5) * 0.4));
        const challengerWins = Math.random() < winRate;

        const winner = challengerWins ? challenger : defender;
        const loser = challengerWins ? defender : challenger;

        // 更新洞府内的居住者：胜者入住，败者移出
        let newBuildings = state.buildings.map(b => {
          if (b.id !== cave.id) return b;
          const filtered = b.assignedDisciples.filter(id => id !== loser.id);
          if (!filtered.includes(winner.id)) filtered.push(winner.id);
          return {
            ...b,
            assignedDisciples: filtered,
            managerId: b.managerId === loser.id ? winner.id : b.managerId,
          };
        });

        // 败者被移出洞府后，若仍为长老，则尝试重新分配居所（可能被降到核心居所）
        const loserObj = state.disciples.find(d => d.id === loser.id);
        if (loserObj && loserObj.status === 'elder') {
          const reassigned = autoAssignResidence({ ...loserObj, status: 'elder' }, newBuildings);
          newBuildings = reassigned.newBuildings;
        }

        // 扣除挑战方贡献
        const newChallengerBalance = challenger.contributionPoints - contributionCost;
        const newDisciples = state.disciples.map(d => {
          if (d.id === challengerId) return { ...d, contributionPoints: newChallengerBalance };
          return d;
        });

        const currentDate = { year: state.year, month: state.month };
        const challengerLog: ContributionLog = {
          id: generateId(),
          discipleId: challengerId,
          date: currentDate,
          type: 'deduct',
          amount: -contributionCost,
          balance: newChallengerBalance,
          description: `挑战「${defender.name}」争夺洞府居住权`,
        };

        // 通知胜负
        const title = challengerWins ? '洞府挑战胜利' : '洞府挑战失败';
        const content = challengerWins
          ? `长老「${challenger.name}」战胜「${defender.name}」，夺得了洞府居住权！`
          : `长老「${challenger.name}」挑战「${defender.name}」失败，未能夺得洞府居住权。`;

        set({
          buildings: newBuildings,
          disciples: newDisciples,
          contributionLogs: [challengerLog, ...state.contributionLogs].slice(0, 5000),
          notifications: [
            createNotification('info', title, content, currentDate),
            ...state.notifications,
          ],
        });

        return { success: true, winnerId: winner.id, loserId: loser.id };
      },

      challengeSkyscraperTower: (discipleId: string): {
        success: boolean; reason?: string; ascended?: boolean;
      } => {
        const state = get();
        if (state.gameWon) return { success: false, reason: '已有人飞升，游戏胜利' };

        const tower = state.buildings.find(b => b.type === 'skyscraper_tower' && b.status === 'active');
        if (!tower) return { success: false, reason: '宗门内无通天塔' };

        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { success: false, reason: '弟子不存在' };

        const cPower = calculateDiscipleCombatPower(disciple);
        if (cPower < SKYSCRAPER_TOWER_COMBAT_POWER) {
          return { success: false, reason: `战力不足（${cPower}/${SKYSCRAPER_TOWER_COMBAT_POWER}）` };
        }

        // 胜率：弟子战力 vs 通天塔战力，±10% 随机浮动
        const towerPower = SKYSCRAPER_TOWER_COMBAT_POWER;
        const baseWinRate = cPower / (cPower + towerPower);
        const winRate = Math.min(0.95, Math.max(0.05, baseWinRate + (Math.random() - 0.5) * 0.2));
        const challengerWins = Math.random() < winRate;

        const currentDate = { year: state.year, month: state.month };

        if (challengerWins) {
          // 飞升：弟子离开宗门，触发游戏胜利
          const newBuildings = state.buildings.map(b =>
            b.assignedDisciples.includes(discipleId)
              ? {
                  ...b,
                  assignedDisciples: b.assignedDisciples.filter(id => id !== discipleId),
                  managerId: b.managerId === discipleId ? null : b.managerId,
                }
              : b
          );
          const newDisciples = state.disciples.filter(d => d.id !== discipleId);

          set({
            buildings: newBuildings,
            disciples: newDisciples,
            gameWon: true,
            victoryInfo: { discipleName: disciple.name, year: currentDate.year, month: currentDate.month },
            notifications: [
              createNotification('success', '飞升仙界', `${disciple.name} 战胜通天塔，白日飞升，踏足仙界！宗门基业大成！`, currentDate),
              ...state.notifications,
            ].slice(0, 50),
          });
          return { success: true, ascended: true };
        } else {
          // 渡劫失败：修为受损，境界跌落一级
          const realmIdx = RealmOrder.indexOf(disciple.realm);
          const newRealm = realmIdx > 0 ? RealmOrder[realmIdx - 1] : disciple.realm;
          const newDisciples = state.disciples.map(d =>
            d.id === discipleId
              ? { ...d, realm: newRealm, realmStage: 'late' as const, realmProgress: 0 }
              : d
          );
          set({
            disciples: newDisciples,
            notifications: [
              createNotification('danger', '渡劫失败', `${disciple.name} 挑战通天塔失败，修为受损，境界跌落至${RealmNames[newRealm]}。`, currentDate),
              ...state.notifications,
            ].slice(0, 50),
          });
          return { success: true, ascended: false };
        }
      },

      canPromoteSect: () => {
        const state = get();
        const currentIndex = SectLevelOrder.indexOf(state.sectLevel);
        
        // 已经是最高等级
        if (currentIndex >= SectLevelOrder.length - 1) {
          return { canPromote: false, nextLevel: null, reasons: ['已达最高等级'] };
        }
        
        const nextLevel = SectLevelOrder[currentIndex + 1];
        const req = SectLevelRequirementsMap[nextLevel];
        const reasons: string[] = [];
        
        // 声望检查
        if (state.reputation < req.reputation) {
          reasons.push(`声望不足（${Math.floor(state.reputation)}/${req.reputation}）`);
        }
        
        // 灵石检查
        if (state.spiritStones < req.spiritStones) {
          reasons.push(`灵石不足（${Math.floor(state.spiritStones)}/${req.spiritStones}）`);
        }
        
        // 弟子数量检查
        if (req.discipleCount && state.disciples.length < req.discipleCount) {
          reasons.push(`弟子数量不足（${state.disciples.length}/${req.discipleCount}）`);
        }
        
        // Lv2建筑数量检查
        if (req.level2Buildings) {
          const lv2Count = state.buildings.filter(b => b.level >= 2 && b.status === 'active').length;
          if (lv2Count < req.level2Buildings) {
            reasons.push(`Lv2建筑不足（${lv2Count}/${req.level2Buildings}）`);
          }
        }
        
        // Lv3建筑数量检查
        if (req.level3Buildings) {
          const lv3Count = state.buildings.filter(b => b.level >= 3 && b.status === 'active').length;
          if (lv3Count < req.level3Buildings) {
            reasons.push(`Lv3建筑不足（${lv3Count}/${req.level3Buildings}）`);
          }
        }
        
        // 全部建筑Lv2检查
        if (req.allLevel2) {
          const activeBuildings = state.buildings.filter(b => b.status === 'active');
          const allLv2 = activeBuildings.every(b => b.level >= 2);
          if (!allLv2) {
            reasons.push('所有建筑需达到Lv2以上');
          }
        }
        
        // 金丹期弟子检查
        if (req.goldenDisciple) {
          const hasGolden = state.disciples.some(d => d.realm === 'golden' || d.realm === 'nascent' || d.realm === 'spirit');
          if (!hasGolden) {
            reasons.push('需要至少1名金丹期弟子');
          }
        }
        
        // 元婴期弟子检查
        if (req.nascentDisciple) {
          const hasNascent = state.disciples.some(d => d.realm === 'nascent' || d.realm === 'spirit');
          if (!hasNascent) {
            reasons.push('需要至少1名元婴期弟子');
          }
        }
        
        // 化神期弟子检查
        if (req.spiritDisciple) {
          const hasSpirit = state.disciples.some(d => d.realm === 'spirit');
          if (!hasSpirit) {
            reasons.push('需要至少1名化神期弟子');
          }
        }
        
        // 长老数量检查
        if (req.elderCount) {
          const elderCount = state.disciples.filter(d => d.status === 'elder').length;
          if (elderCount < req.elderCount) {
            reasons.push(`长老数量不足（${elderCount}/${req.elderCount}）`);
          }
        }
        
        // 晋升消耗检查
        if (state.spiritStones < req.promotionCost) {
          reasons.push(`晋升消耗不足（${Math.floor(state.spiritStones)}/${req.promotionCost}灵石）`);
        }

        // 晋升贡献消耗检查
        if (req.promotionContribution && state.sectContribution < req.promotionContribution) {
          reasons.push(`宗门贡献不足（${Math.floor(state.sectContribution)}/${req.promotionContribution}）`);
        }
        
        return {
          canPromote: reasons.length === 0,
          nextLevel,
          reasons,
        };
      },
      
      promoteSect: (): boolean => {
        const state = get();
        const { canPromote, nextLevel, reasons } = state.canPromoteSect();
        
        if (!canPromote || !nextLevel) return false;
        
        const req = SectLevelRequirementsMap[nextLevel];
        
        // 扣除晋升消耗
        const newSpiritStones = state.spiritStones - req.promotionCost;
        const newContribution = req.promotionContribution
          ? state.sectContribution - req.promotionContribution
          : state.sectContribution;
        
        // 创建通知
        const currentDate = { year: state.year, month: state.month };
        const promotionNotification = createNotification(
          'success',
          '宗门晋升',
          `恭喜！宗门已晋升为「${SectLevelNames[nextLevel]}」，解锁了更多内容！`,
          currentDate
        );
        
        set({
          sectLevel: nextLevel,
          spiritStones: newSpiritStones,
          sectContribution: Math.max(0, newContribution),
          notifications: [promotionNotification, ...state.notifications].slice(0, 50),
        });
        
        return true;
      },

      refreshOtherSects: () => {
        const state = get();
        const playerAlignment: SectAlignment =
          state.karma >= 30 ? 'righteous' : state.karma <= -30 ? 'demonic' : 'neutral';
        const newSects = generateOtherSects(8, state.sectLevel, playerAlignment);
        set({ otherSects: newSects });
      },

      toggleFollowDisciple: (discipleId: string) => {
        const state = get();
        const exists = state.followedDiscipleIds.includes(discipleId);
        const newList = exists
          ? state.followedDiscipleIds.filter(id => id !== discipleId)
          : [...state.followedDiscipleIds, discipleId];
        set({ followedDiscipleIds: newList });
      },

      // 任命核心弟子为长老：校验境界/贡献，转 status，从工作建筑移除并重分居所；扣除贡献并写流水
      appointElder: (discipleId: string) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { success: false, reason: '弟子不存在' };
        if (disciple.status !== 'core') return { success: false, reason: '仅核心弟子可任命为长老' };
        const rule = state.promotionRules.coreToElder;
        if (RealmOrder.indexOf(disciple.realm) < RealmOrder.indexOf(rule.minRealm)) {
          return { success: false, reason: `境界需达到${RealmNames[rule.minRealm]}` };
        }
        if (disciple.contributionPoints < rule.minContribution) {
          return { success: false, reason: `贡献点需达到${rule.minContribution}` };
        }
        const cost = rule.minContribution;
        const newBalance = disciple.contributionPoints - cost;

        // 从工作建筑移除（长老不再参与生产）
        let newBuildings = state.buildings.map(b => ({
          ...b,
          assignedDisciples: b.assignedDisciples.filter(id => id !== discipleId),
          managerId: b.managerId === discipleId ? null : b.managerId,
        }));
        // 重分居所（长老→核心居所/洞府，autoAssignResidence 会按身份映射）
        const residenceResult = autoAssignResidence({ ...disciple, status: 'elder' }, newBuildings);
        newBuildings = residenceResult.newBuildings;

        // 构造贡献值流水：晋升长老扣除
        const currentDate = { year: state.year, month: state.month };
        const logEntry: ContributionLog = {
          id: generateId(),
          discipleId,
          date: currentDate,
          type: 'promotion',
          amount: -cost,
          balance: newBalance,
          description: `手动任命长老，扣除 ${cost} 贡献`,
        };

        set({
          disciples: state.disciples.map(d =>
            d.id === discipleId
              ? { ...d, status: 'elder' as DiscipleStatus, contributionPoints: newBalance }
              : d
          ),
          buildings: newBuildings,
          contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000),
        });
        return { success: true };
      },

      setAutoAppointElder: (enabled: boolean) => {
        set({ autoAppointElder: enabled });
      },

      updateSectTournamentFreqConfig: (frequency, partial) => {
        const state = get();
        const freqConfig = { ...state.sectTournamentConfig[frequency], ...partial };
        set({
          sectTournamentConfig: {
            ...state.sectTournamentConfig,
            [frequency]: freqConfig,
          },
        });
      },

      updateInterSectTournamentFreqConfig: (frequency, partial) => {
        const state = get();
        const freqConfig = { ...state.interSectTournamentConfig[frequency], ...partial };
        set({
          interSectTournamentConfig: {
            ...state.interSectTournamentConfig,
            [frequency]: freqConfig,
          },
        });
      },

      triggerSectTournament: (frequency) => {
        const state = get();
        const freqConfig = state.sectTournamentConfig[frequency];
        // CD 检查：手动举办也受冷却限制
        if (!shouldTournamentTrigger(frequency, freqConfig, state.year, state.month, state.lastSectTournamentYears[frequency])) {
          return null;
        }
        const result = runTournament({
          scope: 'sect',
          frequency,
          config: freqConfig,
          disciples: state.disciples,
          otherSects: state.otherSects,
          date: { year: state.year, month: state.month },
        });

        const { newSpiritStones, newReputation, newPillInventory, newDisciples, contributionChanges } =
          applyTournamentRewards(state, result, freqConfig);

        // 构造贡献值流水记录
        const currentDate = { year: state.year, month: state.month };
        const newLogs: ContributionLog[] = contributionChanges.map(c => ({
          id: generateId(), discipleId: c.discipleId, date: currentDate,
          type: 'tournament', amount: c.amount, balance: c.balance, description: c.description,
        }));

        const freqName = frequency === 'yearly' ? '年度' : frequency === 'every5years' ? '五年' : '十年';
        const notif = createNotification(
          result.ourRank > 0 ? 'success' : 'info',
          `山门${freqName}大比`,
          result.ourRank === 1
            ? `${result.ourChampionName} 夺得山门${freqName}大比冠军！${result.rewardSummary.join('、')}`
            : result.ourRank > 0
              ? `山门${freqName}大比结束，本宗弟子获得第${result.ourRank}名。${result.rewardSummary.join('、')}`
              : `山门${freqName}大比结束，本宗弟子未入三甲。`,
          { year: state.year, month: state.month },
        );

        set({
          lastSectTournamentResults: {
            ...state.lastSectTournamentResults,
            [frequency]: result,
          },
          lastSectTournamentYears: {
            ...state.lastSectTournamentYears,
            [frequency]: state.year,
          },
          spiritStones: newSpiritStones,
          reputation: newReputation,
          pillInventory: newPillInventory,
          disciples: newDisciples,
          notifications: [notif, ...state.notifications].slice(0, 50),
          contributionLogs: [...newLogs, ...state.contributionLogs].slice(0, 5000),
        });
        return result;
      },

      triggerInterSectTournament: (frequency) => {
        const state = get();
        const freqConfig = state.interSectTournamentConfig[frequency];
        // CD 检查：手动举办也受冷却限制
        if (!shouldTournamentTrigger(frequency, freqConfig, state.year, state.month, state.lastInterSectTournamentYears[frequency])) {
          return null;
        }
        const result = runTournament({
          scope: 'inter-sect',
          frequency,
          config: freqConfig,
          disciples: state.disciples,
          otherSects: state.otherSects,
          date: { year: state.year, month: state.month },
        });

        const { newSpiritStones, newReputation, newPillInventory, newDisciples, contributionChanges } =
          applyTournamentRewards(state, result, freqConfig);

        // 构造贡献值流水记录
        const currentDate = { year: state.year, month: state.month };
        const newLogs: ContributionLog[] = contributionChanges.map(c => ({
          id: generateId(), discipleId: c.discipleId, date: currentDate,
          type: 'tournament', amount: c.amount, balance: c.balance, description: c.description,
        }));

        const freqName = frequency === 'yearly' ? '年度' : frequency === 'every5years' ? '五年' : '十年';
        const notif = createNotification(
          result.ourRank > 0 ? 'success' : 'info',
          `宗门${freqName}大比`,
          result.ourRank === 1
            ? `${result.ourChampionName} 夺得宗门${freqName}大比冠军，扬名天下！${result.rewardSummary.join('、')}`
            : result.ourRank > 0
              ? `宗门${freqName}大比结束，本宗弟子获得第${result.ourRank}名。${result.rewardSummary.join('、')}`
              : `宗门${freqName}大比结束，本宗弟子未入三甲，须勤加修炼。`,
          { year: state.year, month: state.month },
        );

        set({
          lastInterSectTournamentResults: {
            ...state.lastInterSectTournamentResults,
            [frequency]: result,
          },
          lastInterSectTournamentYears: {
            ...state.lastInterSectTournamentYears,
            [frequency]: state.year,
          },
          spiritStones: newSpiritStones,
          reputation: newReputation,
          pillInventory: newPillInventory,
          disciples: newDisciples,
          notifications: [notif, ...state.notifications].slice(0, 50),
          contributionLogs: [...newLogs, ...state.contributionLogs].slice(0, 5000),
        });
        return result;
      },
      changeSectFavorability: (sectId, delta) => {
        const state = get();
        const newSects = state.otherSects.map(sect => {
          if (sect.id !== sectId) return sect;
          const newFav = Math.max(0, Math.min(100, (sect.favorability ?? 50) + delta));
          return { ...sect, favorability: newFav };
        });
        set({ otherSects: newSects });
      },

      setSectDiplomaticStatus: (sectId, status) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return;
        // 停战校验：切换为敌对关系前，必须不在停战期
        if (
          (status === 'rival' || status === 'vassal') &&
          sect.truceUntilYear && sect.truceUntilYear > state.year
        ) {
          const years = sect.truceUntilYear - state.year;
          const notif = createNotification(
            'warning',
            '停战期间',
            `与「${sect.name}」尚在停战期（还有 ${years} 年），无法变更外交为敌对。`,
            { year: state.year, month: state.month },
          );
          set({ notifications: [notif, ...state.notifications].slice(0, 50) });
          return;
        }
        const newSects = state.otherSects.map(s =>
          s.id === sectId ? { ...s, diplomaticStatus: status } : s,
        );
        set({ otherSects: newSects });
      },

      toggleSectTrade: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return false;
        // 开启交易需消耗灵石
        if (!sect.tradeActive) {
          const cost = 50;
          if (state.spiritStones < cost) return false;
          const newSects = state.otherSects.map(s =>
            s.id === sectId ? { ...s, tradeActive: true } : s,
          );
          set({ otherSects: newSects, spiritStones: state.spiritStones - cost });
          return true;
        } else {
          // 关闭交易，获得收益
          const income = Math.floor(sect.combatPower * 0.01) + 20;
          const newSects = state.otherSects.map(s =>
            s.id === sectId ? { ...s, tradeActive: false } : s,
          );
          set({
            otherSects: newSects,
            spiritStones: state.spiritStones + income,
            reputation: state.reputation + 2,
          });
          return true;
        }
      },

      // ===== 试炼系统 =====
      refreshTrials: () => {
        const state = get();
        const combatResult = calculateSectCombatPower(state.disciples, state.buildings);
        const newTrials = generateTrials(combatResult.totalPower, state.disciples.length, state.year, true);
        // 保留进行中的旧试炼
        const inProgress = state.trials.filter(t => t.status === 'in_progress');
        set({ trials: [...inProgress, ...newTrials] });
      },

      dispatchDiscipleToTrial: (trialId, discipleId) => {
        const state = get();
        const trial = state.trials.find(t => t.id === trialId);
        if (!trial) return { ok: false, reason: '试炼不存在' };
        if (trial.status !== 'available') return { ok: false, reason: '该试炼不可派遣' };
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        if (disciple.onTrialId) return { ok: false, reason: '该弟子正在执行其他试炼' };
        if (disciple.isBreakingThrough) return { ok: false, reason: '该弟子正在突破中' };
        if (disciple.isLearningSecret) return { ok: false, reason: '该弟子正在学习秘籍' };

        set({
          trials: state.trials.map(t =>
            t.id === trialId ? {
              ...t, status: 'in_progress' as const,
              assignedDiscipleId: discipleId,
              startYear: state.year, startMonth: state.month, progress: 0,
            } : t,
          ),
          disciples: state.disciples.map(d =>
            d.id === discipleId ? { ...d, onTrialId: trialId } : d,
          ),
        });
        return { ok: true };
      },

      cancelTrial: (trialId) => {
        const state = get();
        const trial = state.trials.find(t => t.id === trialId);
        if (!trial || trial.status !== 'in_progress') return;
        set({
          trials: state.trials.map(t =>
            t.id === trialId ? { ...t, status: 'available' as const, assignedDiscipleId: null, progress: 0 } : t,
          ),
          disciples: state.disciples.map(d =>
            d.id === trial.assignedDiscipleId ? { ...d, onTrialId: null } : d,
          ),
        });
      },

      // ===== 外交系统优化 =====
      giftSpiritStonesToSect: (sectId, amount) => {
        const state = get();
        if (amount <= 0) return { ok: false, reason: '赠送数量必须大于0' };
        if (state.spiritStones < amount) return { ok: false, reason: '灵石不足' };
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        // 每 50 灵石 +5 好感，上限 +20
        const favGain = Math.min(20, Math.floor(amount / 50) * 5);
        const newFav = Math.min(100, (sect.favorability ?? 50) + favGain);
        const st = get();
        const notif = createNotification(
          'info', '赠送灵石',
          `向「${sect.name}」赠送 ${amount} 灵石，好感度 +${favGain}，正邪度 +3（示好天下）。`,
          { year: st.year, month: st.month },
        );
        set({
          spiritStones: state.spiritStones - amount,
          karma: Math.min(100, state.karma + 3),
          otherSects: state.otherSects.map(s =>
            s.id === sectId ? { ...s, favorability: newFav } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
        return { ok: true };
      },

      insultSect: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return;
        const newFav = Math.max(0, (sect.favorability ?? 50) - 15);
        const st = get();
        const notif = createNotification(
          'warning', '侮辱宗门',
          `你当众羞辱了「${sect.name}」，好感度 -15，对方对此铭记于心。`,
          { year: st.year, month: st.month },
        );
        set({
          karma: Math.max(-100, state.karma - 5),
          otherSects: state.otherSects.map(s =>
            s.id === sectId ? { ...s, favorability: newFav, relation: newFav < 30 ? 'hostile' : s.relation } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
      },

      requestAlliance: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        const fav = sect.favorability ?? 50;
        if (fav < 70) return { ok: false, reason: `好感度不足（需≥70，当前${fav}）` };
        // 战力校验：本宗战力不低于对方 50%
        const ourCombat = calculateSectCombatPower(state.disciples, state.buildings).totalPower;
        if (ourCombat < sect.combatPower * 0.5) {
          return { ok: false, reason: `本宗战力不足（需≥对方50%，当前 ${(ourCombat / sect.combatPower * 100).toFixed(0)}%）` };
        }
        const st = get();
        const notif = createNotification(
          'success', '同盟缔结',
          `与「${sect.name}」正式结为同盟！好感度 ${fav}，双方将守望相助。`,
          { year: st.year, month: st.month },
        );
        set({
          karma: Math.min(100, state.karma + 5),
          otherSects: state.otherSects.map(s =>
            s.id === sectId ? { ...s, diplomaticStatus: 'ally' as const, relation: 'ally' as const } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
        return { ok: true };
      },

      declareRivalry: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        // 停战校验
        if (sect.truceUntilYear && sect.truceUntilYear > state.year) {
          return { ok: false, reason: `与「${sect.name}」尚在停战期（还有 ${sect.truceUntilYear - state.year} 年）` };
        }
        const fav = sect.favorability ?? 50;
        if (fav > 30) return { ok: false, reason: `好感度过高，无法宣战（需≤30，当前${fav}）` };
        const st = get();
        const notif = createNotification(
          'warning', '宣布宿敌',
          `正式与「${sect.name}」成为宿敌！双方从此势不两立。`,
          { year: st.year, month: st.month },
        );
        set({
          karma: Math.max(-100, state.karma - 5),
          otherSects: state.otherSects.map(s =>
            s.id === sectId ? { ...s, diplomaticStatus: 'rival' as const, relation: 'hostile' as const } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
        return { ok: true };
      },

      subjugateSect: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        if (sect.diplomaticStatus === 'vassal') return { ok: false, reason: '对方已是附庸' };
        // 停战校验：仍在停战期则禁止讨伐
        if (sect.truceUntilYear && sect.truceUntilYear > state.year) {
          return { ok: false, reason: `与「${sect.name}」尚在停战期（还有 ${sect.truceUntilYear - state.year} 年）` };
        }
        // 战力校验：本宗战力需达到对方 1.3 倍以上
        const ourCombat = calculateSectCombatPower(state.disciples, state.buildings).totalPower;
        if (ourCombat < sect.combatPower * 1.3) {
          return { ok: false, reason: `本宗战力不足以压制（需≥对方130%，当前 ${(ourCombat / sect.combatPower * 100).toFixed(0)}%）` };
        }
        // 战斗判定：本宗战力优势越大胜率越高
        const winRate = Math.min(0.95, 0.5 + (ourCombat / sect.combatPower - 1) * 0.3);
        const isWin = Math.random() < winRate;
        const st = get();
        if (isWin) {
          const notif = createNotification(
            'success', '讨伐成功',
            `本宗击败「${sect.name}」，对方俯首称臣成为附庸！`,
            { year: st.year, month: st.month },
          );
          set({
            karma: Math.max(-100, state.karma - 15),
            otherSects: state.otherSects.map(s =>
              s.id === sectId ? { ...s, diplomaticStatus: 'vassal' as const, favorability: Math.min(100, (s.favorability ?? 50) + 20) } : s,
            ),
            notifications: [notif, ...state.notifications].slice(0, 50),
          });
          return { ok: true };
        } else {
          // 失败：损失声望和灵石
          const loss = Math.floor(sect.combatPower * 0.05);
          const notif = createNotification(
            'warning', '讨伐失败',
            `攻打「${sect.name}」失败！损失 ${loss} 灵石与 5 声望。`,
            { year: st.year, month: st.month },
          );
          set({
            spiritStones: Math.max(0, state.spiritStones - loss),
            reputation: Math.max(0, state.reputation - 5),
            karma: Math.max(-100, state.karma - 10),
            otherSects: state.otherSects.map(s =>
              s.id === sectId ? { ...s, relation: 'hostile' as const, favorability: Math.max(0, (s.favorability ?? 50) - 20) } : s,
            ),
            notifications: [notif, ...state.notifications].slice(0, 50),
          });
          return { ok: false, reason: '讨伐失败，损失惨重' };
        }
      },

      // ===== 灵兽系统 =====
      buyBeast: () => {
        const state = get();
        const cost = 500;
        if (state.spiritStones < cost) return { ok: false, reason: `灵石不足（需${cost}）` };
        // 随机购买一只灵兽
        const beastTypes: BeastType[] = ['spirit_fox', 'mystic_turtle', 'fire_crow', 'jade_rabbit', 'ice_serpent', 'earth_bear'];
        // 90% 普通品阶，10% 金鹏
        const type: BeastType = Math.random() < 0.1 ? 'golden_roc' : beastTypes[Math.floor(Math.random() * beastTypes.length)];
        const existing = state.beastInventory.find(b => b.type === type);
        if (existing) {
          set({ spiritStones: state.spiritStones - cost, beastInventory: state.beastInventory.map(b => b.type === type ? { ...b, quantity: b.quantity + 1 } : b) });
        } else {
          set({ spiritStones: state.spiritStones - cost, beastInventory: [...state.beastInventory, { type, quantity: 1 }] });
        }
        const st = get();
        const notif = createNotification('success', '购买灵兽', `花费 ${cost} 灵石购得一只灵兽。`, { year: st.year, month: st.month });
        set(s => ({ notifications: [notif, ...s.notifications].slice(0, 50) }));
        return { ok: true };
      },

      captureBeast: (discipleId) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        if (disciple.onTrialId) return { ok: false, reason: '弟子正在试炼中' };
        if (disciple.isBreakingThrough) return { ok: false, reason: '弟子正在突破' };
        // 捕捉成功率和弟子战力有关
        const power = calculateDiscipleCombatPower(disciple);
        const captureRate = Math.min(0.9, 0.3 + power / 2000);
        const isSuccess = Math.random() < captureRate;
        if (isSuccess) {
          const beastTypes: BeastType[] = ['spirit_fox', 'mystic_turtle', 'fire_crow', 'jade_rabbit', 'ice_serpent', 'earth_bear'];
          const type: BeastType = Math.random() < 0.05 ? 'golden_roc' : beastTypes[Math.floor(Math.random() * beastTypes.length)];
          const existing = state.beastInventory.find(b => b.type === type);
          if (existing) {
            set({ beastInventory: state.beastInventory.map(b => b.type === type ? { ...b, quantity: b.quantity + 1 } : b) });
          } else {
            set({ beastInventory: [...state.beastInventory, { type, quantity: 1 }] });
          }
          const st = get();
          const notif = createNotification('success', '捕捉成功', `${disciple.name} 成功捕捉一只灵兽！`, { year: st.year, month: st.month });
          set(s => ({ notifications: [notif, ...s.notifications].slice(0, 50) }));
          return { ok: true };
        } else {
          const st = get();
          const notif = createNotification('info', '捕捉失败', `${disciple.name} 未能捕捉到灵兽。`, { year: st.year, month: st.month });
          set(s => ({ notifications: [notif, ...s.notifications].slice(0, 50) }));
          return { ok: false, reason: '捕捉失败' };
        }
      },

      // ===== 存档槽系统 =====
      saveToSlot: (slotIndex: number) => {
        const state = get();
        saveToSlotUtil(slotIndex, state as any);
      },
      loadFromSlot: (slotIndex: number) => {
        const snapshot = loadFromSlotUtil(slotIndex);
        if (!snapshot) return false;
        // 读取快照后替换全部 state，保留 action 函数（set 会合并）
        set({ ...snapshot, showMainMenu: false, gameStarted: true });
        return true;
      },
      buyShopItem: (itemId: string): { success: boolean; reason?: string } => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return { success: false, reason: '商品不存在' };

        const state = get();
        if (state.spiritStones < item.price) return { success: false, reason: '灵石不足' };

        // 配方类：检查是否已解锁
        if (item.category === 'pill_recipe') {
          if (item.recipePillType && state.unlockedPillRecipes.includes(item.recipePillType)) {
            return { success: false, reason: '该丹方已解锁' };
          }
        } else if (item.category === 'artifact_recipe') {
          if (item.recipeArtifactType && state.unlockedArtifactRecipes.includes(item.recipeArtifactType)) {
            return { success: false, reason: '该图谱已解锁' };
          }
        } else if (item.category === 'talisman_recipe') {
          if (item.recipeTalismanType && state.unlockedTalismanRecipes.includes(item.recipeTalismanType)) {
            return { success: false, reason: '该符谱已解锁' };
          }
        }

        set(state => {
          const patch: Partial<GameState> = {
            spiritStones: state.spiritStones - item.price,
          };

          // 成品类：增加库存
          if (item.pillType) {
            patch.pillInventory = addItem(state.pillInventory, item.pillType);
          } else if (item.artifactType) {
            patch.artifactInventory = addItem(state.artifactInventory, item.artifactType);
          } else if (item.talismanType) {
            patch.talismanInventory = addItem(state.talismanInventory, item.talismanType);
          } else if (item.beastType) {
            patch.beastInventory = addItem(state.beastInventory, item.beastType);
          }
          // 配方类：加入解锁列表
          else if (item.recipePillType) {
            patch.unlockedPillRecipes = [...state.unlockedPillRecipes, item.recipePillType];
          } else if (item.recipeArtifactType) {
            patch.unlockedArtifactRecipes = [...state.unlockedArtifactRecipes, item.recipeArtifactType];
          } else if (item.recipeTalismanType) {
            patch.unlockedTalismanRecipes = [...state.unlockedTalismanRecipes, item.recipeTalismanType];
          }
          // 原材料类：增加特殊材料库存
          else if (item.materialName) {
            patch.specialMaterials = {
              ...state.specialMaterials,
              [item.materialName]: (state.specialMaterials[item.materialName] ?? 0) + 1,
            };
          }

          return patch;
        });

        return { success: true };
      },
      sellShopItem: (itemId: string): { success: boolean; reason?: string; gain?: number } => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return { success: false, reason: '商品不存在' };

        // 成品类与原材料可出售（配方为一次性解锁，不支持回收）
        const isSellable = !!(item.pillType || item.artifactType || item.talismanType || item.beastType || item.materialName);
        if (!isSellable) return { success: false, reason: '该物品不可出售' };

        const state = get();
        // 校验库存
        let inv: { type: string; quantity: number }[] | null = null;
        let type: string | undefined;
        if (item.pillType) { inv = state.pillInventory; type = item.pillType; }
        else if (item.artifactType) { inv = state.artifactInventory; type = item.artifactType; }
        else if (item.talismanType) { inv = state.talismanInventory; type = item.talismanType; }
        else if (item.beastType) { inv = state.beastInventory; type = item.beastType; }
        let have = inv?.find(i => i.type === type)?.quantity ?? 0;
        // 原材料库存校验
        if (item.materialName) {
          have = state.specialMaterials[item.materialName] ?? 0;
        }
        if (have <= 0) return { success: false, reason: '库存不足' };

        // 出售价 = floor(售价 * 0.5)（与 beast.ts 注释约定一致）
        const gain = Math.floor(item.price * 0.5);

        set(state => {
          const patch: Partial<GameState> = {
            spiritStones: state.spiritStones + gain,
          };
          if (item.pillType) patch.pillInventory = removeItem(state.pillInventory, item.pillType);
          else if (item.artifactType) patch.artifactInventory = removeItem(state.artifactInventory, item.artifactType);
          else if (item.talismanType) patch.talismanInventory = removeItem(state.talismanInventory, item.talismanType);
          else if (item.beastType) patch.beastInventory = removeItem(state.beastInventory, item.beastType);
          else if (item.materialName) {
            patch.specialMaterials = {
              ...state.specialMaterials,
              [item.materialName]: Math.max(0, (state.specialMaterials[item.materialName] ?? 0) - 1),
            };
          }
          return patch;
        });

        return { success: true, gain };
      },
      setProductionTarget: (buildingId: string, slotIndex: number, target: NonNullable<Building['productionTargets']>[number]) => {
        set(state => ({
          buildings: state.buildings.map(b => {
            if (b.id !== buildingId) return b;
            const slots = [...(b.productionTargets || [])];
            // 确保数组长度覆盖到 slotIndex
            while (slots.length <= slotIndex) slots.push({});
            slots[slotIndex] = target;
            return { ...b, productionTargets: slots };
          }),
        }));
      },
      clearProductionTarget: (buildingId: string, slotIndex: number) => {
        set(state => ({
          buildings: state.buildings.map(b => {
            if (b.id !== buildingId) return b;
            const slots = [...(b.productionTargets || [])];
            if (slotIndex < slots.length) {
              slots[slotIndex] = {};
            }
            return { ...b, productionTargets: slots };
          }),
        }));
      },
      setBuildingContributionSettings: (buildingId, settings) => {
        set(state => ({
          buildings: state.buildings.map(b =>
            b.id === buildingId ? {
              ...b,
              contributionSettings: {
                ...b.contributionSettings,
                ...settings,
              },
            } : b
          ),
        }));
      },
      exchangeItemByDisciple: (discipleId, kind, itemType, contributionCost) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        if (disciple.contributionPoints < contributionCost) {
          return { ok: false, reason: `贡献不足（需${contributionCost}，现有${Math.floor(disciple.contributionPoints)}）` };
        }
        // 校验物品库存
        let invKey: 'pillInventory' | 'artifactInventory' | 'talismanInventory' | 'beastInventory' | null = null;
        if (kind === 'pill') invKey = 'pillInventory';
        else if (kind === 'artifact') invKey = 'artifactInventory';
        else if (kind === 'talisman') invKey = 'talismanInventory';
        else if (kind === 'beast') invKey = 'beastInventory';
        if (!invKey) return { ok: false, reason: '未知物品类型' };
        const item = state[invKey].find(i => i.type === itemType);
        if (!item || item.quantity <= 0) return { ok: false, reason: '物品库存不足' };

        // 扣贡献 + 减库存 + 给弟子物品（直接进弟子装备槽，若弟子已有装备则进不了装备槽——先尝试装备，装备失败则直接丢弃？
        // 按修仙游戏常规：兑换后直接装到对应槽位；若已有则保留在宗门仓库但扣贡献。
        // 更简单通用：直接发放给弟子——但弟子 Inventory 未实现，所以兑换等同于"给弟子装备一件"（或直接消耗贡献，作为弟子获得了物品）。
        // 为避免复杂度：此处实现为"弟子消耗贡献，从仓库取走一件物品"，物品归属到弟子的当前装备槽位；若槽位已有，物品视为被弟子领用（消耗），同时给弟子小幅满意度奖励。
        let slot: 'artifact' | 'talisman' | 'beast' | null = null;
        if (kind === 'artifact') slot = 'artifact';
        else if (kind === 'talisman') slot = 'talisman';
        else if (kind === 'beast') slot = 'beast';
        // 丹药类不进装备槽，直接给弟子加 buff（恢复/增寿等简单实现：加满意度+小额突破加成）
        const newBalance = disciple.contributionPoints - contributionCost;
        set(state => {
          const newInv = (state[invKey!] as any[]).map(i =>
            i.type === itemType ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
          );
          const nextDisciples = state.disciples.map(d => {
            if (d.id !== discipleId) return d;
            let patch: any = {
              contributionPoints: newBalance,
              // 兑换物品奖励小幅满意度（物品到手本身就是一种激励）
              satisfaction: Math.min(100, d.satisfaction + 2),
            };
            if (slot) {
              patch[`equipped${slot.charAt(0).toUpperCase() + slot.slice(1)}`] = itemType;
            } else {
              // 丹药类：加一点突破加成或寿命（简化：每颗丹药+1~3 突破 bonus）
              patch.breakthroughBonus = (d.breakthroughBonus || 0) + 2;
            }
            return { ...d, ...patch };
          });
          // 兑换物品扣贡献流水
          const logEntry: ContributionLog = {
            id: generateId(),
            discipleId,
            date: { year: state.year, month: state.month },
            type: 'deduct',
            amount: -contributionCost,
            balance: newBalance,
            description: `兑换物品「${item.type}」，扣除 ${contributionCost} 贡献`,
          };
          return {
            [invKey!]: newInv,
            disciples: nextDisciples,
            contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000),
          } as any;
        });
        const st = get();
        const notif = createNotification(
          'info',
          '弟子兑换成功',
          `${disciple.name} 花费 ${contributionCost} 贡献兑换了一件「${item.type}」`,
          { year: st.year, month: st.month }
        );
        set(state => ({ notifications: [notif, ...state.notifications].slice(0, 50) }));
        return { ok: true };
      },
      giftItemToDisciple: (discipleId, kind, itemType, satisfactionBonus) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        let invKey: 'pillInventory' | 'artifactInventory' | 'talismanInventory' | 'beastInventory' | null = null;
        if (kind === 'pill') invKey = 'pillInventory';
        else if (kind === 'artifact') invKey = 'artifactInventory';
        else if (kind === 'talisman') invKey = 'talismanInventory';
        else if (kind === 'beast') invKey = 'beastInventory';
        if (!invKey) return { ok: false, reason: '未知物品类型' };
        const item = state[invKey].find(i => i.type === itemType);
        if (!item || item.quantity <= 0) return { ok: false, reason: '物品库存不足' };

        // 默认满意度：丹药 +10，法器 +15，符箓 +10，灵兽 +20
        const defaultGain =
          kind === 'beast' ? 20 :
          kind === 'artifact' ? 15 : 10;
        const gain = typeof satisfactionBonus === 'number' ? satisfactionBonus : defaultGain;

        let slot: 'artifact' | 'talisman' | 'beast' | null = null;
        if (kind === 'artifact') slot = 'artifact';
        else if (kind === 'talisman') slot = 'talisman';
        else if (kind === 'beast') slot = 'beast';

        set(state => {
          const newInv = (state[invKey!] as any[]).map(i =>
            i.type === itemType ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
          );
          const nextDisciples = state.disciples.map(d => {
            if (d.id !== discipleId) return d;
            let patch: any = {
              satisfaction: Math.min(100, d.satisfaction + gain),
            };
            if (slot) {
              patch[`equipped${slot.charAt(0).toUpperCase() + slot.slice(1)}`] = itemType;
            } else {
              patch.breakthroughBonus = (d.breakthroughBonus || 0) + 3;
            }
            return { ...d, ...patch };
          });
          return { [invKey!]: newInv, disciples: nextDisciples } as any;
        });
        const st = get();
        const notif = createNotification(
          'success',
          '已赠送弟子',
          `将「${item.type}」赠给 ${disciple.name}，满意度 +${gain}`,
          { year: st.year, month: st.month }
        );
        set(state => ({ notifications: [...state.notifications, notif] }));
        return { ok: true };
      },
      equipItem: (discipleId: string, slot: 'artifact' | 'talisman' | 'beast', type: string): boolean => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return false;

        // 校验库存中有该物品
        let hasItem = false;
        if (slot === 'artifact') {
          hasItem = (state.artifactInventory.find(a => a.type === type)?.quantity ?? 0) > 0;
        } else if (slot === 'talisman') {
          hasItem = (state.talismanInventory.find(t => t.type === type)?.quantity ?? 0) > 0;
        } else if (slot === 'beast') {
          hasItem = (state.beastInventory.find(b => b.type === type)?.quantity ?? 0) > 0;
        }
        if (!hasItem) return false;

        set(state => {
          // 若该槽已有装备，归还旧装备到库存
          const oldEquipped = disciple[slot === 'artifact' ? 'equippedArtifact' : slot === 'talisman' ? 'equippedTalisman' : 'equippedBeast'];
          let newArtifactInv = state.artifactInventory.map(a => ({ ...a }));
          let newTalismanInv = state.talismanInventory.map(t => ({ ...t }));
          let newBeastInv = state.beastInventory.map(b => ({ ...b }));

          if (oldEquipped) {
            if (slot === 'artifact') {
              const ex = newArtifactInv.find(a => a.type === oldEquipped);
              if (ex) ex.quantity += 1; else newArtifactInv.push({ type: oldEquipped as any, quantity: 1 });
            } else if (slot === 'talisman') {
              const ex = newTalismanInv.find(t => t.type === oldEquipped);
              if (ex) ex.quantity += 1; else newTalismanInv.push({ type: oldEquipped as any, quantity: 1 });
            } else {
              const ex = newBeastInv.find(b => b.type === oldEquipped);
              if (ex) ex.quantity += 1; else newBeastInv.push({ type: oldEquipped as any, quantity: 1 });
            }
          }

          // 从库存扣除新装备
          if (slot === 'artifact') {
            const ex = newArtifactInv.find(a => a.type === type);
            if (ex) { ex.quantity -= 1; if (ex.quantity <= 0) newArtifactInv = newArtifactInv.filter(a => a.type !== type); }
          } else if (slot === 'talisman') {
            const ex = newTalismanInv.find(t => t.type === type);
            if (ex) { ex.quantity -= 1; if (ex.quantity <= 0) newTalismanInv = newTalismanInv.filter(t => t.type !== type); }
          } else {
            const ex = newBeastInv.find(b => b.type === type);
            if (ex) { ex.quantity -= 1; if (ex.quantity <= 0) newBeastInv = newBeastInv.filter(b => b.type !== type); }
          }

          return {
            artifactInventory: newArtifactInv,
            talismanInventory: newTalismanInv,
            beastInventory: newBeastInv,
            disciples: state.disciples.map(d =>
              d.id === discipleId
                ? {
                    ...d,
                    equippedArtifact: slot === 'artifact' ? type as any : d.equippedArtifact,
                    equippedTalisman: slot === 'talisman' ? type as any : d.equippedTalisman,
                    equippedBeast: slot === 'beast' ? type as any : d.equippedBeast,
                  }
                : d
            ),
          };
        });
        return true;
      },
      unequipItem: (discipleId: string, slot: 'artifact' | 'talisman' | 'beast') => {
        set(state => {
          const disciple = state.disciples.find(d => d.id === discipleId);
          if (!disciple) return state;
          const oldEquipped = disciple[slot === 'artifact' ? 'equippedArtifact' : slot === 'talisman' ? 'equippedTalisman' : 'equippedBeast'];
          if (!oldEquipped) return state;

          let newArtifactInv = state.artifactInventory.map(a => ({ ...a }));
          let newTalismanInv = state.talismanInventory.map(t => ({ ...t }));
          let newBeastInv = state.beastInventory.map(b => ({ ...b }));
          if (slot === 'artifact') {
            const ex = newArtifactInv.find(a => a.type === oldEquipped);
            if (ex) ex.quantity += 1; else newArtifactInv.push({ type: oldEquipped as any, quantity: 1 });
          } else if (slot === 'talisman') {
            const ex = newTalismanInv.find(t => t.type === oldEquipped);
            if (ex) ex.quantity += 1; else newTalismanInv.push({ type: oldEquipped as any, quantity: 1 });
          } else {
            const ex = newBeastInv.find(b => b.type === oldEquipped);
            if (ex) ex.quantity += 1; else newBeastInv.push({ type: oldEquipped as any, quantity: 1 });
          }

          return {
            artifactInventory: newArtifactInv,
            talismanInventory: newTalismanInv,
            beastInventory: newBeastInv,
            disciples: state.disciples.map(d =>
              d.id === discipleId
                ? {
                    ...d,
                    equippedArtifact: slot === 'artifact' ? null : d.equippedArtifact,
                    equippedTalisman: slot === 'talisman' ? null : d.equippedTalisman,
                    equippedBeast: slot === 'beast' ? null : d.equippedBeast,
                  }
                : d
            ),
          };
        });
      },

      // 检查弟子是否可以晋升到下一级（用于 UI 展示阈值提示）
      canPromoteDisciple: (discipleId: string) => {
        const st = get();
        const d = st.disciples.find(x => x.id === discipleId);
        if (!d) return { canPromote: false, nextStatus: null, reason: '弟子不存在' };
        const rules = st.promotionRules;
        const statusOrder: DiscipleStatus[] = ['servant', 'outer', 'inner', 'core', 'elder'];
        const curIdx = statusOrder.indexOf(d.status as DiscipleStatus);

        // 长老已是最高
        if (curIdx < 0 || curIdx >= statusOrder.length - 1) {
          return { canPromote: false, nextStatus: null, reason: '已是最高身份' };
        }
        const nextStatus = statusOrder[curIdx + 1];

        // ===== servant → outer =====
        if (d.status === 'servant') {
          const rule = rules.servantToOuter;
          const contributionOk = d.contributionPoints >= rule.minContribution;
          const rootBoneOk = d.hiddenTalents.rootBone >= rule.minRootBone;
          const exceptionalOk = rule.enableExceptional && (d.hiddenTalents.rootBone >= rule.exceptionalThreshold);
          if (contributionOk && rootBoneOk) {
            return {
              canPromote: true, nextStatus,
              reason: '达标：贡献和根骨均满足',
              minContribution: rule.minContribution, minRootBone: rule.minRootBone,
            };
          }
          if (exceptionalOk) {
            return {
              canPromote: true, nextStatus,
              reason: `破格：根骨 ≥${rule.exceptionalThreshold}（不扣贡献）`,
              minRootBone: rule.exceptionalThreshold,
            };
          }
          const missing: string[] = [];
          if (!contributionOk) missing.push(`贡献不足（${Math.floor(d.contributionPoints)}/${rule.minContribution}）`);
          if (!rootBoneOk && !exceptionalOk) missing.push(`根骨不足（${d.hiddenTalents.rootBone}/${rule.minRootBone}；破格需≥${rule.exceptionalThreshold}）`);
          return {
            canPromote: false, nextStatus, reason: missing.join('；'),
            minContribution: rule.minContribution, minRootBone: rule.minRootBone,
          };
        }

        // ===== outer → inner =====
        if (d.status === 'outer') {
          const rule = rules.outerToInner;
          const minRealmIdx = RealmOrder.indexOf(rule.minRealm);
          const curRealmIdx = RealmOrder.indexOf(d.realm);
          const contributionOk = d.contributionPoints >= rule.minContribution;
          const realmOk = curRealmIdx >= minRealmIdx;
          if (contributionOk && realmOk) {
            return {
              canPromote: true, nextStatus,
              reason: '达标：贡献和境界均满足',
              minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
            };
          }
          const missing: string[] = [];
          if (!contributionOk) missing.push(`贡献不足（${Math.floor(d.contributionPoints)}/${rule.minContribution}）`);
          if (!realmOk) missing.push(`境界不足（需达到${RealmNames[rule.minRealm]}）`);
          return {
            canPromote: false, nextStatus, reason: missing.join('；'),
            minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
          };
        }

        // ===== inner → core =====
        if (d.status === 'inner') {
          const rule = rules.innerToCore;
          const minRealmIdx = RealmOrder.indexOf(rule.minRealm);
          const curRealmIdx = RealmOrder.indexOf(d.realm);
          const contributionOk = d.contributionPoints >= rule.minContribution;
          const realmOk = curRealmIdx >= minRealmIdx;
          if (contributionOk && realmOk) {
            return {
              canPromote: true, nextStatus,
              reason: '达标：贡献和境界均满足',
              minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
            };
          }
          const missing: string[] = [];
          if (!contributionOk) missing.push(`贡献不足（${Math.floor(d.contributionPoints)}/${rule.minContribution}）`);
          if (!realmOk) missing.push(`境界不足（需达到${RealmNames[rule.minRealm]}）`);
          return {
            canPromote: false, nextStatus, reason: missing.join('；'),
            minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
          };
        }

        // ===== core → elder =====
        if (d.status === 'core') {
          const rule = rules.coreToElder;
          const minRealmIdx = RealmOrder.indexOf(rule.minRealm);
          const curRealmIdx = RealmOrder.indexOf(d.realm);
          const contributionOk = d.contributionPoints >= rule.minContribution;
          const realmOk = curRealmIdx >= minRealmIdx;
          if (contributionOk && realmOk) {
            return {
              canPromote: true, nextStatus,
              reason: '达标：贡献和境界均满足',
              minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
            };
          }
          const missing: string[] = [];
          if (!contributionOk) missing.push(`贡献不足（${Math.floor(d.contributionPoints)}/${rule.minContribution}）`);
          if (!realmOk) missing.push(`境界不足（需达到${RealmNames[rule.minRealm]}）`);
          return {
            canPromote: false, nextStatus, reason: missing.join('；'),
            minContribution: rule.minContribution, minRealm: RealmNames[rule.minRealm],
          };
        }

        return { canPromote: false, nextStatus: null, reason: '当前状态无法晋升' };
      },

      // 玩家手动提升弟子身份（每次晋升一级）。成功后：扣贡献（破格提升不扣）+ 调岗+调居所 + 写流水 + 返回结果
      promoteDisciple: (discipleId: string) => {
        const st = get();
        const d = st.disciples.find(x => x.id === discipleId);
        if (!d) return { ok: false, reason: '弟子不存在' };
        const { canPromote, nextStatus, minContribution } = st.canPromoteDisciple(discipleId);
        if (!canPromote || !nextStatus) {
          const info = st.canPromoteDisciple(discipleId);
          return { ok: false, reason: info.reason || '晋升条件未满足' };
        }
        const rules = st.promotionRules;
        let cost = 0;  // 贡献扣费
        let deductionDesc = '';
        // 判断是否为破格提升（仅 servant→outer 可能破格）
        if (d.status === 'servant') {
          const rule = rules.servantToOuter;
          const contributionOk = d.contributionPoints >= rule.minContribution;
          const rootBoneOk = d.hiddenTalents.rootBone >= rule.minRootBone;
          const exceptional = rule.enableExceptional && (d.hiddenTalents.rootBone >= rule.exceptionalThreshold);
          if (contributionOk && rootBoneOk) {
            cost = rule.minContribution;
            deductionDesc = `晋升外门弟子，扣除 ${cost} 贡献`;
          } else if (exceptional) {
            cost = 0;
            deductionDesc = `破格晋升外门弟子（根骨优异，不扣贡献）`;
          }
        } else if (d.status === 'outer') {
          cost = rules.outerToInner.minContribution;
          deductionDesc = `晋升内门弟子，扣除 ${cost} 贡献`;
        } else if (d.status === 'inner') {
          cost = rules.innerToCore.minContribution;
          deductionDesc = `晋升核心弟子，扣除 ${cost} 贡献`;
        } else if (d.status === 'core') {
          cost = rules.coreToElder.minContribution;
          deductionDesc = `晋升长老，扣除 ${cost} 贡献`;
        }
        const newBalance = Math.max(0, d.contributionPoints - cost);

        // 调整建筑：从旧工作建筑中移除（居所保留，等下 autoAssignResidence 覆盖）
        let newBuildings = st.buildings.map(b => ({
          ...b,
          assignedDisciples: (b.type === 'outer_residence' || b.type === 'inner_residence' || b.type === 'core_residence' || b.type === 'cave_mansion')
            ? b.assignedDisciples
            : b.assignedDisciples.filter(id => id !== discipleId),
          managerId: b.managerId === discipleId ? null : b.managerId,
        }));

        // 如果新身份是长老：不再参与生产（居所由 autoAssignResidence 处理）
        if (nextStatus === 'elder') {
          newBuildings = newBuildings.map(b => ({
            ...b,
            assignedDisciples: b.assignedDisciples.filter(id => id !== discipleId),
          }));
        } else {
          // 自动分配新工作建筑
          const workRes = autoAssignBuilding({ ...d, status: nextStatus }, newBuildings);
          newBuildings = workRes.newBuildings;
        }
        // 重新分配居所
        const resRes = autoAssignResidence({ ...d, status: nextStatus }, newBuildings);
        newBuildings = resRes.newBuildings;

        // 构造流水
        const currentDate = { year: st.year, month: st.month };
        const logEntry: ContributionLog = {
          id: generateId(),
          discipleId,
          date: currentDate,
          type: 'promotion',
          amount: -cost,
          balance: newBalance,
          description: deductionDesc,
        };

        // 新身份的岗位 ID：若非长老，从新建筑找分配到的工作建筑
        let newAssignedBuilding: string | null = d.assignedBuilding;
        if (nextStatus !== 'elder') {
          const found = newBuildings.find(b =>
            !(b.type === 'outer_residence' || b.type === 'inner_residence' || b.type === 'core_residence' || b.type === 'cave_mansion') &&
            b.assignedDisciples.includes(discipleId)
          );
          newAssignedBuilding = found?.id ?? null;
        } else {
          newAssignedBuilding = null;
        }

        set(state => ({
          disciples: state.disciples.map(x =>
            x.id === discipleId
              ? { ...x, status: nextStatus, contributionPoints: newBalance, assignedBuilding: newAssignedBuilding }
              : x
          ),
          buildings: newBuildings,
          contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000),
          notifications: [
            createNotification(
              'success',
              '手动晋升',
              `${d.name} 已晋升为「${DiscipleStatusNames[nextStatus]}」${cost > 0 ? `，扣除 ${cost} 贡献` : '（破格）'}`,
              currentDate,
            ),
            ...state.notifications,
          ].slice(0, 50),
        }));
        return { ok: true, newStatus: nextStatus, cost };
      },
    }),
    {
      name: 'sect-game-save',
      version: 9,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState;
        const state = persistedState as GameState;
        // v7: 新增 sectName 字段，旧存档默认为「修仙宗门」
        if (!state.sectName) {
          state.sectName = '修仙宗门';
        }
        // v7: 新增 beastInventory 字段
        if (!state.beastInventory) {
          state.beastInventory = [];
        }
        if (!state.unlockedPillRecipes) state.unlockedPillRecipes = [];
        if (!state.unlockedArtifactRecipes) state.unlockedArtifactRecipes = [];
        if (!state.unlockedTalismanRecipes) state.unlockedTalismanRecipes = [];
        if (state.ironInventory === undefined) state.ironInventory = 10;
        if (state.paperInventory === undefined) state.paperInventory = 10;
        if (!state.specialMaterials) state.specialMaterials = {};
        if (!state.contributionLogs) state.contributionLogs = [];
        if (state.buildings) {
          // 有效建筑类型（杂役居所已移除，旧存档中的杂役居所会被过滤）
          const validTypes = new Set([
            'mountain_gate', 'lecture_hall', 'servant_hall',
            'pill_hall', 'sutra_hall', 'artifact_hall',
            'secret_library', 'array_hall', 'spirit_beast_garden',
            'skyscraper_tower',
            'outer_residence', 'inner_residence', 'core_residence',
            'cave_mansion'
          ]);
          const removedIds = new Set(
            state.buildings
              .filter((b: any) => !validTypes.has(b.type))
              .map((b: any) => b.id)
          );
          state.buildings = state.buildings.filter((b: any) => validTypes.has(b.type));
          if (state.disciples && removedIds.size > 0) {
            state.disciples = state.disciples.map((d: any) => ({
              ...d,
              assignedBuilding: d.assignedBuilding && removedIds.has(d.assignedBuilding)
                ? null
                : d.assignedBuilding
            }));
          }

          // 修复弟子建筑分配
          if (state.disciples && version < 3) {
            state.buildings = state.buildings.map((b: any) => ({
              ...b,
              assignedDisciples: [],
            }));
            state.disciples.forEach((disciple: any) => {
              if (disciple.status !== 'elder' && disciple.status !== 'mortal') {
                const workResult = autoAssignBuilding(disciple, state.buildings);
                state.buildings = workResult.newBuildings;
                disciple.assignedBuilding = workResult.buildingId;
              }
              const residenceResult = autoAssignResidence(disciple, state.buildings);
              state.buildings = residenceResult.newBuildings;
            });
          }
        }
        // 补齐 otherSects（旧存档没有此字段）
        if (!state.otherSects || state.otherSects.length === 0) {
          state.otherSects = generateOtherSects(8, state.sectLevel || 'founding');
        }
        // 补齐 trials（旧存档没有此字段）
        if (!state.trials) {
          state.trials = [];
        }
        // 关注弟子列表
        if (!state.followedDiscipleIds) {
          state.followedDiscipleIds = [];
        }
        // 大比配置迁移：旧版单配置 -> 新版三频率独立配置（version < 4）
        const defaultSectCfg = getDefaultTournamentConfig('sect');
        const defaultInterCfg = getDefaultTournamentConfig('inter-sect');
        const oldSect: any = state.sectTournamentConfig;
        const oldInter: any = state.interSectTournamentConfig;
        if (!oldSect || typeof oldSect.yearly === 'undefined') {
          // 旧格式或不存在：若旧配置有频率字段，则保留到对应频率槽位；其余用默认
          if (oldSect && oldSect.frequency && typeof oldSect.division === 'object') {
            const freqKey: TournamentFrequency = oldSect.frequency;
            state.sectTournamentConfig = {
              ...defaultSectCfg,
              [freqKey]: {
                enabled: !!oldSect.enabled,
                division: oldSect.division,
                rewards: oldSect.rewards || defaultSectCfg[freqKey].rewards,
              },
            };
          } else {
            state.sectTournamentConfig = defaultSectCfg;
          }
        }
        if (!oldInter || typeof oldInter.yearly === 'undefined') {
          if (oldInter && oldInter.frequency && typeof oldInter.division === 'object') {
            const freqKey: TournamentFrequency = oldInter.frequency;
            state.interSectTournamentConfig = {
              ...defaultInterCfg,
              [freqKey]: {
                enabled: !!oldInter.enabled,
                division: oldInter.division,
                rewards: oldInter.rewards || defaultInterCfg[freqKey].rewards,
              },
            };
          } else {
            state.interSectTournamentConfig = defaultInterCfg;
          }
        }
        // 大比结果和年份迁移
        const FREQS: TournamentFrequency[] = ['yearly', 'every5years', 'every10years'];
        if (!state.lastSectTournamentResults || typeof state.lastSectTournamentResults === 'object' && FREQS.every(f => !((state.lastSectTournamentResults as any)[f] !== undefined))) {
          state.lastSectTournamentResults = { yearly: null, every5years: null, every10years: null };
          // 旧的单一结果尽量塞到 yearly 槽
          if ((state as any).lastSectTournamentResult) {
            state.lastSectTournamentResults.yearly = (state as any).lastSectTournamentResult as any;
            delete (state as any).lastSectTournamentResult;
          }
        }
        if (!state.lastInterSectTournamentResults || typeof state.lastInterSectTournamentResults === 'object' && FREQS.every(f => !((state.lastInterSectTournamentResults as any)[f] !== undefined))) {
          state.lastInterSectTournamentResults = { yearly: null, every5years: null, every10years: null };
          if ((state as any).lastInterSectTournamentResult) {
            state.lastInterSectTournamentResults.yearly = (state as any).lastInterSectTournamentResult as any;
            delete (state as any).lastInterSectTournamentResult;
          }
        }
        if (!state.lastSectTournamentYears || typeof (state.lastSectTournamentYears as any).yearly === 'undefined') {
          const oldYear = typeof (state as any).lastSectTournamentYear === 'number' ? (state as any).lastSectTournamentYear : 0;
          state.lastSectTournamentYears = { yearly: oldYear, every5years: oldYear, every10years: oldYear };
          delete (state as any).lastSectTournamentYear;
        }
        if (!state.lastInterSectTournamentYears || typeof (state.lastInterSectTournamentYears as any).yearly === 'undefined') {
          const oldYear = typeof (state as any).lastInterSectTournamentYear === 'number' ? (state as any).lastInterSectTournamentYear : 0;
          state.lastInterSectTournamentYears = { yearly: oldYear, every5years: oldYear, every10years: oldYear };
          delete (state as any).lastInterSectTournamentYear;
        }
        // version 5: 补齐弟子的师承/好友/大比历史字段；补齐其他宗门的好感度/外交/交易字段
        if (state.disciples) {
          state.disciples = state.disciples.map((d: any) => ({
            ...d,
            master: d.master ?? null,
            friends: d.friends ?? [],
            tournamentHistory: d.tournamentHistory ?? [],
            // v8: 境界拆分前/中/后期，旧存档弟子默认前期；realmProgress 保留原值
            realmStage: d.realmStage ?? 'early',
          }));
        }
        if (state.otherSects) {
          state.otherSects = state.otherSects.map((s: any) => ({
            ...s,
            favorability: s.favorability ?? 50,
            diplomaticStatus: s.diplomaticStatus ?? 'neutral',
            tradeActive: s.tradeActive ?? false,
            truceUntilYear: s.truceUntilYear ?? null,
          }));
        }
        // v8: 新增灵石收支历史与自动任命长老开关
        if (!state.spiritStoneHistory) state.spiritStoneHistory = [];
        if (state.autoAppointElder === undefined) state.autoAppointElder = false;
        // v9: 生产目标从单数 productionTarget 迁移到复数 productionTargets（数组）
        // 旧存档的丹堂/炼器堂/符堂若有单目标，迁移到槽位 0
        if (state.buildings) {
          state.buildings = state.buildings.map((b: any) => {
            if (b.productionTargets) return b; // 已迁移
            const old = b.productionTarget;
            if (old && (old.pillType || old.artifactType || old.talismanType)) {
              return { ...b, productionTargets: [old], productionTarget: undefined };
            }
            return { ...b, productionTargets: [], productionTarget: undefined };
          });
        }
        return state;
      },
    }
  )
);
