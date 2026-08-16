import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUIStore } from '@/store/uiStore';
import type { Disciple, PromotionRules } from '@/types/disciple';
import { DiscipleStatusNames, RealmNames, RealmOrder, getRealmDisplay } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { BuildingTypeNames } from '@/types/building';
import { RESIDENCE_TYPES } from '@/types/building';
import { BUILDING_CONFIGS, BookTierNames } from '@/data/buildings';
import type { BookConfig, BookTier, BookType } from '@/data/buildings';
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
import type { Trial, ContributionLog, ContributionLogType, SectHistoryEntry, AutoTradeRule, ChoiceEvent, BuildingEvent, ExplorationEncounter, TrialType, ChainEvent, PendingChainEvent, SectSchool, CalamityEvent } from '@/types/game';
import {
  createInitialDisciple, createInitialBuildings, getDefaultPromotionRules, autoAssignBuilding,
  autoAssignResidence, getResidenceUpgradeCost, getResidenceCapacityByLevel, getCaveMansionUpgradeCost,
  monthlyReassign,
  autoAssignManagers, autoLearnTechniqueOnBreakthrough, pickUpgradeBook,
  getMaintenanceCostByLevel, calculateLectureBonus, SKYSCRAPER_TOWER_COMBAT_POWER,
  processDiscipleDepartures, mergeDepartureInventories,
  processMonthlyEmergentEvents, processMasterInheritance,
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
  getStageBreakthroughRequired,
  generateMonthlyReport,
  createNotification,
  createDeducingBook,
  finalizeDeducingBook,
  calculateMonthlyDeductionProgress,
  getMaxDeduceTier,
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
import { calcRecipeMaterialContribution, getMaterialContributionCost } from '@/data/specialMaterials';
import { PILL_CONFIGS } from '@/data/pills';
import { ARTIFACT_CONFIGS } from '@/data/artifacts';
import { TALISMAN_CONFIGS } from '@/data/talismans';
import { BEAST_CONFIGS } from '@/data/beasts';
import { EXPLORATION_REGIONS, getEncountersByRegion, getRegionById } from '@/data/exploration';
import type { CraftingTask, CraftingResult } from '@/types/crafting';
import { QualityNames } from '@/types/crafting';
import { processMonthlyCrafting, createCraftingTask as createCraftingTaskLogic } from '@/utils/gameLogic';
import { generateChainEvents, processPendingChainEvents, generatePriceFluctuations, calculateExpansionCost, calculateDiscipleWelfareCost, checkCalamityTrigger, generateCalamity } from '@/utils/gameLogic';
import { SCHOOL_TALENT_TREES } from '@/types/game';
import { RECIPE_MAP } from '@/data/recipes';

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
  sectHistory: SectHistoryEntry[]; // 宗门历史事件（建筑升级/宗门晋升/宗门战争，新记录在前）
  gameStarted: boolean;
  showMainMenu: boolean;
  libraryBooks: BookConfig[]; // 藏经阁拥有的书籍
  libraryCosts: Record<BookTier, number>; // 每层藏经阁学习消耗贡献点
  otherSects: OtherSect[]; // 天下其他宗门
  trials: Trial[]; // 试炼任务列表（每年刷新）
  autoTrialEnabled: boolean; // 是否每月自动派遣空闲弟子执行可完成的试炼
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
  // 涌现事件系统
  choiceEvent: ChoiceEvent | null;       // 当前待处理的分支选择事件
  pendingChainEvents: PendingChainEvent[]; // 待触发的连锁事件队列
  pendingEncounter: ExplorationEncounter | null; // 探索遭遇事件
  unlockedExplorationRegions: string[];  // 已解锁的探索区域ID列表
  monthsConsecutiveNegative: number;     // 连续灵石赤字月数
  sectCollapsed: boolean;                // 宗门是否已灭亡
  sectCollapseReason: string;            // 灭亡原因
  // 经济系统
  priceMultipliers: Record<string, number>; // 商店物品价格倍率（0.8 ~ 1.2）
  // 宗门传承系统
  sectSchool: SectSchool | null;          // 当前宗门流派（首次晋升时选择）
  unlockedTalents: string[];              // 已解锁的天赋节点ID列表
  // 宗门气运系统
  sectFortune: number;                    // 宗门气运值（-100 ~ 100）
  activeCalamity: CalamityEvent | null;   // 当前活跃的天灾事件
  calamityWarnings: CalamityEvent[];      // 待触发的天灾预警
  // 大额支出
  expansionCount: number;                 // 宗门扩张次数
  lastCalamityYear: number;               // 上次天灾触发年份
  resolveChoiceEvent: (choiceIndex: number) => void; // 处理分支选择
  initiateExploration: (regionId: string, discipleId: string) => { ok: boolean; reason?: string }; // 发起探索
  resolveExplorationEncounter: (choiceIndex: number) => void; // 处理探索遭遇
  recruitCandidates: Disciple[];           // 招收弟子候选列表（一次招 3~5 人让玩家挑）
  recruitCostPerDisciple: number;          // 每个候选人的招收费用（统一费用，固定 50 灵石）
  recruitRefreshCost: number;              // 「换一批」刷新候选列表的费用（固定 50 灵石）
  clearRecruitCandidates: () => void;      // 清空候选
  // 仓库快捷交易 & 自动交易：按 ShopItem.id 存规则（键对应 SHOP_ITEMS[i].id）
  autoTrade: Record<string, AutoTradeRule>;
  setAutoTradeRule: (shopItemId: string, rule: Partial<AutoTradeRule>) => void;  // 设置/覆盖某物品的自动交易规则
  toggleAutoTrade: (shopItemId: string, enabled: boolean) => void;               // 某物品启用/停用自动交易
  // 炼制系统
  craftingTasks: CraftingTask[];
  startCrafting: (recipeId: string, category: 'pill' | 'artifact' | 'talisman', itemType: string, discipleId: string | null, quantity: number) => { success: boolean; reason?: string };
  cancelCrafting: (taskId: string) => void;
  collectCraftingResult: (taskId: string) => void;
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
  recruitDisciple: (opts?: { refresh?: boolean }) => { candidates: Disciple[]; costPerDisciple: number };  // 返回候选列表；refresh=true 会扣 50 灵石的换一批费用
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
  // 藏经阁推演功法：手动安排/取消推演任务
  startDeducingBook: (discipleId: string, type: BookType, tierOverride?: BookTier) => { success: boolean; reason?: string };
  cancelDeducingBook: (discipleId: string) => boolean;
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
  // 弟子背包：从宗门仓库转移物品到弟子背包
  giveItemToDisciple: (discipleId: string, kind: 'pill' | 'artifact' | 'talisman' | 'beast', itemType: string, quantity?: number) => { ok: boolean; reason?: string };
  // 弟子背包：从弟子背包取回物品到宗门仓库
  takeItemFromDisciple: (discipleId: string, kind: 'pill' | 'artifact' | 'talisman' | 'beast', itemType: string, quantity?: number) => { ok: boolean; reason?: string };
  // 弟子用贡献兑换原材料（基础或特殊），从宗门仓库转移到弟子背包
  exchangeMaterialByDisciple: (discipleId: string, materialName: string, quantity: number, contributionCost: number) => { ok: boolean; reason?: string };
  // 试炼系统
  refreshTrials: () => void;  // 刷新试炼列表（按本宗战力生成）
  dispatchDiscipleToTrial: (trialId: string, discipleId: string) => { ok: boolean; reason?: string };  // 派遣弟子执行试炼
  cancelTrial: (trialId: string) => void;  // 取消试炼（弟子返回，无奖励）
  toggleAutoTrial: () => void;  // 切换自动试炼开关
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
  // 宗门传承系统
  selectSchool: (school: SectSchool) => void;
  unlockTalent: (talentId: string) => { ok: boolean; reason: string };
  // 大额支出
  expandSect: () => { ok: boolean; cost?: number; newCapacity?: number; reason?: string };
  distributeWelfare: (generosityLevel: number) => { ok: boolean; cost?: number; satisfactionGain?: number; reason?: string };
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
  contributionCost: number;   // 本次生产消耗的原材料贡献总值
  discipleIds: string[];      // 分摊贡献的弟子 ID 列表
  skippedReason?: string;     // 跳过原因（贡献不足等）
}
function produceWorkBuilding(
  building: Building,
  state: GameState,
  mats: { herbs: number; iron: number; paper: number },
  specialMats: Record<string, number>, // 当前特殊材料库存（会被就地扣减）
  assignedDisciples: Disciple[],      // 该建筑在岗弟子（用于贡献扣减）
): ProductionResult[] {
  const targets = building.productionTargets?.filter(t => t && (t.pillType || t.artifactType || t.talismanType)) || [];
  if (targets.length === 0) return [];

  const results: ProductionResult[] = [];
  // 工人按槽位数均分（至少1人/槽）
  const perSlotWorkers = Math.max(1, Math.floor(assignedDisciples.length / targets.length));
  // 按槽位分配弟子（顺序取 perSlotWorkers 个）
  let discipleOffset = 0;

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
      productionCap = Math.max(1, Math.floor(perSlotWorkers / 2)); // 丹药每2工人产1件
    } else if (building.type === 'sutra_hall' && target.artifactType) {
      if (!state.unlockedArtifactRecipes.includes(target.artifactType)) continue;
      recipe = ARTIFACT_CONFIGS[target.artifactType] ?? null;
      productionCap = Math.max(1, Math.floor(perSlotWorkers / 3)); // 法器耗时，每3工人产1件
    } else if (building.type === 'artifact_hall' && target.talismanType) {
      if (!state.unlockedTalismanRecipes.includes(target.talismanType)) continue;
      recipe = TALISMAN_CONFIGS[target.talismanType] ?? null;
      productionCap = Math.max(1, Math.floor(perSlotWorkers / 2)); // 符箓每2工人产1件
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

    // ===== 弟子自动兑换原材料：计算贡献值并检查 =====
    // 每件成品所需原材料的贡献总值
    const perUnitContrib = calcRecipeMaterialContribution(recipe.materials);
    const totalContrib = perUnitContrib * maxUnits;

    // 分配到此槽位的弟子
    const slotDisciples = assignedDisciples.slice(discipleOffset, discipleOffset + perSlotWorkers);
    discipleOffset += perSlotWorkers;
    const slotDiscipleIds = slotDisciples.map(d => d.id);

    // 检查每个弟子是否有足够贡献分摊
    const perDiscipleCost = slotDisciples.length > 0 ? Math.ceil(totalContrib / slotDisciples.length) : 0;
    const canAfford = slotDisciples.length > 0 && slotDisciples.every(d => (d.contributionPoints || 0) >= perDiscipleCost);

    if (!canAfford && perDiscipleCost > 0) {
      // 贡献不足：跳过此目标，不消耗材料
      const itemName = target.pillType ? PILL_CONFIGS[target.pillType]?.name
        : target.artifactType ? ARTIFACT_CONFIGS[target.artifactType]?.name
        : target.talismanType ? TALISMAN_CONFIGS[target.talismanType]?.name : '未知';
      results.push({
        pillType: target.pillType, artifactType: target.artifactType, talismanType: target.talismanType,
        quantity: 0, herbsConsumed: 0, ironConsumed: 0, paperConsumed: 0,
        specialConsumed: {}, contributionCost: 0, discipleIds: slotDiscipleIds,
        skippedReason: `贡献不足（需 ${perDiscipleCost}/人）`,
      });
      continue;
    }

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
      contributionCost: totalContrib,
      discipleIds: slotDiscipleIds,
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
    sectHistory: [],
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
    autoTrialEnabled: false,
    followedDiscipleIds: [],
    sectTournamentConfig: getDefaultTournamentConfig('sect'),
    interSectTournamentConfig: getDefaultTournamentConfig('inter-sect'),
    lastSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastInterSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
    lastInterSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
    spiritStoneHistory: [],
    autoAppointElder: false,
    choiceEvent: null,
    pendingChainEvents: [],
    monthsConsecutiveNegative: 0,
    pendingEncounter: null,
    unlockedExplorationRegions: ['outer'],
    sectCollapsed: false,
    sectCollapseReason: '',
    priceMultipliers: {},
    // 宗门传承系统
    sectSchool: null,
    unlockedTalents: [],
    // 宗门气运系统
    sectFortune: 0,
    activeCalamity: null,
    calamityWarnings: [],
    // 大额支出
    expansionCount: 0,
    lastCalamityYear: 0,
    recruitCandidates: [],
    recruitCostPerDisciple: 50,
    recruitRefreshCost: 50,
    autoTrade: {},
    craftingTasks: [],
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

      resolveChoiceEvent: (choiceIndex: number) => {
        const state = get();
        if (!state.choiceEvent) return;
        const choice = state.choiceEvent.choices[choiceIndex];
        if (!choice) return;
        const { spiritStoneChange, reputationChange, karmaChange, satisfactionChange, notificationText } = choice.effects;
        const currentDate = { year: state.year, month: state.month };
        const newNotifications: Notification[] = [
          createNotification('info', state.choiceEvent.title, notificationText, currentDate),
          ...state.notifications,
        ].slice(0, 50);
        // 满意度变化影响所有弟子
        const satChange = satisfactionChange ?? 0;
        const updatedDisciples = satChange !== 0
          ? state.disciples.map(d => ({ ...d, satisfaction: Math.max(0, Math.min(100, d.satisfaction + satChange)) }))
          : state.disciples;
        // 生成连锁事件
        const currentMonthTotal = state.year * 12 + state.month;
        const newChainEvents = generateChainEvents(
          state.choiceEvent.id,
          choice.label,
          currentMonthTotal,
        );
        const updatedChainEvents = [...state.pendingChainEvents, ...newChainEvents];
        set({
          spiritStones: state.spiritStones + (spiritStoneChange ?? 0),
          reputation: state.reputation + (reputationChange ?? 0),
          karma: Math.max(-100, Math.min(100, state.karma + (karmaChange ?? 0))),
          disciples: updatedDisciples,
          choiceEvent: null,
          pendingChainEvents: updatedChainEvents,
          notifications: newNotifications,
        });
      },

      // 发起探索（创建探索试炼）
      initiateExploration: (regionId: string, discipleId: string) => {
        const state = get();
        if (!state.unlockedExplorationRegions.includes(regionId)) {
          return { ok: false, reason: '该区域尚未解锁' };
        }
        const region = getRegionById(regionId);
        if (!region) return { ok: false, reason: '区域不存在' };
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        if (disciple.onTrialId) return { ok: false, reason: '该弟子已在执行任务' };
        if (disciple.isBreakingThrough) return { ok: false, reason: '该弟子正在突破' };
        if (disciple.status !== 'inner' && disciple.status !== 'core' && disciple.status !== 'elder') {
          return { ok: false, reason: '该弟子不可派遣' };
        }

        // 创建探索试炼
        const newTrial: Trial = {
          id: generateId(),
          type: region.trialType as TrialType,
          name: `探索·${region.name}`,
          description: `派遣弟子 ${disciple.name} 前往「${region.name}」探索游历，预计耗时 ${region.baseDurationMonths} 个月。`,
          difficulty: 'normal',
          requiredPower: region.minPower,
          durationMonths: region.baseDurationMonths,
          rewards: { description: '探索收获（含随机遭遇）' },
          riskRate: region.riskRate,
          injuryRate: region.riskRate * 0.5,
          status: 'in_progress',
          assignedDiscipleId: discipleId,
          startYear: state.year,
          startMonth: state.month,
          progress: 0,
          generatedYear: state.year,
        };

        const updatedDisciples = state.disciples.map(d =>
          d.id === discipleId ? { ...d, onTrialId: newTrial.id } : d,
        );

        set({
          trials: [...state.trials, newTrial],
          disciples: updatedDisciples,
          notifications: [
            createNotification('info', '探索出发', `弟子 ${disciple.name} 启程前往「${region.name}」探索，预计 ${region.baseDurationMonths} 个月后返回。`, { year: state.year, month: state.month }),
            ...state.notifications,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      // 处理探索遭遇选择
      resolveExplorationEncounter: (choiceIndex: number) => {
        const state = get();
        if (!state.pendingEncounter) return;
        const encounter = state.pendingEncounter;
        const choice = encounter.choices[choiceIndex];
        if (!choice) return;
        const currentDate = { year: state.year, month: state.month };

        const roll = Math.random();
        const isSuccess = roll < choice.successChance;
        const eff = isSuccess ? choice.effects.success : choice.effects.failure;

        // 更新状态
        const updates: Partial<GameState> = {
          pendingEncounter: null,
          notifications: [
            createNotification(
              isSuccess ? 'success' : 'warning',
              encounter.name,
              eff.notificationText,
              currentDate,
            ),
            ...state.notifications,
          ].slice(0, 50),
        };

        // 应用效果
        const effAny = eff as any;
        if (isSuccess) {
          if (effAny.spiritStones) updates.spiritStones = state.spiritStones + (effAny.spiritStones ?? 0);
          if (effAny.reputation) updates.reputation = state.reputation + (effAny.reputation ?? 0);
          if (effAny.herb) updates.herbInventory = state.herbInventory + (effAny.herb ?? 0);
          if (effAny.iron) updates.ironInventory = state.ironInventory + (effAny.iron ?? 0);
          if (effAny.paper) updates.paperInventory = state.paperInventory + (effAny.paper ?? 0);
          if (effAny.specialMaterials) {
            const newSpec = { ...state.specialMaterials };
            for (const mat of effAny.specialMaterials) {
              newSpec[mat.name] = (newSpec[mat.name] ?? 0) + mat.amount;
            }
            updates.specialMaterials = newSpec;
          }
        } else {
          if (effAny.spiritStones) updates.spiritStones = state.spiritStones + (effAny.spiritStones ?? 0);
          if (effAny.discipleInjury && encounter.trialId) {
            // 弟子受伤：扣除满意度
            const updatedDisciples = state.disciples.map(d =>
              d.onTrialId === encounter.trialId
                ? { ...d, satisfaction: Math.max(0, d.satisfaction - 15) }
                : d,
            );
            updates.disciples = updatedDisciples;
          }
        }

        set(updates as any);
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
        const tierZh = (t: BookTier) => BookTierNames[t] + (BookTierNames[t].endsWith('阶') ? '' : '阶');
        const qualityZh = (q: number) =>
          q >= 90 ? '仙品' : q >= 80 ? '极品' : q >= 60 ? '上品' : q >= 40 ? '中品' : '下品';
        const state = get();
        let { year, month, spiritStones, reputation, herbInventory } = state;
        const { disciples, buildings, promotionRules, pillInventory, libraryBooks, libraryCosts } = state;
        
        let spiritStoneIncome: { source: string; amount: number }[] = [];
        const spiritStoneExpense: { source: string; amount: number }[] = [];
        const breakthroughEvents: { discipleId: string; discipleName: string; from: string; to: string; success: boolean }[] = [];
        const promotionEvents: { discipleId: string; discipleName: string; from: string; to: string }[] = [];
        const newDisciples: { id: string; name: string; status: string }[] = [];
        const newNotifications: Notification[] = [];
        // 藏经阁推演本月新增的秘籍（在循环外汇总，避免每次 set 全量复制）
        let libraryBooksAfter = libraryBooks;

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
        let accPillInventory: PillInventory[] = state.pillInventory.map(p => ({ ...p }));
        let accArtifactInventory: ArtifactInventory[] = state.artifactInventory.map(a => ({ ...a }));
        let accTalismanInventory: TalismanInventory[] = state.talismanInventory.map(t => ({ ...t }));

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

        // ===== 生产原材料贡献扣减（暂存区） =====
        // 说明：nextMonth 前期（buildings.forEach 阶段）不能直接修改 state.disciples 的对象，
        // 原因有二：① 时序上本月工作贡献尚未发放，直接按月初余额判定不公平；
        //        ② 脏写 state 原对象若中途异常会污染存档。
        // 因此在 buildings.forEach 内仅计算扣减信息并暂存，待 updatedDisciples.map
        // 发完本月工作贡献后，在同一链路统一扣减 + 记录流水。
        // Map<discipleId, { amount: number; description: string }[]> 每个弟子本月待扣的原材料贡献条目（多条可累加）
        type _PendDeduct = { amount: number; description: string };
        const pendingMatContributionDeductions = new Map<string, _PendDeduct[]>();
        const pushPendingMatDeduct = (discipleId: string, amount: number, description: string) => {
          if (amount <= 0) return;
          const arr = pendingMatContributionDeductions.get(discipleId) || [];
          arr.push({ amount, description });
          pendingMatContributionDeductions.set(discipleId, arr);
        };

        // 预计算每个弟子本月可获得的工作贡献（用于贡献检查时"预估可支配"，避免月初0贡献直接跳过生产）
        const projectWorkContribution = new Map<string, number>();
        for (const d of disciples) {
          const b = buildings.find(b0 => b0.assignedDisciples.includes(d.id)) || null;
          projectWorkContribution.set(d.id, computeMonthlyContribution(d, b));
        }

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
          // 弟子自动兑换原材料：贡献值不足时跳过生产
          const buildingDisciples = (building.assignedDisciples || [])
            .map(id => disciples.find(d => d.id === id))
            .filter(d => d) as Disciple[];
          // 生产前：为在岗弟子注入"本月预估工作贡献"，使贡献检查能基于「月初余额 + 本月预计赚到的贡献」
          // 注意：此处不直接修改 disciple 对象，仅把预估值传给 produceWorkBuilding 做判定
          const projectedDisciples = buildingDisciples.map(d => ({
            ...d,
            contributionPoints: (d.contributionPoints || 0) + (projectWorkContribution.get(d.id) || 0),
          }));
          const prods = produceWorkBuilding(building, state, { herbs: accHerbs, iron: accIron, paper: accPaper }, accSpecialMaterials, projectedDisciples);
          for (const prod of prods) {
            // 贡献不足跳过
            if (prod.skippedReason) {
              const itemName = prod.pillType ? PILL_CONFIGS[prod.pillType]?.name
                : prod.artifactType ? ARTIFACT_CONFIGS[prod.artifactType]?.name
                : prod.talismanType ? TALISMAN_CONFIGS[prod.talismanType]?.name : '未知';
              newNotifications.push(createNotification(
                'warning', '生产跳过',
                `${building.name}·「${itemName}」因弟子${prod.skippedReason}，本月未生产`,
                { year, month },
              ));
              continue;
            }
            if (prod.quantity <= 0) continue;

            // 暂存原材料贡献扣减：待本月工作贡献发放后，统一在 updatedDisciples.map 扣减
            // （避免脏写 state.disciples 原对象，且时序更合理：先领工资再扣材料钱）
            if (prod.contributionCost > 0 && prod.discipleIds.length > 0) {
              const perDisciple = Math.ceil(prod.contributionCost / prod.discipleIds.length);
              for (const did of prod.discipleIds) {
                pushPendingMatDeduct(did, perDisciple, `自动兑换原材料（${building.name}生产）`);
              }
            }

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
        const pendingSectHistory: SectHistoryEntry[] = [];
        const rivalSects = refreshedOtherSects.filter(
          s => s.diplomaticStatus === 'rival' && (!s.truceUntilYear || s.truceUntilYear <= year),
        );
        if (rivalSects.length > 0) {
          // 单月仅抽 1 个 rival 进行判定（其他 rival 视为"未进攻"）
          const rival = rivalSects[Math.floor(Math.random() * rivalSects.length)];
          const ourCombat = calculateSectCombatPower(disciples, buildings).totalPower;
          // 宿敌只会在战力高于本宗时才发起进攻；每月 10% 概率
          if (rival.combatPower > ourCombat && Math.random() < 0.10) {
            const rivalCombat = rival.combatPower;
            // 同盟协防：被攻击时同盟宗门提供 50% 战力援助
            const allySects = refreshedOtherSects.filter(s => s.diplomaticStatus === 'ally');
            const allyDefense = Math.floor(allySects.reduce((sum, s) => sum + s.combatPower, 0) * 0.5);
            const totalDefense = ourCombat + allyDefense;
            const allyLabel = allySects.length > 0
              ? allySects.slice(0, 3).map(s => `「${s.name}」`).join('、') + (allySects.length > 3 ? `等${allySects.length}家` : '')
              : '';
            if (totalDefense >= rivalCombat) {
              const repGain = Math.floor(rival.combatPower * 0.001) + 1;
              rivalRepGain += repGain;
              newNotifications.push(createNotification(
                'success', '击退来犯',
                `「${rival.name}」来袭，本宗成功击退！声望 +${repGain}。5 年内双方不得再启战端。`,
                { year, month },
              ));
              pendingSiegeReport = {
                title: '击退来犯',
                description: `「${rival.name}」趁本月来袭，战力 ${rivalCombat} vs 本宗战力 ${ourCombat}${allyDefense > 0 ? ` + 同盟协防 ${allyDefense}（${allyLabel}提供 50% 战力）` : ''} = ${totalDefense}。本宗成功击退，声望 +${repGain}，双方进入 5 年停战期。`,
                attackers: [rival.name],
                isPlayerVictory: true,
                stoneLoss: 0,
                repLoss: -repGain,
                deadDisciples: 0,
                date: { year, month },
                source: 'rival',
                ourPower: totalDefense,
                enemyPower: rivalCombat,
              };
              pendingSectHistory.push({
                id: generateId(),
                date: { year, month },
                type: 'war_victory',
                title: '击退来犯',
                description: `「${rival.name}」来袭（战力 ${rivalCombat}），本宗成功击退（防御 ${totalDefense}），声望 +${repGain}。`,
              });
            } else {
              // 战败损失：声望固定 50，灵石为当前月收入的 10 倍
              const repLoss = 50;
              const stoneLoss = Math.max(100, totalSpiritStoneIncome * 10);
              rivalStoneLoss += stoneLoss;
              rivalRepLoss += repLoss;
              newNotifications.push(createNotification(
                'warning', '宗门被攻',
                `「${rival.name}」来犯，本宗不敌！损失 ${stoneLoss} 灵石、${repLoss} 声望。双方进入 5 年停战期。`,
                { year, month },
              ));
              pendingSiegeReport = {
                title: '宗门被攻',
                description: `「${rival.name}」趁本月来袭，战力 ${rivalCombat} vs 本宗战力 ${ourCombat}${allyDefense > 0 ? ` + 同盟协防 ${allyDefense}（${allyLabel}提供 50% 战力）` : ''} = ${totalDefense}。本宗不敌，损失 ${stoneLoss} 灵石、${repLoss} 声望，双方进入 5 年停战期。`,
                attackers: [rival.name],
                isPlayerVictory: false,
                stoneLoss,
                repLoss,
                deadDisciples: 0,
                date: { year, month },
                source: 'rival',
                ourPower: totalDefense,
                enemyPower: rivalCombat,
              };
              pendingSectHistory.push({
                id: generateId(),
                date: { year, month },
                type: 'war_defeat',
                title: '宗门被攻',
                description: `「${rival.name}」来袭（战力 ${rivalCombat}），本宗不敌（防御 ${totalDefense}），损失 ${stoneLoss} 灵石、${repLoss} 声望。`,
              });
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
              const ourCombat = calculateSectCombatPower(disciples, buildings).totalPower;
              // 同盟协防：被联军攻击时同盟宗门提供 50% 战力援助
              const allySects = refreshedOtherSects.filter(s => s.diplomaticStatus === 'ally');
              const allyDefense = Math.floor(allySects.reduce((sum, s) => sum + s.combatPower, 0) * 0.5);
              const totalDefense = ourCombat + allyDefense;
              const allyLabel = allySects.length > 0
                ? allySects.slice(0, 3).map(s => `「${s.name}」`).join('、') + (allySects.length > 3 ? `等${allySects.length}家` : '')
                : '';
              // 联合战力 = 各宗门战力之和 * 协同系数（0.7）
              const coalitionPower = Math.floor(
                coalition.reduce((sum, s) => sum + s.combatPower, 0) * 0.7
              );
              const coalitionLabel = coalition.slice(0, 3).map(s => `「${s.name}」`).join('、') +
                (coalition.length > 3 ? `等${coalition.length}家` : '');

              const truceYear = year + 5;

              // 联军只确认能战胜才进攻：战力不足则放弃
              if (coalitionPower > totalDefense) {
                // 战败损失：声望固定 50，灵石为当前月收入的 10 倍
                const repLoss = 50;
                const stoneLoss = Math.max(100, totalSpiritStoneIncome * 10);
                rivalStoneLoss += stoneLoss;
                rivalRepLoss += repLoss;
                // 联军战败后释放所有附庸（宗门威信扫地，附庸趁机独立）
                const vassalNames = refreshedOtherSects
                  .filter(s => s.diplomaticStatus === 'vassal')
                  .map(s => s.name);
                if (vassalNames.length > 0) {
                  refreshedOtherSects = refreshedOtherSects.map(s => {
                    if (s.diplomaticStatus !== 'vassal') return s;
                    // 附庸独立：好感-30（改基础好感），同时清空 karmaFavorApplied 重新参与每月正邪对齐
                    const indBase =
                      typeof s.baseFavorability === 'number' ? s.baseFavorability : (s.favorability ?? 50) - (s.karmaFavorApplied ?? 0);
                    const newIndBase = Math.max(0, indBase - 30);
                    return {
                      ...s,
                      diplomaticStatus: 'neutral' as const,
                      baseFavorability: newIndBase,
                      karmaFavorApplied: 0,
                      favorability: Math.max(0, Math.min(100, newIndBase)),
                    };
                  });
                  const vassalLabel = vassalNames.slice(0, 3).map(n => `「${n}」`).join('、') +
                    (vassalNames.length > 3 ? `等${vassalNames.length}家` : '');
                  newNotifications.push(createNotification(
                    'danger', '附庸脱离',
                    `${vassalLabel}附庸宗门趁联军破山之际宣布独立，脱离本宗掌控！`,
                    { year, month },
                  ));
                }
                const vassalNote = vassalNames.length > 0
                  ? `，${vassalNames.length} 个附庸宗门宣布独立`
                  : '';
                newNotifications.push(createNotification(
                  'danger', '正道联军破山',
                  `${coalitionLabel}正道宗门联合讨伐，本宗不敌！损失 ${stoneLoss} 灵石、${repLoss} 声望${vassalNote}。联军 5 年内不得再启战端。`,
                  { year, month },
                ));
                pendingSiegeReport = {
                  title: '正道联军破山',
                  description: `${coalitionLabel}正道宗门联合讨伐，联军战力 ${coalitionPower} vs 本宗战力 ${ourCombat}${allyDefense > 0 ? ` + 同盟协防 ${allyDefense}（${allyLabel}提供 50% 战力）` : ''} = ${totalDefense}。本宗不敌，损失 ${stoneLoss} 灵石、${repLoss} 声望${vassalNote}，联军 5 年内不得再启战端。`,
                  attackers: coalition.map(s => s.name),
                  isPlayerVictory: false,
                  stoneLoss,
                  repLoss,
                  deadDisciples: 0,
                  date: { year, month },
                  source: 'coalition',
                  ourPower: totalDefense,
                  enemyPower: coalitionPower,
                };
                pendingSectHistory.push({
                  id: generateId(),
                  date: { year, month },
                  type: 'war_defeat',
                  title: '正道联军破山',
                  description: `${coalitionLabel}联合讨伐（联军战力 ${coalitionPower}），本宗不敌（防御 ${totalDefense}），损失 ${stoneLoss} 灵石、${repLoss} 声望${vassalNote}。`,
                });
                // 联军全体进入 5 年停战
                const attackerIds = new Set(coalition.map(s => s.id));
                refreshedOtherSects = refreshedOtherSects.map(s =>
                  attackerIds.has(s.id) ? { ...s, truceUntilYear: truceYear } : s,
                );
              }
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

          // 发完本月工作贡献后，统一扣暂存的「自动兑换原材料」贡献
          // （此处与生产阶段分属不同流程，避免脏写 state 原对象 + 保证时序合理）
          const pendings = pendingMatContributionDeductions.get(d2.id);
          if (pendings && pendings.length > 0) {
            let bal = d2.contributionPoints;
            for (const p of pendings) {
              bal = Math.max(0, bal - p.amount);
              pushContributionLog(d2.id, 'deduct', -p.amount, bal, p.description);
            }
            d2 = { ...d2, contributionPoints: bal };
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

            // ===== 推演任务进度推进 =====
            if (d2.deducingBook) {
              const step = calculateMonthlyDeductionProgress(d2, d2.deducingBook.totalMonths, building.level);
              const newProgress = d2.deducingBook.progress + step;
              if (newProgress >= 100) {
                // 推演完成，正式入库藏经阁
                const finishedBook = finalizeDeducingBook(d2.deducingBook, d2.name);
                libraryBooksAfter = [...libraryBooksAfter, finishedBook];
                // 额外贡献奖励：推演成功的激励
                const bonus = d2.deducingBook.tier === 'nascent' ? 80 : d2.deducingBook.tier === 'golden' ? 50 : d2.deducingBook.tier === 'foundation' ? 30 : 15;
                d2 = {
                  ...d2,
                  deducingBook: null,
                  contributionPoints: d2.contributionPoints + bonus,
                };
                pushContributionLog(
                  d2.id, 'library', bonus, d2.contributionPoints,
                  `推演《${finishedBook.name}》完成入库 +${bonus} 贡献奖励`,
                );
                newNotifications.push(createNotification(
                  'success', '推演大成',
                  `「${d2.name}」在藏经阁推演出${tierZh(finishedBook.tier)}《${finishedBook.name}》（${qualityZh(finishedBook.quality)}），已收入藏经阁！`,
                  { year, month },
                ));
              } else {
                d2 = {
                  ...d2,
                  deducingBook: { ...d2.deducingBook, progress: newProgress },
                };
              }
            } else if (!d2.learningBook && realmIdx >= 2) {
              // ===== 自动推演：筑基以上（含筑基）、当前没在学习/推演时，每月按概率自动开启
              // 按道缘和藏经阁等级权重：基础 8% + 道缘/100 × 15% + 每级藏经阁 3%，上限 35%
              const daoFate = d2.hiddenTalents.daoFate || 50;
              const autoProb = Math.min(0.35, 0.08 + (daoFate / 100) * 0.15 + (building.level - 1) * 0.03);
              if (realmIdx >= 2 && Math.random() < autoProb) {
                const tier = getMaxDeduceTier(d2.realm, building.level);
                // 自动倾向：已学过功法的偏战技，否则 50/50
                const type: BookType =
                  d2.learnedTechnique && d2.learnedBattles.length < 2 && Math.random() < 0.7
                    ? 'battle'
                    : d2.learnedBattles.length >= 2
                      ? 'technique'
                      : Math.random() < 0.5 ? 'technique' : 'battle';
                const deducing = createDeducingBook(d2, type, tier, building.level);
                d2 = { ...d2, deducingBook: deducing };
                pushContributionLog(
                  d2.id, 'library', 0, d2.contributionPoints,
                  `开始自动推演 ${tierZh(tier)}${type === 'technique' ? '功法' : '战技'}《${deducing.name}》（${qualityZh(deducing.quality)}）`,
                );
              }
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
            // 从丹药配置读取实际突破加成值
            const pillCfg = pillForBreak ? PILL_CONFIGS[pillForBreak] : null;
            const pillBreakBonus = pillCfg?.breakthroughBonus ?? 0;
            const pillLifespan = pillCfg?.lifespanBonus ?? 0;

            const result = attemptBreakthrough(d2, hasPill, pillBreakBonus);

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
                // 丹药延寿效果：首次服用有效
                ...(hasPill && pillLifespan > 0 && pillCfg?.firstUseOnly
                  ? { maxAge: (realmChanged ? recomputeLifespan(breakthroughed) : d2.maxAge) + pillLifespan }
                  : {}),
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

        // ===== 自然流失：寿命死亡 + 叛逃（替代旧版 "status=mortal 粗暴离开"） =====
        // processDiscipleDepartures 内部会：
        //   · age >= maxAge 判定寿终；连续低满意度判定叛逃
        //   · 死亡遗产：师傅→道侣→同门好友 → 其余归仓库（会 mutate 传人弟子的装备字段，返回浅拷贝对象）
        //   · 叛逃带走 1–3 倍身份月收入灵石
        //   · 生成 Notification 和 SectHistoryEntry
        const depResult = processDiscipleDepartures(updatedDisciples, currentDate, createNotification);

        // 合并遗产/装备回流到本月库存累加器（与生产扣减顺序不冲突，因为是纯加项）
        mergeDepartureInventories(depResult.inventoryReport, {
          pillInventory: accPillInventory,
          artifactInventory: accArtifactInventory,
          talismanInventory: accTalismanInventory,
          beastInventory: newBeastInventory,
          specialMaterials: accSpecialMaterials,
          herbInventory: accHerbs,
          ironInventory: accIron,
          paperInventory: accPaper,
        });
        spiritStones -= depResult.stoneLossFromDefection;
        if (depResult.stoneLossFromDefection > 0) {
          spiritStoneExpense.push({ source: '叛逃弟子带走灵石', amount: depResult.stoneLossFromDefection });
        }
        newNotifications.push(...depResult.notifications);
        pendingSectHistory.push(...depResult.sectHistories);

        // 兼容旧代码：用新的幸存者替换 activeDisciples（leftDisciples 保留概念性字段避免后续 lint 报错）
        const leftDisciples: Disciple[] = []; // 语义保留，不再使用旧的 status=mortal 粗暴标记
        const activeDisciples = depResult.survivors;

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

        // 宗门扩张加成：每扩张一次 +5% 全局产出
        const expansionMultiplier = 1 + state.expansionCount * 0.05;
        totalSpiritStoneIncome = Math.floor(totalSpiritStoneIncome * expansionMultiplier);
        totalHerbIncome = Math.floor(totalHerbIncome * expansionMultiplier);
        // 同步更新收入明细中的产出项（附庸上贡和宿敌相关不翻倍，仅建筑产出翻倍）
        spiritStoneIncome = spiritStoneIncome.map(entry => {
          if (entry.source === '附庸上贡') return entry;
          return { ...entry, amount: Math.floor(entry.amount * expansionMultiplier) };
        });

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
        
        // 跨年：正邪度每年自然回归中立 +1；所有互动产生的好感度 buff 也以每年 1 点向中立(50)回归
        let karmaYearlyRecover = 0;
        // 跨年回归时：每个宗门的 baseFavorability 向 50 靠拢 ±1（已达 50 的不调整）
        // 敌对/附庸门派不参与好感度自动回归（已是特殊关系）
        const yearStartFavorDecay: { name: string; before: number; after: number }[] = [];
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
          }
          // 好感度（所有互动 buff）每年 1 点向中立回归
          refreshedOtherSects = refreshedOtherSects.map(s => {
            if (s.diplomaticStatus === 'rival' || s.diplomaticStatus === 'vassal') return s;
            const baseFav =
              typeof s.baseFavorability === 'number'
                ? s.baseFavorability
                : (s.favorability ?? 50) - (s.karmaFavorApplied ?? 0);
            if (baseFav === 50) return s;
            const step = baseFav > 50 ? -1 : +1; // 向 50 靠拢
            const newBase = baseFav + step;
            const applied =
              typeof s.karmaFavorApplied === 'number' ? s.karmaFavorApplied : 0;
            const newFav = Math.max(0, Math.min(100, newBase + applied));
            const before = s.favorability ?? 50;
            if (Math.abs(newFav - before) > 0) {
              yearStartFavorDecay.push({ name: s.name, before, after: newFav });
            }
            return {
              ...s,
              baseFavorability: newBase,
              favorability: newFav,
            };
          });
          if (yearStartFavorDecay.length > 0) {
            // 若跨年变动宗门不多（<=4）逐个列出；否则只展示数量
            const label = yearStartFavorDecay.length <= 4
              ? yearStartFavorDecay.map(r => `「${r.name}」${r.before>r.after?'↘':'↗'}${r.before>r.after?r.before-r.after:r.after-r.before}`).join('、')
              : `${yearStartFavorDecay.length} 家宗门`;
            newNotifications.push(createNotification(
              'info', '好感度淡忘',
              `随着时间流逝，昔日恩怨渐被淡忘，${label} 的好感度悄然向中立回归 1 点。`,
              { year, month },
            ));
          }
        }
        
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
        // 注意：必须基于 refreshedOtherSects（已包含本月围攻写入的 truceUntilYear）刷新，
        // 否则会从 state.otherSects 重新计算，把刚写入的停战期丢掉，导致停战期下月失效。
        refreshedOtherSects = refreshSectRelations(refreshedOtherSects);

        // 正邪度影响好感度：低正邪度（karma<0）对所有非敌对/非附庸宗门扣好感
        // —— 总量对齐模式：每个宗门维护 karmaFavorApplied（累计已扣量，负数）
        //    每个月只把它「对齐」到当前应扣的目标总量，diff 才作用到 favorability，
        //    因此不会每月重复扣（不再是累计流失）。
        // 规则：目标扣量 target = floor(karma/10) * 5  当 karma<0；目标 0  当 karma>=0
        //       diff = target - karmaFavorApplied
        //       例：karma 稳定在 -30，则 target=-15，首月从 0→-15（扣 15），之后 diff=0 不再扣
        //           若 karma 从 -30 回升到 -10，target=-10，diff=+5（回升 5）
        //           若 karma 从 -30 跌到 -50，target=-25，diff=-10（再扣 10）
        {
          const targetApplied =
            state.karma < 0 ? Math.floor(state.karma / 10) * 5 : 0; // 应扣的总量
          refreshedOtherSects = refreshedOtherSects.map(s => {
            // 敌对/附庸宗门不受正邪度好感影响（已是对立面）
            if (s.diplomaticStatus === 'rival' || s.diplomaticStatus === 'vassal') {
              // 补齐字段但不应用修正：对齐 applied=0，同时把 base 固定为当前 favorability
              const baseFav = typeof s.baseFavorability === 'number' ? s.baseFavorability : (s.favorability ?? 50);
              return {
                ...s,
                baseFavorability: baseFav,
                karmaFavorApplied: 0,
                favorability: Math.max(0, Math.min(100, baseFav)),
              };
            }
            const baseFav =
              typeof s.baseFavorability === 'number'
                ? s.baseFavorability
                : (s.favorability ?? 50) - (s.karmaFavorApplied ?? 0);
            const prevApplied =
              typeof s.karmaFavorApplied === 'number' ? s.karmaFavorApplied : 0;
            const diff = targetApplied - prevApplied; // 本次变动
            // 基础好感不受正邪度回归/下降影响；若 diff 为正（回升好感），基础好感不变，只放开上限
            const newApplied = targetApplied;
            const clampedFav = Math.max(0, Math.min(100, baseFav + newApplied));
            return {
              ...s,
              baseFavorability: baseFav,
              karmaFavorApplied: newApplied,
              favorability: clampedFav,
            };
          });
        }

        // 同盟断盟校验：好感度低于阈值（50）的同盟宗门自动断盟
        // 正邪度降低导致好感度跌破阈值时，触发断盟并弹窗通知
        {
          const ALLIANCE_FAV_THRESHOLD = 50;
          const brokenAlliances: string[] = [];
          refreshedOtherSects = refreshedOtherSects.map(s => {
            if (s.diplomaticStatus === 'ally' && (s.favorability ?? 50) < ALLIANCE_FAV_THRESHOLD) {
              brokenAlliances.push(s.name);
              return {
                ...s,
                diplomaticStatus: 'neutral' as const,
                relation: 'neutral' as const,
              };
            }
            return s;
          });
          if (brokenAlliances.length > 0) {
            const label = brokenAlliances.map(n => `「${n}」`).join('、');
            newNotifications.push(createNotification(
              'warning', '同盟破裂',
              `由于好感度低于 ${ALLIANCE_FAV_THRESHOLD}，与 ${label} 的同盟自动解除。`,
              { year, month },
            ));
          }
        }

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

        // ===== 自动试炼：每月为空闲弟子匹配可完成的试炼 =====
        // 策略：开启后，遍历 available 试炼（按难度升序、奖励降序），为每个试炼挑选
        //       战力最匹配的空闲弟子（战力 >= requiredPower 优先，至少 >= 0.8 倍避免必败）。
        //       每个弟子每月最多被自动派遣一次，避免冲突。
        if (state.autoTrialEnabled) {
          // 收集空闲弟子（非试炼中、非突破中、非学习秘籍、未离开）
          const idleDisciples = finalDisciples.filter(d =>
            !d.onTrialId && !d.isBreakingThrough && !d.isLearningSecret && d.status !== 'mortal',
          );
          // 已被自动派遣占用的弟子ID集合
          const assignedIds = new Set<string>();
          // 按难度升序（easy→extreme）、同难度按奖励总价值降序排序
          const diffOrder: Record<string, number> = { easy: 0, normal: 1, hard: 2, extreme: 3 };
          const sortedAvail = finalTrials
            .filter(t => t.status === 'available')
            .sort((a, b) => {
              const da = diffOrder[a.difficulty] ?? 9;
              const db = diffOrder[b.difficulty] ?? 9;
              if (da !== db) return da - db;
              // 奖励价值粗略估算：灵石 + 声望*2 + 贡献*0.5
              const va = (a.rewards.spiritStones || 0) + (a.rewards.reputation || 0) * 2 + (a.rewards.contributionPoints || 0) * 0.5;
              const vb = (b.rewards.spiritStones || 0) + (b.rewards.reputation || 0) * 2 + (b.rewards.contributionPoints || 0) * 0.5;
              return vb - va;
            });
          // 标记本轮被派遣的试炼与弟子，最后统一应用
          const dispatchPairs: { trialId: string; discipleId: string }[] = [];
          for (const trial of sortedAvail) {
            if (idleDisciples.length === 0) break;
            // 找出尚未被占用的空闲弟子，按战力降序
            const candidates = idleDisciples
              .filter(d => !assignedIds.has(d.id))
              .map(d => ({ d, power: calculateDiscipleCombatPower(d) }))
              .sort((a, b) => b.power - a.power);
            if (candidates.length === 0) continue;
            // 筛选"能完成"的弟子：战力 >= requiredPower * 0.8（避免必败）
            const minPower = trial.requiredPower * 0.8;
            const qualified = candidates.filter(c => c.power >= minPower);
            // 优先选战力最接近 requiredPower（略高）的弟子，避免浪费高战力
            const pick = qualified.length > 0
              ? qualified.reduce((best, c) => {
                  // 偏好战力刚好覆盖 requiredPower 的弟子
                  const diffC = Math.abs(c.power - trial.requiredPower);
                  const diffBest = Math.abs(best.power - trial.requiredPower);
                  return diffC < diffBest ? c : best;
                })
              : null;
            if (pick) {
              dispatchPairs.push({ trialId: trial.id, discipleId: pick.d.id });
              assignedIds.add(pick.d.id);
            }
          }
          // 应用派遣：更新 finalTrials 与 finalDisciples
          if (dispatchPairs.length > 0) {
            const pairMap = new Map(dispatchPairs.map(p => [p.trialId, p.discipleId]));
            finalTrials = finalTrials.map(t => {
              const did = pairMap.get(t.id);
              if (!did) return t;
              return {
                ...t, status: 'in_progress' as const,
                assignedDiscipleId: did,
                startYear: year, startMonth: month, progress: 0,
              };
            });
            const dispatchedDiscipleIds = new Set(dispatchPairs.map(p => p.discipleId));
            finalDisciples = finalDisciples.map(d =>
              dispatchedDiscipleIds.has(d.id)
                ? (() => {
                  const tid = dispatchPairs.find(p => p.discipleId === d.id)!.trialId;
                  return { ...d, onTrialId: tid };
                })()
                : d,
            );
            if (dispatchPairs.length > 0) {
              trialNotifs.push(createNotification(
                'info', '自动试炼',
                `本月自动派遣 ${dispatchPairs.length} 名弟子执行试炼任务。`,
                { year, month },
              ));
            }
          }
        }

        // 推进进行中试炼的进度
        finalTrials = finalTrials.map(trial => {
          if (trial.status !== 'in_progress' || !trial.assignedDiscipleId) return trial;
          const progressInc = 100 / trial.durationMonths;
          const newProgress = Math.min(100, trial.progress + progressInc);

          // 探索试炼：每月有概率触发遭遇事件
          if (trial.type.startsWith('explore_') && !state.pendingEncounter) {
            const region = getRegionById(trial.type.replace('explore_', ''));
            if (region && Math.random() < region.encounterChance) {
              const encounters = getEncountersByRegion(region.id);
              if (encounters.length > 0) {
                const encounter = encounters[Math.floor(Math.random() * encounters.length)];
                state.pendingEncounter = {
                  id: encounter.id,
                  trialId: trial.id,
                  regionId: region.id,
                  name: encounter.name,
                  description: encounter.description,
                  choices: encounter.choices.map(c => ({
                    label: c.label,
                    description: `成功率 ${Math.round(c.successChance * 100)}%`,
                    successChance: c.successChance,
                    effects: {
                      success: {
                        spiritStones: c.effects.success.spiritStones,
                        reputation: c.effects.success.reputation,
                        herb: c.effects.success.herb,
                        iron: c.effects.success.iron,
                        paper: c.effects.success.paper,
                        specialMaterials: c.effects.success.specialMaterials,
                        notificationText: c.effects.success.notificationText,
                      },
                      failure: {
                        discipleInjury: c.effects.failure.discipleInjury,
                        spiritStones: c.effects.failure.spiritStones,
                        notificationText: c.effects.failure.notificationText,
                      },
                    },
                  })),
                };
              }
            }
          }

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

        // ===== 自动交易（低买高卖）：基于阈值规则，每月批量执行一次 =====
        interface AutoTradeRecord {
          id: string;
          name: string;
          bought: number;
          sold: number;
          cost: number;
          gain: number;
        }
        const autoTradeRecords: AutoTradeRecord[] = [];
        {
          // 读取某 shopItem 当前库存（基于本月累加器，不走 state 因为最终 set 还没执行）
          const getStock = (item: typeof SHOP_ITEMS[number]): number => {
            if (item.pillType)
              return accPillInventory.find(p => p.type === item.pillType)?.quantity ?? 0;
            if (item.artifactType)
              return accArtifactInventory.find(a => a.type === item.artifactType)?.quantity ?? 0;
            if (item.talismanType)
              return accTalismanInventory.find(t => t.type === item.talismanType)?.quantity ?? 0;
            if (item.beastType)
              return newBeastInventory.find(b => b.type === item.beastType)?.quantity ?? 0;
            if (item.materialName)
              return accSpecialMaterials[item.materialName] ?? 0;
            return 0;
          };
          const addStock = (item: typeof SHOP_ITEMS[number]) => {
            if (item.pillType) {
              const idx = accPillInventory.findIndex(p => p.type === item.pillType);
              if (idx >= 0) accPillInventory[idx] = { ...accPillInventory[idx], quantity: accPillInventory[idx].quantity + 1 };
              else accPillInventory.push({ type: item.pillType!, quantity: 1 });
            } else if (item.artifactType) {
              const idx = accArtifactInventory.findIndex(a => a.type === item.artifactType);
              if (idx >= 0) accArtifactInventory[idx] = { ...accArtifactInventory[idx], quantity: accArtifactInventory[idx].quantity + 1 };
              else accArtifactInventory.push({ type: item.artifactType!, quantity: 1 });
            } else if (item.talismanType) {
              const idx = accTalismanInventory.findIndex(t => t.type === item.talismanType);
              if (idx >= 0) accTalismanInventory[idx] = { ...accTalismanInventory[idx], quantity: accTalismanInventory[idx].quantity + 1 };
              else accTalismanInventory.push({ type: item.talismanType!, quantity: 1 });
            } else if (item.beastType) {
              const idx = newBeastInventory.findIndex(b => b.type === item.beastType);
              if (idx >= 0) newBeastInventory[idx] = { ...newBeastInventory[idx], quantity: newBeastInventory[idx].quantity + 1 };
              else newBeastInventory.push({ type: item.beastType!, quantity: 1 });
            } else if (item.materialName) {
              accSpecialMaterials[item.materialName] = (accSpecialMaterials[item.materialName] ?? 0) + 1;
            }
          };
          const removeStock = (item: typeof SHOP_ITEMS[number]) => {
            if (item.pillType) {
              accPillInventory = accPillInventory.map(p =>
                p.type === item.pillType ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p,
              ).filter(p => p.quantity > 0);
            } else if (item.artifactType) {
              accArtifactInventory = accArtifactInventory.map(a =>
                a.type === item.artifactType ? { ...a, quantity: Math.max(0, a.quantity - 1) } : a,
              ).filter(a => a.quantity > 0);
            } else if (item.talismanType) {
              accTalismanInventory = accTalismanInventory.map(t =>
                t.type === item.talismanType ? { ...t, quantity: Math.max(0, t.quantity - 1) } : t,
              ).filter(t => t.quantity > 0);
            } else if (item.beastType) {
              newBeastInventory = newBeastInventory.map(b =>
                b.type === item.beastType ? { ...b, quantity: Math.max(0, b.quantity - 1) } : b,
              ).filter(b => b.quantity > 0);
            } else if (item.materialName) {
              accSpecialMaterials[item.materialName] = Math.max(0, (accSpecialMaterials[item.materialName] ?? 0) - 1);
            }
          };
          const sellPriceOf = (item: typeof SHOP_ITEMS[number]): number =>
            item.sellPrice ?? Math.floor(item.price * 0.5);

          for (const [shopItemId, rule] of Object.entries(state.autoTrade)) {
            if (!rule?.enabled) continue;
            const item = SHOP_ITEMS.find(i => i.id === shopItemId);
            if (!item) continue;
            // 配方类不参与交易（一次性解锁，不支持回收）
            const tradable = !!(item.pillType || item.artifactType || item.talismanType || item.beastType || item.materialName);
            if (!tradable) continue;

            let bought = 0;
            let sold = 0;
            let cost = 0;
            let gain = 0;

            // 低买：库存 < buyBelow 时买入
            if (rule.buyBelow > 0) {
              const maxBuy = Math.max(1, rule.monthlyBuyQty ?? 1);
              for (let i = 0; i < maxBuy; i++) {
                const stock = getStock(item);
                if (stock >= rule.buyBelow) break;
                if (finalSpiritStones < item.price) break;
                finalSpiritStones -= item.price;
                cost += item.price;
                addStock(item);
                bought += 1;
              }
            }

            // 高卖：库存 > sellAbove 时卖出
            if (rule.sellAbove > 0) {
              const maxSell = Math.max(1, rule.monthlySellQty ?? 1);
              for (let i = 0; i < maxSell; i++) {
                const stock = getStock(item);
                if (stock <= rule.sellAbove) break;
                const sp = sellPriceOf(item);
                finalSpiritStones += sp;
                gain += sp;
                removeStock(item);
                sold += 1;
              }
            }

            if (bought > 0 || sold > 0) {
              autoTradeRecords.push({ id: shopItemId, name: item.name, bought, sold, cost, gain });
            }
          }
        }
        if (autoTradeRecords.length > 0) {
          const buySummary = autoTradeRecords
            .filter(r => r.bought > 0)
            .map(r => `「${r.name}」×${r.bought}(-${r.cost}灵石)`)
            .join('、');
          const sellSummary = autoTradeRecords
            .filter(r => r.sold > 0)
            .map(r => `「${r.name}」×${r.sold}(+${r.gain}灵石)`)
            .join('、');
          const totalCost = autoTradeRecords.reduce((s, r) => s + r.cost, 0);
          const totalGain = autoTradeRecords.reduce((s, r) => s + r.gain, 0);
          const netLabel = totalGain - totalCost >= 0 ? `净+${totalGain - totalCost}` : `净${totalGain - totalCost}`;
          const body = [
            buySummary ? `买入：${buySummary}` : null,
            sellSummary ? `卖出：${sellSummary}` : null,
            `合计（${netLabel}灵石）`,
          ].filter(Boolean).join('；');
          newNotifications.push(createNotification(
            'info', '自动交易',
            body,
            { year, month },
          ));
        }

        // 记录本月灵石收支历史（保留最近24条）
        const netIncome = totalSpiritStoneIncome - totalMaintenance;
        const newSpiritStoneHistory = [
          ...state.spiritStoneHistory,
          { year, month, spiritStones: finalSpiritStones, netIncome },
        ].slice(-24);

        // ===== 涌现事件系统：关系网 + 建筑随机事件 + 分支选择 + 灭亡检查 =====
        const monthsNeg = netIncome < 0 ? state.monthsConsecutiveNegative + 1 : 0;
        // 月度炼制进度推进
        const { completedTasks, updatedTasks } = processMonthlyCrafting(
          state.craftingTasks,
          { herbInventory: accHerbs, ironInventory: accIron, paperInventory: accPaper, specialMaterials: accSpecialMaterials },
          activeDisciples,
          currentBuildings,
          Math.random,
        );
        // 完成的炼制任务加入通知
        for (const ct of completedTasks) {
          const qualityName = QualityNames[ct.quality];
          newNotifications.push(createNotification(
            'success',
            '炼制完成',
            `${ct.category === 'pill' ? '丹药' : ct.category === 'artifact' ? '法器' : '符箓'}炼制完成：${RECIPE_MAP[ct.recipeId]?.name ?? ct.itemType} x${ct.quantity}（${qualityName}）${ct.isCritical ? '【暴击】' : ''}`,
            { year, month },
          ));
          // 自动入库
          if (ct.category === 'pill') {
            const idx = finalPillInventory.findIndex(p => p.type === ct.itemType as any);
            if (idx >= 0) finalPillInventory[idx] = { ...finalPillInventory[idx], quantity: finalPillInventory[idx].quantity + ct.quantity };
            else finalPillInventory.push({ type: ct.itemType as any, quantity: ct.quantity });
          } else if (ct.category === 'artifact') {
            const idx = accArtifactInventory.findIndex(a => a.type === ct.itemType as any);
            if (idx >= 0) accArtifactInventory[idx] = { ...accArtifactInventory[idx], quantity: accArtifactInventory[idx].quantity + ct.quantity };
            else accArtifactInventory.push({ type: ct.itemType as any, quantity: ct.quantity });
          } else if (ct.category === 'talisman') {
            const idx = accTalismanInventory.findIndex(t => t.type === ct.itemType as any);
            if (idx >= 0) accTalismanInventory[idx] = { ...accTalismanInventory[idx], quantity: accTalismanInventory[idx].quantity + ct.quantity };
            else accTalismanInventory.push({ type: ct.itemType as any, quantity: ct.quantity });
          }
        }

        const emergentResult = processMonthlyEmergentEvents(
          activeDisciples, currentBuildings, finalSpiritStones, finalReputation, state.karma,
          monthsNeg, { year, month }, createNotification, Math.random,
        );
        // 合并涌现事件通知
        newNotifications.push(...emergentResult.notifications);
        pendingSectHistory.push(...emergentResult.sectHistories);
        // 更新灵石/声望/正邪度
        finalSpiritStones += emergentResult.spiritStoneChange;
        finalReputation += emergentResult.reputationChange;
        // 更新受影响的弟子
        for (const updated of emergentResult.updatedDisciples) {
          const idx = activeDisciples.findIndex(d => d.id === updated.id);
          if (idx >= 0) activeDisciples[idx] = updated;
        }
        // 存入分支选择事件（待处理）
        const pendingChoiceEvent = emergentResult.choiceEvent;

        // 处理连锁事件：检查到期的连锁事件
        const currentMonthTotal = year * 12 + month;
        const { activated: activatedChainEvents, remaining: remainingChainEvents } = processPendingChainEvents(
          state.pendingChainEvents,
          currentMonthTotal,
        );
        for (const chainEvent of activatedChainEvents) {
          const chainNotif = createNotification(
            chainEvent.type === 'auspicious' ? 'success' : 'danger',
            `【连锁】${chainEvent.title}`,
            chainEvent.description,
            { year, month },
          );
          newNotifications.push(chainNotif);
          pendingSectHistory.push({
            id: generateId(),
            date: { year, month },
            type: 'building_event' as SectHistoryEntry['type'],
            title: chainEvent.title,
            description: chainEvent.description,
          });
          if (chainEvent.effects.spiritStoneChange) finalSpiritStones += chainEvent.effects.spiritStoneChange;
          if (chainEvent.effects.reputationChange) finalReputation += chainEvent.effects.reputationChange;
          if (chainEvent.effects.satisfactionChange) {
            const target = activeDisciples[Math.floor(Math.random() * activeDisciples.length)];
            if (target) {
              target.satisfaction = Math.max(0, Math.min(100, target.satisfaction + (chainEvent.effects.satisfactionChange ?? 0)));
            }
          }
        }

        // 生成月度价格波动
        const currentPriceMultipliers = Object.keys(state.priceMultipliers).length > 0
          ? state.priceMultipliers
          : (() => {
              // 首次初始化所有商店物品的价格倍率为 1.0
              const initial: Record<string, number> = {};
              for (const item of SHOP_ITEMS) {
                initial[item.id] = 1.0;
              }
              return initial;
            })();
        const newPriceMultipliers = generatePriceFluctuations(currentPriceMultipliers, finalReputation, Math.random);

        // 宗门气运系统：月度更新
        // 气运自然波动（随机微调 ±1）
        const fortuneDrift = (Math.random() - 0.5) * 2;
        let newSectFortune = Math.max(-100, Math.min(100, state.sectFortune + fortuneDrift));
        // 检测天灾触发
        const calamityTriggered = checkCalamityTrigger(year, state.lastCalamityYear, newSectFortune, Math.random);
        let newActiveCalamity = state.activeCalamity;
        let newCalamityWarnings = [...state.calamityWarnings];
        let newLastCalamityYear = state.lastCalamityYear;
        if (calamityTriggered && !state.activeCalamity) {
          const calamity = generateCalamity(newSectFortune, Math.random);
          if (calamity.warningMonths > 0) {
            // 触发预警
            newCalamityWarnings = [calamity];
            newNotifications.push(createNotification(
              'warning', `【天灾预警】${calamity.warningTitle}`, calamity.warningDescription, { year, month },
            ));
          } else {
            // 直接触发天灾
            newActiveCalamity = calamity;
            newLastCalamityYear = year;
            newNotifications.push(createNotification(
              calamity.type === 'secret_realm_open' ? 'success' : 'danger',
              `【天灾】${calamity.title}`, calamity.description, { year, month },
            ));
            // 应用效果
            if (calamity.effects.spiritStoneChange) finalSpiritStones += calamity.effects.spiritStoneChange;
            if (calamity.effects.reputationChange) finalReputation += calamity.effects.reputationChange;
          }
        }
        // 处理待触发的天灾预警（预警到期后触发）
        const resolvedWarnings: CalamityEvent[] = [];
        for (const warning of newCalamityWarnings) {
          // 预警到期：预警月数后触发
          newNotifications.push(createNotification(
            warning.type === 'secret_realm_open' ? 'success' : 'danger',
            `【天灾降临】${warning.title}`, warning.description, { year, month },
          ));
          newActiveCalamity = warning;
          newLastCalamityYear = year;
          resolvedWarnings.push(warning);
          // 应用效果
          if (warning.effects.spiritStoneChange) finalSpiritStones += warning.effects.spiritStoneChange;
          if (warning.effects.reputationChange) finalReputation += warning.effects.reputationChange;
        }
        newCalamityWarnings = newCalamityWarnings.filter(w => !resolvedWarnings.includes(w));

        // 灭亡检查（暂不处理，存到状态中让 UI 展示）
        const collapseState = {
          collapsed: emergentResult.collapsed,
          collapseReason: emergentResult.collapseReason,
        };

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
          libraryBooks: libraryBooksAfter,
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
          sectHistory: [...pendingSectHistory, ...state.sectHistory].slice(0, 200),
          // 炼制任务状态
          craftingTasks: updatedTasks,
          // 涌现事件状态
          choiceEvent: pendingChoiceEvent,
          pendingChainEvents: remainingChainEvents,
          pendingEncounter: state.pendingEncounter,
          monthsConsecutiveNegative: monthsNeg,
          sectCollapsed: collapseState.collapsed,
          sectCollapseReason: collapseState.collapseReason,
          // 价格波动
          priceMultipliers: newPriceMultipliers,
          // 气运状态
          sectFortune: newSectFortune,
          activeCalamity: newActiveCalamity,
          calamityWarnings: newCalamityWarnings,
          lastCalamityYear: newLastCalamityYear,
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

        const historyEntry: SectHistoryEntry = {
          id: generateId(),
          date: { year: state.year, month: state.month },
          type: 'building_upgrade',
          title: '建筑升级',
          description: `${BuildingTypeNames[building.type]} Lv.${building.level} → Lv.${newLevel}，消耗 ${upgradeCost.spiritStones} 灵石${needReputation > 0 ? `、${needReputation} 声望` : ''}。`,
        };

        set(state => ({
          spiritStones: state.spiritStones - upgradeCost.spiritStones,
          reputation: state.reputation - needReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
          sectHistory: [historyEntry, ...state.sectHistory].slice(0, 200),
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
      
      recruitDisciple: (opts) => {
        const state = get();
        // 固定规则：首次打开生成候选、以及「换一批」刷新候选都扣 50 灵石；招入免费
        const FIXED_COST = 50;
        // 灵石不足：拒绝生成/刷新候选（返回空数组，UI 会显示无候选）
        if (state.spiritStones < FIXED_COST) {
          return { candidates: [], costPerDisciple: FIXED_COST };
        }
        // 按招收规则生成 3~5 名候选弟子
        const rule = state.promotionRules.recruitment;
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
        // 首次打开 & 刷新都扣 50 灵石；招入时免费
        set({
          recruitCandidates: candidates,
          recruitCostPerDisciple: FIXED_COST,
          recruitRefreshCost: FIXED_COST,
          spiritStones: state.spiritStones - FIXED_COST,
        });
        return { candidates, costPerDisciple: FIXED_COST };
      },

      // 确认招收候选弟子（不再扣灵石，灵石费已在生成候选时一次性扣除）
      recruitConfirmDisciple: (candidate) => {
        const state = get();
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
          // 招入时免费：灵石已在生成/刷新候选列表时一次性扣除
          recruitCandidates: state.recruitCandidates.filter(c => c.id !== candidate.id),
          notifications: [joinNotif, ...state.notifications].slice(0, 50),
        }));
        return { ok: true };
      },

      // 清空招收候选
      clearRecruitCandidates: () => {
        set({ recruitCandidates: [], recruitCostPerDisciple: 50, recruitRefreshCost: 50 });
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

      // ===== 藏经阁推演：手动开始/取消推演 =====
      startDeducingBook: (discipleId: string, type: BookType, tierOverride?: BookTier) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { success: false, reason: '弟子不存在' };
        // 必须是藏经阁分配弟子（或长老/核心在藏经阁）
        const assigned = state.buildings.find(
          b => b.type === 'secret_library' && b.status === 'active' && b.assignedDisciples.includes(discipleId),
        );
        const library = assigned ?? state.buildings.find(b => b.type === 'secret_library' && b.status === 'active');
        if (!library) return { success: false, reason: '藏经阁尚未启用' };
        if (!assigned && disciple.status !== 'elder' && disciple.status !== 'core') {
          return { success: false, reason: '弟子未分配至藏经阁，无法进行推演' };
        }
        if (disciple.learningBook) return { success: false, reason: '正在学习秘籍，请等学成后再推演' };
        if (disciple.deducingBook) return { success: false, reason: `当前正在推演《${disciple.deducingBook.name}》` };
        const realmIdx = RealmOrder.indexOf(disciple.realm);
        if (realmIdx < RealmOrder.indexOf('qi')) return { success: false, reason: '凡人无法推演秘籍' };
        const tier = tierOverride ?? getMaxDeduceTier(disciple.realm, library.level);
        const tiers: BookTier[] = ['qi', 'foundation', 'golden', 'nascent'];
        const libraryMaxTier = tiers[Math.min(Math.max(1, library.level) - 1, 3)];
        if (tiers.indexOf(tier) > tiers.indexOf(libraryMaxTier)) {
          return { success: false, reason: `藏经阁仅 Lv.${library.level}，最高可推演 ${BookTierNames[libraryMaxTier]}` };
        }
        const deducing = createDeducingBook(disciple, type, tier, library.level);
        set({
          disciples: state.disciples.map(d =>
            d.id === discipleId ? { ...d, deducingBook: deducing } : d,
          ),
        });
        return { success: true, reason: `已开启推演《${deducing.name}》` };
      },

      cancelDeducingBook: (discipleId: string): boolean => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple || !disciple.deducingBook) return false;
        set({
          disciples: state.disciples.map(d =>
            d.id === discipleId ? { ...d, deducingBook: null } : d,
          ),
        });
        return true;
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

        // 首次晋升时提示选择流派
        let schoolNotification: Notification | null = null;
        if (!state.sectSchool) {
          schoolNotification = createNotification(
            'info',
            '选择宗门流派',
            '宗门已晋升，可在宗务面板选择宗门流派（剑修/丹修/阵修/器修/均衡），获得流派专属加成！',
            currentDate,
          );
        }

        const historyEntry: SectHistoryEntry = {
          id: generateId(),
          date: currentDate,
          type: 'sect_promote',
          title: '宗门晋升',
          description: `宗门由「${SectLevelNames[state.sectLevel]}」晋升为「${SectLevelNames[nextLevel]}」，消耗 ${req.promotionCost} 灵石${req.promotionContribution ? `、${req.promotionContribution} 贡献` : ''}。`,
        };

        set({
          sectLevel: nextLevel,
          spiritStones: newSpiritStones,
          sectContribution: Math.max(0, newContribution),
          notifications: [
            ...(schoolNotification ? [schoolNotification] : []),
            promotionNotification,
            ...state.notifications,
          ].slice(0, 50),
          sectHistory: [historyEntry, ...state.sectHistory].slice(0, 200),
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
          // 手动改好感度 = 改 baseFavorability；karmaFavorApplied 保持，favorability 重新钳制
          const baseFav =
            typeof sect.baseFavorability === 'number'
              ? sect.baseFavorability
              : (sect.favorability ?? 50) - (sect.karmaFavorApplied ?? 0);
          const applied =
            typeof sect.karmaFavorApplied === 'number' ? sect.karmaFavorApplied : 0;
          const newBase = Math.max(0, Math.min(100, baseFav + delta));
          return {
            ...sect,
            baseFavorability: newBase,
            karmaFavorApplied: applied,
            favorability: Math.max(0, Math.min(100, newBase + applied)),
          };
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
        // 开启交易：扣 50 灵石，开通后维持交易关系；提醒玩家可在合适时机手动结束获取一次性收益
        if (!sect.tradeActive) {
          const cost = 50;
          if (state.spiritStones < cost) return false;
          const newSects = state.otherSects.map(s =>
            s.id === sectId ? { ...s, tradeActive: true } : s,
          );
          const openNotif = createNotification(
            'info', '交易开启',
            `已与「${sect.name}」建立交易通道（消耗 50 灵石）。结束时将按对方战力一次性获得少量灵石与 1 点声望，请在合适时机手动结束。`,
            { year: state.year, month: state.month },
          );
          set({
            otherSects: newSects,
            spiritStones: state.spiritStones - cost,
            notifications: [openNotif, ...state.notifications].slice(0, 50),
          });
          return true;
        } else {
          // 结束交易：收益 = 对方战力 ×0.3% + 5（最低 5）；声望 +1
          const income = Math.max(5, Math.floor(sect.combatPower * 0.003) + 5);
          const repGain = 1;
          const newSects = state.otherSects.map(s =>
            s.id === sectId ? { ...s, tradeActive: false } : s,
          );
          const closeNotif = createNotification(
            'success', '交易结算',
            `与「${sect.name}」的交易圆满结束，本次获利 ${income} 灵石、${repGain} 点声望。`,
            { year: state.year, month: state.month },
          );
          set({
            otherSects: newSects,
            spiritStones: state.spiritStones + income,
            reputation: state.reputation + repGain,
            notifications: [closeNotif, ...state.notifications].slice(0, 50),
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

      toggleAutoTrial: () => {
        const state = get();
        set({ autoTrialEnabled: !state.autoTrialEnabled });
      },

      // ===== 外交系统优化 =====
      // 注：所有主动互动（赠送/侮辱/同盟/宿敌/讨伐）每宗门每年只能执行一次，
      // 由 checkSectInteraction 统一校验，并在成功后写入 lastInteractionYear。
      giftSpiritStonesToSect: (sectId, amount) => {
        const state = get();
        if (amount <= 0) return { ok: false, reason: '赠送数量必须大于0' };
        if (state.spiritStones < amount) return { ok: false, reason: '灵石不足' };
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        // 年度互动校验
        if (sect.lastInteractionYear === state.year) {
          return { ok: false, reason: `今年已与「${sect.name}」互动过，每年仅可互动一次` };
        }
        // 每 50 灵石 +5 好感，上限 +20
        const favGain = Math.min(20, Math.floor(amount / 50) * 5);
        // 手动改好感：增量加在 baseFavorability，karmaFavorApplied 保留
        const giftBase =
          typeof sect.baseFavorability === 'number' ? sect.baseFavorability : (sect.favorability ?? 50) - (sect.karmaFavorApplied ?? 0);
        const giftApplied = typeof sect.karmaFavorApplied === 'number' ? sect.karmaFavorApplied : 0;
        const newGiftBase = Math.min(100, giftBase + favGain);
        const newGiftFav = Math.max(0, Math.min(100, newGiftBase + giftApplied));
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
            s.id === sectId ? { ...s, baseFavorability: newGiftBase, karmaFavorApplied: giftApplied, favorability: newGiftFav, lastInteractionYear: st.year } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
        return { ok: true };
      },

      insultSect: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return;
        // 年度互动校验
        if (sect.lastInteractionYear === state.year) {
          const st = get();
          const notif = createNotification(
            'warning', '互动受限',
            `今年已与「${sect.name}」互动过，每年仅可互动一次。`,
            { year: st.year, month: st.month },
          );
          set({ notifications: [notif, ...state.notifications].slice(0, 50) });
          return;
        }
        const insultBase =
          typeof sect.baseFavorability === 'number' ? sect.baseFavorability : (sect.favorability ?? 50) - (sect.karmaFavorApplied ?? 0);
        const insultApplied = typeof sect.karmaFavorApplied === 'number' ? sect.karmaFavorApplied : 0;
        const newInsultBase = Math.max(0, insultBase - 15);
        const newInsultFav = Math.max(0, Math.min(100, newInsultBase + insultApplied));
        const st = get();
        const notif = createNotification(
          'warning', '侮辱宗门',
          `你当众羞辱了「${sect.name}」，好感度 -15，对方对此铭记于心。`,
          { year: st.year, month: st.month },
        );
        set({
          karma: Math.max(-100, state.karma - 5),
          otherSects: state.otherSects.map(s =>
            s.id === sectId ? { ...s, baseFavorability: newInsultBase, karmaFavorApplied: insultApplied, favorability: newInsultFav, relation: newInsultFav < 30 ? 'hostile' : s.relation, lastInteractionYear: st.year } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
      },

      requestAlliance: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        // 年度互动校验
        if (sect.lastInteractionYear === state.year) {
          return { ok: false, reason: `今年已与「${sect.name}」互动过，每年仅可互动一次` };
        }
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
            s.id === sectId ? { ...s, diplomaticStatus: 'ally' as const, relation: 'ally' as const, lastInteractionYear: st.year } : s,
          ),
          notifications: [notif, ...state.notifications].slice(0, 50),
        });
        return { ok: true };
      },

      declareRivalry: (sectId) => {
        const state = get();
        const sect = state.otherSects.find(s => s.id === sectId);
        if (!sect) return { ok: false, reason: '宗门不存在' };
        // 年度互动校验
        if (sect.lastInteractionYear === state.year) {
          return { ok: false, reason: `今年已与「${sect.name}」互动过，每年仅可互动一次` };
        }
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
            s.id === sectId ? { ...s, diplomaticStatus: 'rival' as const, relation: 'hostile' as const, lastInteractionYear: st.year } : s,
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
        // 年度互动校验
        if (sect.lastInteractionYear === state.year) {
          return { ok: false, reason: `今年已与「${sect.name}」互动过，每年仅可互动一次` };
        }
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
            `本宗击败「${sect.name}」，对方俯首称臣成为附庸！获得 100 灵石、10 声望。`,
            { year: st.year, month: st.month },
          );
          const historyEntry: SectHistoryEntry = {
            id: generateId(),
            date: { year: st.year, month: st.month },
            type: 'war_victory',
            title: '讨伐附庸',
            description: `击败「${sect.name}」并将其收为附庸，获得 100 灵石、10 声望。`,
          };
          // 收为附庸：好感+20（改基础好感），附庸不参与正邪度好感修正（下月会重置 karmaFavorApplied=0）
          const vassBase =
            typeof sect.baseFavorability === 'number' ? sect.baseFavorability : (sect.favorability ?? 50) - (sect.karmaFavorApplied ?? 0);
          const vassApplied = typeof sect.karmaFavorApplied === 'number' ? sect.karmaFavorApplied : 0;
          const newVassBase = Math.min(100, vassBase + 20);
          const newVassFav = Math.max(0, Math.min(100, newVassBase + vassApplied));
          set({
            karma: Math.max(-100, state.karma - 15),
            spiritStones: state.spiritStones + 100,
            reputation: state.reputation + 10,
            otherSects: state.otherSects.map(s =>
              s.id === sectId ? { ...s, diplomaticStatus: 'vassal' as const, baseFavorability: newVassBase, karmaFavorApplied: vassApplied, favorability: newVassFav, lastInteractionYear: st.year } : s,
            ),
            notifications: [notif, ...state.notifications].slice(0, 50),
            sectHistory: [historyEntry, ...state.sectHistory].slice(0, 200),
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
          // 失败：好感-20（改基础好感），变为敌对
          const failBase =
            typeof sect.baseFavorability === 'number' ? sect.baseFavorability : (sect.favorability ?? 50) - (sect.karmaFavorApplied ?? 0);
          const failApplied = typeof sect.karmaFavorApplied === 'number' ? sect.karmaFavorApplied : 0;
          const newFailBase = Math.max(0, failBase - 20);
          const newFailFav = Math.max(0, Math.min(100, newFailBase + failApplied));
          set({
            spiritStones: Math.max(0, state.spiritStones - loss),
            reputation: Math.max(0, state.reputation - 5),
            karma: Math.max(-100, state.karma - 10),
            otherSects: state.otherSects.map(s =>
              s.id === sectId ? { ...s, relation: 'hostile' as const, baseFavorability: newFailBase, karmaFavorApplied: failApplied, favorability: newFailFav, lastInteractionYear: st.year } : s,
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

      // 宗门传承：选择流派（首次晋升时触发）
      selectSchool: (school: SectSchool) => {
        const state = get();
        if (state.sectSchool) return; // 已选择过流派，不可更改
        set({ sectSchool: school });
      },

      // 宗门传承：解锁天赋节点
      unlockTalent: (talentId: string) => {
        const state = get();
        if (!state.sectSchool) return { ok: false, reason: '请先选择宗门流派' };
        if (state.unlockedTalents.includes(talentId)) return { ok: false, reason: '该天赋已解锁' };
        const tree = SCHOOL_TALENT_TREES[state.sectSchool];
        const talent = tree.find(t => t.id === talentId);
        if (!talent) return { ok: false, reason: '天赋节点不存在' };
        // 检查前置节点
        for (const prereq of talent.prerequisites) {
          if (!state.unlockedTalents.includes(prereq)) return { ok: false, reason: '前置天赋未解锁' };
        }
        // 检查消耗
        if ((state.sectContribution || 0) < talent.contributionCost) return { ok: false, reason: '宗门贡献不足' };
        if (state.spiritStones < talent.spiritStoneCost) return { ok: false, reason: '灵石不足' };
        set({
          sectContribution: (state.sectContribution || 0) - talent.contributionCost,
          spiritStones: state.spiritStones - talent.spiritStoneCost,
          unlockedTalents: [...state.unlockedTalents, talentId],
        });
        return { ok: true, reason: '' };
      },

      // 宗门扩张：每次扩张增加 5% 全局产出加成（含灵石、灵草、材料、声望等）
      expandSect: () => {
        const state = get();
        const cost = calculateExpansionCost(state.expansionCount);
        if (state.spiritStones < cost) return { ok: false, reason: `灵石不足，需要 ${cost} 灵石` };
        const newCount = state.expansionCount + 1;
        set({
          spiritStones: state.spiritStones - cost,
          expansionCount: newCount,
        });
        return { ok: true, cost, newCapacity: newCount };
      },

      // 发放弟子福利
      distributeWelfare: (generosityLevel: number) => {
        const state = get();
        const activeCount = state.disciples.filter(d => d.status !== 'mortal').length;
        const { cost, satisfactionGain } = calculateDiscipleWelfareCost(activeCount, generosityLevel);
        if (state.spiritStones < cost) return { ok: false, reason: `灵石不足，需要 ${cost} 灵石` };
        const updatedDisciples = state.disciples.map(d => ({
          ...d,
          satisfaction: Math.min(100, d.satisfaction + satisfactionGain),
        }));
        set({
          spiritStones: state.spiritStones - cost,
          disciples: updatedDisciples,
          notifications: [
            createNotification('success', '弟子福利', `发放了价值 ${cost} 灵石的福利，全体弟子满意度 +${satisfactionGain}。`, { year: state.year, month: state.month }),
            ...state.notifications,
          ].slice(0, 50),
        });
        return { ok: true, cost, satisfactionGain };
      },

      // 设置某物品自动交易规则（buyBelow=0 表示关闭自动买，sellAbove=0 表示关闭自动卖，qty<1 会被钳制到 1）
      setAutoTradeRule: (shopItemId: string, rule: Partial<AutoTradeRule>) => {
        set(state => {
          const prev: AutoTradeRule = state.autoTrade[shopItemId] ?? {
            enabled: false, buyBelow: 0, sellAbove: 0, monthlyBuyQty: 1, monthlySellQty: 1,
          };
          const next: AutoTradeRule = {
            ...prev,
            ...rule,
            monthlyBuyQty: Math.max(1, rule.monthlyBuyQty ?? prev.monthlyBuyQty ?? 1),
            monthlySellQty: Math.max(1, rule.monthlySellQty ?? prev.monthlySellQty ?? 1),
            buyBelow: Math.max(0, Math.floor(rule.buyBelow ?? prev.buyBelow ?? 0)),
            sellAbove: Math.max(0, Math.floor(rule.sellAbove ?? prev.sellAbove ?? 0)),
          };
          return { autoTrade: { ...state.autoTrade, [shopItemId]: next } };
        });
      },
      toggleAutoTrade: (shopItemId: string, enabled: boolean) => {
        set(state => {
          const prev: AutoTradeRule = state.autoTrade[shopItemId] ?? {
            enabled: false, buyBelow: 0, sellAbove: 0, monthlyBuyQty: 1, monthlySellQty: 1,
          };
          return { autoTrade: { ...state.autoTrade, [shopItemId]: { ...prev, enabled } } };
        });
      },

      // 炼制系统
      startCrafting: (recipeId: string, category: 'pill' | 'artifact' | 'talisman', itemType: string, discipleId: string | null, quantity: number) => {
        const state = get();
        const recipe = RECIPE_MAP[recipeId];
        if (!recipe) return { success: false, reason: '配方不存在' };
        // 检查解锁状态
        if (category === 'pill' && !state.unlockedPillRecipes.includes(itemType as any)) return { success: false, reason: '丹方未解锁' };
        if (category === 'artifact' && !state.unlockedArtifactRecipes.includes(itemType as any)) return { success: false, reason: '图谱未解锁' };
        if (category === 'talisman' && !state.unlockedTalismanRecipes.includes(itemType as any)) return { success: false, reason: '符谱未解锁' };

        const task = createCraftingTaskLogic(recipeId, category, itemType, discipleId, quantity, {
          herbInventory: state.herbInventory,
          ironInventory: state.ironInventory,
          paperInventory: state.paperInventory,
          specialMaterials: { ...state.specialMaterials },
        });

        if (!task) return { success: false, reason: '材料不足' };

        set({
          craftingTasks: [...state.craftingTasks, task],
          herbInventory: state.herbInventory,
          ironInventory: state.ironInventory,
          paperInventory: state.paperInventory,
          specialMaterials: state.specialMaterials,
        });
        return { success: true };
      },

      cancelCrafting: (taskId: string) => {
        set(state => ({
          craftingTasks: state.craftingTasks.filter(t => t.id !== taskId),
        }));
      },

      collectCraftingResult: (taskId: string) => {
        set(state => {
          const task = state.craftingTasks.find(t => t.id === taskId);
          if (!task || task.status !== 'completed') return state;
          // 将成品加入库存
          const resultQuality = task.resultQuality ?? 'mortal';
          if (task.category === 'pill') {
            const inv = [...state.pillInventory];
            const idx = inv.findIndex(p => p.type === task.itemType as any);
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + task.quantity };
            else inv.push({ type: task.itemType as any, quantity: task.quantity });
            return { craftingTasks: state.craftingTasks.filter(t => t.id !== taskId), pillInventory: inv };
          } else if (task.category === 'artifact') {
            const inv = [...state.artifactInventory];
            const idx = inv.findIndex(a => a.type === task.itemType as any);
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + task.quantity };
            else inv.push({ type: task.itemType as any, quantity: task.quantity });
            return { craftingTasks: state.craftingTasks.filter(t => t.id !== taskId), artifactInventory: inv };
          } else if (task.category === 'talisman') {
            const inv = [...state.talismanInventory];
            const idx = inv.findIndex(t => t.type === task.itemType as any);
            if (idx >= 0) inv[idx] = { ...inv[idx], quantity: inv[idx].quantity + task.quantity };
            else inv.push({ type: task.itemType as any, quantity: task.quantity });
            return { craftingTasks: state.craftingTasks.filter(t => t.id !== taskId), talismanInventory: inv };
          }
          return { craftingTasks: state.craftingTasks.filter(t => t.id !== taskId) };
        });
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
              // 丹药类：从丹药配置读取实际效果
              const pillCfg = PILL_CONFIGS[itemType as PillType];
              if (pillCfg) {
                if (pillCfg.breakthroughBonus > 0) {
                  patch.breakthroughBonus = (d.breakthroughBonus || 0) + pillCfg.breakthroughBonus;
                }
                if (pillCfg.lifespanBonus && pillCfg.lifespanBonus > 0) {
                  patch.maxAge = (d.maxAge || 0) + pillCfg.lifespanBonus;
                }
                // 回灵丹：恢复修为进度
                if (itemType === 'recovery_pill') {
                  const bkReq = getStageBreakthroughRequired(d.realm, d.realmStage);
                  patch.realmProgress = Math.min(bkReq, (d.realmProgress || 0) + 50);
                }
              }
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
              // 丹药类：从丹药配置读取实际效果
              const pillCfg = PILL_CONFIGS[itemType as PillType];
              if (pillCfg) {
                if (pillCfg.breakthroughBonus > 0) {
                  patch.breakthroughBonus = (d.breakthroughBonus || 0) + pillCfg.breakthroughBonus;
                }
                if (pillCfg.lifespanBonus && pillCfg.lifespanBonus > 0) {
                  patch.maxAge = (d.maxAge || 0) + pillCfg.lifespanBonus;
                }
                // 回灵丹：恢复修为进度
                if (itemType === 'recovery_pill') {
                  const bkReq = getStageBreakthroughRequired(d.realm, d.realmStage);
                  patch.realmProgress = Math.min(bkReq, (d.realmProgress || 0) + 50);
                }
              }
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

          // 灵兽寿命加成：装备时增加，卸下旧灵兽时扣除
          let lifespanDelta = 0;
          if (slot === 'beast') {
            if (oldEquipped) {
              const oldBeastCfg = BEAST_CONFIGS[oldEquipped as BeastType];
              lifespanDelta -= oldBeastCfg?.lifespanBonus ?? 0;
            }
            const newBeastCfg = BEAST_CONFIGS[type as BeastType];
            lifespanDelta += newBeastCfg?.lifespanBonus ?? 0;
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
                    ...(lifespanDelta !== 0 ? { maxAge: d.maxAge + lifespanDelta } : {}),
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

          // 灵兽寿命加成：卸下时扣除
          let lifespanDelta = 0;
          if (slot === 'beast' && oldEquipped) {
            const oldBeastCfg = BEAST_CONFIGS[oldEquipped as BeastType];
            lifespanDelta -= oldBeastCfg?.lifespanBonus ?? 0;
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
                    ...(lifespanDelta !== 0 ? { maxAge: d.maxAge + lifespanDelta } : {}),
                  }
                : d
            ),
          };
        });
      },

      // 弟子背包：从宗门仓库转移物品到弟子背包
      giveItemToDisciple: (discipleId, kind, itemType, quantity = 1) => {
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
        if (!item || item.quantity < quantity) return { ok: false, reason: '物品库存不足' };

        set(state => {
          const newInv = (state[invKey!] as any[]).map(i =>
            i.type === itemType ? { ...i, quantity: Math.max(0, i.quantity - quantity) } : i
          );
          const nextDisciples = state.disciples.map(d => {
            if (d.id !== discipleId) return d;
            const bp = d.backpack ? [...d.backpack] : [];
            const existing = bp.find(b => b.kind === kind && b.itemType === itemType);
            if (existing) {
              existing.quantity += quantity;
            } else {
              bp.push({ kind, itemType, quantity });
            }
            return { ...d, backpack: bp };
          });
          return { [invKey!]: newInv, disciples: nextDisciples } as any;
        });
        return { ok: true };
      },

      // 弟子背包：从弟子背包取回物品到宗门仓库
      takeItemFromDisciple: (discipleId, kind, itemType, quantity = 1) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        const bpItem = disciple.backpack?.find(b => b.kind === kind && b.itemType === itemType);
        if (!bpItem || bpItem.quantity < quantity) return { ok: false, reason: '弟子背包物品不足' };

        // 判断是否为原材料：kind='artifact' 且 itemType 前缀 "material:"
        const isMaterial = kind === 'artifact' && String(itemType).startsWith('material:');
        const materialName = isMaterial ? String(itemType).slice('material:'.length) : '';
        const isHerb = materialName === '灵草';
        const isIron = materialName === '玄铁' || materialName === '灵铁' || materialName === '矿石';
        const isPaper = materialName === '灵纸' || materialName === '符纸';

        if (!isMaterial) {
          let invKey: 'pillInventory' | 'artifactInventory' | 'talismanInventory' | 'beastInventory' | null = null;
          if (kind === 'pill') invKey = 'pillInventory';
          else if (kind === 'artifact') invKey = 'artifactInventory';
          else if (kind === 'talisman') invKey = 'talismanInventory';
          else if (kind === 'beast') invKey = 'beastInventory';
          if (!invKey) return { ok: false, reason: '未知物品类型' };

          set(state => {
            const newInv = addItem(state[invKey!] as any[], itemType as any);
            const nextDisciples = state.disciples.map(d => {
              if (d.id !== discipleId) return d;
              const bp = (d.backpack || []).map(b => {
                if (b.kind === kind && b.itemType === itemType) {
                  return { ...b, quantity: b.quantity - quantity };
                }
                return b;
              }).filter(b => b.quantity > 0);
              return { ...d, backpack: bp };
            });
            return { [invKey!]: newInv, disciples: nextDisciples } as any;
          });
        } else {
          // 原材料：返回到对应基础/特殊材料库存
          set(state => {
            const patch: any = {};
            if (isHerb) patch.herbInventory = state.herbInventory + quantity;
            else if (isIron) patch.ironInventory = state.ironInventory + quantity;
            else if (isPaper) patch.paperInventory = state.paperInventory + quantity;
            else patch.specialMaterials = { ...state.specialMaterials, [materialName]: (state.specialMaterials[materialName] ?? 0) + quantity };
            const nextDisciples = state.disciples.map(d => {
              if (d.id !== discipleId) return d;
              const bp = (d.backpack || []).map(b => {
                if (b.kind === kind && b.itemType === itemType) {
                  return { ...b, quantity: b.quantity - quantity };
                }
                return b;
              }).filter(b => b.quantity > 0);
              return { ...d, backpack: bp };
            });
            return { ...patch, disciples: nextDisciples };
          });
        }
        return { ok: true };
      },

      // 弟子用贡献兑换原材料（基础或特殊），转移到弟子背包
      exchangeMaterialByDisciple: (discipleId, materialName, quantity, contributionCost) => {
        const state = get();
        const disciple = state.disciples.find(d => d.id === discipleId);
        if (!disciple) return { ok: false, reason: '弟子不存在' };
        if (quantity < 1) return { ok: false, reason: '数量必须大于 0' };
        if ((disciple.contributionPoints || 0) < contributionCost) return { ok: false, reason: '贡献值不足' };

        // 确定材料类型与库存
        const isHerb = materialName === '灵草';
        const isIron = materialName === '玄铁' || materialName === '灵铁' || materialName === '矿石';
        const isPaper = materialName === '灵纸' || materialName === '符纸';

        let stock = 0;
        if (isHerb) stock = state.herbInventory;
        else if (isIron) stock = state.ironInventory;
        else if (isPaper) stock = state.paperInventory;
        else stock = state.specialMaterials[materialName] ?? 0;
        if (stock < quantity) return { ok: false, reason: '仓库原材料不足' };

        set(state => {
          const newBalance = (disciple.contributionPoints || 0) - contributionCost;
          const patch: any = { contributionPoints: newBalance };

          // 扣减原材料库存
          if (isHerb) patch.herbInventory = Math.max(0, state.herbInventory - quantity);
          else if (isIron) patch.ironInventory = Math.max(0, state.ironInventory - quantity);
          else if (isPaper) patch.paperInventory = Math.max(0, state.paperInventory - quantity);
          else patch.specialMaterials = { ...state.specialMaterials, [materialName]: Math.max(0, (state.specialMaterials[materialName] ?? 0) - quantity) };

          // 添加到弟子背包：用 kind='artifact' 存为特殊背包项目以复用现有 backpack 展示
          const nextDisciples = state.disciples.map(d => {
            if (d.id !== discipleId) return d;
            const bp = d.backpack ? [...d.backpack] : [];
            const existing = bp.find(b => b.kind === 'artifact' && b.itemType === `material:${materialName}`);
            if (existing) {
              existing.quantity += quantity;
            } else {
              bp.push({ kind: 'artifact', itemType: `material:${materialName}`, quantity });
            }
            return { ...d, ...patch, backpack: bp };
          });

          // 贡献流水
          const logEntry: ContributionLog = {
            id: generateId(),
            discipleId,
            date: { year: state.year, month: state.month },
            type: 'deduct',
            amount: -contributionCost,
            balance: newBalance,
            description: `兑换原材料「${materialName}」×${quantity}，扣除 ${contributionCost} 贡献`,
          };
          return { ...patch, disciples: nextDisciples, contributionLogs: [logEntry, ...state.contributionLogs].slice(0, 5000) };
        });
        const st = get();
        const notif = createNotification(
          'info',
          '弟子兑换原材料',
          `${disciple.name} 花费 ${contributionCost} 贡献兑换「${materialName}」×${quantity}，前往堂口炼制`,
          { year: st.year, month: st.month }
        );
        set(state => ({ notifications: [notif, ...state.notifications].slice(0, 50) }));
        return { ok: true };
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
        if (!state.sectHistory) state.sectHistory = [];
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
        // 补齐 autoTrialEnabled（旧存档没有此字段）
        if (typeof state.autoTrialEnabled !== 'boolean') {
          state.autoTrialEnabled = false;
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
            // v9+：藏经阁推演任务与学习字段兜底
            learningBook: d.learningBook ?? null,
            deducingBook: d.deducingBook ?? null,
            learnedTechnique: d.learnedTechnique ?? null,
            learnedBattles: d.learnedBattles ?? [],
            learnedSecrets: d.learnedSecrets ?? [],
          }));
        }
        if (state.otherSects) {
          state.otherSects = state.otherSects.map((s: any) => ({
            ...s,
            favorability: s.favorability ?? 50,
            diplomaticStatus: s.diplomaticStatus ?? 'neutral',
            tradeActive: s.tradeActive ?? false,
            truceUntilYear: s.truceUntilYear ?? null,
            lastInteractionYear: s.lastInteractionYear ?? null,
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
