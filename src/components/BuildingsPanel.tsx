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
  Hammer, Scroll, Zap, TreePine, Crown, Info, X
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { LibraryPanel } from '@/components/LibraryPanel';
import { calculateBuildingMaintenance, calculateBuildingOutput, getResidenceUpgradeCost } from '@/utils/gameLogic';
import { RealmNames, RealmOrder, DiscipleStatusNames } from '@/types/disciple';
import type { BuildingType } from '@/types/building';
import { RESIDENCE_TYPES, RESIDENCE_TYPES_WITH_CAVE, isResidenceType } from '@/types/building';
import { BUILDING_CONFIGS } from '@/data/buildings';
import { SectLevelNames } from '@/types/game';
import { SectIcon } from '@/components/icons/SectIcons';
import { SimpleAvatar } from '@/components/ui/Avatar';
import { getBuildingImage } from '@/data/buildingImages';
import { BUILDING_CONTRIBUTION_BONUS } from '@/domain/balance';

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
    case 'guardian_array': return <Shield size={24} />;
    case 'skyscraper_tower': return <Crown size={24} />;
    default: return <Building2 size={24} />;
  }
}

export const BuildingsPanel: React.FC = () => {
  const {
    buildings, disciples, spiritStones, reputation, sectLevel,
    upgradeBuilding, downgradeBuilding, toggleBuilding, buildBuilding, setBuildingManager
  } = useGameStore();
  const { selectedBuildingId, setSelectedBuildingId } = useUIStore();
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showVacant, setShowVacant] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);

  // 显示错误提示
  const showError = (message: string) => {
    setBuildError(message);
    setTimeout(() => setBuildError(null), 3000);
  };
  
  const handleUpgrade = (buildingId: string) => {
    upgradeBuilding(buildingId);
  };
  
  const canUpgrade = (building: any) => {
    if (building.level >= building.maxLevel) return false;

    const isResidence = RESIDENCE_TYPES.includes(building.type);

    let cost;
    if (isResidence) {
      cost = getResidenceUpgradeCost(building);
      if (!cost) return false;
    } else {
      cost = building.upgradeCosts[building.level - 1];
      if (!cost) return false;
    }

    if (spiritStones < cost.spiritStones) return false;
    return true;
  };

  const getUpgradeCost = (building: any) => {
    if (building.level >= building.maxLevel) return null;
    const isResidence = RESIDENCE_TYPES.includes(building.type);
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
        spiritStones: 0, herbs: 0, reputation: 0, pills: 0, artifacts: 0, talismans: 0,
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

      {/* 建筑头像网格：一排6个，点击展开3个功能按钮 */}
      <div className="building-avatar-grid">
        {buildings.map(building => {
          const isLocked = building.status === 'locked';
          const isClosed = building.status === 'closed';
          const upgradeCost = getUpgradeCost(building);
          const img = getBuildingImage(building.type);
          const isExpanded = expandedBuildingId === building.id;

          const statusClass = isLocked
            ? 'building-avatar-status-locked'
            : isClosed
            ? 'building-avatar-status-closed'
            : '';

          return (
            <div
              key={building.id}
              className={`building-avatar-item ${isExpanded ? 'building-avatar-item-expanded' : ''}`}
            >
              {/* 头像 + 等级角标 + 人数/维护费叠加层 + 名称：点击切换展开 */}
              <div
                className="w-full"
                onClick={() => setExpandedBuildingId(isExpanded ? null : building.id)}
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

              {/* 展开后的3个功能按钮：开启/关闭、升级、进入 */}
              {isExpanded && !isLocked && (
                <div className="building-avatar-actions">
                  <button
                    className="building-action-btn building-action-btn-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBuilding(building.id);
                    }}
                    title={isClosed ? '开启建筑' : '关闭建筑'}
                  >
                    <Power size={12} />
                    {isClosed ? '开启' : '关闭'}
                  </button>
                  <button
                    className="building-action-btn building-action-btn-upgrade"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canUpgrade(building)) handleUpgrade(building.id);
                    }}
                    disabled={!canUpgrade(building) || !upgradeCost}
                    title={upgradeCost ? `升级需 ${upgradeCost.spiritStones} 灵石` : '已满级'}
                  >
                    <ArrowUp size={12} />
                    升级
                  </button>
                  <button
                    className="building-action-btn building-action-btn-enter"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBuildingId(building.id);
                      setExpandedBuildingId(null);
                    }}
                    title="进入建筑详情"
                  >
                    <DoorOpen size={12} />
                    进入
                  </button>
                </div>
              )}

              {/* 锁定状态下展开解锁条件 */}
              {isExpanded && isLocked && building.unlockRequirement && (
                <div className="building-avatar-actions">
                  <div className="text-[9px] text-sect-jade/60 px-1 py-0.5">
                    解锁：
                    {building.unlockRequirement.sectLevel && (
                      <span>{SectLevelNames[building.unlockRequirement.sectLevel as keyof typeof SectLevelNames]}</span>
                    )}
                    {building.unlockRequirement.reputation && (
                      <span> · 声望{building.unlockRequirement.reputation}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示：点击头像展开操作 */}
      <div className="text-center text-[10px] text-sect-jade/40 mt-2">
        点击建筑头像展开「开启/关闭 · 升级 · 进入」操作；点击「进入」查看完整描述与详情
      </div>
      
      <Modal
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
        title={selectedBuilding?.name || '建筑详情'}
        size="md"
      >
        {selectedBuilding && (
          <div className="space-y-3">
            {/* 顶部：头像缩略 + 标题 + 描述 —— 紧凑一行 */}
            <div className="flex items-start gap-2">
              <BuildingThumb type={selectedBuilding.type} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-display text-base text-sect-gold leading-none">
                    {selectedBuilding.name}
                  </h2>
                  <Badge variant="gold" size="sm">Lv.{selectedBuilding.level}</Badge>
                  <Badge
                    size="sm"
                    variant={selectedBuilding.category === 'production' ? 'herb' : selectedBuilding.category === 'special' ? 'pill' : 'default'}
                  >
                    {getCategoryName(selectedBuilding.category)}
                  </Badge>
                </div>
                <p className="text-[11px] text-sect-jade/70 mt-1 leading-snug">
                  {selectedBuilding.description}
                </p>
              </div>
            </div>

            <div className="divider-gold !my-0" />

            {/* 概览指标：4 列紧凑网格（不再 md:grid-cols-4，横屏也塞得下） */}
            <div className="grid grid-cols-4 gap-1.5">
              {output.spiritStones > 0 && (
                <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                  <div className="text-sm font-display text-green-400">+{output.spiritStones}</div>
                  <div className="text-[10px] text-sect-jade/60 mt-0.5">灵石/月</div>
                </div>
              )}
              {output.herbs > 0 && (
                <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                  <div className="text-sm font-display text-green-400">+{output.herbs}</div>
                  <div className="text-[10px] text-sect-jade/60 mt-0.5">灵草/月</div>
                </div>
              )}
              {output.reputation > 0 && (
                <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                  <div className="text-sm font-display text-yellow-400">+{output.reputation}</div>
                  <div className="text-[10px] text-sect-jade/60 mt-0.5">声望/月</div>
                </div>
              )}
              <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                <div className="text-sm font-display text-red-400">-{maintenance}</div>
                <div className="text-[10px] text-sect-jade/60 mt-0.5">维护/月</div>
              </div>
              <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                <div className="text-sm font-display text-sect-jade">
                  {assignedDisciples.length}/{selectedBuilding.discipleCapacity}
                </div>
                <div className="text-[10px] text-sect-jade/60 mt-0.5">弟子</div>
              </div>
              {selectedBuilding.minDiscipleStatus && (
                <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                  <div className="text-xs font-display text-sect-gold leading-tight">
                    {DiscipleStatusDisplayNames[selectedBuilding.minDiscipleStatus]}
                  </div>
                  <div className="text-[10px] text-sect-jade/60 mt-0.5">准入</div>
                </div>
              )}
              <div className="text-center px-1 py-1 rounded border border-sect-gold/10 bg-sect-ink-light/30">
                <div className="text-sm font-display text-sect-herb-light">
                  +{BUILDING_CONTRIBUTION_BONUS[selectedBuilding.type] ?? 0}
                </div>
                <div className="text-[10px] text-sect-jade/60 mt-0.5">贡献/弟子</div>
              </div>
              {selectedBuilding.discipleEffect && selectedBuilding.discipleEffect.type !== 'none' && (
                <div className="text-center px-1 py-1 rounded border border-sect-gold/40 bg-gradient-to-br from-sect-gold/20 to-sect-gold/5">
                  <div className="text-[10px] text-sect-gold/70">
                    {getEffectTypeName(selectedBuilding.discipleEffect.type)}
                  </div>
                  <div className="text-sm font-display text-sect-gold font-bold leading-tight">
                    {selectedBuilding.discipleEffect.value}
                  </div>
                </div>
              )}
            </div>

            {/* 特殊建筑作用说明 —— 更紧凑 */}
            {selectedBuilding.type === 'mountain_gate' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 space-y-1 text-[11px]">
                <div className="font-display text-blue-300 flex items-center gap-1 mb-0.5">
                  <Shield size={12} />山门作用
                </div>
                <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                  <div>✓ 驻守弟子每月 +5 贡献点</div>
                  <div>✓ 满员时，宗门战力 +10%</div>
                  <div>↑ 每级 +10 容量 / +10% 战力上限</div>
                </div>
                <div className="text-[10px] text-blue-400/60">
                  当前容量：{selectedBuilding.discipleCapacity}（Lv.{selectedBuilding.level}）
                </div>
              </div>
            )}

            {selectedBuilding.type === 'lecture_hall' && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 space-y-1 text-[11px]">
                <div className="font-display text-purple-300 flex items-center gap-1 mb-0.5">
                  <BookOpen size={12} />讲经堂作用
                </div>
                <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                  <div>+ 听讲弟子每月 +{BUILDING_CONTRIBUTION_BONUS['lecture_hall'] ?? 8} 贡献</div>
                  <div>✓ 听讲弟子修炼 +10%，讲师越强加成越高</div>
                  <div>★ 讲师每月 +{BUILDING_CONTRIBUTION_BONUS['lecture_hall'] ?? 8} 贡献</div>
                </div>
                {selectedBuilding.managerId && (
                  <div className="text-[10px] text-purple-400/60">
                    当前讲师：{disciples.find(d => d.id === selectedBuilding.managerId)?.name || '未知'}
                  </div>
                )}
              </div>
            )}

            {selectedBuilding.type === 'servant_hall' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded p-2 space-y-1 text-[11px]">
                <div className="font-display text-green-300 flex items-center gap-1 mb-0.5">
                  <Wrench size={12} />杂役堂作用
                </div>
                <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                  <div>✓ 杂役弟子劳作赚取贡献点</div>
                  <div>★ 每名弟子每月 +10 贡献</div>
                  <div>↑ 每级 +10 容量；灵韵越高产出越多</div>
                </div>
                <div className="text-[10px] text-green-400/60">
                  Lv.{selectedBuilding.level} · 容量 {selectedBuilding.discipleCapacity}
                </div>
              </div>
            )}

            {RESIDENCE_TYPES.includes(selectedBuilding.type) && (
              <div className="bg-sect-gold/10 border border-sect-gold/30 rounded p-2 text-[11px]">
                <div className="font-display text-sect-gold flex items-center gap-1 mb-0.5">
                  <Building2 size={12} />居所升级
                </div>
                <div className="space-y-0.5 text-sect-jade/80 leading-snug">
                  <div>✓ 每级 +10 可居住弟子</div>
                </div>
                <div className="text-[10px] text-sect-jade/60 mt-1">
                  Lv.{selectedBuilding.level} · 容量 {selectedBuilding.discipleCapacity}
                </div>
              </div>
            )}

            {selectedBuilding.discipleCapacity > 0 && (
              <>
                {/* 升级区域 */}
                {(() => {
                  const detailUpgradeCost = getUpgradeCost(selectedBuilding);
                  const detailCanUpgrade = canUpgrade(selectedBuilding);
                  const atMaxLevel = !isResidenceBuilding(selectedBuilding.type) &&
                    selectedBuilding.level >= selectedBuilding.maxLevel;
                  return detailUpgradeCost && selectedBuilding.level < selectedBuilding.maxLevel ? (
                    <div className="bg-sect-gold/10 border border-sect-gold/30 rounded p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <div className="font-display text-sect-gold flex items-center gap-1 text-xs">
                            <ArrowUp size={12} />升级建筑
                          </div>
                          <div className="text-[10px] text-sect-jade/60 mt-0.5">
                            Lv.{selectedBuilding.level} → Lv.{selectedBuilding.level + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-[11px] text-sect-jade">
                            <Gem size={12} /> {detailUpgradeCost.spiritStones}
                          </span>
                          {detailUpgradeCost.contribution && detailUpgradeCost.contribution > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400">
                              <Star size={12} /> {detailUpgradeCost.contribution}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full text-xs py-1"
                        onClick={() => handleUpgrade(selectedBuilding.id)}
                        disabled={!detailCanUpgrade}
                      >
                        {detailCanUpgrade ? '升级' : '灵石不足'}
                      </Button>
                    </div>
                  ) : null;
                })()}

                {/* 降级区域 */}
                {(() => {
                  if (selectedBuilding.level <= 1) return null;
                  const isRes = isResidenceBuilding(selectedBuilding.type);
                  let refundStones = 0;
                  if (isRes) {
                    const c = getResidenceUpgradeCost({ ...selectedBuilding, level: selectedBuilding.level - 1 });
                    if (c) refundStones = c.spiritStones;
                  } else {
                    const c = selectedBuilding.upgradeCosts[selectedBuilding.level - 2];
                    if (c) refundStones = c.spiritStones;
                  }
                  if (refundStones <= 0) return null;
                  return (
                    <div className="bg-red-500/5 border border-red-500/30 rounded p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <div className="font-display text-red-300 flex items-center gap-1 text-xs">
                            <ArrowDown size={12} />降级建筑
                          </div>
                          <div className="text-[10px] text-sect-jade/60 mt-0.5">
                            Lv.{selectedBuilding.level} → Lv.{selectedBuilding.level - 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
                          <Gem size={12} /> 返还 {refundStones}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs py-1"
                        onClick={() => {
                          if (confirm(`确认将「${selectedBuilding.name}」降级至 Lv.${selectedBuilding.level - 1}？返还 ${refundStones} 灵石。`)) {
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
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-sect-spirit" />
                          <span className="font-display text-sect-spirit text-xs">堂主</span>
                          {currentManager ? (
                            <span className="text-[11px] text-sect-jade">{currentManager.name}</span>
                          ) : (
                            <span className="text-[10px] text-yellow-400">空缺中</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] py-0.5 px-2"
                          onClick={() => setShowManagerPicker(!showManagerPicker)}>
                          {currentManager ? '撤换' : '任命堂主'}
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
                                <span className={`text-[10px] ${getRealmColor(d.realm)}`}>{RealmNames[d.realm]}</span>
                              </div>
                              <span className="text-[10px] text-sect-jade/50">贡献 {d.contributionPoints}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 在堂弟子 —— 再紧凑，头像小一点，行高差小 */}
                <div>
                  <h3 className="font-display text-xs text-sect-gold mb-1.5 flex items-center gap-1">
                    <Users size={14} />
                    在堂弟子 ({assignedDisciples.length})
                  </h3>

                  {assignedDisciples.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-sect-jade/40">
                      暂无弟子在此处修行
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
                                {RealmNames[disciple.realm]}
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
                          <div className="text-right shrink-0">
                            <div className="text-[9px] text-sect-jade/60">修为</div>
                            <div className="text-[11px] text-sect-jade leading-none">
                              {Math.floor(disciple.realmProgress)}%
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
