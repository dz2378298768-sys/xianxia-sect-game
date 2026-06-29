import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Disciple, PromotionRules } from '@/types/disciple';
import { DiscipleStatusNames, RealmNames, RealmOrder } from '@/types/disciple';
import type { Building, BuildingType } from '@/types/building';
import { BUILDING_CONFIGS } from '@/data/buildings';
import type { BookConfig, BookTier } from '@/data/buildings';
import { generateInitialLibraryBooks, generateRandomBook, getBookPrice, canLearnBook } from '@/utils/bookGenerator';
import type { DiscipleStatus } from '@/types/disciple';
import type { PillInventory, PillType } from '@/types/pill';
import type { ArtifactInventory, ArtifactType } from '@/types/artifact';
import type { TalismanInventory, TalismanType } from '@/types/talisman';
import type { SectLevel, MonthlyReport, Notification } from '@/types/game';
import {
  SectLevelNames, SectLevelRequirementsMap, SectLevelOrder,
  SectLevelDiscipleCap, SectLevelReputationCap, ReputationGrowthConfig,
} from '@/types/game';
import {
  createInitialDisciple, createInitialBuildings, getDefaultPromotionRules, autoAssignBuilding,
  autoAssignResidence, getResidenceUpgradeCost, calculateLectureBonus,
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

interface GameState {
  year: number;
  month: number;
  sectLevel: SectLevel;
  reputation: number;
  spiritStones: number;
  disciples: Disciple[];
  buildings: Building[];
  pillInventory: PillInventory[];
  artifactInventory: ArtifactInventory[];
  talismanInventory: TalismanInventory[];
  promotionRules: PromotionRules;
  notifications: Notification[];
  monthlyReport: MonthlyReport | null;
  showReport: boolean;
  herbInventory: number;
  gameStarted: boolean;
  showMainMenu: boolean;
  libraryBooks: BookConfig[]; // 藏经阁拥有的书籍
  libraryCosts: Record<BookTier, number>; // 每层藏经阁学习消耗贡献点
  
  nextMonth: () => void;
  dismissReport: () => void;
  startGame: () => void;
  resetGame: () => void;
  newGame: () => void;
  returnToMenu: () => void;
  markNotificationRead: (id: string) => void;
  assignDiscipleToBuilding: (discipleId: string, buildingId: string | null) => void;
  setBuildingManager: (buildingId: string, discipleId: string | null) => void;
  upgradeBuilding: (buildingId: string) => boolean;
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
}

const createInitialState = () => {
  let buildings = createInitialBuildings();
  const disciples: Disciple[] = [];
  
  for (let i = 0; i < 10; i++) {
    const disciple = createInitialDisciple('servant', 'qi');
    disciples.push(disciple);
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
  
  return {
    year: 1,
    month: 1,
    sectLevel: 'founding' as SectLevel,
    reputation: 10,
    spiritStones: 500,
    disciples,
    buildings,
    // 仓库物品初始为0，需要解锁建筑后才能制作
    pillInventory: [],
    artifactInventory: [],
    talismanInventory: [],
    promotionRules: getDefaultPromotionRules(),
    notifications: [],
    monthlyReport: null,
    showReport: false,
    herbInventory: 20,
    gameStarted: false,
    showMainMenu: true,
    libraryBooks,
    libraryCosts: {
      foundation: 100,
      golden: 200,
      nascent: 400,
      spirit: 800,
    },
  };
};

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
      
      newGame: () => {
        const newState = createInitialState();
        set({ ...newState, showMainMenu: false, gameStarted: true });
      },
      
      returnToMenu: () => {
        set({ showMainMenu: true });
      },
      
      nextMonth: () => {
        const state = get();
        let { year, month, spiritStones, reputation, herbInventory } = state;
        const { disciples, buildings, promotionRules, pillInventory } = state;
        
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
            (b.type === 'servant_residence' || b.type === 'outer_residence' || 
             b.type === 'inner_residence' || b.type === 'core_residence') && 
            b.assignedDisciples.includes(disciple.id)
          );
          if (residence) {
            const residenceBonusMap: Record<string, number> = {
              servant_residence: 0,
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
            const lectureBonus = calculateLectureBonus(lecturer || null);
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
          
          // 满意度影响修炼速度：每降低1%效率降低2%
          const satisfactionPenalty = (100 - disciple.satisfaction) * 0.02;
          const adjustedCultivationSpeed = disciple.cultivationSpeed * (1 - satisfactionPenalty);
          discipleWithBonus.cultivationSpeed = adjustedCultivationSpeed;
          
          let d2 = processMonthlyCultivation(discipleWithBonus);
          d2 = { ...d2, buffs: disciple.buffs, cultivationSpeed: disciple.cultivationSpeed }; // 恢复原始buffs和基础修炼速度
          
          // 处理每月学习进度
          d2 = processMonthlyLearning(d2);
          
          const building = buildings.find(b => b.assignedDisciples.includes(d2.id));
          if (building) {
            const workContribution = processMonthlyWork(d2, building);
            d2 = { ...d2, contributionPoints: d2.contributionPoints + workContribution };
            if (workContribution > 0) {
            }
          }
          
          // 满意度系统计算
          // 检查是否有工作
          const hasWork = building !== undefined || d2.status === 'elder';
          const currentResidence = buildings.find(b => 
            (b.type === 'servant_residence' || b.type === 'outer_residence' || 
             b.type === 'inner_residence' || b.type === 'core_residence' ||
             b.type === 'cave_mansion') && b.assignedDisciples.includes(d2.id)
          );
          
          // 计算居所等级需求
          const requiredResidenceTypeMap: Record<string, string> = {
            servant: 'servant_residence',
            outer: 'outer_residence',
            inner: 'inner_residence',
            core: 'core_residence',
            elder: 'core_residence',
          };
          const residenceTypeOrder = ['servant_residence', 'outer_residence', 'inner_residence', 'core_residence'];
          const requiredType = requiredResidenceTypeMap[d2.status] || 'servant_residence';
          const requiredIndex = residenceTypeOrder.indexOf(requiredType);
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
              d2 = {
                ...d2,
                realm: result.newRealm,
                realmProgress: result.newProgress,
                breakthroughAttempts: 0,
                breakthroughBonus: 0,
                isBreakingThrough: false,
              };
              
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
              
              // 从杂役堂口移除
              currentBuildings = currentBuildings.map(b => ({
                ...b,
                assignedDisciples: b.assignedDisciples.filter(id => id !== d.id)
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
              // 晋升后重新分配居所
              const residenceResult = autoAssignResidence({ ...d, status: 'inner' }, currentBuildings);
              currentBuildings = residenceResult.newBuildings;
              d = { ...d, status: 'inner' };
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
              // 晋升后重新分配居所
              const residenceResult = autoAssignResidence({ ...d, status: 'core' }, currentBuildings);
              currentBuildings = residenceResult.newBuildings;
              d = { ...d, status: 'core' };
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
            
            // 新的招收规则检查
            const { rootBone, spiritRhythm, constitution, daoFate } = newDisciple.hiddenTalents;
            const rec = promotionRules.recruitment;
            
            // 检查是否满足所有最低要求
            const allRequirementsMet = 
              rootBone >= rec.minRootBone &&
              spiritRhythm >= rec.minSpiritRhythm &&
              constitution >= rec.minConstitution &&
              daoFate >= rec.minDaoFate;
            
            // 检查是否满足破例条件（任一属性超过阈值）
            const exceptional = 
              rootBone >= rec.exceptionalThreshold ||
              spiritRhythm >= rec.exceptionalThreshold ||
              constitution >= rec.exceptionalThreshold ||
              daoFate >= rec.exceptionalThreshold;
            
            if (allRequirementsMet || exceptional) {
              newDisciple.status = 'outer';
              newDisciple.realm = 'qi';
              newDisciple.realmProgress = 0;
              // 外门弟子自动分配岗位
              const { buildingId, newBuildings } = autoAssignBuilding(newDisciple, currentBuildings);
              currentBuildings = newBuildings;
              newDisciple.assignedBuilding = buildingId;
            } else {
              newDisciple.status = 'servant';
              newDisciple.realm = 'qi';
              newDisciple.realmProgress = randomInt(10, 40);
              const servantHall = currentBuildings.find(b => b.type === 'servant_hall');
              if (servantHall && servantHall.assignedDisciples.length < servantHall.discipleCapacity) {
                servantHall.assignedDisciples.push(newDisciple.id);
              }
            }
            
            finalDisciples.push(newDisciple);
            newDisciples.push({ id: newDisciple.id, name: newDisciple.name, status: DiscipleStatusNames[newDisciple.status] });
          }
        }
        
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
        
        set({
          year,
          month,
          sectLevel: state.sectLevel,
          reputation,
          spiritStones,
          herbInventory,
          disciples: finalDisciples,
          buildings: [...currentBuildings],
          pillInventory: [...pillInventory],
          monthlyReport: report,
          showReport: true,
          notifications: [...newNotifications, ...state.notifications].slice(0, 50),
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
          
          const newBuildings = state.buildings.map(b => ({
            ...b,
            assignedDisciples: b.assignedDisciples.filter(id => id !== discipleId),
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

        const isResidence = building.type === 'servant_residence' ||
                           building.type === 'outer_residence' ||
                           building.type === 'inner_residence' ||
                           building.type === 'core_residence';

        if (!isResidence && building.level >= building.maxLevel) return false;

        let upgradeCost;
        if (isResidence) {
          upgradeCost = getResidenceUpgradeCost(building);
          if (!upgradeCost) return false;
        } else {
          upgradeCost = building.upgradeCosts[building.level];
          if (!upgradeCost) return false;
        }

        if (state.spiritStones < upgradeCost.spiritStones) return false;

        let newCapacity = building.discipleCapacity;
        if (isResidence) {
          newCapacity = building.discipleCapacity + 10;
        }

        set(state => ({
          spiritStones: state.spiritStones - upgradeCost.spiritStones,
          buildings: state.buildings.map(b =>
            b.id === buildingId
              ? { ...b, level: b.level + 1, discipleCapacity: newCapacity }
              : b
          ),
        }));

        return true;
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
        
        const rootBoneOk = newDisciple.hiddenTalents.rootBone >= state.promotionRules.servantToOuter.minRootBone;
        const exceptional = state.promotionRules.servantToOuter.enableExceptional &&
          newDisciple.hiddenTalents.rootBone >= state.promotionRules.servantToOuter.exceptionalThreshold;
        
        if (rootBoneOk || exceptional) {
          newDisciple.status = 'outer';
          newDisciple.realm = 'qi';
        } else {
          newDisciple.status = 'servant';
          newDisciple.realm = 'qi';
        }
        
        // 自动分配居所
        const { newBuildings } = autoAssignResidence(newDisciple, state.buildings);
        
        set(state => ({
          disciples: [...state.disciples, newDisciple],
          buildings: newBuildings,
          spiritStones: state.spiritStones - 50,
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
        };

        set(state => ({
          spiritStones: state.spiritStones - buildCost.spiritStones,
          reputation: buildCost.reputation ? state.reputation - buildCost.reputation : state.reputation,
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
          foundation: 'foundation',
          golden: 'golden',
          nascent: 'nascent',
          spirit: 'spirit',
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
    }),
    {
      name: 'sect-game-save',
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState;
        const state = persistedState as GameState;
        if (state.buildings) {
          const validTypes = new Set([
            'mountain_gate', 'lecture_hall', 'servant_hall',
            'pill_hall', 'sutra_hall', 'artifact_hall',
            'secret_library', 'array_hall', 'spirit_beast_garden',
            'guardian_array', 'skyscraper_tower',
            'residence', 'cave_mansion'
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
        }
        return state;
      },
    }
  )
);
