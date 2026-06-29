import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { 
  DiscipleStatus, DiscipleStatusNames, RealmNames, SpiritRootNames 
} from '@/types/disciple';
import { 
  User, Heart, Sparkles, BookOpen, Calendar, Star, 
  Filter, UserPlus, X, Building2, Sword, Shield, 
  Zap, Target, Activity, Smile, Frown, Wind, Swords, Flame
} from 'lucide-react';
import { calculateDiscipleCombatPower } from '@/utils/gameLogic';
import { CONSTITUTIONS, RARITY_COLORS, RARITY_NAMES } from '@/data/constitutions';
import type { Constitution } from '@/data/constitutions';

const statusFilters: { value: DiscipleStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'servant', label: '杂役' },
  { value: 'outer', label: '外门' },
  { value: 'inner', label: '内门' },
  { value: 'core', label: '核心' },
  { value: 'elder', label: '长老' },
];

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

function getStatusVariant(status: DiscipleStatus): 'gold' | 'spirit' | 'herb' | 'pill' | 'default' {
  const variants: Record<DiscipleStatus, 'gold' | 'spirit' | 'herb' | 'pill' | 'default'> = {
    mortal: 'default',
    servant: 'default',
    outer: 'herb',
    inner: 'spirit',
    core: 'gold',
    elder: 'pill',
  };
  return variants[status];
}

