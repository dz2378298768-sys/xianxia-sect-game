import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Disciple, PromotionRules } from '@/types/disciple';
import { DiscipleStatusNames, RealmNames, RealmOrder } from '@/types/disciple';
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
import type { SectLevel, MonthlyReport, Notification, OtherSect, DiplomaticStatus } from '@/types/game';
import {
  SectLevelNames, SectLevelRequirementsMap, SectLevelOrder,
  SectLevelDiscipleCap, SectLevelReputationCap, ReputationGrowthConfig,
} from '@/types/game';
import {
  createInitialDisciple, createInitialBuildings, getDefaultPromotionRules, autoAssignBuilding,
  autoAssignResidence, getResidenceUpgradeCost, getResidenceCapacityByLevel, monthlyReassign,
  autoAssignManagers, autoLearnTechniqueOnBreakthrough,
  getMaintenanceCostByLevel, calculateLectureBonus,
} from '@/utils/gameLogic';
import {
  calculateBuildingMaintenance,
  calculateBuildingOutput,
  calculateSectCombatPower,
  processMonthlyCultivation,
  processMonthlyWork,
  processMonthlyLearning,
  canAttemptBreakthrough,
  attemptBreakthrough,
  generateMonthlyReport,
  createNotification,
} from '@/utils/gameLogic';
import { randomInt } from '@/utils/random';
import { recomputeCultivationSpeed, applySatisfactionPenalty, recomputeLifespan } from '@/domain/balance';
import { generateOtherSects, refreshSectRelations } from '@/utils/worldGenerator';
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

interface GameState {
  year: number;
  month: number;
  sectName: string;
  sectLevel: SectLevel;
  reputation: number;
  sectContribution: number; // 宗门贡献池：用于建筑升级等宗门级消耗
  spiritStones: number;
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
  herbInventory: number;
  ironInventory: number;    // 灵铁（炼器堂原料）
  paperInventory: number;   // 符纸（符堂原料）
  gameStarted: boolean;
  showMainMenu: boolean;
  libraryBooks: BookConfig[]; // 藏经阁拥有的书籍
  libraryCosts: Record<BookTier, number>; // 每层藏经阁学习消耗贡献点
  otherSects: OtherSect[]; // 天下其他宗门
  followedDiscipleIds: string[]; // 关注的弟子ID列表
  // 大比系统
  sectTournamentConfig: TournamentConfig;        // 山门大比配置（三频率独立）
  interSectTournamentConfig: TournamentConfig;  // 宗门大比配置（三频率独立）
  lastSectTournamentResults: Record<TournamentFrequency, TournamentResult | null>;
  lastInterSectTournamentResults: Record<TournamentFrequency, TournamentResult | null>;
  lastSectTournamentYears: Record<TournamentFrequency, number>;
  lastInterSectTournamentYears: Record<TournamentFrequency, number>;
  
  nextMonth: () => void;
  dismissReport: () => void;
  startGame: () => void;
  resetGame: () => void;
  newGame: (sectName?: string) => void;
  returnToMenu: () => void;
  markNotificationRead: (id: string) => void;
  assignDiscipleToBuilding: (discipleId: string, buildingId: string | null) => void;
  setBuildingManager: (buildingId: string, discipleId: string | null) => void;
  upgradeBuilding: (buildingId: string) => boolean;
  downgradeBuilding: (buildingId: string) => { success: boolean; refundSpiritStones: number; refundContribution: number; refundReputation: number; reason?: string };
  toggleBuilding: (buildingId: string) => void;
  recruitDisciple: () => void;
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
  updateSectTournamentFreqConfig: (frequency: TournamentFrequency, config: Partial<FrequencyTournamentConfig>) => void;   // 更新山门大比指定频率配置
  updateInterSectTournamentFreqConfig: (frequency: TournamentFrequency, config: Partial<FrequencyTournamentConfig>) => void; // 更新宗门大比指定频率配置
  triggerSectTournament: (frequency: TournamentFrequency) => void;       // 手动触发山门大比（指定频率）
  triggerInterSectTournament: (frequency: TournamentFrequency) => void;  // 手动触发宗门大比（指定频率）
  // 宗门互动系统
  changeSectFavorability: (sectId: string, delta: number) => void;       // 增减好感度
  setSectDiplomaticStatus: (sectId: string, status: DiplomaticStatus) => void;  // 设置外交状态（同盟/宿敌/附庸/中立）
  toggleSectTrade: (sectId: string) => boolean;                          // 开启/关闭交易
  // 存档槽系统
  saveToSlot: (slotIndex: number) => void;                              // 保存当前游戏到指定槽位
  loadFromSlot: (slotIndex: number) => boolean;                         // 从槽位读取游戏（成功返回 true）
  buyShopItem: (itemId: string) => { success: boolean; reason?: string };
  setProductionTarget: (buildingId: string, target: NonNullable<Building['productionTarget']>) => void;
}

