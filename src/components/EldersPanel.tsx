import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Crown, Users, Building2, Star, Award, X, Swords } from 'lucide-react';
import { RESIDENCE_TYPES } from '@/types/building';
import { calculateDiscipleCombatPower } from '@/utils/gameLogic';

export const EldersPanel: React.FC = () => {
  const { disciples, buildings, challengeCaveMansion } = useGameStore();
  const [showVacantModal, setShowVacantModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  const elders = disciples.filter(d => d.status === 'elder');
  const elderCandidates = disciples.filter(d => 
    d.status === 'core' && d.contributionPoints >= 1000
  );
  
  const vacantBuildings = buildings.filter(b => 
    b.status === 'active' && 
    !b.managerId && 
    b.discipleCapacity > 0 &&
    !RESIDENCE_TYPES.includes(b.type)
  );
  const assignedBuildings = buildings.filter(b => b.status === 'active' && b.managerId);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-gold-gradient">长老院</h1>
        <p className="text-sect-jade/60 text-sm mt-1">
          任命长老管理各堂口，提供加成
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Crown className="text-sect-pill" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">现任长老</div>
              <div className="font-display text-xl text-sect-pill-light">
                {elders.length} 位
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Award className="text-sect-spirit" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">长老候选</div>
              <div className="font-display text-xl text-sect-spirit-light">
                {elderCandidates.length} 位
              </div>
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-4 cursor-pointer hover:border-sect-gold/40 transition-colors"
          onClick={() => setShowVacantModal(true)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Building2 className="text-yellow-400" size={24} />
            </div>
            <div className="flex-1">
              <div className="text-sect-jade/60 text-xs">空缺堂口</div>
              <div className="font-display text-xl text-yellow-400">
                {vacantBuildings.length} 个
              </div>
            </div>
            <div className="text-sect-jade/30">
              <X size={16} />
            </div>
          </div>
        </Card>
      </div>
      
      <Card title="现任长老">
        {elders.length === 0 ? (
          <div className="text-center py-8">
            <Crown size={48} className="mx-auto text-sect-jade/20 mb-3" />
            <p className="text-sect-jade/50">暂无长老</p>
            <p className="text-sect-jade/40 text-sm mt-1">
              核心弟子达到元婴期且贡献点满1000可任命为长老
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {elders.map(elder => {
              const building = buildings.find(b => b.managerId === elder.id);
              const cave = buildings.find(b => b.type === 'cave_mansion' && b.assignedDisciples.includes(elder.id));
              return (
                <div key={elder.id} className="flex items-center gap-4 p-3 rounded-lg bg-sect-ink-light/30">
                  <div className="w-12 h-12 rounded-full bg-sect-pill/20 flex items-center justify-center">
                    <Crown size={24} className="text-sect-pill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sect-jade">{elder.name}</span>
                      <Badge variant="pill">长老</Badge>
                      {cave && <Badge variant="default">洞府</Badge>}
                    </div>
                    <div className="text-sm text-sect-jade/60 mt-0.5">
                      {building ? `管辖：${building.name}` : '暂未分配堂口'}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-sect-gold">加成 +{building?.elderBonus || 0}%</div>
                    <div className="text-sect-jade/50 text-xs">
                      贡献 {Math.floor(elder.contributionPoints)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 洞府挑战区 */}
      {(() => {
        const cave = buildings.find(b => b.type === 'cave_mansion' && b.status === 'active');
        if (!cave) return null;
        const residents = disciples.filter(d => cave.assignedDisciples.includes(d.id));
        const nonCaveElders = elders.filter(d => !cave.assignedDisciples.includes(d.id));
        return (
          <Card title={`洞府 (${residents.length}/${cave.discipleCapacity})`}>
            <div className="space-y-3">
              <div className="text-xs text-sect-jade/60">
                洞府当前等级 Lv.{cave.level}，可居住 {cave.discipleCapacity} 位长老。住满后，长老可发起挑战争夺居住权。
              </div>
              {residents.length > 0 && (
                <div>
                  <div className="text-[11px] text-sect-gold mb-1">洞府内长老</div>
                  <div className="space-y-1.5">
                    {residents.map(r => {
                      const power = calculateDiscipleCombatPower(r);
                      return (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded bg-sect-ink-light/30 border border-sect-gold/10">
                          <div className="flex items-center gap-2">
                            <Crown size={16} className="text-sect-pill" />
                            <span className="text-sm text-sect-jade">{r.name}</span>
                          </div>
                          <span className="text-xs text-sect-herb-light font-mono">战力 {power}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {nonCaveElders.length > 0 && (
                <div>
                  <div className="text-[11px] text-sect-jade/60 mb-1">洞府外长老（可挑战）</div>
                  <div className="space-y-1.5">
                    {nonCaveElders.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded bg-sect-ink-light/20 border border-sect-gold/5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-sect-jade">{r.name}</span>
                          <span className="text-[10px] text-sect-jade/50">战力 {calculateDiscipleCombatPower(r)}</span>
                        </div>
                        <button
                          className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                          onClick={() => {
                            // 直接对洞府内第一人发起挑战（简化逻辑）
                            const target = cave.assignedDisciples[0];
                            if (!target) return;
                            const res = challengeCaveMansion(r.id, target);
                            if (!res.success && res.reason) {
                              alert(res.reason);
                            }
                          }}
                          title={`挑战洞府第一位长老（消耗 1000 贡献）`}
                        >
                          <Swords size={12} />
                          挑战
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-sect-jade/40">点击「挑战」以 1000 贡献挑战洞府内第一位长老；胜则入住洞府，败则失去 1000 贡献</div>
                </div>
              )}
            </div>
          </Card>
        );
      })()}
      
      <Card title="长老加成">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-sect-ink-light/30">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-sect-gold" />
              <span className="text-sect-jade/80">境界加成</span>
            </div>
            <p className="text-sect-jade/50 text-xs">
              长老自身境界越高，堂口产出加成越大
            </p>
            <div className="text-sect-gold mt-2">+20% (元婴期)</div>
          </div>
          <div className="p-4 rounded-lg bg-sect-ink-light/30">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-sect-spirit" />
              <span className="text-sect-jade/80">专精加成</span>
            </div>
            <p className="text-sect-jade/50 text-xs">
              长老灵韵属性提升生产类建筑效率
            </p>
            <div className="text-sect-spirit-light mt-2">+15% (灵韵80)</div>
          </div>
          <div className="p-4 rounded-lg bg-sect-ink-light/30">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-sect-herb" />
              <span className="text-sect-jade/80">弟子加成</span>
            </div>
            <p className="text-sect-jade/50 text-xs">
              堂口弟子平均技能水平影响产出
            </p>
            <div className="text-sect-herb-light mt-2">+10% (平均灵韵50)</div>
          </div>
        </div>
      </Card>
      
      <Modal
        isOpen={showVacantModal}
        onClose={() => setShowVacantModal(false)}
        title="空缺堂口"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sect-jade/60 text-sm mb-4">
            以下堂口暂无长老管辖，点击分配长老进行管理
          </p>
          {vacantBuildings.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={48} className="mx-auto text-sect-jade/20 mb-3" />
              <p className="text-sect-jade/50">所有堂口都已分配长老</p>
            </div>
          ) : (
            vacantBuildings.map(building => {
              const manager = building.managerId 
                ? disciples.find(d => d.id === building.managerId) 
                : null;
              const assignedCount = building.assignedDisciples.length;
              
              return (
                <div 
                  key={building.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-sect-ink-light/30 border border-sect-gold/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Building2 size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-display text-sect-jade">{building.name}</div>
                      <div className="text-xs text-sect-jade/50 mt-0.5">
                        弟子：{assignedCount}/{building.discipleCapacity}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">
                    {manager ? manager.name : '待分配'}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
