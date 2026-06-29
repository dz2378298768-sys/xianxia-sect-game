import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Users, Building2, Gem, TrendingUp, TrendingDown,
  Sparkles, Mountain, BookOpen, Hammer, Sword, Shield,
  Crown, ChevronRight, Star, Zap, Lock
} from 'lucide-react';
import { calculateSectCombatPower, calculateDiscipleCombatPower } from '@/utils/gameLogic';
import {
  SectLevelNames, SectLevelDescriptions, SectLevelOrder,
  SectLevelRequirementsMap, SectLevelUnlockBuildings, SectLevelUnlockFeatures,
  SectLevelDiscipleCap, SectLevelReputationCap,
} from '@/types/game';
import { BuildingTypeNames } from '@/types/building';
import { cn } from '@/lib/utils';

export const OverviewPanel: React.FC = () => {
  const {
    year, month, sectLevel, reputation, spiritStones,
    disciples, buildings, herbInventory, nextMonth,
    canPromoteSect, promoteSect,
  } = useGameStore();
  
  const { canPromote, nextLevel, reasons } = canPromoteSect();
  const currentLevelIndex = SectLevelOrder.indexOf(sectLevel);
  const nextLevelReq = nextLevel ? SectLevelRequirementsMap[nextLevel] : null;
  const discipleCap = SectLevelDiscipleCap[sectLevel];
  const reputationCap = SectLevelReputationCap[sectLevel];
  
  const sectCombatPower = calculateSectCombatPower(disciples, buildings);
  const strongestDisciple = disciples.length > 0 
    ? disciples.reduce((max, d) => {
        const power = calculateDiscipleCombatPower(d);
        const maxPower = calculateDiscipleCombatPower(max);
        return power > maxPower ? d : max;
      })
    : null;
  const strongestPower = strongestDisciple ? calculateDiscipleCombatPower(strongestDisciple) : 0;
  
  const servantCount = disciples.filter(d => d.status === 'servant').length;
  const outerCount = disciples.filter(d => d.status === 'outer').length;
  const innerCount = disciples.filter(d => d.status === 'inner').length;
  const coreCount = disciples.filter(d => d.status === 'core').length;
  
  const activeBuildings = buildings.filter(b => b.status === 'active').length;
  const totalMaintenance = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    const levelMultiplier = 1 + (b.level - 1) * 0.75;
    return sum + Math.floor(b.baseMaintenanceCost * levelMultiplier);
  }, 0);
  
  const totalOutput = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    const levelMultiplier = 1 + (b.level - 1) * 0.5;
    return sum + Math.floor((b.baseOutput.spiritStones || 0) * levelMultiplier);
  }, 0);
  
  const netIncome = totalOutput - totalMaintenance;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-gradient">宗门总览</h1>
          <p className="text-sect-jade/60 text-sm mt-1">
            第 {year} 年 {month} 月 · 观察宗门运转
          </p>
        </div>
      </div>
      
      {/* 宗门等级卡片 */}
      <Card className="bg-gradient-to-r from-sect-gold/10 via-purple-500/5 to-sect-gold/10 border-sect-gold/30">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sect-gold/20">
              <Crown className="text-sect-gold" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-sect-gold">
                  {SectLevelNames[sectLevel]}
                </h2>
                <Badge variant="gold" size="sm">
                  Lv.{currentLevelIndex + 1}
                </Badge>
              </div>
              <p className="text-sm text-sect-jade/60 mt-1">
                {SectLevelDescriptions[sectLevel]}
              </p>
            </div>
          </div>
          
          <div className="md:ml-auto flex flex-col items-end gap-2">
            {nextLevel ? (
              <>
                <div className="text-sm text-sect-jade/60 flex items-center gap-2">
                  下一阶段
                  <ChevronRight size={16} />
                  <span className="font-display text-sect-gold">
                    {SectLevelNames[nextLevel]}
                  </span>
                </div>
                <Tooltip
                  content={
                    <div className="space-y-2 text-xs min-w-[200px]">
                      <div className="font-medium text-sect-gold mb-2 flex items-center gap-1">
                        <Crown size={14} />
                        晋升条件
                      </div>
                      {nextLevelReq && (
                        <>
                          <div className="border-b border-sect-gold/20 pb-2 space-y-1">
                            <div className={`flex items-center justify-between gap-4 ${reputation >= nextLevelReq.reputation ? 'text-green-400' : 'text-red-400'}`}>
                              <span>声望</span>
                              <span>{reputation} / {nextLevelReq.reputation}</span>
                            </div>
                            <div className={`flex items-center justify-between gap-4 ${spiritStones >= nextLevelReq.spiritStones ? 'text-green-400' : 'text-red-400'}`}>
                              <span>灵石</span>
                              <span>{Math.floor(spiritStones)} / {nextLevelReq.spiritStones}</span>
                            </div>
                            {nextLevelReq.discipleCount && (
                              <div className={`flex items-center justify-between gap-4 ${disciples.length >= nextLevelReq.discipleCount ? 'text-green-400' : 'text-red-400'}`}>
                                <span>弟子数量</span>
                                <span>{disciples.length} / {nextLevelReq.discipleCount}</span>
                              </div>
                            )}
                            {nextLevelReq.level2Buildings !== undefined && (
                              <div className={`flex items-center justify-between gap-4 ${buildings.filter(b => b.level >= 2 && b.status === 'active').length >= nextLevelReq.level2Buildings ? 'text-green-400' : 'text-red-400'}`}>
                                <span>2级建筑</span>
                                <span>{buildings.filter(b => b.level >= 2 && b.status === 'active').length} / {nextLevelReq.level2Buildings}</span>
                              </div>
                            )}
                            {nextLevelReq.level3Buildings !== undefined && (
                              <div className={`flex items-center justify-between gap-4 ${buildings.filter(b => b.level >= 3 && b.status === 'active').length >= nextLevelReq.level3Buildings ? 'text-green-400' : 'text-red-400'}`}>
                                <span>3级建筑</span>
                                <span>{buildings.filter(b => b.level >= 3 && b.status === 'active').length} / {nextLevelReq.level3Buildings}</span>
                              </div>
                            )}
                            {nextLevelReq.goldenDisciple && (
                              <div className={`flex items-center justify-between gap-4 ${disciples.some(d => d.realm === 'golden') ? 'text-green-400' : 'text-red-400'}`}>
                                <span>金丹期弟子</span>
                                <span>{disciples.some(d => d.realm === 'golden') ? '✓' : '✗'}</span>
                              </div>
                            )}
                            {nextLevelReq.nascentDisciple && (
                              <div className={`flex items-center justify-between gap-4 ${disciples.some(d => d.realm === 'nascent') ? 'text-green-400' : 'text-red-400'}`}>
                                <span>元婴期弟子</span>
                                <span>{disciples.some(d => d.realm === 'nascent') ? '✓' : '✗'}</span>
                              </div>
                            )}
                            {nextLevelReq.spiritDisciple && (
                              <div className={`flex items-center justify-between gap-4 ${disciples.some(d => d.realm === 'spirit') ? 'text-green-400' : 'text-red-400'}`}>
                                <span>化神期弟子</span>
                                <span>{disciples.some(d => d.realm === 'spirit') ? '✓' : '✗'}</span>
                              </div>
                            )}
                            {nextLevelReq.allLevel2 && (
                              <div className={`flex items-center justify-between gap-4 ${buildings.every(b => b.level >= 2 || b.status !== 'active') ? 'text-green-400' : 'text-red-400'}`}>
                                <span>全部2级建筑</span>
                                <span>{buildings.filter(b => b.status === 'active').every(b => b.level >= 2) ? '✓' : '✗'}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-1 flex items-center justify-between text-yellow-400">
                            <span>晋升消耗</span>
                            <span>{nextLevelReq.promotionCost} 灵石</span>
                          </div>
                        </>
                      )}
                    </div>
                  }
                  position="bottom"
                >
                  <Button
                    variant={canPromote ? 'gold' : 'ghost'}
                    size="sm"
                    onClick={() => canPromote && promoteSect()}
                    disabled={!canPromote}
                    className={canPromote ? 'animate-pulse-gold' : ''}
                  >
                    {canPromote ? (
                      <span className="flex items-center gap-2">
                        <Star size={14} />
                        可晋升
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lock size={14} />
                        条件未达成
                      </span>
                    )}
                  </Button>
                </Tooltip>
                {nextLevelReq && (
                  <div className="text-xs text-sect-jade/50">
                    晋升消耗：{nextLevelReq.promotionCost} 灵石
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-sect-gold flex items-center gap-2">
                <Sparkles size={16} />
                已达最高等级
              </div>
            )}
          </div>
        </div>
        
        {/* 等级进度条 */}
        <div className="mt-4">
          <div className="flex justify-between mb-2">
            {SectLevelOrder.map((level, i) => (
              <div
                key={level}
                className={cn(
                  'text-xs font-display flex items-center gap-1',
                  i <= currentLevelIndex ? 'text-sect-gold' : 'text-sect-jade/30'
                )}
              >
                {i <= currentLevelIndex ? <Star size={12} fill="currentColor" /> : <Star size={12} />}
                {SectLevelNames[level]}
              </div>
            ))}
          </div>
          <ProgressBar 
            value={currentLevelIndex + (nextLevel ? (reputation / (nextLevelReq?.reputation || 1)) * 0.5 : 1)} 
            max={SectLevelOrder.length} 
            color="gold"
          />
        </div>
        
        {/* 解锁内容预览 */}
        {nextLevel && (
          <div className="mt-4 pt-4 border-t border-sect-gold/20 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-sect-jade/60 mb-2 flex items-center gap-1">
                <Building2 size={12} />
                晋升解锁建筑
              </div>
              <div className="flex flex-wrap gap-1">
                {SectLevelUnlockBuildings[nextLevel].map(type => (
                  <Badge key={type} variant="spirit" size="sm">
                    {BuildingTypeNames[type as keyof typeof BuildingTypeNames] || type}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-sect-jade/60 mb-2 flex items-center gap-1">
                <Zap size={12} />
                晋升解锁功能
              </div>
              <div className="flex flex-wrap gap-1">
                {SectLevelUnlockFeatures[nextLevel].map((feature, i) => (
                  <Badge key={i} variant="herb" size="sm">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 当前等级上限 */}
        <div className="mt-4 pt-4 border-t border-sect-gold/20 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-xs text-sect-jade/60">弟子上限</div>
            <div className="font-display text-sect-gold mt-1">
              {disciples.length} / {discipleCap === null ? '∞' : discipleCap}
            </div>
          </div>
          <div>
            <div className="text-xs text-sect-jade/60">声望上限</div>
            <div className="font-display text-yellow-400 mt-1">
              {Math.floor(reputation)} / {reputationCap === null ? '∞' : reputationCap}
            </div>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Gem className="text-sect-spirit" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">灵石</div>
              <div className={`font-display text-xl ${spiritStones < 0 ? 'text-red-400' : 'text-sect-gold'}`}>
                {Math.floor(spiritStones)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Mountain className="text-yellow-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">声望</div>
              <div className="font-display text-xl text-yellow-300">
                {reputation}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="text-blue-400" size={24} />
            </div>
            <div>
              <div className="text-sect-jade/60 text-xs">弟子总数</div>
              <div className="font-display text-xl text-blue-300">
                {disciples.length}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <Tooltip 
            content={
              <div className="space-y-2 text-xs">
                <div className="font-medium text-sect-gold">战力明细</div>
                <div className="text-sect-jade/80">基础战力: {sectCombatPower.basePower.toLocaleString()}</div>
                {sectCombatPower.bonuses.map((b, i) => (
                  <div key={i} className="text-green-400">+{b.name}: +{(b.multiplier * 100).toFixed(0)}%</div>
                ))}
                <div className="border-t border-sect-gold/20 pt-1 mt-1">
                  <div>最强弟子: {strongestDisciple?.name} ({strongestPower.toLocaleString()})</div>
                </div>
              </div>
            } 
            position="bottom"
          >
            <div className="flex items-center gap-3 cursor-help">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Sword className="text-red-400" size={24} />
              </div>
              <div>
                <div className="text-sect-jade/60 text-xs">宗门战力</div>
                <div className="font-display text-xl text-red-300">
                  {sectCombatPower.totalPower.toLocaleString()}
                </div>
              </div>
              {sectCombatPower.bonuses.length > 0 && (
                <Shield size={16} className="text-green-400 ml-auto" />
              )}
            </div>
          </Tooltip>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="弟子构成" className="lg:col-span-2">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-sect-jade/80">杂役弟子</span>
                <span className="text-sect-jade/60">{servantCount} 人</span>
              </div>
              <ProgressBar value={servantCount} max={Math.max(disciples.length, 1)} color="default" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-sect-jade/80">外门弟子</span>
                <span className="text-sect-jade/60">{outerCount} 人</span>
              </div>
              <ProgressBar value={outerCount} max={Math.max(disciples.length, 1)} color="herb" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-sect-jade/80">内门弟子</span>
                <span className="text-sect-jade/60">{innerCount} 人</span>
              </div>
              <ProgressBar value={innerCount} max={Math.max(disciples.length, 1)} color="spirit" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-sect-jade/80">核心弟子</span>
                <span className="text-sect-jade/60">{coreCount} 人</span>
              </div>
              <ProgressBar value={coreCount} max={Math.max(disciples.length, 1)} color="gold" />
            </div>
          </div>
        </Card>
        
        <Card title="月度收支">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-green-400" size={18} />
                <span className="text-sect-jade/80">收入</span>
              </div>
              <span className="font-display text-green-400">+{totalOutput}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="text-red-400" size={18} />
                <span className="text-sect-jade/80">支出</span>
              </div>
              <span className="font-display text-red-400">-{totalMaintenance}</span>
            </div>
            <div className="divider-gold" />
            <div className="flex items-center justify-between">
              <span className="text-sect-jade font-medium">净收入</span>
              <span className={`font-display text-lg ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netIncome >= 0 ? '+' : ''}{netIncome}
              </span>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="建筑状态">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-sect-gold/60" />
                <span className="text-sect-jade/80">启用建筑</span>
              </div>
              <span>{activeBuildings} / {buildings.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Hammer size={16} className="text-sect-gold/60" />
                <span className="text-sect-jade/80">灵草库存</span>
              </div>
              <span>{herbInventory} 株</span>
            </div>
          </div>
        </Card>
        
        <Card title="宗门箴言">
          <div className="flex items-start gap-3">
            <BookOpen className="text-sect-gold/40 mt-1 flex-shrink-0" size={24} />
            <div className="text-sect-jade/70 italic font-display text-sm leading-relaxed">
              天地不仁，以万物为刍狗；
              圣人不仁，以百姓为刍狗。
              <br />
              <span className="text-sect-jade/50 not-italic text-xs mt-2 block">
                —— 天道有常，不为尧存，不为桀亡
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