function getSatisfactionColor(satisfaction: number): string {
  if (satisfaction >= 80) return 'text-green-400';
  if (satisfaction >= 60) return 'text-yellow-400';
  if (satisfaction >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getSatisfactionIcon(satisfaction: number) {
  if (satisfaction >= 80) return <Smile size={16} className="text-green-400" />;
  if (satisfaction >= 60) return <Smile size={16} className="text-yellow-400" />;
  return <Frown size={16} className="text-red-400" />;
}

// 获取灵根品质样式
function getSpiritRootQualityClass(quality: number): string {
  if (quality >= 90) return 'spirit-root-legendary';
  if (quality >= 75) return 'spirit-root-epic';
  if (quality >= 55) return 'spirit-root-rare';
  if (quality >= 35) return 'spirit-root-uncommon';
  return 'text-gray-300';
}

function getBaseCultivationSpeed(disciple: any): number {
  const totalBonus = disciple.buffs
    .filter((b: any) => b.type === 'cultivation')
    .reduce((sum: number, b: any) => sum + b.value, 0);
  const satisfactionPenalty = (100 - disciple.satisfaction) * 0.02;
  return disciple.cultivationSpeed / (1 + totalBonus / 100) / (1 - satisfactionPenalty);
}

// 精美弟子头像 - DiceBear API + 玉石边框
function DiscipleAvatar({ seed, size = 48, status = 'servant' }: { seed: number; size?: number; status?: string }) {
  // DiceBear 冒险风格头像（适合古风主题）
  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=1a2e2a`;

  // 根据身份状态选择边框颜色
  const getBorderGradient = () => {
    switch (status) {
      case 'elder': return 'from-amber-400 via-yellow-300 to-amber-400';
      case 'core': return 'from-yellow-600 via-amber-400 to-yellow-600';
      case 'inner': return 'from-purple-500 via-violet-400 to-purple-500';
      case 'outer': return 'from-emerald-500 via-teal-400 to-emerald-500';
      default: return 'from-stone-400 via-stone-300 to-stone-400';
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 外层光晕 */}
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/20 via-transparent to-amber-500/20 blur-sm"
      />
      {/* 金色边框 */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getBorderGradient()} p-[2px]`}>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-900 to-stone-800 overflow-hidden flex items-center justify-center">
          <img
            src={avatarUrl}
            alt="弟子头像"
            width={size - 6}
            height={size - 6}
            className="rounded-full"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </div>
      {/* 内层高光 */}
      <div
        className="absolute inset-1 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

// 简化版头像 - 用于列表
function SimpleAvatar({ seed, size = 36 }: { seed: number; size?: number }) {
  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=1a2e2a`;

  return (
    <div
      className="rounded-full overflow-hidden border border-sect-gold/30"
      style={{ width: size, height: size }}
    >
      <img
        src={avatarUrl}
        alt="弟子头像"
        width={size}
        height={size}
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}

export const DisciplesPanel: React.FC = () => {
  const { disciples, recruitDisciple, spiritStones, getBuildingById } = useGameStore();
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<DiscipleStatus | 'all'>('all');
  const [detailTab, setDetailTab] = useState<'basic' | 'combat'>('basic');
  
  const filteredDisciples = statusFilter === 'all'
    ? disciples
    : disciples.filter(d => d.status === statusFilter);
  
  const selectedDisciple = disciples.find(d => d.id === selectedDiscipleId);
  
  const canRecruit = spiritStones >= 50;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient">弟子管理</h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            共 {disciples.length} 名弟子
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={recruitDisciple}
            disabled={!canRecruit}
          >
            <UserPlus size={16} className="mr-1.5" />
            招募弟子 (50灵石)
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-sect-jade/50" />
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1 text-sm rounded-full transition-all ${
              statusFilter === filter.value
                ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
                : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDisciples.map(disciple => (
          <Card
            key={disciple.id}
            hoverable
            className="cursor-pointer"
            onClick={() => setSelectedDiscipleId(disciple.id)}
          >
            <div className="flex items-start gap-3">
              <SimpleAvatar seed={disciple.avatarSeed} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sect-jade truncate">
                    {disciple.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusVariant(disciple.status)} size="sm">
                    {DiscipleStatusNames[disciple.status]}
                  </Badge>
                  <span className={`text-xs ${getRealmColor(disciple.realm)}`}>
                    {RealmNames[disciple.realm]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-sect-jade/60">
                  <span className="flex items-center gap-0.5">
                    <Star size={12} className="text-sect-herb-light/60" />
                    {Math.floor(disciple.contributionPoints)}
                  </span>
                  {disciple.assignedBuilding && (
                    <span className="flex items-center gap-0.5 truncate">
                      <Building2 size={12} className="text-sect-gold/60" />
                      {getBuildingById(disciple.assignedBuilding)?.name || '无'}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-sect-jade/50 mb-0.5">
                    <span>修为</span>
                    <span>{Math.floor(disciple.realmProgress)}%</span>
                  </div>
                  <ProgressBar value={disciple.realmProgress} max={100} size="sm" />
                </div>
                {/* 满意度显示 */}
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {getSatisfactionIcon(disciple.satisfaction)}
                  <span className={getSatisfactionColor(disciple.satisfaction)}>
                    {Math.floor(disciple.satisfaction)}%满意
                  </span>
                  {disciple.maxSatisfactionLossWork > 0 && (
                    <span className="text-orange-400/60 text-[10px]">
                      (工作-{disciple.maxSatisfactionLossWork}%)
                    </span>
                  )}
                  {disciple.maxSatisfactionLossResidence > 0 && (
                    <span className="text-orange-400/60 text-[10px]">
                      (居所-{disciple.maxSatisfactionLossResidence}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <Modal
        isOpen={!!selectedDisciple}
        onClose={() => setSelectedDiscipleId(null)}
        title="弟子详情"
        size="lg"
      >
        {selectedDisciple && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DiscipleAvatar seed={selectedDisciple.avatarSeed} size={64} />
              <div>
                <h2 className="font-display text-xl text-sect-gold">
                  {selectedDisciple.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusVariant(selectedDisciple.status)}>
                    {DiscipleStatusNames[selectedDisciple.status]}
                  </Badge>
                  <span className={`text-sm ${getRealmColor(selectedDisciple.realm)}`}>
                    {RealmNames[selectedDisciple.realm]}
                  </span>
                </div>
                <div className="text-sm text-sect-jade/60 mt-1">
                  「{selectedDisciple.talentDisplay.nickname}」
                </div>
              </div>
            </div>
            
            <div className="divider-gold" />
            
            {/* 标签页切换 */}
            <div className="flex gap-2 border-b border-sect-gold/20">
              <button
                onClick={() => setDetailTab('basic')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  detailTab === 'basic'
                    ? 'text-sect-gold border-b-2 border-sect-gold'
                    : 'text-sect-jade/60 hover:text-sect-jade'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Activity size={16} />
                  基础属性
                </span>
              </button>
              <button
                onClick={() => setDetailTab('combat')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  detailTab === 'combat'
                    ? 'text-sect-gold border-b-2 border-sect-gold'
                    : 'text-sect-jade/60 hover:text-sect-jade'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sword size={16} />
                  战斗属性
                </span>
              </button>
            </div>
            
            {/* 基础属性页 */}
            {detailTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-sect-jade/50" />
                    <span className="text-sect-jade/80 text-sm">
                      {Math.floor(selectedDisciple.age)} 岁
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-sect-jade/50" />
                    <span className="text-sect-jade/80 text-sm">
                      寿元 {Math.floor(selectedDisciple.maxAge)} 年
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-sect-jade/50" />
                    <span className="text-sect-jade/80 text-sm">
                      贡献点 {Math.floor(selectedDisciple.contributionPoints)}
                    </span>
                  </div>
                </div>
                
                {/* 修炼速度 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-sect-jade/50" />
                      <span className="text-sect-jade/80 text-sm font-medium">修炼速度</span>
                    </div>
                    <span className="font-display text-sect-gold">
                      {selectedDisciple.cultivationSpeed.toFixed(1)}/月
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.min(100, selectedDisciple.cultivationSpeed * 2)}
                    max={100}
                    color="spirit"
                  />
                  {/* 加成明细 */}
                  <div className="mt-2 pt-2 border-t border-sect-gold/10 text-xs space-y-1">
                    <div className="flex justify-between text-sect-jade/60">
                      <span>基础速度</span>
                      <span>{getBaseCultivationSpeed(selectedDisciple).toFixed(1)}/月</span>
                    </div>
                    {selectedDisciple.buffs.filter(b => b.type === 'cultivation' && b.value > 0).map(buff => (
                      <div key={buff.id} className="flex justify-between text-green-400">
                        <span>{buff.name}</span>
                        <span>+{buff.value}%</span>
                      </div>
                    ))}
                    {selectedDisciple.satisfaction < 100 && (
                      <div className="flex justify-between text-red-400">
                        <span>满意度惩罚</span>
                        <span>-{(100 - selectedDisciple.satisfaction) * 2}%</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 满意度 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSatisfactionIcon(selectedDisciple.satisfaction)}
                      <span className="text-sect-jade/80 text-sm font-medium">满意度</span>
                    </div>
                    <Tooltip
                      content={
                        <div className="space-y-2 text-xs min-w-[200px]">
                          <div className="font-medium text-sect-gold mb-1">满意度明细</div>
                          <div className="border-b border-sect-gold/20 pb-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sect-jade/60">当前满意度</span>
                              <span className={`font-medium ${getSatisfactionColor(selectedDisciple.satisfaction)}`}>
                                {Math.floor(selectedDisciple.satisfaction)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sect-jade/60">修炼效率影响</span>
                              <span className="text-red-400">
                                  -{(100 - selectedDisciple.satisfaction) * 2}%
                                </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {selectedDisciple.maxSatisfactionLossWork > 0 ? (
                              <div className="flex items-center gap-1 text-orange-400">
                                <span>无工作惩罚: -{selectedDisciple.maxSatisfactionLossWork}% (上限20%)</span>
                              </div>
                            ) : (
                              <div className="text-green-400">✓ 有工作，每月恢复</div>
                            )}
                            {selectedDisciple.maxSatisfactionLossResidence > 0 ? (
                              <div className="flex items-center gap-1 text-orange-400">
                                <span>居所不匹配: -{selectedDisciple.maxSatisfactionLossResidence}% (上限40%)</span>
                              </div>
                            ) : (
                              <div className="text-green-400">✓ 居所匹配，每月恢复</div>
                            )}
                            {selectedDisciple.satisfaction < 60 && (
                              <div className="text-red-400 pt-1 border-t border-sect-gold/20">
                                ⚠ 满意度低于60%，弟子可能离开！
                              </div>
                            )}
                          </div>
                        </div>
                      }
                      position="bottom"
                    >
                      <span className={`font-display ${getSatisfactionColor(selectedDisciple.satisfaction)} cursor-help`}>
                        {Math.floor(selectedDisciple.satisfaction)}%
                      </span>
                    </Tooltip>
                  </div>
                  <ProgressBar 
                    value={selectedDisciple.satisfaction} 
                    max={100} 
                    color={selectedDisciple.satisfaction >= 60 ? 'herb' : selectedDisciple.satisfaction >= 40 ? 'spirit' : 'pill'}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-sect-jade/80">修为进度</span>
                    <span className="text-sect-jade/60">
                      {Math.floor(selectedDisciple.realmProgress)} / 100
                    </span>
                  </div>
                  <ProgressBar 
                    value={selectedDisciple.realmProgress} 
                    max={100} 
                    color="spirit" 
                  />
                </div>
                

                <div>
                  <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                    <BookOpen size={16} />
                    天赋评价
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* 根骨 - 包含灵根 */}
                    <Tooltip
                      content={
                        <div className="space-y-2 text-xs min-w-[240px]">
                          <div className="font-medium text-sect-gold mb-1">根骨</div>
                          <div className="text-sect-jade/80">
                            决定修炼速度和突破成功率。根骨越高，修炼越快，突破越容易。
                          </div>
                          <div className="border-t border-sect-gold/20 pt-2 space-y-1">
                            <div className="text-sect-jade/60">你的根骨：{selectedDisciple.hiddenTalents.rootBone}</div>
                            <div className="text-sect-gold">{selectedDisciple.talentDisplay.rootBoneDesc}</div>
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="text-sect-jade/50 text-xs mb-1">根骨（灵根）</div>
                        <div className="text-sect-jade text-sm">{selectedDisciple.talentDisplay.rootBoneDesc}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedDisciple.hiddenTalents.spiritRoots.map((root, idx) => (
                            <span key={idx} className={`text-xs ${getSpiritRootQualityClass(root.quality)}`}>
                              {SpiritRootNames[root.type]}{root.quality}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Tooltip>
                    
                    {/* 灵韵 */}
                    <Tooltip
                      content={
                        <div className="space-y-2 text-xs min-w-[240px]">
                          <div className="font-medium text-sect-gold mb-1">灵韵</div>
                          <div className="text-sect-jade/80">
                            影响炼制丹药、武器、符纸等物品的品质和成功率。
                          </div>
                          <div className="border-t border-sect-gold/20 pt-2 space-y-1">
                            <div className="text-sect-jade/60">你的灵韵：{selectedDisciple.hiddenTalents.spiritRhythm}</div>
                            <div className="text-sect-gold">{selectedDisciple.talentDisplay.spiritRhythmDesc}</div>
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="text-sect-jade/50 text-xs">灵韵</div>
                        <div className="text-sect-jade">{selectedDisciple.talentDisplay.spiritRhythmDesc}</div>
                      </div>
                    </Tooltip>
                    
                    {/* 体质 - 包含体质详情 */}
                    <Tooltip
                      content={
                        <div className="space-y-2 text-xs min-w-[240px]">
                          <div className="font-medium text-sect-gold mb-1">体质</div>
                          <div className="text-sect-jade/80">
                            影响生命值上限和各种战斗属性。特殊体质会带来额外加成。
                          </div>
                          <div className="border-t border-sect-gold/20 pt-2 space-y-1">
                            <div className="text-sect-jade/60">你的体质：{selectedDisciple.hiddenTalents.constitution}</div>
                            <div className="text-sect-gold">{selectedDisciple.talentDisplay.constitutionDesc}</div>
                          </div>
                          <div className="border-t border-sect-gold/20 pt-2">
                            {(() => {
                              const constitution = CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId);
                              if (!constitution) return null;
                              return (
                                <>
                                  <div className={`font-medium ${RARITY_COLORS[constitution.rarity]}`}>
                                    特殊体质：{constitution.name}
                                  </div>
                                  <div className="text-sect-jade/60 text-[10px]">
                                    {RARITY_NAMES[constitution.rarity]}
                                  </div>
                                  <div className="text-sect-jade/80 text-[10px] mt-1">
                                    {constitution.description}
                                  </div>
                                  <div className="space-y-1 pt-1">
                                    {constitution.effects.cultivationBonus && (
                                      <div className="text-green-400">修炼速度 +{constitution.effects.cultivationBonus}%</div>
                                    )}
                                    {constitution.effects.attackBonus && (
                                      <div className="text-red-400">攻击 +{constitution.effects.attackBonus}</div>
                                    )}
                                    {constitution.effects.defenseBonus && (
                                      <div className="text-blue-400">防御 +{constitution.effects.defenseBonus}</div>
                                    )}
                                    {constitution.effects.hpBonus && (
                                      <div className="text-pink-400">生命 +{constitution.effects.hpBonus}</div>
                                    )}
                                    {constitution.effects.critBonus && (
                                      <div className="text-yellow-400">暴击 +{constitution.effects.critBonus}%</div>
                                    )}
                                    {constitution.effects.dodgeBonus && (
                                      <div className="text-cyan-400">闪避 +{constitution.effects.dodgeBonus}%</div>
                                    )}
                                    {constitution.effects.breakthroughBonus && (
                                      <div className="text-purple-400">突破成功率 +{constitution.effects.breakthroughBonus}%</div>
                                    )}
                                    {constitution.effects.lifespanBonus && (
                                      <div className="text-sect-gold">寿元 +{constitution.effects.lifespanBonus}</div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="text-sect-jade/50 text-xs">体质</div>
                        <div className="text-sect-jade text-sm">{selectedDisciple.talentDisplay.constitutionDesc}</div>
                        <div className="text-sect-jade/60 text-xs mt-1">
                          {CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)?.name || '无'}
                        </div>
                      </div>
                    </Tooltip>
                    
                    {/* 道缘 */}
                    <Tooltip
                      content={
                        <div className="space-y-2 text-xs min-w-[240px]">
                          <div className="font-medium text-sect-gold mb-1">道缘</div>
                          <div className="text-sect-jade/80">
                            影响领悟功法和战技的速度，以及获得稀有物品和机遇的概率。
                          </div>
                          <div className="border-t border-sect-gold/20 pt-2 space-y-1">
                            <div className="text-sect-jade/60">你的道缘：{selectedDisciple.hiddenTalents.daoFate}</div>
                            <div className="text-sect-gold">{selectedDisciple.talentDisplay.daoFateDesc}</div>
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="text-sect-jade/50 text-xs">道缘</div>
                        <div className="text-sect-jade">{selectedDisciple.talentDisplay.daoFateDesc}</div>
                      </div>
                    </Tooltip>
                  </div>
                </div>
                
                {/* 所属堂口 */}
                <div>
                  <h3 className="font-display text-sect-gold mb-2 text-sm">所属堂口</h3>
                  <Badge variant="herb">
                    {selectedDisciple.assignedBuilding 
                      ? getBuildingById(selectedDisciple.assignedBuilding)?.name || '无'
                      : '无'}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* 战斗属性页 */}
            {detailTab === 'combat' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Sword size={16} className="text-red-400/50" />
                    <span className="text-sect-jade/80 text-sm">
                      战力 {calculateDiscipleCombatPower(selectedDisciple).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* 战斗属性 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                    <Swords size={16} />
                    战斗属性
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart size={14} className="text-red-500/70" />
                        <span className="text-sect-jade/60 text-xs">生命</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.maxHp}</div>
                    </div>
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Sword size={14} className="text-red-400/70" />
                        <span className="text-sect-jade/60 text-xs">攻击</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.attack}</div>
                    </div>
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={14} className="text-blue-400/70" />
                        <span className="text-sect-jade/60 text-xs">防御</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.defense}</div>
                    </div>
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Wind size={14} className="text-cyan-400/70" />
                        <span className="text-sect-jade/60 text-xs">闪避</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.dodge}%</div>
                    </div>
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-yellow-400/70" />
                        <span className="text-sect-jade/60 text-xs">暴击</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.crit}%</div>
                    </div>
                  </div>
                </div>
                
                {/* 功法战技加成 */}
                <div>
                  <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                    <BookOpen size={16} />
                    功法加成
                  </h3>
                  {selectedDisciple.learnedTechnique ? (
                    <div className="p-3 rounded bg-sect-ink-light/50 border border-sect-gold/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sect-jade font-medium">{selectedDisciple.learnedTechnique.name}</span>
                        <Badge variant="spirit" size="sm">
                          {selectedDisciple.learnedTechnique.isLearned ? '已学成' : '学习中'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-sect-jade/60">
                        <span>修炼加成: +{selectedDisciple.learnedTechnique.cultivationBonus}%</span>
                        <span>战力加成: +{selectedDisciple.learnedTechnique.combatBonus}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-sect-jade/50 italic">尚未学习功法</div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                    <Sword size={16} />
                    战技加成
                  </h3>
                  {selectedDisciple.learnedBattles.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDisciple.learnedBattles.map((battle, index) => (
                        <div key={index} className="p-3 rounded bg-sect-ink-light/50 border border-sect-gold/20">
                          <div className="flex justify-between items-center">
                            <span className="text-sect-jade font-medium">{battle.name}</span>
                            <Badge variant="pill" size="sm">
                              {battle.isLearned ? '已学成' : '学习中'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-sect-jade/60">
                            <span>战力加成: +{battle.combatBonus}%</span>
                            <span>学习进度: {battle.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-sect-jade/50 italic">尚未学习战技</div>
                  )}
                </div>
                
                {/* 当前学习的书籍 */}
                {selectedDisciple.learningBook && (
                  <div>
                    <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                      <Target size={16} />
                      正在学习
                    </h3>
                    <div className="p-3 rounded bg-sect-ink-light/50 border border-sect-gold/20">
                      <div className="flex justify-between items-center">
                        <span className="text-sect-jade font-medium">{selectedDisciple.learningBook.name}</span>
                        <Badge variant="herb" size="sm">学习中</Badge>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-sect-jade/60 mb-1">
                          <span>学习进度</span>
                          <span>{selectedDisciple.learningBook.progress}% / 100%</span>
                        </div>
                        <ProgressBar 
                          value={selectedDisciple.learningBook.progress} 
                          max={100} 
                          color="herb"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setSelectedDiscipleId(null)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
