import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SimpleAvatar, DiscipleAvatar } from '@/components/ui/Avatar';
import { BuildingTypeNames } from '@/types/building';
import { DiscipleStatusNames, RealmNames, RealmOrder } from '@/types/disciple';
import type { DiscipleStatus } from '@/types/disciple';
import { 
  Users, Building2, Sparkles, TrendingUp, 
  Star, UserPlus, Shuffle, Crown, X, Check, Shield
} from 'lucide-react';

type ViewMode = 'disciples' | 'buildings';

const DiscipleStatusDisplayNames: Record<string, string> = {
  servant: '杂役',
  outer: '外门',
  inner: '内门',
  core: '核心',
  elder: '长老',
};

const statusOrder: DiscipleStatus[] = ['mortal', 'servant', 'outer', 'inner', 'core', 'elder'];

function canDiscipleEnterBuilding(discipleStatus: DiscipleStatus, minStatus?: DiscipleStatus): boolean {
  if (!minStatus) return true;
  const discipleIndex = statusOrder.indexOf(discipleStatus);
  const minIndex = statusOrder.indexOf(minStatus);
  return discipleIndex >= minIndex;
}

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

function getTalentLevel(value: number): { level: string; color: string } {
  if (value >= 80) return { level: '绝世', color: 'text-sect-gold' };
  if (value >= 60) return { level: '优秀', color: 'text-sect-herb-light' };
  if (value >= 40) return { level: '普通', color: 'text-sect-jade' };
  if (value >= 20) return { level: '欠佳', color: 'text-gray-400' };
  return { level: '低劣', color: 'text-gray-500' };
}