// 库存累加辅助：找到同类型则 +1，否则新增条目
function addItem<T extends string>(inv: { type: T; quantity: number }[], type: T): { type: T; quantity: number }[] {
  const existing = inv.find(i => i.type === type);
  if (existing) {
    return inv.map(i => i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...inv, { type, quantity: 1 }];
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
  // 后面的弟子从前面选一位师傅
  for (let i = 2; i < disciples.length; i++) {
    const masterCandidate = disciples[i % 2]; // 选前面的弟子做师傅
    disciples[i].master = masterCandidate.name;
    if (!masterCandidate.friends.includes(disciples[i].name)) {
      masterCandidate.friends.push(disciples[i].name);
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
    sectContribution: 0,
    spiritStones: 500,
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
    herbInventory: 20,
    ironInventory: 10,
    paperInventory: 10,
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
    followedDiscipleIds: [],
    sectTournamentConfig: getDefaultTournamentConfig('sect'),
    interSectTournamentConfig: getDefaultTournamentConfig('inter-sect'),
    lastSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastInterSectTournamentResults: { yearly: null, every5years: null, every10years: null },
    lastSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
    lastInterSectTournamentYears: { yearly: 0, every5years: 0, every10years: 0 },
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
          // 贡献点发放给冠军弟子
          if (championDisciple) {
            championDisciple.contributionPoints += reward.amount;
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

  return { newSpiritStones, newReputation, newPillInventory, newDisciples };
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
        const newState = createInitialState();
        set({
          ...newState,
          sectName: sectName && sectName.trim() ? sectName.trim() : '修仙宗门',
          showMainMenu: false,
          gameStarted: true,
        });
      },
      
      returnToMenu: () => {
        set({ showMainMenu: true });
      },
      
      nextMonth: () => {
        const state = get();
        let { year, month, spiritStones, reputation, herbInventory } = state;
        const { disciples, buildings, promotionRules, pillInventory, libraryBooks } = state;
        
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

        // 灵兽库存：以当前库存为基底，累加本月灵兽原产出
        const newBeastInventory: BeastInventory[] = state.beastInventory.map(b => ({ ...b }));
        
        // 声望自动增长（基于人数和战力）
        const sectCombatPower = calculateSectCombatPower(disciples, buildings);
        const discipleBonus = disciples.length * ReputationGrowthConfig.discipleWeight;
        const combatBonus = sectCombatPower.totalPower * ReputationGrowthConfig.combatWeight;
        const growthMultiplier = Math.min(1 + discipleBonus + combatBonus, ReputationGrowthConfig.maxMultiplier);
        const reputationChange = Math.floor(ReputationGrowthConfig.baseGrowth * growthMultiplier);
        
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
          }

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
        });
        
        const servantCount = disciples.filter(d => d.status === 'servant').length;
        const servantStipend = servantCount * 1;
        if (servantStipend > 0) {
          spiritStoneExpense.push({ source: '杂役零花钱', amount: servantStipend });
          totalMaintenance += servantStipend;
        }
        
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
          
          // 洞府加成
          const caveMansion = buildings.find(b =>
            b.type === 'cave_mansion' && b.assignedDisciples.includes(disciple.id)
          );
          if (caveMansion) {
            bonusBuffs.push({
              id: `cave_${caveMansion.id}`,
              name: '洞府加成',
              description: `洞府修炼加成 +50%`,
              type: 'cultivation',
              value: 50,
              duration: 1,
              remainingMonths: 1,
            });
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
          
          const building = buildings.find(b => b.assignedDisciples.includes(d2.id));
          // 贡献点按身份发放，不依赖建筑分配
          const workContribution = processMonthlyWork(d2, building || null);
          d2 = { ...d2, contributionPoints: d2.contributionPoints + workContribution };
          
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
            elder: 'core_residence',
          };
          const residenceTypeOrder = ['outer_residence', 'inner_residence', 'core_residence'];
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
            const hasPill = (() => {
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
                const pill = pillInventory.find(p => p.type === pillType);
                return pill && pill.quantity > 0;
              }
              return false;
            })();
            
            const result = attemptBreakthrough(d2, hasPill);
            
            breakthroughEvents.push({
              discipleId: d2.id,
              discipleName: d2.name,
              from: RealmNames[d2.realm],
              to: RealmNames[result.newRealm],
              success: result.success,
            });
            
            if (result.success) {
              // 突破后境界提升，按新境界重算修炼速度（修复旧实现不重算的 Bug A）。
              const breakthroughed = { ...d2, realm: result.newRealm };
              d2 = {
                ...d2,
                realm: result.newRealm,
                realmProgress: result.newProgress,
                cultivationSpeed: recomputeCultivationSpeed(breakthroughed),
                // 突破后寿命上限随新境界重算（金丹寿命 260 >> 炼气 80）。
                maxAge: recomputeLifespan(breakthroughed),
                breakthroughAttempts: 0,
                breakthroughBonus: 0,
                isBreakingThrough: false,
              };
              // 突破后自动去藏经阁学习更优秀的功法（可替换旧功法，玩家无需手动操作）
              d2 = autoLearnTechniqueOnBreakthrough(d2, libraryBooks);
              
              if (hasPill) {
                const nextRealm = result.newRealm;
                const pillMap: Record<string, PillType> = {
                  foundation: 'foundation_pill',
                  golden: 'golden_pill',
                  nascent: 'nascent_pill',
                  spirit: 'spirit_pill',
                };
                const pillType = pillMap[nextRealm];
                if (pillType) {
                  const idx = pillInventory.findIndex(p => p.type === pillType);
                  if (idx >= 0) {
                    pillInventory[idx] = { ...pillInventory[idx], quantity: pillInventory[idx].quantity - 1 };
                  }
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
        
        let currentBuildings = [...buildings];
        
        let finalDisciples = activeDisciples.map(disciple => {
          let d = disciple;
          
          if (d.status === 'servant') {
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
              
              // 添加通知
              if (buildingId) {
                const assignedBuilding = currentBuildings.find(b => b.id === buildingId);
                newNotifications.push(
                  createNotification(
                    'info',
                    '弟子分配',
                    `${d.name}晋升为外门弟子，已自动分配至${assignedBuilding?.name || '某岗位'}`,
                    currentDate
                  )
                );
              }
            }
          }
          
          if (d.status === 'outer') {
            const realmIndex = RealmOrder.indexOf(d.realm);
            const minRealmIndex = RealmOrder.indexOf(promotionRules.outerToInner.minRealm);
            const canPromote = 
              realmIndex >= minRealmIndex &&
              d.contributionPoints >= promotionRules.outerToInner.minContribution;
            
            if (canPromote) {
              promotionEvents.push({
                discipleId: d.id,
                discipleName: d.name,
                from: DiscipleStatusNames[d.status],
                to: DiscipleStatusNames.inner,
              });
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
            }
          }
          
          if (d.status === 'inner') {
            const realmIndex = RealmOrder.indexOf(d.realm);
            const minRealmIndex = RealmOrder.indexOf(promotionRules.innerToCore.minRealm);
            const canPromote = 
              realmIndex >= minRealmIndex &&
              d.contributionPoints >= promotionRules.innerToCore.minContribution;
            
            if (canPromote) {
              promotionEvents.push({
                discipleId: d.id,
                discipleName: d.name,
                from: DiscipleStatusNames[d.status],
                to: DiscipleStatusNames.core,
              });
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
            }
          }
          
          return d;
        });
        
        const totalInnerCount = finalDisciples.filter(d => d.status === 'inner').length;
        const maxCoreCount = Math.floor(finalDisciples.filter(d => d.status === 'outer').length * 0.3);
        
        // 每月随机弟子拜师
        // 基础概率：声望越高，概率越大，弟子数量越多
        const baseProbability = Math.min(0.7, 0.3 + reputation / 1000); // 30%~70%概率有弟子来
        const maxNewDisciples = Math.min(5, 1 + Math.floor(reputation / 200)); // 每月最多1~5个
        
        // 弟子上限检查
        const discipleCap = SectLevelDiscipleCap[state.sectLevel];
        
        if (Math.random() < baseProbability && (discipleCap === null || finalDisciples.length < discipleCap)) {
          const remainingSlots = discipleCap === null ? maxNewDisciples : discipleCap - finalDisciples.length;
          const actualNew = Math.min(randomInt(1, maxNewDisciples), remainingSlots);
          
          for (let i = 0; i < actualNew; i++) {
            const newDisciple = createInitialDisciple('mortal', 'mortal');
            newDisciple.joinDate = { year, month };

            // 根据声望影响弟子资质
            const bonusChance = Math.min(0.3, reputation / 1000);
            if (Math.random() < bonusChance) {
              // 高声望有概率获得更好的弟子
              newDisciple.hiddenTalents.rootBone = Math.min(100, newDisciple.hiddenTalents.rootBone + randomInt(10, 30));
            }

            // 新拜师弟子一律从杂役做起，积累贡献后晋升为外门
            newDisciple.status = 'servant';
            newDisciple.realm = 'qi';
            newDisciple.realmProgress = randomInt(10, 40);
            const servantHall = currentBuildings.find(b => b.type === 'servant_hall');
            if (servantHall && servantHall.assignedDisciples.length < servantHall.discipleCapacity) {
              currentBuildings = currentBuildings.map(b =>
                b.id === servantHall.id
                  ? { ...b, assignedDisciples: [...b.assignedDisciples, newDisciple.id] }
                  : b
              );
              newDisciple.assignedBuilding = servantHall.id;
            }

            // 自动分配居所（不影响工作建筑）
            const residenceResult = autoAssignResidence(newDisciple, currentBuildings);
            currentBuildings = residenceResult.newBuildings;

            finalDisciples.push(newDisciple);
            newDisciples.push({ id: newDisciple.id, name: newDisciple.name, status: DiscipleStatusNames[newDisciple.status] });
          }
        }

        // 每月重新分配：确保无工作弟子被分配到有空缺的建筑，居所不匹配的弟子重新匹配
        const reassignResult = monthlyReassign(finalDisciples, currentBuildings);
        finalDisciples = reassignResult.disciples;
        currentBuildings = reassignResult.buildings;

        // 每月自动任命堂主：为每座工作堂口选出堂内身份最高的弟子担任堂主（玩家无需手动分配）
        const managerResult = autoAssignManagers(finalDisciples, currentBuildings);
        finalDisciples = managerResult.disciples;
        currentBuildings = managerResult.buildings;

        spiritStones += totalSpiritStoneIncome - totalMaintenance;
        herbInventory += totalHerbIncome;
        reputation += reputationChange;
        
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
        
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
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
        const refreshedOtherSects = refreshSectRelations(state.otherSects);

        // 大比自动触发（仅在每年1月检查，三频率独立判断）
        const FREQUENCIES: TournamentFrequency[] = ['yearly', 'every5years', 'every10years'];
        const sectTournamentResults = { ...state.lastSectTournamentResults };
        const interSectTournamentResults = { ...state.lastInterSectTournamentResults };
        const sectYears = { ...state.lastSectTournamentYears };
        const interSectYears = { ...state.lastInterSectTournamentYears };
        let finalSpiritStones = spiritStones;
        let finalReputation = reputation;
        let finalPillInventory = [...pillInventory];
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

        set({
          year,
          month,
          sectLevel: state.sectLevel,
          reputation: finalReputation,
          spiritStones: finalSpiritStones,
          herbInventory,
          disciples: finalDisciples,
          buildings: [...currentBuildings],
          pillInventory: finalPillInventory,
          beastInventory: newBeastInventory,
          monthlyReport: report,
          showReport: true,
          notifications: [...tournamentNotifs, ...newNotifications, ...state.notifications].slice(0, 50),
          otherSects: refreshedOtherSects,
          lastSectTournamentResults: sectTournamentResults,
          lastInterSectTournamentResults: interSectTournamentResults,
          lastSectTournamentYears: sectYears,
          lastInterSectTournamentYears: interSectYears,
        });
      },
      
      dismissReport: () => {
        set({ showReport: false });
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

        set(state => {
          // 先移除该弟子可能担任的其他建筑管理者身份
          const newDisciples = state.disciples.map(d => {
            if (d.id === discipleId && d.managingBuilding !== buildingId) {
              // 如果这个弟子之前在管理其他建筑，清除那个建筑的管理者
              if (d.managingBuilding) {
                return { ...d, managingBuilding: null };
              }
            }
            if (d.managingBuilding === buildingId && d.id !== discipleId) {
              return { ...d, managingBuilding: null };
            }
            return d;
          });

          // 更新建筑的管理者
          const newBuildings = state.buildings.map(b => {
            if (b.id === buildingId) {
              return { ...b, managerId: discipleId };
            }
            return b;
          });

          // 如果设置管理者，同时更新弟子的 managingBuilding
          const finalDisciples = newDisciples.map(d => {
            if (d.id === discipleId) {
              return { ...d, managingBuilding: buildingId };
            }
            return d;
          });

          return { buildings: newBuildings, disciples: finalDisciples };
        });
      },

      upgradeBuilding: (buildingId: string): boolean => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return false;
        if (building.level >= building.maxLevel) return false;

        // 统一使用配置中的升级费用
        let upgradeCost;
        const isResidence = RESIDENCE_TYPES.includes(building.type);
        if (isResidence) {
          upgradeCost = getResidenceUpgradeCost(building);
          if (!upgradeCost) return false;
        } else {
          upgradeCost = building.upgradeCosts[building.level - 1];
          if (!upgradeCost) return false;
        }

        // 三类资源校验
        if (state.spiritStones < upgradeCost.spiritStones) return false;
        const needContribution = upgradeCost.contribution ?? 0;
        if (state.sectContribution < needContribution) return false;
        const needReputation = upgradeCost.reputation ?? 0;
        if (state.reputation < needReputation) return false;

        // 计算升级后的新容量
        const newLevel = building.level + 1;
        let newCapacity = building.discipleCapacity;
        if (isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          // 非居所功能建筑升级也增加容量
          newCapacity = building.discipleCapacity + 10;
        }

        // 计算升级后的新维护费
        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones - upgradeCost.spiritStones,
          sectContribution: state.sectContribution - needContribution,
          reputation: state.reputation - needReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return true;
      },

      downgradeBuilding: (buildingId: string): { success: boolean; refundSpiritStones: number; refundContribution: number; refundReputation: number; reason?: string } => {
        const state = get();
        const building = state.buildings.find(b => b.id === buildingId);

        if (!building) return { success: false, refundSpiritStones: 0, refundContribution: 0, refundReputation: 0, reason: '建筑不存在' };
        if (building.level <= 1) return { success: false, refundSpiritStones: 0, refundContribution: 0, refundReputation: 0, reason: '已是最低等级' };

        const isResidence = RESIDENCE_TYPES.includes(building.type);

        // 计算返还资源：从 (level-1) 升级到 level 时花费的全部资源
        let refundSpiritStones = 0;
        let refundContribution = 0;
        let refundReputation = 0;
        if (isResidence) {
          const prevLevelBuilding = { ...building, level: building.level - 1 };
          const cost = getResidenceUpgradeCost(prevLevelBuilding);
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundContribution = cost.contribution ?? 0;
            refundReputation = cost.reputation ?? 0;
          }
        } else {
          const cost = building.upgradeCosts[building.level - 2];
          if (cost) {
            refundSpiritStones = cost.spiritStones;
            refundContribution = cost.contribution ?? 0;
            refundReputation = cost.reputation ?? 0;
          }
        }

        const newLevel = building.level - 1;
        let newCapacity = building.discipleCapacity;
        if (isResidence) {
          newCapacity = getResidenceCapacityByLevel(building.type, newLevel);
        } else if (building.discipleCapacity > 0) {
          newCapacity = Math.max(0, building.discipleCapacity - 10);
        }

        const newMaintenanceCost = getMaintenanceCostByLevel(building.type, newLevel);

        set(state => ({
          spiritStones: state.spiritStones + refundSpiritStones,
          sectContribution: state.sectContribution + refundContribution,
          reputation: state.reputation + refundReputation,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: newLevel, discipleCapacity: newCapacity, baseMaintenanceCost: newMaintenanceCost }
              : b
          ),
        }));

        return { success: true, refundSpiritStones, refundContribution, refundReputation };
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
      
      recruitDisciple: () => {
        const state = get();
        const newDisciple = createInitialDisciple('mortal', 'mortal');
        newDisciple.joinDate = { year: state.year, month: state.month };

        // 新招入弟子一律从杂役做起，通过积累贡献后晋升为外门
        newDisciple.status = 'servant';
        newDisciple.realm = 'qi';

        // 自动生成师承关系：从高境界弟子中选一位作为师傅
        const potentialMasters = state.disciples.filter(
          d => d.id !== newDisciple.id && (d.status === 'inner' || d.status === 'core' || d.status === 'elder'),
        );
        if (potentialMasters.length > 0) {
          const master = potentialMasters[randomInt(0, potentialMasters.length - 1)];
          newDisciple.master = master.name;
          // 师傅将新弟子加入好友
          if (!master.friends.includes(newDisciple.name)) {
            master.friends = [...master.friends, newDisciple.name];
          }
        }

        // 自动生成好友：从同境界弟子中选 1-2 位
        const potentialFriends = state.disciples.filter(
          d => d.id !== newDisciple.id && d.name !== newDisciple.master,
        );
        if (potentialFriends.length > 0) {
          const friendCount = Math.min(randomInt(1, 2), potentialFriends.length);
          const shuffled = [...potentialFriends].sort(() => Math.random() - 0.5);
          newDisciple.friends = shuffled.slice(0, friendCount).map(d => d.name);
          // 双向好友关系
          newDisciple.friends.forEach(fname => {
            const friend = state.disciples.find(d => d.name === fname);
            if (friend && !friend.friends.includes(newDisciple.name)) {
              friend.friends = [...friend.friends, newDisciple.name];
            }
          });
        }

        let currentBuildings = state.buildings;

        // 杂役弟子分配到杂役堂
        const servantHall = currentBuildings.find(b => b.type === 'servant_hall');
        if (servantHall && servantHall.assignedDisciples.length < servantHall.discipleCapacity) {
          currentBuildings = currentBuildings.map(b =>
            b.id === servantHall.id
              ? { ...b, assignedDisciples: [...b.assignedDisciples, newDisciple.id] }
              : b
          );
          newDisciple.assignedBuilding = servantHall.id;
        }

        // 自动分配居所（不影响工作建筑）
        const { newBuildings } = autoAssignResidence(newDisciple, currentBuildings);

        const joinNotif = createNotification(
          'success',
          '新弟子加入',
          `${newDisciple.name} 已拜入山门，从杂役做起。`,
          { year: state.year, month: state.month },
        );

        set(state => ({
          disciples: [...state.disciples, newDisciple],
          buildings: newBuildings,
          spiritStones: state.spiritStones - 50,
          notifications: [joinNotif, ...state.notifications].slice(0, 50),
        }));
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

        // 居所使用容量表
        const isResidenceType = ['outer_residence', 'inner_residence', 'core_residence'].includes(type);
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
        
        // 检查数量限制
        if (book.type === 'technique' && disciple.learnedTechnique) return false;
        if (book.type === 'battle' && disciple.learnedBattles.length >= 2) return false;
        
        // 开始学习
        const updatedDisciples = state.disciples.map(d => {
          if (d.id !== discipleId) return d;
          return {
            ...d,
            contributionPoints: d.contributionPoints - cost,
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
        });
        
        set({ disciples: updatedDisciples });
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
        
        // 检查长老是否已有洞府
        const hasCave = state.buildings.some(b => 
          b.type === 'cave_mansion' && b.assignedDisciples.includes(elderId)
        );
        if (hasCave) return false;
        
        const contributionCost = 1000;
        if (elder.contributionPoints < contributionCost) return false;
        
        // 检查能否建造新洞府（先检查是否有空的洞府）
        let caveBuilding = state.buildings.find(b => 
          b.type === 'cave_mansion' && b.assignedDisciples.length === 0
        );
        
        let newBuildings = state.buildings;
        let spiritStonesCost = 0;
        
        if (!caveBuilding) {
          // 建造新洞府
          const caveConfig = BUILDING_CONFIGS['cave_mansion'];
          if (!caveConfig.buildCost) return false;
          if (state.spiritStones < caveConfig.buildCost.spiritStones) return false;
          
          spiritStonesCost = caveConfig.buildCost.spiritStones;
          
          const newCave: Building = {
            id: `cave_mansion_${Date.now()}`,
            type: 'cave_mansion',
            name: `${elder.name}洞府`,
            level: 1,
            maxLevel: caveConfig.maxLevel,
            status: 'active',
            baseOutput: caveConfig.baseOutput,
            baseMaintenanceCost: caveConfig.baseMaintenanceCost,
            upgradeCosts: caveConfig.upgradeCosts,
            elderBonus: 0,
            discipleCapacity: caveConfig.discipleCapacity,
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
          // 分配现有洞府
          newBuildings = state.buildings.map(b => {
            if (b.id === caveBuilding!.id) {
              return {
                ...b,
                assignedDisciples: [elderId],
                managerId: elderId,
                name: `${elder.name}洞府`,
              };
            }
            return b;
          });
        }
        
        // 扣除贡献点
        const newDisciples = state.disciples.map(d => {
          if (d.id === elderId) {
            return { ...d, contributionPoints: d.contributionPoints - contributionCost };
          }
          return d;
        });
        
        set({
          buildings: newBuildings,
          disciples: newDisciples,
          spiritStones: state.spiritStones - spiritStonesCost,
        });
        
        return true;
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
          notifications: [promotionNotification, ...state.notifications].slice(0, 50),
        });
        
        return true;
      },

      refreshOtherSects: () => {
        const state = get();
        const newSects = generateOtherSects(8, state.sectLevel);
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
        const result = runTournament({
          scope: 'sect',
          frequency,
          config: freqConfig,
          disciples: state.disciples,
          otherSects: state.otherSects,
          date: { year: state.year, month: state.month },
        });

        const { newSpiritStones, newReputation, newPillInventory, newDisciples } =
          applyTournamentRewards(state, result, freqConfig);

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
        });
      },

      triggerInterSectTournament: (frequency) => {
        const state = get();
        const freqConfig = state.interSectTournamentConfig[frequency];
        const result = runTournament({
          scope: 'inter-sect',
          frequency,
          config: freqConfig,
          disciples: state.disciples,
          otherSects: state.otherSects,
          date: { year: state.year, month: state.month },
        });

        const { newSpiritStones, newReputation, newPillInventory, newDisciples } =
          applyTournamentRewards(state, result, freqConfig);

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
        });
      },

      // ===== 宗门互动系统 =====
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
        const newSects = state.otherSects.map(sect =>
          sect.id === sectId ? { ...sect, diplomaticStatus: status } : sect,
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

          return patch;
        });

        return { success: true };
      },
      setProductionTarget: (buildingId: string, target: NonNullable<Building['productionTarget']>) => {
        set(state => ({
          buildings: state.buildings.map(b =>
            b.id === buildingId ? { ...b, productionTarget: target } : b
          ),
        }));
      },
    }),
    {
      name: 'sect-game-save',
      version: 7,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState;
        const state = persistedState as GameState;
        // v7: 新增 sectName 字段，旧存档默认为「修仙宗门」
        if (!state.sectName) {
          state.sectName = '修仙宗门';
        }
        // v7: 新增 sectContribution 字段，旧存档默认 0
        if (state.sectContribution === undefined) {
          state.sectContribution = 0;
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
        if (state.buildings) {
          // 有效建筑类型（杂役居所已移除，旧存档中的杂役居所会被过滤）
          const validTypes = new Set([
            'mountain_gate', 'lecture_hall', 'servant_hall',
            'pill_hall', 'sutra_hall', 'artifact_hall',
            'secret_library', 'array_hall', 'spirit_beast_garden',
            'guardian_array', 'skyscraper_tower',
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
          }));
        }
        if (state.otherSects) {
          state.otherSects = state.otherSects.map((s: any) => ({
            ...s,
            favorability: s.favorability ?? 50,
            diplomaticStatus: s.diplomaticStatus ?? 'neutral',
            tradeActive: s.tradeActive ?? false,
          }));
        }
        return state;
      },
    }
  )
);
