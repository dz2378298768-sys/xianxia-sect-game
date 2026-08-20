import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import {
  Building2, Wrench, Users, ArrowUp, ArrowDown, Power,
  Lock, Gem, Star, DoorOpen, Heart, Sparkles,
  TrendingUp, Plus, Shield, BookOpen, FlaskConical,
  Hammer, Scroll, Zap, TreePine, Crown, Info, X, Swords
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { LibraryPanel } from '@/components/LibraryPanel';
import { calculateBuildingMaintenance, calculateBuildingOutput, getResidenceUpgradeCost, getCaveMansionUpgradeCost, calculateDiscipleCombatPower, SKYSCRAPER_TOWER_COMBAT_POWER } from '@/utils/gameLogic';
import { RealmOrder, DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import { BuildingType, RESIDENCE_TYPES, RESIDENCE_TYPES_WITH_CAVE, isResidenceType, MAX_PRODUCTION_SLOTS, getAvailableSlots } from '@/types/building';
import { BUILDING_CONFIGS } from '@/data/buildings';
import { PillTypeNames } from '@/types/pill';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { SectLevelNames } from '@/types/game';
import { SectIcon } from '@/components/icons/SectIcons';
import { SimpleAvatar } from '@/components/ui/Avatar';
import { getBuildingImage } from '@/data/buildingImages';
import { BUILDING_CONTRIBUTION_BONUS } from '@/domain/balance';
import { BeastTypeNames } from '@/types/beast';

/** 建筑圆形缩略图：优先用生成的水墨建筑图，无图则回退图标 */
const BuildingThumb: React.FC<{ type: string; size?: number; locked?: boolean; className?: string }> = ({
  type, size = 48, locked = false, className = '',
}) => {
  const img = getBuildingImage(type);
  return (
    <div
      className={`building-thumb shrink-0 ${locked ? 'building-thumb-locked' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {img ? (
        <img src={img} alt="" className="building-thumb-img" />
      ) : (
        <span className={`text-sect-gold flex items-center justify-center w-full h-full`}>
          {getBuildingIcon(type)}
        </span>
      )}
    </div>
  );
};

const DiscipleStatusDisplayNames: Record<string, string> = {
  servant: '杂役',
  outer: '外门',
  inner: '内门',
  core: '核心',
  elder: '长老',
};

function getCategoryIcon(category: string) {
  switch (category) {
    case 'production': return <Hammer size={20} />;
    case 'service': return <BookOpen size={20} />;
    case 'special': return <Crown size={20} />;
    default: return <Building2 size={20} />;
  }
}

function getCategoryName(category: string) {
  switch (category) {
    case 'production': return '生产';
    case 'service': return '服务';
    case 'special': return '特殊';
    default: return '建筑';
  }
}

function getBuildingIcon(type: string) {
  switch (type) {
    case 'mountain_gate': return <Shield size={24} />;
    case 'lecture_hall': return <BookOpen size={24} />;
    case 'servant_hall': return <TreePine size={24} />;
    case 'pill_hall': return <FlaskConical size={24} />;
    case 'sutra_hall': return <Hammer size={24} />;
    case 'artifact_hall': return <Scroll size={24} />;
    case 'secret_library': return <BookOpen size={24} />;
    case 'array_hall': return <Zap size={24} />;
    case 'spirit_beast_garden': return <TreePine size={24} />;
    case 'skyscraper_tower': return <Crown size={24} />;
    default: return <Building2 size={24} />;
  }
}

/**
 * 贡献度设置编辑器：
 * 玩家可为每个建筑手动调整"每名弟子每月额外获得贡献"和"每名弟子每月消耗贡献"
 */
interface ContributionSettingsEditorProps {
  building: any;
  onChange: (settings: { monthlyGainPerDisciple?: number; monthlyCostPerDisciple?: number }) => void;
  onReset: () => void;
}
const ContributionSettingsEditor: React.FC<ContributionSettingsEditorProps> = ({ building, onChange, onReset }) => {
  const settings = building.contributionSettings || {};
  const [gainVal, setGainVal] = useState<string>(
    typeof settings.monthlyGainPerDisciple === 'number' ? String(settings.monthlyGainPerDisciple) : ''
  );
  const [costVal, setCostVal] = useState<string>(
    typeof settings.monthlyCostPerDisciple === 'number' ? String(settings.monthlyCostPerDisciple) : ''
  );

  const commit = (patch: { monthlyGainPerDisciple?: number; monthlyCostPerDisciple?: number }) => {
    const next: { monthlyGainPerDisciple?: number; monthlyCostPerDisciple?: number } = {
      monthlyGainPerDisciple:
        'monthlyGainPerDisciple' in patch ? patch.monthlyGainPerDisciple : settings.monthlyGainPerDisciple,
      monthlyCostPerDisciple:
        'monthlyCostPerDisciple' in patch ? patch.monthlyCostPerDisciple : settings.monthlyCostPerDisciple,
    };
    onChange(next);
  };

  return (
    <div className="contribution-settings">
      <div className="contribution-settings-header">
        <span className="contribution-settings-title">
          <SectIcon name="gem" size={11} />贡献参数
        </span>
        <button
          type="button"
          className="contribution-reset-btn"
          onClick={() => {
            setGainVal(''); setCostVal(''); onReset();
          }}
        >
          重置为默认
        </button>
      </div>
      <div className="contribution-settings-grid">
        <label className="contribution-field">
          <span className="contribution-field-label">每人月获得 +</span>
          <input
            type="number"
            className="contribution-field-input"
            min={0}
            placeholder="默认按公式"
            value={gainVal}
            onChange={e => {
              const v = e.target.value;
              setGainVal(v);
              if (v.trim() === '') commit({ monthlyGainPerDisciple: undefined });
              else {
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) commit({ monthlyGainPerDisciple: Math.max(0, n) });
              }
            }}
          />
        </label>
        <label className="contribution-field">
          <span className="contribution-field-label">每人月消耗 -</span>
          <input
            type="number"
            className="contribution-field-input"
            min={0}
            placeholder="默认 0"
            value={costVal}
            onChange={e => {
              const v = e.target.value;
              setCostVal(v);
              if (v.trim() === '') commit({ monthlyCostPerDisciple: undefined });
              else {
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) commit({ monthlyCostPerDisciple: Math.max(0, n) });
              }
            }}
          />
        </label>
      </div>
      <div className="text-[10px] text-sect-jade/50 mt-2 leading-snug">
        提示：获得贡献会在默认工作贡献之外 <em className="text-sect-gold">再加</em>；
        消耗贡献会在最后 <em className="text-red-400/80">再减</em>。不填表示按原公式/默认0。
      </div>
    </div>
  );
};

/**
 * 生产目标选择器（多槽位自定义下拉）
 * - 槽位数 = min(MAX_PRODUCTION_SLOTS, building.level)（1级1槽、2级2槽、3级3槽）
 * - 用自定义下拉替代原生 <select>，避免 Android WebView 放大选项字体
 * - 已设置槽位可清除；未解锁槽位显示锁标
 */
interface ProductionTargetSelectorProps {
  building: any;
  unlockedPillRecipes: string[];
  unlockedArtifactRecipes: string[];
  unlockedTalismanRecipes: string[];
  onSet: (slotIndex: number, target: any) => void;
  onClear: (slotIndex: number) => void;
}
const ProductionTargetSelector: React.FC<ProductionTargetSelectorProps> = ({
  building, unlockedPillRecipes, unlockedArtifactRecipes, unlockedTalismanRecipes, onSet, onClear,
}) => {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const availableSlots = getAvailableSlots(building.level);
  const slots = building.productionTargets || [];

  // 该建筑对应的配方类型
  const isPill = building.type === 'pill_hall';
  const isArtifact = building.type === 'sutra_hall';
  const isTalisman = building.type === 'artifact_hall';

  const recipes: string[] = isPill ? unlockedPillRecipes
    : isArtifact ? unlockedArtifactRecipes
    : isTalisman ? unlockedTalismanRecipes
    : [];

  const getName = (t: string) =>
    isPill ? (PillTypeNames as any)[t]
    : isArtifact ? (ArtifactTypeNames as any)[t]
    : isTalisman ? (TalismanTypeNames as any)[t]
    : t;

  const makeTarget = (t: string) =>
    isPill ? { pillType: t as any }
    : isArtifact ? { artifactType: t as any }
    : isTalisman ? { talismanType: t as any }
    : {};

  const getSlotLabel = (idx: number): string => {
    const s = slots[idx];
    if (!s) return '未设置';
    if (s.pillType) return PillTypeNames[s.pillType as keyof typeof PillTypeNames];
    if (s.artifactType) return ArtifactTypeNames[s.artifactType as keyof typeof ArtifactTypeNames];
    if (s.talismanType) return TalismanTypeNames[s.talismanType as keyof typeof TalismanTypeNames];
    return '未设置';
  };

  const isSlotFilled = (idx: number): boolean => {
    const s = slots[idx];
    return !!(s && (s.pillType || s.artifactType || s.talismanType));
  };

  const noRecipes = recipes.length === 0;

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 production-target-selector">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <FlaskConical size={12} className="text-blue-300" />
          <span className="font-display text-blue-300 text-xs">生产目标</span>
        </div>
        <span className="text-[10px] text-sect-jade/60">
          {availableSlots}/{MAX_PRODUCTION_SLOTS} 槽位（Lv.{building.level}）
        </span>
      </div>

      {/* 槽位列表 */}
      <div className="space-y-1">
        {Array.from({ length: MAX_PRODUCTION_SLOTS }).map((_, idx) => {
          const unlocked = idx < availableSlots;
          const filled = isSlotFilled(idx);
          const isOpen = openSlot === idx;
          return (
            <div key={idx} className="production-slot-row">
              <div className="flex items-center gap-1.5">
                <span className="production-slot-index">{idx + 1}</span>
                <button
                  type="button"
                  className={`production-slot-btn ${filled ? 'production-slot-btn-filled' : ''} ${!unlocked ? 'production-slot-btn-locked' : ''}`}
                  disabled={!unlocked}
                  onClick={() => {
                    if (!unlocked) return;
                    setOpenSlot(isOpen ? null : idx);
                  }}
                >
                  {!unlocked ? (
                    <><Lock size={11} className="mr-1" />需 Lv.{idx + 1}</>
                  ) : (
                    <span className="truncate">{getSlotLabel(idx)}</span>
                  )}
                </button>
                {unlocked && filled && (
                  <button
                    type="button"
                    className="production-slot-clear"
                    onClick={() => {
                      onClear(idx);
                      if (isOpen) setOpenSlot(null);
                    }}
                    title="清除"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* 自定义下拉选项 */}
              {unlocked && isOpen && (
                <div className="production-slot-dropdown">
                  {noRecipes ? (
                    <div className="text-[10px] text-yellow-400 px-2 py-1.5">
                      尚未解锁任何配方，请前往商店购买丹方/图谱/符谱
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`production-slot-option ${!filled ? 'production-slot-option-active' : ''}`}
                        onClick={() => {
                          onClear(idx);
                          setOpenSlot(null);
                        }}
                      >
                        — 未设置 —
                      </button>
                      {recipes.map(t => {
                        const name = getName(t);
                        // 同一槽位不允许重复选择已在其他槽位选中的目标
                        const usedElsewhere = slots.some((s: any, i: number) =>
                          i !== idx && (s.pillType === t || s.artifactType === t || s.talismanType === t)
                        );
                        const current = filled && (
                          (isPill && slots[idx]?.pillType === t) ||
                          (isArtifact && slots[idx]?.artifactType === t) ||
                          (isTalisman && slots[idx]?.talismanType === t)
                        );
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`production-slot-option ${current ? 'production-slot-option-active' : ''} ${usedElsewhere ? 'production-slot-option-used' : ''}`}
                            disabled={usedElsewhere && !current}
                            onClick={() => {
                              onSet(idx, makeTarget(t));
                              setOpenSlot(null);
                            }}
                          >
                            <span className="truncate">{name}</span>
                            {usedElsewhere && !current && <Lock size={10} className="ml-1 shrink-0" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noRecipes && (
        <div className="text-[10px] text-yellow-400 mt-1">尚未解锁任何配方，请前往商店购买丹方/图谱/符谱</div>
      )}
    </div>
  );
};

export const BuildingsPanel: React.FC = () => {
  const {
    buildings, disciples, spiritStones, reputation, sectLevel,
    upgradeBuilding, downgradeBuilding, toggleBuilding, buildBuilding, setBuildingManager,
    setProductionTarget, clearProductionTarget, setBuildingContributionSettings,
    unlockedPillRecipes, unlockedArtifactRecipes, unlockedTalismanRecipes,
    buyBeast, captureBeast, beastInventory,
    buyCaveMansion, challengeCaveMansion, challengeSkyscraperTower,
    assignDiscipleToBuilding,
  } = useGameStore();
  const { selectedBuildingId, setSelectedBuildingId, setActivePanel } = useUIStore();
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showVacant, setShowVacant] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [showBeastCapturePicker, setShowBeastCapturePicker] = useState(false);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [showElderPicker, setShowElderPicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [towerChallengerId, setTowerChallengerId] = useState<string | null>(null);

  // 显示错误提示
  const showError = (message: string) => {
    setBuildError(message);
    setTimeout(() => setBuildError(null), 3000);
  };
  
  const handleUpgrade = (buildingId: string) => {
    const ok = upgradeBuilding(buildingId);
    if (!ok) {
      const b = buildings.find(x => x.id === buildingId);
      const reason = b ? getUpgradeBlockReason(b) : null;
      showError(reason || '无法升级');
    }
  };

  // 与 store.upgradeBuilding 的资源校验完全对齐：
  // 灵石 + 声望 两类资源同时校验，避免按钮可点但点击静默失败。
  const getUpgradeBlockReason = (building: any): string | null => {
    if (building.level >= building.maxLevel) return '已满级';
    // 通天塔为结局建筑，不可升级
    if (building.type === 'skyscraper_tower') return '通天塔不可升级';

    const isCave = building.type === 'cave_mansion';
    const isResidence = RESIDENCE_TYPES.includes(building.type);
    let cost;
    if (isCave) {
      cost = getCaveMansionUpgradeCost(building.level);
      if (!cost) return '无法升级';
    } else if (isResidence) {
      cost = getResidenceUpgradeCost(building);
      if (!cost) return '无法升级';
    } else {
      cost = building.upgradeCosts[building.level - 1];
      if (!cost) return '无法升级';
    }

    if (spiritStones < cost.spiritStones) return '灵石不足';
    const needReputation = cost.reputation ?? 0;
    if (reputation < needReputation) return '声望不足';
    return null;
  };

  const canUpgrade = (building: any) => getUpgradeBlockReason(building) === null;

  const getUpgradeCost = (building: any) => {
    if (building.level >= building.maxLevel) return null;
    const isCave = building.type === 'cave_mansion';
    const isResidence = RESIDENCE_TYPES.includes(building.type);
    if (isCave) {
      return getCaveMansionUpgradeCost(building.level);
    }
    if (isResidence) {
      return getResidenceUpgradeCost(building);
    }
    return building.upgradeCosts[building.level - 1] || null;
  };

  const isResidenceBuilding = (type: string) => {
    return isResidenceType(type);
  };
  
  const canBuild = (type: BuildingType) => {
    const config = BUILDING_CONFIGS[type];
    if (!config || !config.buildCost) return false;
    
    if (buildings.some(b => b.type === type)) return false;
    
    if (config.unlockRequirement) {
      if (config.unlockRequirement.sectLevel) {
        const sectLevelOrder = ['founding', 'known', 'famous', 'dominant', 'eternal'];
        const requiredIndex = sectLevelOrder.indexOf(config.unlockRequirement.sectLevel);
        const currentIndex = sectLevelOrder.indexOf(sectLevel);
        if (currentIndex < requiredIndex) return false;
      }
      if (config.unlockRequirement.reputation && reputation < config.unlockRequirement.reputation) {
        return false;
      }
      if (config.unlockRequirement.buildings) {
        for (const req of config.unlockRequirement.buildings) {
          const existing = buildings.find(b => b.type === req.type);
          if (!existing || existing.level < req.level) return false;
        }
      }
    }
    
    if (spiritStones < config.buildCost.spiritStones) return false;
    if (config.buildCost.reputation && reputation < config.buildCost.reputation) return false;
    
    return true;
  };
  
  const isUnlocked = (type: BuildingType) => {
    const config = BUILDING_CONFIGS[type];
    if (!config.unlockRequirement) return true;
    
    if (config.unlockRequirement.sectLevel) {
      const sectLevelOrder = ['founding', 'known', 'famous', 'dominant', 'eternal'];
      const requiredIndex = sectLevelOrder.indexOf(config.unlockRequirement.sectLevel);
      const currentIndex = sectLevelOrder.indexOf(sectLevel);
      if (currentIndex < requiredIndex) return false;
    }
    if (config.unlockRequirement.reputation && reputation < config.unlockRequirement.reputation) {
      return false;
    }
    if (config.unlockRequirement.buildings) {
      for (const req of config.unlockRequirement.buildings) {
        const existing = buildings.find(b => b.type === req.type);
        if (!existing || existing.level < req.level) return false;
      }
    }
    
    return true;
  };
  
  const getEffectTypeName = (type: string): string => {
    const names: Record<string, string> = {
      contribution: '贡献点收益',
      cultivation: '修炼加成',
      defense: '宗门防御',
      morale: '宗门士气',
    };
    return names[type] || '特殊效果';
  };
  
  const activeBuildings = buildings.filter(b => b.status === 'active');

  // 空缺堂口：活跃、无管理者、有容量、非居所类建筑（居所无需长老管理）
  const RESIDENCE_TYPES_FOR_VACANT = RESIDENCE_TYPES_WITH_CAVE;
  const vacantBuildings = buildings.filter(b =>
    b.status === 'active' &&
    !b.managerId &&
    b.discipleCapacity > 0 &&
    !RESIDENCE_TYPES_FOR_VACANT.includes(b.type)
  );
  
  const allBuildingsToShow = useMemo(() => {
    return Object.keys(BUILDING_CONFIGS).filter(type =>
      !buildings.some(b => b.type === type)
    ) as BuildingType[];
  }, [buildings]);

  // 已解锁且可建造的建筑
  const unlockedToBuild = allBuildingsToShow.filter(type => isUnlocked(type));

  // 未解锁的建筑
  const lockedBuildings = allBuildingsToShow.filter(type => !isUnlocked(type));
  
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const assignedDisciples = selectedBuilding 
    ? disciples.filter(d => selectedBuilding.assignedDisciples.includes(d.id))
    : [];
  const output = selectedBuilding
    ? calculateBuildingOutput(selectedBuilding, assignedDisciples)
    : {
        spiritStones: 0, herbs: 0, iron: 0, paper: 0, reputation: 0,
        pills: 0, artifacts: 0, talismans: 0, beasts: 0,
        breakdown: {
          levelBonus: 0,
          managerBonus: 0,
          talentBonus: 0,
          capacityRatio: 0,
          workerCount: 0,
          totalMultiplier: 0,
        }
      };
  const maintenance = selectedBuilding 
    ? calculateBuildingMaintenance(selectedBuilding)
    : 0;
  
  const totalMonthlyContribution = assignedDisciples.reduce((sum, d) => {
    return sum + Math.floor((d.contributionPoints || 0) / 10);
  }, 0);
  
  function getRealmColor(realm: string): string {
    const colors: Record<string, string> = {
      mortal: 'text-gray-400',
      qi: 'text-blue-400',
      foundation: 'text-green-400',
      golden: 'text-yellow-400',
      nascent: 'text-purple-400',
      spirit: 'text-pink-400',
    };
    return colors[realm] || 'text-sect-jade';
  }
  
  function getTalentLevel(value: number): string {
    if (value >= 80) return '绝世';
    if (value >= 60) return '优秀';
    if (value >= 40) return '普通';
    if (value >= 20) return '欠佳';
    return '低劣';
  }
  
  const renderBreakdownTooltip = (breakdown: any) => {
    const lines = [];
    lines.push(`建筑等级加成: +${breakdown.levelBonus.toFixed(0)}%`);
    if (breakdown.managerBonus > 0) {
      lines.push(`管理者加成: +${breakdown.managerBonus.toFixed(0)}% (${breakdown.managerName})`);
    }
    lines.push(`弟子天赋加成: ${breakdown.talentBonus >= 0 ? '+' : ''}${breakdown.talentBonus.toFixed(0)}%`);
    lines.push(`人员配置: ${breakdown.capacityRatio.toFixed(0)}%`);
    lines.push(`总加成倍率: ${(breakdown.totalMultiplier / 100).toFixed(2)}x`);
    return (
      <div className="text-left space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="text-xs">{line}</div>
        ))}
      </div>
    );
  };
  
  const handleBuild = (type: BuildingType) => {
    const config = BUILDING_CONFIGS[type];
    if (!config || !config.buildCost) return;

    // 检查灵石是否足够
    if (spiritStones < config.buildCost.spiritStones) {
      showError(`灵石不足！需要 ${config.buildCost.spiritStones} 灵石，当前拥有 ${Math.floor(spiritStones)} 灵石`);
      return;
    }

    if (buildBuilding(type)) {
      setShowBuildModal(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient">建筑设施</h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            已启用 {activeBuildings.length} / 共 {buildings.length} 座建筑
          </p>
        </div>
        <Button
          variant="gold"
          onClick={() => setShowBuildModal(true)}
        >
          <Plus size={18} className="mr-1.5" />
          新建建筑
        </Button>
      </div>

      {/* 空缺堂口管理：列出无长老管理的堂口，点击跳转详情分配长老 */}
      {vacantBuildings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <button
            onClick={() => setShowVacant(!showVacant)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 text-yellow-400">
              <Building2 size={16} />
              <span className="font-display">空缺堂口 · {vacantBuildings.length} 个待管理</span>
            </div>
            <span className="text-xs text-sect-jade/50">{showVacant ? '收起' : '展开'}</span>
          </button>
          {showVacant && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-sect-jade/50 mb-2">以下堂口暂无长老管辖，点击前往分配长老</p>
              {vacantBuildings.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBuildingId(b.id)}
                  className="w-full flex items-center justify-between p-2 rounded bg-sect-ink-light/30 hover:bg-sect-gold/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sect-gold">{getBuildingIcon(b.type)}</span>
                    <span className="text-sm text-sect-jade">{b.name}</span>
                  </div>
                  <span className="text-xs text-sect-jade/50">
                    {b.assignedDisciples.length}/{b.discipleCapacity} 弟子
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 建筑头像网格：点击直接进入建筑详情 */}
      <div className="building-avatar-grid">
        {buildings.map(building => {
          const isLocked = building.status === 'locked';
          const isClosed = building.status === 'closed';
          const img = getBuildingImage(building.type);

          const statusClass = isLocked
            ? 'building-avatar-status-locked'
            : isClosed
            ? 'building-avatar-status-closed'
            : '';

          return (
            <div
              key={building.id}
              className="building-avatar-item"
            >
              {/* 头像 + 等级角标 + 人数/维护费叠加层 + 名称：点击直接进入详情 */}
              <div
                className="w-full cursor-pointer"
                onClick={() => setSelectedBuildingId(building.id)}
              >
                <div className={`building-avatar-thumb ${statusClass}`}>
                  {img ? (
                    <img src={img} alt={building.name} />
                  ) : (
                    <span className="text-sect-gold flex items-center justify-center w-full h-full">
                      {getBuildingIcon(building.type)}
                    </span>
                  )}
                  <span className="building-avatar-level">Lv.{building.level}</span>
                  {/* 人数/满额叠加层（左下角）— 仅对非锁定建筑显示 */}
                  {!isLocked && building.discipleCapacity > 0 && (
                    <span className="building-avatar-count" title={`弟子 ${building.assignedDisciples.length}/${building.discipleCapacity}`}>
                      {building.assignedDisciples.length}/{building.discipleCapacity}
                    </span>
                  )}
                  {/* 维护费叠加层（右下角）— 仅对开启中建筑显示 */}
                  {!isLocked && !isClosed && (
                    <span className="building-avatar-maintenance" title={`月维护 ${calculateBuildingMaintenance(building)} 灵石`}>
                      -{calculateBuildingMaintenance(building)}
                    </span>
                  )}
                </div>
                <div className="building-avatar-name">{building.name}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
        title={selectedBuilding?.name || '建筑详情'}
        size="md"
      >
        {selectedBuilding && (
          <div className="space-y-3">
            {/* 顶部：头像 + 标题 + 描述 —— 装饰性卡片 */}
            <div className="relative overflow-hidden p-3 rounded-xl bg-gradient-to-br from-sect-gold/8 to-sect-ink-light/10 border border-sect-gold/20">
              {/* 装饰性背景元素 */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-sect-gold/5 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-sect-herb/5 blur-lg" />
              <div className="flex items-start gap-3 relative z-10">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-sect-gold/15 blur-md" />
                  <BuildingThumb type={selectedBuilding.type} size={56} />
                  <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] rounded-full bg-gradient-to-br from-sect-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-sect-gold/20">
                    <span className="text-[9px] font-display text-ink-900 font-bold px-1">{selectedBuilding.level}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="font-display text-base text-gold-gradient leading-none tracking-wide">
                      {selectedBuilding.name}
                    </h2>
                    <Badge
                      size="sm"
                      variant={selectedBuilding.category === 'production' ? 'herb' : selectedBuilding.category === 'special' ? 'pill' : 'default'}
                    >
                      {getCategoryName(selectedBuilding.category)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-sect-jade/80 mt-1 leading-relaxed">
                    {selectedBuilding.description}
                  </p>
                  {/* 建筑状态标签行 */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[9px] text-sect-gold/60 bg-sect-gold/8 px-1.5 py-0.5 rounded-full">
                      Lv.{selectedBuilding.level}/{selectedBuilding.maxLevel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-sect-jade/50">
                      维护 {maintenance}/月
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-sect-jade/50">
                      弟子 {assignedDisciples.length}/{selectedBuilding.discipleCapacity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 概览指标：2 列网格，每项更宽更清晰 */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const items: { label: string; value: number | string; color: string; icon: string }[] = [];
                if (output.spiritStones > 0) items.push({ label: '灵石/月', value: output.spiritStones, color: 'text-green-400', icon: '✦' });
                if (output.herbs > 0) items.push({ label: '灵草/月', value: output.herbs, color: 'text-green-400', icon: '🌿' });
                if (output.iron > 0) items.push({ label: '灵铁/月', value: output.iron, color: 'text-sect-jade', icon: '⛏' });
                if (output.paper > 0) items.push({ label: '符纸/月', value: output.paper, color: 'text-sect-gold', icon: '📜' });
                if (output.pills > 0) items.push({ label: '丹药/月', value: output.pills, color: 'text-sect-herb-light', icon: '💊' });
                if (output.artifacts > 0) items.push({ label: '法器/月', value: output.artifacts, color: 'text-sect-jade', icon: '⚔' });
                if (output.talismans > 0) items.push({ label: '符箓/月', value: output.talismans, color: 'text-sect-gold', icon: '🔮' });
                if (output.reputation > 0) items.push({ label: '声望/月', value: output.reputation, color: 'text-yellow-400', icon: '⭐' });
                if (maintenance > 0) items.push({ label: '维护/月', value: `-${maintenance}`, color: 'text-red-400', icon: '⚡' });
                items.push({ label: '弟子', value: `${assignedDisciples.length}/${selectedBuilding.discipleCapacity}`, color: 'text-sect-jade', icon: '👤' });
                if (selectedBuilding.minDiscipleStatus) {
                  items.push({ label: '准入', value: DiscipleStatusDisplayNames[selectedBuilding.minDiscipleStatus], color: 'text-sect-gold', icon: '🔑' });
                }
                items.push({ label: '贡献/弟子', value: `+${BUILDING_CONTRIBUTION_BONUS[selectedBuilding.type] ?? 0}`, color: 'text-sect-herb-light', icon: '✨' });

                const hasEffect = selectedBuilding.discipleEffect && selectedBuilding.discipleEffect.type !== 'none';

                return (
                  <>
                    {items.map((item, i) => (
                      <div key={i}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-sect-gold/8 bg-gradient-to-br from-sect-ink-light/30 to-sect-ink-light/10 hover:border-sect-gold/25 hover:from-sect-ink-light/40 hover:to-sect-ink-light/20 transition-all duration-200"
                      >
                        <span className="text-[14px] leading-none">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-display ${item.color} font-bold leading-none`}>
                            {item.value}
                          </div>
                          <div className="text-[9px] text-sect-jade/50 mt-0.5">{item.label}</div>
                        </div>
                      </div>
                    ))}
                    {hasEffect && (
                      <div className="col-span-2 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-sect-gold/30 bg-gradient-to-br from-sect-gold/12 to-sect-gold/5">
                        <span className="text-[16px]">⭐</span>
                        <div className="flex-1">
                          <div className="text-[10px] text-sect-gold/70">{getEffectTypeName(selectedBuilding.discipleEffect!.type)}</div>
                          <div className="text-sm font-display text-sect-gold font-bold">{selectedBuilding.discipleEffect!.value}</div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* 特殊建筑作用说明 —— 装饰性卡片 */}
            {selectedBuilding.type === 'mountain_gate' && (
              <div className="relative overflow-hidden rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/8 to-blue-500/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-blue-500/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-blue-500/15">
                    <Shield size={14} className="text-blue-300" />
                  </span>
                  <span className="font-display text-blue-300 text-xs">山门作用</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>驻守弟子每月 +5 贡献点</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>每级满员 +5% 防御战力</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-400">★</span>升至 10 级满员化为护山大阵，+50% 战力</div>
                  <div className="flex items-center gap-1.5"><span className="text-blue-400">↑</span>每级 +10 容量，最高 10 级</div>
                </div>
                <div className="mt-2 text-[10px] text-blue-400/60 bg-blue-500/5 rounded-lg px-2 py-1 relative z-10">
                  当前：Lv.{selectedBuilding.level} · 容量 {selectedBuilding.discipleCapacity} ·
                  {selectedBuilding.assignedDisciples.length >= selectedBuilding.discipleCapacity
                    ? <span className="text-emerald-400">已满员 +{(selectedBuilding.level * 5)}% 战力</span>
                    : <span className="text-yellow-400">未满员（满员后生效）</span>}
                </div>
              </div>
            )}

            {selectedBuilding.type === 'lecture_hall' && (
              <div className="relative overflow-hidden rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/8 to-purple-500/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-purple-500/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-purple-500/15">
                    <BookOpen size={14} className="text-purple-300" />
                  </span>
                  <span className="font-display text-purple-300 text-xs">讲经堂作用</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-orange-400">−</span>听讲弟子每月消耗 {Math.abs(BUILDING_CONTRIBUTION_BONUS['lecture_hall'] ?? -5)} 贡献</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>听讲弟子修炼 +10%，讲师越强加成越高</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-400">★</span>讲师同享修炼加成</div>
                </div>
                {selectedBuilding.managerId && (
                  <div className="mt-2 text-[10px] text-purple-400/60 bg-purple-500/5 rounded-lg px-2 py-1 relative z-10">
                    当前讲师：{disciples.find(d => d.id === selectedBuilding.managerId)?.name || '未知'}
                  </div>
                )}
              </div>
            )}

            {selectedBuilding.type === 'servant_hall' && (
              <div className="relative overflow-hidden rounded-xl border border-green-500/25 bg-gradient-to-br from-green-500/8 to-green-500/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-green-500/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-green-500/15">
                    <Wrench size={14} className="text-green-300" />
                  </span>
                  <span className="font-display text-green-300 text-xs">杂役堂作用</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>杂役弟子劳作赚取贡献点</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-400">★</span>每名弟子每月 +10 贡献</div>
                  <div className="flex items-center gap-1.5"><span className="text-blue-400">↑</span>每级 +10 容量；灵韵越高产出越多</div>
                </div>
                <div className="mt-2 text-[10px] text-green-400/60 bg-green-500/5 rounded-lg px-2 py-1 relative z-10">
                  Lv.{selectedBuilding.level} · 容量 {selectedBuilding.discipleCapacity} · 最高 5 级
                </div>
              </div>
            )}

            {selectedBuilding.type === 'spirit_beast_garden' && (
              <div className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 to-emerald-500/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-emerald-500/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-emerald-500/15">
                    <TreePine size={14} className="text-emerald-300" />
                  </span>
                  <span className="font-display text-emerald-300 text-xs">灵兽原</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>弟子于灵兽原培养，每月 +{BUILDING_CONTRIBUTION_BONUS['spirit_beast_garden'] ?? 7} 贡献</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>每只灵兽每月消耗 2 灵草维持</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-400">★</span>解锁条件：山门达到 2 级</div>
                </div>

                {/* 购买 / 捕捉 */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="gold"
                    size="sm"
                    className="text-[11px] py-1"
                    disabled={spiritStones < 500}
                    onClick={() => {
                      const r = buyBeast();
                      if (!r.ok && r.reason) showError(r.reason);
                    }}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Gem size={11} />购买灵兽 (500)
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] py-1 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => setShowBeastCapturePicker(v => !v)}
                  >
                    派遣弟子捕捉
                  </Button>
                </div>
                {spiritStones < 500 && (
                  <div className="text-[10px] text-red-400/80">灵石不足，无法购买</div>
                )}

                {/* 捕捉弟子选择 */}
                {showBeastCapturePicker && (
                  <div className="bg-sect-ink-light/40 border border-emerald-500/20 rounded p-1.5 max-h-40 overflow-y-auto">
                    <div className="text-[10px] text-sect-jade/60 mb-1">选择空闲弟子（战力越高成功率越高）</div>
                    {disciples.filter(d => !d.onTrialId && !d.isBreakingThrough).length === 0 ? (
                      <div className="text-[10px] text-yellow-400 px-1 py-1">暂无可用弟子</div>
                    ) : (
                      <div className="space-y-0.5">
                        {disciples
                          .filter(d => !d.onTrialId && !d.isBreakingThrough)
                          .sort((a, b) => calculateDiscipleCombatPower(b) - calculateDiscipleCombatPower(a))
                          .map(d => (
                          <button
                            key={d.id}
                            type="button"
                            className="w-full flex items-center justify-between px-2 py-1 rounded bg-sect-ink-light/30 hover:bg-emerald-500/15 transition-colors"
                            onClick={() => {
                              const r = captureBeast(d.id);
                              if (!r.ok && r.reason) showError(r.reason);
                              setShowBeastCapturePicker(false);
                            }}
                          >
                            <span className="text-[11px] text-sect-jade">{d.name}</span>
                            <span className="flex items-center gap-2">
                              <span className={`text-[10px] ${getRealmColor(d.realm)}`}>
                                {getRealmDisplay(d)}
                              </span>
                              <span className="text-[9px] text-sect-gold/60">
                                {Math.floor(calculateDiscipleCombatPower(d)).toLocaleString()}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 灵兽库存 */}
                <div className="bg-sect-ink-light/30 border border-emerald-500/15 rounded p-1.5">
                  <div className="text-[10px] text-emerald-300/80 mb-1">灵兽存栏</div>
                  {beastInventory.length === 0 ? (
                    <div className="text-[10px] text-sect-jade/40">尚无灵兽</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {beastInventory.map(b => (
                        <div key={b.type} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-500/5">
                          <span className="text-[11px] text-sect-jade">{BeastTypeNames[b.type]}</span>
                          <span className="text-[10px] text-emerald-300">×{b.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedBuilding.type === 'secret_library' && (
              <div className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/8 to-amber-500/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-amber-500/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-amber-500/15">
                    <BookOpen size={14} className="text-amber-300" />
                  </span>
                  <span className="font-display text-amber-300 text-xs">藏经阁</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>弟子于此学习功法，无额外基础贡献</div>
                  <div className="flex items-center gap-1.5"><span className="text-amber-400">★</span>金丹期以上弟子可推演功法，每月获取贡献</div>
                  <div className="flex items-center gap-1.5"><span className="text-blue-400">↑</span>推演贡献随道缘、藏经阁等级提升</div>
                </div>
                <div className="mt-2 text-[10px] text-amber-400/60 bg-amber-500/5 rounded-lg px-2 py-1 relative z-10">
                  Lv.{selectedBuilding.level} · 可推演弟子：
                  {assignedDisciples.filter(d => RealmOrder.indexOf(d.realm) >= RealmOrder.indexOf('golden')).length} 人
                </div>
              </div>
            )}

            {RESIDENCE_TYPES.includes(selectedBuilding.type) && selectedBuilding.type !== 'cave_mansion' && (
              <div className="relative overflow-hidden rounded-xl border border-sect-gold/25 bg-gradient-to-br from-sect-gold/8 to-sect-gold/2 p-3">
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-sect-gold/5 blur-xl" />
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="p-1.5 rounded-lg bg-sect-gold/15">
                    <Building2 size={14} className="text-sect-gold" />
                  </span>
                  <span className="font-display text-sect-gold text-xs">居所升级</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-sect-jade/80 leading-snug ml-1 relative z-10">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span>每级 +10 可居住弟子</div>
                </div>
                <div className="mt-2 text-[10px] text-sect-jade/60 bg-sect-ink-light/30 rounded-lg px-2 py-1 relative z-10">
                  Lv.{selectedBuilding.level} · 容量 {selectedBuilding.discipleCapacity}
                </div>
              </div>
            )}

            {selectedBuilding.type === 'cave_mansion' && (() => {
              const residents = assignedDisciples;
              const elders = disciples.filter(d => d.status === 'elder');
              const nonResidentElders = elders.filter(d => !selectedBuilding.assignedDisciples.includes(d.id));
              const isFull = selectedBuilding.assignedDisciples.length >= selectedBuilding.discipleCapacity;
              return (
                <div className="bg-gradient-to-br from-purple-500/10 to-yellow-500/5 border border-sect-gold/40 rounded p-2 text-[11px] space-y-2">
                  <div className="font-display text-sect-gold flex items-center gap-1">
                    <Crown size={12} />洞府长老居所
                  </div>
                  <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                    <div>✓ 专属长老居所，Lv1=1 人，每级 +2 人，最高 5 级（9 人）</div>
                    <div>★ 洞府住满后，其他长老可挑战现任长老以夺取洞府居住权</div>
                    <div>↑ 升级洞府以容纳更多长老</div>
                  </div>
                  <div className="text-[10px] text-sect-gold/80">
                    Lv.{selectedBuilding.level} · 容量 {selectedBuilding.assignedDisciples.length}/{selectedBuilding.discipleCapacity}
                    {isFull ? <span className="text-red-400 ml-1">（已满）</span> : <span className="text-emerald-400 ml-1">（有空位）</span>}
                  </div>

                  {/* 当前居住长老 */}
                  {residents.length > 0 && (
                    <div className="bg-sect-ink-light/40 rounded p-1.5 border border-sect-gold/10">
                      <div className="text-[10px] text-sect-gold/70 mb-1">洞府内长老</div>
                      <div className="space-y-1">
                        {residents.map(r => {
                          const power = calculateDiscipleCombatPower(r);
                          return (
                            <div key={r.id} className="flex items-center justify-between gap-1 bg-sect-ink-light/30 rounded px-1.5 py-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <SimpleAvatar seed={r.avatarSeed} name={r.name} status={r.status} realm={r.realm} size={18} />
                                <span className="text-[11px] text-sect-jade truncate">{r.name}</span>
                              </div>
                              <span className="text-[10px] text-sect-herb-light font-mono whitespace-nowrap">战力 {power}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 空位 / 挑战 操作区 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {!isFull && (
                      <Button
                        variant="gold"
                        size="sm"
                        className="text-[11px] py-1 col-span-2"
                        disabled={nonResidentElders.length === 0}
                        onClick={() => setShowElderPicker(true)}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Plus size={11} />安排长老入住 ({nonResidentElders.length})
                        </span>
                      </Button>
                    )}
                    {isFull && residents.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[11px] py-1 col-span-2 border-red-500/40 text-red-300 hover:bg-red-500/15"
                        disabled={nonResidentElders.length === 0}
                        onClick={() => setShowChallengePicker(true)}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Swords size={11} />发起挑战 ({nonResidentElders.length})
                        </span>
                      </Button>
                    )}
                  </div>

                  {/* 选择长老入住 */}
                  {showElderPicker && !isFull && (
                    <div className="bg-sect-ink-light/40 border border-sect-gold/20 rounded p-1.5 max-h-40 overflow-y-auto">
                      <div className="text-[10px] text-sect-gold/80 mb-1">选择一名无洞府长老入住（消耗 1000 贡献）</div>
                      {nonResidentElders.length === 0 ? (
                        <div className="text-[10px] text-sect-jade/50">所有长老均已入住</div>
                      ) : (
                        <div className="space-y-0.5">
                          {nonResidentElders.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              className="w-full flex items-center justify-between px-2 py-1 rounded bg-sect-ink-light/30 hover:bg-sect-gold/20 transition-colors disabled:opacity-50"
                              disabled={d.contributionPoints < 1000}
                              onClick={() => {
                                if (buyCaveMansion(d.id)) {
                                  setShowElderPicker(false);
                                } else {
                                  showError('入住洞府失败');
                                }
                              }}
                            >
                              <span className="flex items-center gap-1 text-[11px] text-sect-jade">
                                <SimpleAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={16} />
                                {d.name}
                              </span>
                              <span className={`text-[10px] ${d.contributionPoints < 1000 ? 'text-red-400' : 'text-sect-gold'}`}>
                                贡献 {Math.floor(d.contributionPoints)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 挑战选择器 */}
                  {showChallengePicker && isFull && (
                    <div className="bg-sect-ink-light/40 border border-red-500/20 rounded p-1.5 max-h-56 overflow-y-auto space-y-2">
                      <div className="text-[10px] text-red-300 mb-1">选择挑战方长老 → 再选择被挑战的洞府居住长老（挑战方消耗 1000 贡献）</div>
                      {nonResidentElders.length === 0 ? (
                        <div className="text-[10px] text-sect-jade/50">无符合条件的非洞府长老</div>
                      ) : (
                        nonResidentElders.map(challenger => (
                          <div key={challenger.id} className="bg-sect-ink-light/30 rounded p-1.5 border border-sect-gold/10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-sect-jade flex items-center gap-1">
                                <SimpleAvatar seed={challenger.avatarSeed} name={challenger.name} status={challenger.status} realm={challenger.realm} size={16} />
                                {challenger.name}
                              </span>
                              <span className="text-[10px] text-sect-herb-light font-mono">
                                战力 {calculateDiscipleCombatPower(challenger)}
                              </span>
                            </div>
                            <div className="text-[10px] text-sect-jade/60 mb-1">挑战：</div>
                            <div className="space-y-0.5">
                              {residents.map(defender => {
                                const dPower = calculateDiscipleCombatPower(defender);
                                const cPower = calculateDiscipleCombatPower(challenger);
                                const winRate = Math.round((cPower / (cPower + dPower)) * 100);
                                return (
                                  <button
                                    key={defender.id}
                                    type="button"
                                    className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded bg-sect-ink-light/40 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                                    disabled={challenger.contributionPoints < 1000}
                                    onClick={() => {
                                      const r = challengeCaveMansion(challenger.id, defender.id);
                                      if (r.success) {
                                        setShowChallengePicker(false);
                                      } else if (r.reason) {
                                        showError(r.reason);
                                      }
                                    }}
                                  >
                                    <span className="flex items-center gap-1 text-[11px] text-sect-jade">
                                      <SimpleAvatar seed={defender.avatarSeed} name={defender.name} status={defender.status} realm={defender.realm} size={14} />
                                      {defender.name}
                                    </span>
                                    <span className="text-[10px] text-red-300/80">
                                      战力 {dPower} · 胜率约 {winRate}%
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedBuilding.type === 'skyscraper_tower' && (() => {
              // 通天塔挑战：战力达 20 万的弟子可挑战，胜利飞升，失败境界跌落一级
              const eligibleDisciples = disciples.filter(d => calculateDiscipleCombatPower(d) >= SKYSCRAPER_TOWER_COMBAT_POWER);
              const challenger = towerChallengerId ? disciples.find(d => d.id === towerChallengerId) : null;
              const challengerPower = challenger ? calculateDiscipleCombatPower(challenger) : 0;
              const winRate = challenger
                ? Math.round(Math.min(0.95, Math.max(0.05, challengerPower / (challengerPower + SKYSCRAPER_TOWER_COMBAT_POWER))) * 100)
                : 0;
              return (
                <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-400/40 rounded p-2 text-[11px] space-y-2">
                  <div className="font-display text-yellow-300 flex items-center gap-1">
                    <Crown size={12} />通天塔 · 飞升试炼
                  </div>
                  <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                    <div>✓ 通天塔战力 <span className="text-yellow-300 font-mono">{SKYSCRAPER_TOWER_COMBAT_POWER.toLocaleString()}</span></div>
                    <div>★ 弟子战力达 20 万方可挑战，胜利即飞升仙界，游戏胜利</div>
                    <div>⚠ 挑战失败，境界跌落一级，修为受损</div>
                  </div>

                  {/* 候选挑战弟子列表 */}
                  <div className="bg-sect-ink-light/40 rounded p-1.5 border border-yellow-400/20">
                    <div className="text-[10px] text-yellow-300/80 mb-1">
                      可挑战弟子（战力 ≥ 20 万）：{eligibleDisciples.length} 人
                    </div>
                    {eligibleDisciples.length === 0 ? (
                      <div className="text-[10px] text-sect-jade/50">暂无弟子达到挑战条件，继续修炼。</div>
                    ) : (
                      <div className="space-y-0.5">
                        {eligibleDisciples.map(d => {
                          const power = calculateDiscipleCombatPower(d);
                          const wr = Math.round(Math.min(0.95, Math.max(0.05, power / (power + SKYSCRAPER_TOWER_COMBAT_POWER))) * 100);
                          const isSelected = towerChallengerId === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded transition-colors ${isSelected ? 'bg-yellow-500/20 border border-yellow-400/50' : 'bg-sect-ink-light/30 hover:bg-yellow-500/15'}`}
                              onClick={() => setTowerChallengerId(isSelected ? null : d.id)}
                            >
                              <span className="flex items-center gap-1 text-[11px] text-sect-jade min-w-0">
                                <SimpleAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={16} />
                                <span className="truncate">{d.name}</span>
                                <span className="text-[9px] text-sect-jade/50">{getRealmDisplay(d)}</span>
                              </span>
                              <span className="text-[10px] text-yellow-300/90 font-mono whitespace-nowrap">
                                战力 {power.toLocaleString()} · 胜率 {wr}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 确认挑战 */}
                  {challenger && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded p-1.5 space-y-1.5">
                      <div className="text-[10px] text-yellow-200/90 leading-snug">
                        确认由 <span className="text-yellow-300 font-display">{challenger.name}</span>（战力 {challengerPower.toLocaleString()}）挑战通天塔？
                        <br />预估胜率 <span className="text-yellow-300 font-display">{winRate}%</span>，失败将跌落至 <span className="text-red-300">{getRealmDisplay({ realm: RealmOrder[Math.max(0, RealmOrder.indexOf(challenger.realm) - 1)], realmStage: 'late' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="gold"
                          size="sm"
                          className="text-[11px] py-1 flex-1"
                          onClick={() => {
                            const r = challengeSkyscraperTower(challenger.id);
                            if (!r.success && r.reason) {
                              showError(r.reason);
                            } else {
                              setTowerChallengerId(null);
                            }
                          }}
                        >
                          <span className="flex items-center justify-center gap-1">
                            <Sparkles size={11} />确认挑战 · 飞升试炼
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[11px] py-1"
                          onClick={() => setTowerChallengerId(null)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedBuilding.discipleCapacity > 0 && (
              <>
                {/* 升级区域 */}
                {(() => {
                  const detailUpgradeCost = getUpgradeCost(selectedBuilding);
                  const detailCanUpgrade = canUpgrade(selectedBuilding);
                  const detailBlockReason = getUpgradeBlockReason(selectedBuilding);
                  const atMaxLevel = !isResidenceBuilding(selectedBuilding.type) &&
                    selectedBuilding.level >= selectedBuilding.maxLevel;
                  return detailUpgradeCost && selectedBuilding.level < selectedBuilding.maxLevel ? (
                    <div className="rounded-lg border border-sect-gold/25 bg-gradient-to-br from-sect-gold/8 to-sect-gold/2 p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <div className="font-display text-sect-gold flex items-center gap-1.5 text-xs">
                            <ArrowUp size={13} />升级建筑
                          </div>
                          <div className="text-[10px] text-sect-jade/70 mt-0.5">
                            Lv.{selectedBuilding.level} → Lv.{selectedBuilding.level + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-[11px] text-sect-jade/80">
                            <Gem size={12} className="text-sect-gold" /> {detailUpgradeCost.spiritStones}
                          </span>
                          {detailUpgradeCost.reputation && detailUpgradeCost.reputation > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-blue-300/80">
                              <Star size={12} /> {detailUpgradeCost.reputation}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full text-xs py-1.5"
                        onClick={() => handleUpgrade(selectedBuilding.id)}
                        disabled={!detailCanUpgrade}
                      >
                        {detailCanUpgrade ? '升级' : (detailBlockReason || '无法升级')}
                      </Button>
                    </div>
                  ) : null;
                })()}

                {/* 降级区域 */}
                {(() => {
                  if (selectedBuilding.level <= 1) return null;
                  const isCave = selectedBuilding.type === 'cave_mansion';
                  const isRes = isResidenceBuilding(selectedBuilding.type);
                  let refundStones = 0;
                  if (isCave) {
                    const c = getCaveMansionUpgradeCost(selectedBuilding.level - 1);
                    if (c) refundStones = c.spiritStones;
                  } else if (isRes) {
                    const c = getResidenceUpgradeCost({ ...selectedBuilding, level: selectedBuilding.level - 1 });
                    if (c) refundStones = c.spiritStones;
                  } else {
                    const c = selectedBuilding.upgradeCosts[selectedBuilding.level - 2];
                    if (c) refundStones = c.spiritStones;
                  }
                  if (refundStones <= 0) return null;
                  return (
                    <div className="rounded-lg border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <div className="font-display text-red-300/90 flex items-center gap-1.5 text-xs">
                            <ArrowDown size={13} />降级建筑
                          </div>
                          <div className="text-[10px] text-sect-jade/70 mt-0.5">
                            Lv.{selectedBuilding.level} → Lv.{selectedBuilding.level - 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 shrink-0 flex-wrap justify-end">
                          <span className="flex items-center gap-1"><Gem size={12} /> {refundStones}</span>
                          {(() => {
                            const r = isCave
                              ? 0
                              : isRes
                              ? getResidenceUpgradeCost({ ...selectedBuilding, level: selectedBuilding.level - 1 })?.reputation ?? 0
                              : selectedBuilding.upgradeCosts[selectedBuilding.level - 2]?.reputation ?? 0;
                            return r > 0 ? <span className="flex items-center gap-1 text-blue-300"><Star size={12} /> {r}</span> : null;
                          })()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs py-1"
                        onClick={() => {
                          if (confirm(`确认将「${selectedBuilding.name}」降级至 Lv.${selectedBuilding.level - 1}？将返还升级时消耗的资源。`)) {
                            const r = downgradeBuilding(selectedBuilding.id);
                            if (!r.success && r.reason) alert(r.reason);
                          }
                        }}
                      >
                        降级并返还资源
                      </Button>
                    </div>
                  );
                })()}

                <div className="divider-gold !my-0" />

                {/* 堂主管理 */}
                {(() => {
                  const canHaveManager = selectedBuilding.discipleCapacity > 0 &&
                    !RESIDENCE_TYPES_FOR_VACANT.includes(selectedBuilding.type);
                  if (!canHaveManager) return null;
                  const currentManager = selectedBuilding.managerId
                    ? disciples.find(d => d.id === selectedBuilding.managerId)
                    : null;
                  // 堂主任命规则：金丹期（golden）及以上方可担任
                  const goldenIndex = RealmOrder.indexOf('golden');
                  const candidates = disciples.filter(d => RealmOrder.indexOf(d.realm) >= goldenIndex);
                  return (
                    <div className="rounded-lg border border-purple-500/25 bg-gradient-to-br from-purple-500/8 to-purple-500/2 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-purple-500/15">
                            <Crown size={13} className="text-sect-spirit" />
                          </span>
                          <span className="font-display text-sect-spirit text-xs">堂主</span>
                          {currentManager ? (
                            <span className="text-[11px] text-sect-jade/90 font-medium">{currentManager.name}</span>
                          ) : (
                            <span className="text-[10px] text-yellow-400/90 bg-yellow-500/10 px-1.5 py-0.5 rounded">空缺中</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] py-0.5 px-2"
                          onClick={() => setShowManagerPicker(!showManagerPicker)}>
                          {currentManager ? '撤换' : '任命'}
                        </Button>
                      </div>
                      {showManagerPicker && (
                        <div className="mt-2 space-y-0.5 max-h-56 overflow-y-auto pr-1">
                          {currentManager && (
                            <button
                              onClick={() => { setBuildingManager(selectedBuilding.id, null); setShowManagerPicker(false); }}
                              className="w-full flex items-center justify-between px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                            >
                              <span className="text-[11px] text-red-300">免去 {currentManager.name} 堂主之职</span>
                              <X size={12} className="text-red-400" />
                            </button>
                          )}
                          {candidates.length === 0 ? (
                            <div className="text-center py-2 text-[10px] text-sect-jade/40">
                              暂无合格弟子（需金丹期及以上）
                            </div>
                          ) : candidates.map(d => (
                            <button
                              key={d.id}
                              onClick={() => { setBuildingManager(selectedBuilding.id, d.id); setShowManagerPicker(false); }}
                              className="w-full flex items-center justify-between px-2 py-1 rounded bg-sect-ink-light/30 hover:bg-sect-gold/10 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-sect-jade">{d.name}</span>
                                <Badge variant="default" size="sm">{DiscipleStatusNames[d.status]}</Badge>
                                <span className={`text-[10px] ${getRealmColor(d.realm)}`}>{getRealmDisplay(d)}</span>
                              </div>
                              <span className="text-[10px] text-sect-jade/50">贡献 {d.contributionPoints}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 生产目标选择器：丹堂/炼器堂/符堂（多槽位，按等级解锁） */}
                {(selectedBuilding.type === 'pill_hall' || selectedBuilding.type === 'sutra_hall' || selectedBuilding.type === 'artifact_hall') && (
                  <ProductionTargetSelector
                    building={selectedBuilding}
                    unlockedPillRecipes={unlockedPillRecipes}
                    unlockedArtifactRecipes={unlockedArtifactRecipes}
                    unlockedTalismanRecipes={unlockedTalismanRecipes}
                    onSet={(slotIndex, target) => setProductionTarget(selectedBuilding.id, slotIndex, target)}
                    onClear={(slotIndex) => clearProductionTarget(selectedBuilding.id, slotIndex)}
                  />
                )}

                {/* 贡献度设置：居所类建筑不显示（居所不涉及贡献产出/消耗） */}
                {!isResidenceType(selectedBuilding.type) && (
                  <ContributionSettingsEditor
                    building={selectedBuilding}
                    onChange={settings => setBuildingContributionSettings(selectedBuilding.id, settings)}
                    onReset={() => setBuildingContributionSettings(selectedBuilding.id, { monthlyGainPerDisciple: undefined, monthlyCostPerDisciple: undefined })}
                  />
                )}

                {/* 在堂弟子 —— 再紧凑，头像小一点，行高差小 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-xs text-sect-gold/90 flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-sect-gold/10">
                        <Users size={13} className="text-sect-gold" />
                      </span>
                      在堂弟子 ({assignedDisciples.length}/{selectedBuilding.discipleCapacity})
                    </h3>
                    {!RESIDENCE_TYPES_FOR_VACANT.includes(selectedBuilding.type) && (
                      <div className="flex items-center gap-1.5">
                        {selectedBuilding.type !== 'secret_library' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] py-0.5 px-2 border border-sect-gold/30 text-sect-jade/80 hover:text-sect-gold hover:border-sect-gold/60"
                            onClick={() => { setSelectedBuildingId(selectedBuilding.id); setActivePanel('buildings'); }}
                            title="跳转到「弟子分配」面板"
                          >
                            <Plus size={11} className="mr-0.5" />
                            分配面板
                          </Button>
                        )}
                        {!isResidenceType(selectedBuilding.type) && selectedBuilding.type !== 'cave_mansion' && (
                          <Button
                            size="sm"
                            variant="gold"
                            className="text-[10px] py-0.5 px-2"
                            onClick={() => setShowAssignPicker(v => !v)}
                            disabled={selectedBuilding.assignedDisciples.length >= selectedBuilding.discipleCapacity}
                          >
                            <Plus size={11} className="mr-0.5" />
                            分配弟子
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 简易分配器：直接从符合条件的空闲弟子中挑一个加入 */}
                  {showAssignPicker && !isResidenceType(selectedBuilding.type) && selectedBuilding.type !== 'cave_mansion' && (() => {
                    const statusOrder: any[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];
                    const minIdx = selectedBuilding.minDiscipleStatus ? statusOrder.indexOf(selectedBuilding.minDiscipleStatus) : 0;
                    // 找所有 1) 符合身份准入 2) 未在此工作 3) 非长老的弟子（长老不参与生产分配，除非是讲经堂/藏经阁——允许所有）
                    const isSpecial = selectedBuilding.type === 'lecture_hall' || selectedBuilding.type === 'secret_library';
                    const candidates = disciples.filter(d => {
                      if (selectedBuilding.assignedDisciples.includes(d.id)) return false;
                      const sIdx = statusOrder.indexOf(d.status);
                      if (sIdx < minIdx) return false;
                      if (!isSpecial && d.status === 'elder') return false;
                      return true;
                    });
                    return (
                      <div className="bg-sect-ink-light/40 border border-sect-gold/20 rounded p-1.5 mb-2">
                        <div className="text-[10px] text-sect-jade/60 mb-1">
                          点击弟子加入此堂口（会自动从之前的工作堂口移除，保留居所）
                          {selectedBuilding.assignedDisciples.length >= selectedBuilding.discipleCapacity && <span className="ml-1 text-red-300">（已满）</span>}
                        </div>
                        {candidates.length === 0 ? (
                          <div className="text-[10px] text-yellow-400 px-1 py-1">暂无符合条件的弟子（身份准入：{selectedBuilding.minDiscipleStatus || '无'}）</div>
                        ) : (
                          <div className="space-y-0.5 max-h-40 overflow-y-auto pr-0.5">
                            {candidates.map(d => {
                              const curBd = buildings.find(b =>
                                !RESIDENCE_TYPES_FOR_VACANT.includes(b.type) && b.assignedDisciples.includes(d.id));
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  className="w-full flex items-center justify-between px-2 py-1 rounded bg-sect-ink-light/30 hover:bg-sect-gold/10 transition-colors disabled:opacity-40"
                                  disabled={selectedBuilding.assignedDisciples.length >= selectedBuilding.discipleCapacity}
                                  onClick={() => {
                                    assignDiscipleToBuilding(d.id, selectedBuilding.id);
                                    if (selectedBuilding.assignedDisciples.length + 1 >= selectedBuilding.discipleCapacity) {
                                      setShowAssignPicker(false);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <SimpleAvatar seed={d.avatarSeed} size={20} status={d.status} realm={d.realm} name={d.name} />
                                    <span className="text-[11px] text-sect-jade">{d.name}</span>
                                    <Badge variant="default" size="sm">{DiscipleStatusNames[d.status]}</Badge>
                                    <span className={`text-[10px] ${getRealmColor(d.realm)}`}>{getRealmDisplay(d)}</span>
                                  </div>
                                  <span className="text-[10px] text-sect-jade/50">
                                    {curBd ? `原：${curBd.name}` : '空闲'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-1.5 text-right">
                          <Button size="sm" variant="ghost" className="text-[10px] py-0.5 px-2"
                            onClick={() => setShowAssignPicker(false)}>收起</Button>
                        </div>
                      </div>
                    );
                  })()}

                  {assignedDisciples.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-sect-jade/40">
                      暂无弟子在此处修行，点击右上角「分配弟子」或前往「弟子分配」面板安排
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {assignedDisciples.map(disciple => (
                        <div key={disciple.id}
                          className="flex items-center gap-2 px-2 py-1 rounded border border-sect-gold/15 bg-sect-ink-light/30 hover:border-sect-gold/40 transition-colors">
                          <SimpleAvatar seed={disciple.avatarSeed} size={30} status={disciple.status} realm={disciple.realm} name={disciple.name} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-display text-[11px] text-sect-jade leading-none">
                                {disciple.name}
                              </span>
                              <Badge variant="default" size="sm">{DiscipleStatusNames[disciple.status]}</Badge>
                              <span className={`text-[10px] ${getRealmColor(disciple.realm)}`}>
                                {getRealmDisplay(disciple)}
                              </span>
                              {selectedBuilding.managerId === disciple.id && (
                                <Badge variant="gold" size="sm">
                                  <Crown size={10} className="mr-0.5" />堂主
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-sect-jade/60">
                              <span className="flex items-center gap-0.5">
                                <Sparkles size={10} className="text-sect-gold/60" />
                                灵韵{getTalentLevel(disciple.hiddenTalents.spiritRhythm)}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <TrendingUp size={10} className="text-sect-herb-light/60" />
                                贡献 {disciple.contributionPoints}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Heart size={10} className="text-red-400/60" />
                                {Math.floor(disciple.age)}岁
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1">
                            {!RESIDENCE_TYPES_FOR_VACANT.includes(selectedBuilding.type) && (
                              <Tooltip content={`将${disciple.name}移出此堂口`}>
                                <button
                                  className="text-sect-jade/30 hover:text-red-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assignDiscipleToBuilding(disciple.id, null);
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </Tooltip>
                            )}
                            <div>
                              <div className="text-[9px] text-sect-jade/60">修为</div>
                              <div className="text-[11px] text-sect-jade leading-none">
                                {Math.floor(disciple.realmProgress)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedBuilding.type === 'secret_library' && (
              <>
                <div className="divider-gold !my-0" />
                <LibraryPanel buildingId={selectedBuilding.id} />
              </>
            )}
          </div>
        )}
      </Modal>
      
      <Modal
        isOpen={showBuildModal}
        onClose={() => setShowBuildModal(false)}
        title="新建建筑"
        size="lg"
      >
        <div className="space-y-4">
          {/* 错误提示 */}
          {buildError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
              {buildError}
            </div>
          )}

          <p className="text-sect-jade/60 text-sm">
            选择要建造的建筑，消耗灵石即可修建
          </p>

          {/* 已解锁可建造的建筑 */}
          {unlockedToBuild.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-sect-gold mb-2">可建造</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {unlockedToBuild.map(type => {
                  const config = BUILDING_CONFIGS[type];
                  const canBuildThis = canBuild(type);

                  return (
                    <Card
                      key={type}
                      className={`cursor-pointer transition-all ${
                        canBuildThis
                          ? 'hover:border-sect-gold/50 hover:bg-sect-gold/5'
                          : 'opacity-70'
                      }`}
                      onClick={() => canBuildThis && handleBuild(type)}
                    >
                      <div className="flex items-start gap-3">
                        <BuildingThumb type={type} size={48} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sect-jade">
                              {config.name}
                            </span>
                            <Badge
                              variant={config.category === 'production' ? 'herb' : config.category === 'special' ? 'pill' : 'default'}
                              size="sm"
                            >
                              {getCategoryName(config.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-sect-jade/50 mt-1 line-clamp-2">
                            {config.description}
                          </p>
                          {config.buildCost && (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-sect-gold">
                                <Gem size={12} /> {config.buildCost.spiritStones}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 未解锁的建筑 */}
          {lockedBuildings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">未解锁</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {lockedBuildings.map(type => {
                  const config = BUILDING_CONFIGS[type];

                  // 解锁条件描述
                  const getUnlockDescription = () => {
                    if (!config.unlockRequirement) return null;
                    const parts: string[] = [];
                    if (config.unlockRequirement.sectLevel) {
                      const levelName = SectLevelNames[config.unlockRequirement.sectLevel];
                      parts.push(`宗门达到${levelName}级`);
                    }
                    if (config.unlockRequirement.buildings) {
                      config.unlockRequirement.buildings.forEach(req => {
                        const reqBuilding = BUILDING_CONFIGS[req.type];
                        parts.push(`${reqBuilding?.name || req.type}达到Lv.${req.level}`);
                      });
                    }
                    return parts.join('、');
                  };

                  return (
                    <Card
                      key={type}
                      className="opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gray-500/20">
                          <span className="text-gray-500">
                            <Lock size={20} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-gray-400">
                              {config.name}
                            </span>
                            <Badge
                              variant="default"
                              size="sm"
                            >
                              {getCategoryName(config.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {config.description}
                          </p>
                          {getUnlockDescription() && (
                            <div className="text-xs text-red-400 mt-2">
                              需要：{getUnlockDescription()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {allBuildingsToShow.length === 0 && (
            <div className="text-center py-8 text-sect-jade/40">
              所有建筑均已建造
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
