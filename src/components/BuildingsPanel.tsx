import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { 
  Building2, Wrench, Users, ArrowUp, Power, 
  Lock, Gem, Star, DoorOpen, Heart, Sparkles,
  TrendingUp, Plus, Shield, BookOpen, FlaskConical,
  Hammer, Scroll, Zap, TreePine, Crown, Info
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { LibraryPanel } from '@/components/LibraryPanel';
import { calculateBuildingMaintenance, calculateBuildingOutput, getResidenceUpgradeCost } from '@/utils/gameLogic';
import { RealmNames, DiscipleStatusNames } from '@/types/disciple';
import type { BuildingType } from '@/types/building';
import { BUILDING_CONFIGS } from '@/data/buildings';
import { SectLevelNames } from '@/types/game';

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
    upgradeBuilding, toggleBuilding, buildBuilding 
  } = useGameStore();
  const { selectedBuildingId, setSelectedBuildingId } = useUIStore();
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // 显示错误提示
  const showError = (message: string) => {
    setBuildError(message);
    setTimeout(() => setBuildError(null), 3000);
  };
  
  const handleUpgrade = (buildingId: string) => {
    upgradeBuilding(buildingId);
  };
  
  const canUpgrade = (building: any) => {
    const isResidence = ['servant_residence', 'outer_residence', 'inner_residence', 'core_residence'].includes(building.type);

    if (!isResidence && building.level >= building.maxLevel) return false;

    let cost;
    if (isResidence) {
      cost = getResidenceUpgradeCost(building);
      if (!cost) return false;
    } else {
      cost = building.upgradeCosts[building.level];
      if (!cost) return false;
    }

    if (spiritStones < cost.spiritStones) return false;
    if (cost.reputation && reputation < cost.reputation) return false;
    return true;
  };

  const getUpgradeCost = (building: any) => {
    const isResidence = ['servant_residence', 'outer_residence', 'inner_residence', 'core_residence'].includes(building.type);
    if (isResidence) {
      return getResidenceUpgradeCost(building);
    }
    if (building.level < building.maxLevel) {
      return building.upgradeCosts[building.level];
    }
    return null;
  };

  const isResidenceBuilding = (type: string) => {
    return ['servant_residence', 'outer_residence', 'inner_residence', 'core_residence'].includes(type);
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map(building => {
          const buildingDisciples = disciples.filter(d => building.assignedDisciples.includes(d.id));
          const buildingOutput = calculateBuildingOutput(building, buildingDisciples);
          const buildingMaintenance = calculateBuildingMaintenance(building);
          const upgradeCost = getUpgradeCost(building);
          const isResidence = isResidenceBuilding(building.type);
          
          const isLocked = building.status === 'locked';
          
          return (
            <Card key={building.id} className={isLocked ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isLocked ? 'bg-gray-500/20' : 'bg-sect-gold/20'
                  }`}>
                    {isLocked 
                      ? <Lock size={24} className="text-gray-500" /> 
                      : <span className="text-sect-gold">{getBuildingIcon(building.type)}</span>
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sect-jade">
                        {building.name}
                      </h3>
                      <Badge 
                        variant={building.category === 'production' ? 'herb' : building.category === 'special' ? 'pill' : 'default'} 
                        size="sm"
                      >
                        {getCategoryName(building.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge 
                        variant={isLocked ? 'default' : 'gold'} 
                        size="sm"
                      >
                        Lv.{building.level}
                      </Badge>
                      {building.status === 'closed' && (
                        <Badge variant="pill" size="sm">已关闭</Badge>
                      )}
                      {building.discipleEffect && building.discipleEffect.type !== 'none' && (
                        <Badge variant="spirit" size="sm" className="animate-pulse">
                          {building.discipleEffect.value}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-sect-jade/60 mb-3">
                {building.description}
              </p>
              
              {!isLocked && (
                <>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-sect-jade/60 flex items-center gap-1">
                        <Users size={14} /> 弟子
                      </span>
                      <span className="text-sect-jade">
                        {buildingDisciples.length} / {building.discipleCapacity}
                      </span>
                    </div>
                    
                    {building.minDiscipleStatus && (
                      <div className="flex justify-between">
                        <span className="text-sect-jade/60 flex items-center gap-1">
                          <Shield size={14} /> 准入
                        </span>
                        <span className="text-sect-jade">
                          {DiscipleStatusDisplayNames[building.minDiscipleStatus]}及以上
                        </span>
                      </div>
                    )}
                    
                    {building.monthlyContributionCost && building.monthlyContributionCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sect-jade/60 flex items-center gap-1">
                          <Sparkles size={14} /> 月耗贡献
                        </span>
                        <span className="text-sect-herb-light">
                          -{building.monthlyContributionCost}/弟子/月
                        </span>
                      </div>
                    )}
                    
                    {buildingOutput.spiritStones > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sect-jade/60 flex items-center gap-1">
                          <Gem size={14} /> 灵石产出
                        </span>
                        <Tooltip content={renderBreakdownTooltip(buildingOutput.breakdown)} position="left">
                          <span className="text-green-400 cursor-help flex items-center gap-1">
                            +{buildingOutput.spiritStones}/月
                            <Info size={12} className="opacity-60" />
                          </span>
                        </Tooltip>
                      </div>
                    )}
                    
                    {buildingOutput.herbs > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sect-jade/60 flex items-center gap-1">
                          <TreePine size={14} /> 灵草产出
                        </span>
                        <Tooltip content={renderBreakdownTooltip(buildingOutput.breakdown)} position="left">
                          <span className="text-green-400 cursor-help flex items-center gap-1">
                            +{buildingOutput.herbs}/月
                            <Info size={12} className="opacity-60" />
                          </span>
                        </Tooltip>
                      </div>
                    )}
                    
                    {buildingOutput.reputation > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sect-jade/60 flex items-center gap-1">
                          <Star size={14} /> 声望产出
                        </span>
                        <Tooltip content={renderBreakdownTooltip(buildingOutput.breakdown)} position="left">
                          <span className="text-green-400 cursor-help flex items-center gap-1">
                            +{buildingOutput.reputation}/月
                            <Info size={12} className="opacity-60" />
                          </span>
                        </Tooltip>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-sect-jade/60 flex items-center gap-1">
                        <Wrench size={14} /> 维护
                      </span>
                      <span className="text-red-400">-{buildingMaintenance}/月</span>
                    </div>
                    
                    {building.discipleEffect && building.discipleEffect.type !== 'none' && (
                      <div className="bg-gradient-to-r from-sect-gold/10 to-transparent border border-sect-gold/30 rounded-lg p-2 -mx-1">
                        <Tooltip content={building.discipleEffect.description} position="left">
                          <div className="flex justify-between items-center cursor-help">
                            <span className="text-sect-gold/80 flex items-center gap-1 font-medium text-sm">
                              <Sparkles size={14} className="text-sect-gold" /> 
                              {getEffectTypeName(building.discipleEffect.type)}
                            </span>
                            <span className="text-sect-gold font-display font-bold">
                              {building.discipleEffect.value}
                            </span>
                          </div>
                        </Tooltip>
                      </div>
                    )}
                    
                    {building.discipleCapacity > 0 && (
                      <ProgressBar 
                        value={buildingDisciples.length} 
                        max={building.discipleCapacity} 
                        color="herb"
                        size="sm"
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {upgradeCost && (
                      <Button
                        variant="gold"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUpgrade(building.id)}
                        disabled={!canUpgrade(building)}
                      >
                        <ArrowUp size={14} className="mr-1" />
                        升级
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBuildingId(building.id)}
                    >
                      <DoorOpen size={14} className="mr-1" />
                      进入
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBuilding(building.id)}
                    >
                      <Power size={14} />
                    </Button>
                  </div>
                  
                  {upgradeCost && (
                    <div className="mt-2 text-xs text-sect-jade/50 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Gem size={12} /> {upgradeCost.spiritStones}
                      </span>
                      {upgradeCost.reputation > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={12} /> {upgradeCost.reputation}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {isLocked && building.unlockRequirement && (
                <div className="text-xs text-sect-jade/50">
                  解锁条件：
                  {building.unlockRequirement.sectLevel && (
                    <span className="ml-1">宗门等级达到 {SectLevelNames[building.unlockRequirement.sectLevel as keyof typeof SectLevelNames]}</span>
                  )}
                  {building.unlockRequirement.reputation && (
                    <span className="ml-1">声望 {building.unlockRequirement.reputation}</span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      
      <Modal
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuildingId(null)}
        title={selectedBuilding?.name || '建筑详情'}
        size="lg"
      >
        {selectedBuilding && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-sect-gold/20">
                <span className="text-sect-gold">{getBuildingIcon(selectedBuilding.type)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl text-sect-gold">
                    {selectedBuilding.name}
                  </h2>
                  <Badge variant="gold">Lv.{selectedBuilding.level}</Badge>
                  <Badge variant={selectedBuilding.category === 'production' ? 'herb' : selectedBuilding.category === 'special' ? 'pill' : 'default'}>
                    {getCategoryName(selectedBuilding.category)}
                  </Badge>
                </div>
                <p className="text-sect-jade/70 mt-2">
                  {selectedBuilding.description}
                </p>
              </div>
            </div>
            
            <div className="divider-gold" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {output.spiritStones > 0 && (
                <Card className="text-center">
                  <Tooltip content={renderBreakdownTooltip(output.breakdown)} position="top">
                    <div className="text-2xl font-display text-green-400 cursor-help">
                      +{output.spiritStones}
                    </div>
                    <div className="text-xs text-sect-jade/60 mt-1">灵石/月</div>
                  </Tooltip>
                </Card>
              )}
              {output.herbs > 0 && (
                <Card className="text-center">
                  <Tooltip content={renderBreakdownTooltip(output.breakdown)} position="top">
                    <div className="text-2xl font-display text-green-400 cursor-help">
                      +{output.herbs}
                    </div>
                    <div className="text-xs text-sect-jade/60 mt-1">灵草/月</div>
                  </Tooltip>
                </Card>
              )}
              {output.reputation > 0 && (
                <Card className="text-center">
                  <Tooltip content={renderBreakdownTooltip(output.breakdown)} position="top">
                    <div className="text-2xl font-display text-yellow-400 cursor-help">
                      +{output.reputation}
                    </div>
                    <div className="text-xs text-sect-jade/60 mt-1">声望/月</div>
                  </Tooltip>
                </Card>
              )}
              <Card className="text-center">
                <div className="text-2xl font-display text-red-400">
                  -{maintenance}
                </div>
                <div className="text-xs text-sect-jade/60 mt-1">维护费/月</div>
              </Card>
              <Card className="text-center">
                <div className="text-2xl font-display text-sect-jade">
                  {assignedDisciples.length}/{selectedBuilding.discipleCapacity}
                </div>
                <div className="text-xs text-sect-jade/60 mt-1">弟子人数</div>
              </Card>
              {selectedBuilding.minDiscipleStatus && (
                <Card className="text-center">
                  <div className="text-2xl font-display text-sect-gold">
                    {DiscipleStatusDisplayNames[selectedBuilding.minDiscipleStatus]}
                  </div>
                  <div className="text-xs text-sect-jade/60 mt-1">最低准入</div>
                </Card>
              )}
              {selectedBuilding.monthlyContributionCost && selectedBuilding.monthlyContributionCost > 0 && (
                <Card className="text-center">
                  <div className="text-2xl font-display text-sect-herb-light">
                    -{selectedBuilding.monthlyContributionCost}
                  </div>
                  <div className="text-xs text-sect-jade/60 mt-1">月贡献/弟子</div>
                </Card>
              )}
              {selectedBuilding.discipleEffect && selectedBuilding.discipleEffect.type !== 'none' && (
                <Card className="text-center bg-gradient-to-br from-sect-gold/20 to-sect-gold/5 border-sect-gold/40">
                  <Tooltip content={selectedBuilding.discipleEffect.description} position="top">
                    <div className="flex flex-col items-center cursor-help">
                      <div className="text-sm text-sect-gold/60 mb-1">{getEffectTypeName(selectedBuilding.discipleEffect.type)}</div>
                      <div className="text-2xl font-display text-sect-gold font-bold">
                        {selectedBuilding.discipleEffect.value}
                      </div>
                      <div className="text-xs text-sect-jade/60 mt-1">宗门加成</div>
                    </div>
                  </Tooltip>
                </Card>
              )}
            </div>

            {/* 山门特殊信息 */}
            {selectedBuilding.type === 'mountain_gate' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                <h4 className="font-display text-blue-300 flex items-center gap-2">
                  <Shield size={16} />
                  山门作用
                </h4>
                <div className="text-sm space-y-1 text-sect-jade/80">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>驻守弟子每月获得 5 贡献点</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>人数满员时，宗门战力 +10%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">↑</span>
                    <span>每升一级增加 10 名可容纳弟子</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">↑</span>
                    <span>每升一级，宗门战力上限 +10%</span>
                  </div>
                </div>
                <div className="text-xs text-blue-400/60 mt-2">
                  当前容量：{selectedBuilding.discipleCapacity} 人（Lv.{selectedBuilding.level}）
                </div>
              </div>
            )}

            {/* 讲经堂特殊信息 */}
            {selectedBuilding.type === 'lecture_hall' && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
                <h4 className="font-display text-purple-300 flex items-center gap-2">
                  <BookOpen size={16} />
                  讲经堂作用
                </h4>
                <div className="text-sm space-y-1 text-sect-jade/80">
                  <div className="flex items-center gap-2">
                    <span className="text-sect-herb-light">−</span>
                    <span>听讲弟子每月消耗 {selectedBuilding.monthlyContributionCost || 5} 贡献点</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>听讲弟子获得修炼加成（基础 +10%）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">★</span>
                    <span>讲师修炼效率越高，加成越高</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sect-gold">★</span>
                    <span>讲师每人可获得 5 贡献点/月</span>
                  </div>
                </div>
                {selectedBuilding.managerId && (
                  <div className="text-xs text-purple-400/60 mt-2">
                    当前讲师：{disciples.find(d => d.id === selectedBuilding.managerId)?.name || '未知'}
                  </div>
                )}
              </div>
            )}

            {/* 杂役堂特殊信息 */}
            {selectedBuilding.type === 'servant_hall' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                <h4 className="font-display text-green-300 flex items-center gap-2">
                  <Wrench size={16} />
                  杂役堂作用
                </h4>
                <div className="text-sm space-y-1 text-sect-jade/80">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>杂役弟子在此劳作赚取贡献点</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sect-gold">★</span>
                    <span>每名弟子每月获得 10 贡献点</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">↑</span>
                    <span>每升一级增加 10 名可容纳弟子</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sect-herb-light">♨</span>
                    <span>产出灵石和灵草，灵韵越高产出越多</span>
                  </div>
                </div>
                <div className="text-xs text-green-400/60 mt-2">
                  当前等级：Lv.{selectedBuilding.level} | 当前容量：{selectedBuilding.discipleCapacity} 人
                </div>
              </div>
            )}

            {/* 居所升级信息 */}
            {(selectedBuilding.type === 'servant_residence' ||
              selectedBuilding.type === 'outer_residence' ||
              selectedBuilding.type === 'inner_residence' ||
              selectedBuilding.type === 'core_residence') && (
              <div className="bg-sect-gold/10 border border-sect-gold/30 rounded-lg p-4 space-y-2">
                <h4 className="font-display text-sect-gold flex items-center gap-2">
                  <Building2 size={16} />
                  居所升级
                </h4>
                <div className="text-sm space-y-1 text-sect-jade/80">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>升级每级增加 10 名可居住弟子</span>
                  </div>
                </div>
                <div className="text-xs text-sect-jade/60 mt-2">
                  当前等级：Lv.{selectedBuilding.level} | 当前容量：{selectedBuilding.discipleCapacity} 人
                </div>
              </div>
            )}

            {selectedBuilding.discipleCapacity > 0 && (
              <>
                {/* 升级按钮区域 */}
                {(() => {
                  const detailUpgradeCost = getUpgradeCost(selectedBuilding);
                  const detailCanUpgrade = canUpgrade(selectedBuilding);
                  const isRes = isResidenceBuilding(selectedBuilding.type);
                  const atMaxLevel = !isRes && selectedBuilding.level >= selectedBuilding.maxLevel;

                  return detailUpgradeCost && !atMaxLevel ? (
                    <div className="bg-sect-gold/10 border border-sect-gold/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-display text-sect-gold flex items-center gap-2">
                            <ArrowUp size={16} />
                            升级建筑
                          </div>
                          <div className="text-xs text-sect-jade/60 mt-1">
                            Lv.{selectedBuilding.level} → Lv.{selectedBuilding.level + 1}
                            {isRes && '  (容量 +10)'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-sm text-sect-jade">
                            <Gem size={14} /> {detailUpgradeCost.spiritStones}
                          </span>
                          {detailUpgradeCost.reputation && detailUpgradeCost.reputation > 0 && (
                            <span className="flex items-center gap-1 text-sm text-yellow-400">
                              <Star size={14} /> {detailUpgradeCost.reputation}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full"
                        onClick={() => handleUpgrade(selectedBuilding.id)}
                        disabled={!detailCanUpgrade}
                      >
                        {detailCanUpgrade ? '升级' : '资源不足'}
                      </Button>
                    </div>
                  ) : null;
                })()}

                <div className="divider-gold" />
                
                <div>
                  <h3 className="font-display text-lg text-sect-gold mb-4 flex items-center gap-2">
                    <Users size={20} />
                    在堂弟子 ({assignedDisciples.length})
                  </h3>
                  
                  {assignedDisciples.length === 0 ? (
                    <div className="text-center py-8 text-sect-jade/40">
                      暂无弟子在此处修行
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {assignedDisciples.map(disciple => (
                        <Card key={disciple.id} className="hover:border-sect-gold/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-sect-gold/30"
                              style={{
                                backgroundColor: `hsl(${(disciple.avatarSeed * 137.5) % 360}, 30%, 25%)`,
                                color: `hsl(${(disciple.avatarSeed * 137.5) % 360}, 60%, 70%)`,
                              }}
                            >
                              {disciple.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-display text-sect-jade">
                                  {disciple.name}
                                </span>
                                <Badge variant="default" size="sm">
                                  {DiscipleStatusNames[disciple.status]}
                                </Badge>
                                <span className={`text-xs ${getRealmColor(disciple.realm)}`}>
                                  {RealmNames[disciple.realm]}
                                </span>
                                {selectedBuilding.managerId === disciple.id && (
                                  <Badge variant="gold" size="sm">
                                    <Crown size={12} className="mr-1" />
                                    堂主
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-sect-jade/60">
                                <span className="flex items-center gap-1">
                                  <Sparkles size={12} className="text-sect-gold/60" />
                                  灵韵{getTalentLevel(disciple.hiddenTalents.spiritRhythm)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp size={12} className="text-sect-herb-light/60" />
                                  贡献 {disciple.contributionPoints}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart size={12} className="text-red-400/60" />
                                  {Math.floor(disciple.age)}岁
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-sect-jade/60">修为</div>
                              <div className="text-sm text-sect-jade">
                                {Math.floor(disciple.realmProgress)}%
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            {selectedBuilding.type === 'secret_library' && (
              <>
                <div className="divider-gold" />
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
                        <div className="p-2 rounded-lg bg-sect-gold/20">
                          <span className="text-sect-gold">
                            {getBuildingIcon(type)}
                          </span>
                        </div>
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