export const AllocationPanel: React.FC = () => {
  const { 
    disciples, buildings, 
    assignDiscipleToBuilding, setBuildingManager
  } = useGameStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('buildings');
  const [selectedDisciple, setSelectedDisciple] = useState<string | null>(null);
  const [selectedBuildingForAssign, setSelectedBuildingForAssign] = useState<string | null>(null);
  const [selectedBuildingForManager, setSelectedBuildingForManager] = useState<string | null>(null);
  
  const activeBuildings = useMemo(() => 
    buildings.filter(b => b.status === 'active'), 
  [buildings]);
  
  const assignedDisciples = useMemo(() => 
    disciples.filter(d => d.assignedBuilding), 
  [disciples]);
  
  const unassignedDisciples = useMemo(() => 
    disciples.filter(d => !d.assignedBuilding && d.status !== 'servant'), 
  [disciples]);
  
  const eligibleManagers = useMemo(() => {
    const goldenIndex = RealmOrder.indexOf('golden');
    return disciples.filter(d => RealmOrder.indexOf(d.realm) >= goldenIndex);
  }, [disciples]);
  
  const handleAutoAssign = () => {
    const unassigned = disciples.filter(d => 
      !d.assignedBuilding && d.status !== 'servant'
    );
    
    unassigned.forEach(disciple => {
      const { buildingId } = autoAssignBuilding(disciple, buildings);
      if (buildingId) {
        assignDiscipleToBuilding(disciple.id, buildingId);
      }
    });
  };
  
  const handleAssign = (discipleId: string, buildingId: string) => {
    assignDiscipleToBuilding(discipleId, buildingId);
    setSelectedDisciple(null);
  };
  
  const handleSetManager = (buildingId: string, discipleId: string | null) => {
    setBuildingManager(buildingId, discipleId);
    setSelectedBuildingForManager(null);
  };
  
  const selectedDiscipleData = disciples.find(d => d.id === selectedDisciple);
  const selectedBuildingForAssignData = buildings.find(b => b.id === selectedBuildingForAssign);
  const selectedBuildingForManagerData = buildings.find(b => b.id === selectedBuildingForManager);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient">弟子分配</h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            已分配 {assignedDisciples.length} / 共 {disciples.length} 名弟子
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="gold" 
            size="sm"
            onClick={handleAutoAssign}
            disabled={unassignedDisciples.length === 0}
          >
            <Shuffle size={16} className="mr-1.5" />
            自动分配 ({unassignedDisciples.length})
          </Button>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('buildings')}
          className={`px-4 py-2 rounded-lg font-display text-sm transition-all ${
            viewMode === 'buildings'
              ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
              : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10'
          }`}
        >
          <Building2 size={16} className="inline mr-1.5" />
          按建筑查看
        </button>
        <button
          onClick={() => setViewMode('disciples')}
          className={`px-4 py-2 rounded-lg font-display text-sm transition-all ${
            viewMode === 'disciples'
              ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
              : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10'
          }`}
        >
          <Users size={16} className="inline mr-1.5" />
          按弟子查看
        </button>
      </div>
      
      {viewMode === 'buildings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeBuildings.map(building => {
            const buildingDisciples = disciples.filter(d => d.assignedBuilding === building.id);
            const manager = building.managerId ? disciples.find(d => d.id === building.managerId) : null;
            
            return (
              <Card key={building.id} className="hover:border-sect-gold/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sect-gold/20">
                      <Building2 size={20} className="text-sect-gold" />
                    </div>
                    <div>
                      <h3 className="font-display text-sect-jade">
                        {building.name}
                      </h3>
                      <Badge variant="gold" size="sm">Lv.{building.level}</Badge>
                    </div>
                  </div>
                  {manager && (
                    <Badge variant="pill" className="flex items-center gap-1">
                      <Crown size={12} className="text-sect-gold" />
                      {manager.name}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-sect-jade/60">弟子</span>
                    <span className="text-sect-jade">
                      {buildingDisciples.length} / {building.discipleCapacity}
                    </span>
                  </div>
                  {building.minDiscipleStatus && (
                    <div className="flex justify-between">
                      <span className="text-sect-jade/60 flex items-center gap-1">
                        <Shield size={14} /> 准入
                      </span>
                      <span className="text-sect-gold">
                        {DiscipleStatusDisplayNames[building.minDiscipleStatus]}及以上
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sect-jade/60">管理者</span>
                    <span className={manager ? 'text-sect-gold' : 'text-sect-jade/40'}>
                      {manager ? `${manager.name} (${DiscipleStatusNames[manager.status]})` : '未设置'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedBuildingForAssign(building.id)}
                  >
                    <Users size={14} className="mr-1" />
                    分配弟子
                  </Button>
                  <Button
                    variant={manager ? 'gold' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedBuildingForManager(building.id)}
                    title={eligibleManagers.length === 0 ? '暂无内门及以上弟子可担任管理者' : '设置管理者'}
                  >
                    <Crown size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {disciples.map(disciple => {
            const assignedBuilding = disciple.assignedBuilding 
              ? buildings.find(b => b.id === disciple.assignedBuilding) 
              : null;
            
            return (
              <Card 
                key={disciple.id} 
                className="hover:border-sect-gold/40 transition-colors cursor-pointer"
                onClick={() => setSelectedDisciple(disciple.id)}
              >
                <div className="flex items-start gap-3">
                  <SimpleAvatar seed={disciple.avatarSeed} size={40} status={disciple.status} realm={disciple.realm} name={disciple.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sect-jade truncate">
                        {disciple.name}
                      </span>
                      {disciple.managingBuilding && (
                        <Crown size={14} className="text-sect-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="default" size="sm">
                        {DiscipleStatusNames[disciple.status]}
                      </Badge>
                      <span className={`text-xs ${getRealmColor(disciple.realm)}`}>
                        {RealmNames[disciple.realm]}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sect-jade/50">所属</span>
                    <span className={assignedBuilding ? 'text-sect-jade' : 'text-sect-jade/40'}>
                      {assignedBuilding?.name || '未分配'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sect-jade/50">灵韵</span>
                    <span className={getTalentLevel(disciple.hiddenTalents.spiritRhythm).color}>
                      {getTalentLevel(disciple.hiddenTalents.spiritRhythm).level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sect-jade/50">贡献点</span>
                    <span className="text-sect-herb-light">
                      {Math.floor(disciple.contributionPoints)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* 分配弟子弹窗 */}
      <Modal
        isOpen={!!selectedBuildingForAssign}
        onClose={() => setSelectedBuildingForAssign(null)}
        title="分配弟子"
        size="lg"
      >
        {selectedBuildingForAssignData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sect-ink-light/30">
              <div className="p-2 rounded-lg bg-sect-gold/20">
                <Building2 size={24} className="text-sect-gold" />
              </div>
              <div>
                <div className="font-display text-xl text-sect-gold">
                  {selectedBuildingForAssignData.name}
                </div>
                <div className="text-sm text-sect-jade/60">
                  容量：{selectedBuildingForAssignData.assignedDisciples.length} / {selectedBuildingForAssignData.discipleCapacity}
                  {selectedBuildingForAssignData.minDiscipleStatus && (
                    <span className="ml-2">
                      准入：{DiscipleStatusDisplayNames[selectedBuildingForAssignData.minDiscipleStatus]}及以上
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-display text-sect-jade mb-3 flex items-center gap-2">
                <Users size={16} />
                可分配弟子
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {disciples
                  .filter(d => d.status !== 'elder')
                  .map(disciple => {
                    const isAssignedHere = disciple.assignedBuilding === selectedBuildingForAssignData.id;
                    const canEnter = canDiscipleEnterBuilding(
                      disciple.status as DiscipleStatus,
                      selectedBuildingForAssignData.minDiscipleStatus
                    );
                    
                    return (
                      <div
                        key={disciple.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          !canEnter
                            ? 'border-gray-700/30 opacity-40'
                            : isAssignedHere
                            ? 'border-sect-gold/50 bg-sect-gold/10'
                            : 'border-sect-gold/20 hover:border-sect-gold/40 hover:bg-sect-ink-light/30 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!canEnter) return;
                          if (isAssignedHere) {
                            assignDiscipleToBuilding(disciple.id, '');
                          } else {
                            assignDiscipleToBuilding(disciple.id, selectedBuildingForAssignData.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <SimpleAvatar seed={disciple.avatarSeed} size={40} status={disciple.status} realm={disciple.realm} name={disciple.name} />
                          <div>
                            <div className="font-display text-sect-jade text-sm">
                              {disciple.name}
                            </div>
                            <div className="text-xs text-sect-jade/50 flex items-center gap-2">
                              <Badge variant="default" size="sm">
                                {DiscipleStatusNames[disciple.status]}
                              </Badge>
                              <span className={getRealmColor(disciple.realm)}>
                                {RealmNames[disciple.realm]}
                              </span>
                              {disciple.managingBuilding && (
                                <Crown size={12} className="text-sect-gold" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssignedHere && (
                            <Badge variant="gold" size="sm">
                              <Check size={12} className="mr-1" />
                              已分配
                            </Badge>
                          )}
                          {!canEnter && (
                            <span className="text-xs text-red-400/70">身份不足</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 设置管理者弹窗 */}
      <Modal
        isOpen={!!selectedBuildingForManager}
        onClose={() => setSelectedBuildingForManager(null)}
        title="设置管理者"
        size="md"
      >
        {selectedBuildingForManagerData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sect-ink-light/30">
              <div className="p-2 rounded-lg bg-sect-gold/20">
                <Building2 size={24} className="text-sect-gold" />
              </div>
              <div>
                <div className="font-display text-xl text-sect-gold">
                  {selectedBuildingForManagerData.name}
                </div>
                <div className="text-sm text-sect-jade/60">
                  管理者可提升 {selectedBuildingForManagerData.name} 效率 30%+
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-display text-sect-jade mb-3 flex items-center gap-2">
                <Users size={16} />
                选择管理者（需内门及以上）
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {eligibleManagers.length === 0 ? (
                  <div className="text-center py-8 text-sect-jade/40">
                    暂无符合条件的弟子（需内门及以上）
                  </div>
                ) : (
                  eligibleManagers.map(disciple => {
                    const isCurrent = selectedBuildingForManagerData.managerId === disciple.id;
                    
                    return (
                      <div
                        key={disciple.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                          isCurrent
                            ? 'border-sect-gold/50 bg-sect-gold/10'
                            : 'border-sect-gold/20 hover:border-sect-gold/40 hover:bg-sect-ink-light/30'
                        }`}
                        onClick={() => handleSetManager(selectedBuildingForManagerData.id, disciple.id)}
                      >
                        <div className="flex items-center gap-3">
                          <SimpleAvatar seed={disciple.avatarSeed} size={40} status={disciple.status} realm={disciple.realm} name={disciple.name} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-sect-jade">
                                {disciple.name}
                              </span>
                              {isCurrent && <Crown size={14} className="text-sect-gold" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="default" size="sm">
                                {DiscipleStatusNames[disciple.status]}
                              </Badge>
                              <span className={`text-xs ${getRealmColor(disciple.realm)}`}>
                                {RealmNames[disciple.realm]}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-sect-jade/60">
                            贡献 {Math.floor(disciple.contributionPoints)}
                          </span>
                          {isCurrent && (
                            <Badge variant="gold" size="sm">
                              <Check size={12} className="mr-1" />
                              当前
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {selectedBuildingForManagerData.managerId && (
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  handleSetManager(selectedBuildingForManagerData.id, null);
                  setSelectedBuildingForManager(null);
                }}
              >
                <X size={14} className="mr-1" />
                取消管理者
              </Button>
            )}
          </div>
        )}
      </Modal>
      
      {/* 弟子详情弹窗（按弟子查看时点击） */}
      <Modal
        isOpen={!!selectedDisciple}
        onClose={() => setSelectedDisciple(null)}
        title="弟子分配"
        size="md"
      >
        {selectedDiscipleData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sect-ink-light/30">
              <DiscipleAvatar seed={selectedDiscipleData.avatarSeed} size={48} status={selectedDiscipleData.status} realm={selectedDiscipleData.realm} name={selectedDiscipleData.name} />
              <div>
                <div className="font-display text-sect-gold">
                  {selectedDiscipleData.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="default" size="sm">
                    {DiscipleStatusNames[selectedDiscipleData.status]}
                  </Badge>
                  <span className={`text-sm ${getRealmColor(selectedDiscipleData.realm)}`}>
                    {RealmNames[selectedDiscipleData.realm]}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-display text-sect-jade mb-3 flex items-center gap-2">
                <Building2 size={16} />
                选择要分配的堂口
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {activeBuildings
                  .filter(b => b.discipleCapacity > 0)
                  .map(building => {
                    const buildingDisciples = disciples.filter(d => d.assignedBuilding === building.id);
                    const isFull = buildingDisciples.length >= building.discipleCapacity;
                    const isCurrent = selectedDiscipleData.assignedBuilding === building.id;
                    const canEnter = canDiscipleEnterBuilding(
                      selectedDiscipleData.status as DiscipleStatus, 
                      building.minDiscipleStatus
                    );
                    
                    return (
                      <div
                        key={building.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          !canEnter
                            ? 'border-gray-700/30 opacity-40'
                            : isCurrent
                            ? 'border-sect-gold/50 bg-sect-gold/10'
                            : isFull
                            ? 'border-gray-700/50 opacity-50'
                            : 'border-sect-gold/20 hover:border-sect-gold/40 hover:bg-sect-ink-light/30 cursor-pointer'
                        }`}
                        onClick={() => canEnter && !isFull && !isCurrent && handleAssign(selectedDiscipleData.id, building.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 size={18} className="text-sect-gold" />
                          <div>
                            <div className="font-display text-sect-jade text-sm">
                              {building.name}
                            </div>
                            <div className="text-xs text-sect-jade/50 flex items-center gap-2">
                              {building.minDiscipleStatus && (
                                <span className="flex items-center gap-1">
                                  <Shield size={12} />
                                  准入：{DiscipleStatusDisplayNames[building.minDiscipleStatus]}及以上
                                </span>
                              )}
                              {RealmOrder.indexOf(selectedDiscipleData.realm) >= RealmOrder.indexOf('golden') && (
                                <span className="text-sect-gold/70">可担任管理者</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-sect-jade/60">
                            {buildingDisciples.length}/{building.discipleCapacity}
                          </span>
                          {isCurrent && (
                            <Badge variant="gold" size="sm">
                              <Check size={12} className="mr-1" />
                              当前
                            </Badge>
                          )}
                          {isFull && !isCurrent && (
                            <Badge variant="default" size="sm">已满</Badge>
                          )}
                          {!canEnter && (
                            <Badge variant="default" size="sm" className="text-red-400/70">身份不足</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {selectedDiscipleData.assignedBuilding && (
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  handleAssign(selectedDiscipleData.id, '');
                  setSelectedDisciple(null);
                }}
              >
                <X size={14} className="mr-1" />
                取消分配
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

// 自动分配逻辑（与 gameLogic.ts 中的保持一致）
function autoAssignBuilding(disciple: any, buildings: any[]): { buildingId: string | null; newBuildings: any[] } {
  const availableBuildings = buildings.filter(b => 
    b.status === 'active' && 
    b.discipleCapacity > 0 &&
    b.assignedDisciples.length < b.discipleCapacity
  );
  
  if (availableBuildings.length === 0) {
    return { buildingId: null, newBuildings: buildings };
  }
  
  const { rootBone, spiritRhythm, daoFate } = disciple.hiddenTalents;
  
  const buildingScores = availableBuildings.map(building => {
    let score = 30;
    
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
    }
    
    return { building, score };
  });
  
  buildingScores.sort((a, b) => b.score - a.score);
  return { buildingId: buildingScores[0]?.building.id || null, newBuildings: buildings };
}
