import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { DiscipleAvatar, SimpleAvatar } from '@/components/ui/Avatar';
import {
  DiscipleStatus, DiscipleStatusNames, RealmNames, RealmOrder, SpiritRootNames, getRealmDisplay
} from '@/types/disciple';
import { 
  User, Heart, Sparkles, BookOpen, Calendar, Star, 
  UserPlus, X, Building2, Sword, Shield, 
  Zap, Target, Activity, Smile, Frown, Wind, Swords, Flame
} from 'lucide-react';
import { calculateDiscipleCombatPower, getStageBreakthroughRequired } from '@/utils/gameLogic';
import { CONSTITUTIONS, RARITY_COLORS, RARITY_NAMES } from '@/data/constitutions';
import type { Constitution } from '@/data/constitutions';
import { SectIcon } from '@/components/icons/SectIcons';

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

// 头像组件统一使用 ui/Avatar（DiscipleAvatar / SimpleAvatar），不再在此文件内重复定义


// 头像组件统一使用 ui/Avatar（DiscipleAvatar / SimpleAvatar），不再在此文件内重复定义


// 头像组件统一使用 ui/Avatar（DiscipleAvatar / SimpleAvatar），不再在此文件内重复定义


export const DisciplesPanel: React.FC = () => {
  const { disciples, recruitDisciple, spiritStones, getBuildingById, followedDiscipleIds, toggleFollowDisciple } = useGameStore();
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<DiscipleStatus | 'all'>('all');
  const [detailTab, setDetailTab] = useState<'basic' | 'combat' | 'experience'>('basic');

  // 左侧等级分布导航：按 status 分组
  const statusNavItems: { value: DiscipleStatus | 'all'; label: string; count: number }[] = [
    { value: 'all',     label: '全部', count: disciples.length },
    { value: 'servant', label: '杂役', count: disciples.filter(d => d.status === 'servant').length },
    { value: 'outer',   label: '外门', count: disciples.filter(d => d.status === 'outer').length },
    { value: 'inner',   label: '内门', count: disciples.filter(d => d.status === 'inner').length },
    { value: 'core',    label: '核心', count: disciples.filter(d => d.status === 'core').length },
    { value: 'elder',   label: '长老', count: disciples.filter(d => d.status === 'elder').length },
  ];

  const filteredDisciples = statusFilter === 'all'
    ? disciples
    : disciples.filter(d => d.status === statusFilter);

  const selectedDisciple = disciples.find(d => d.id === selectedDiscipleId);

  const canRecruit = spiritStones >= 50;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      {/* 顶部标题栏 + 招募按钮 */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="font-display text-lg text-gold-gradient">弟子管理</h1>
          <p className="text-sect-jade/60 text-[10px] mt-0.5">
            共 {disciples.length} 名弟子 · 当前筛选 {filteredDisciples.length} 名
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={recruitDisciple}
          disabled={!canRecruit}
        >
          <UserPlus size={14} className="mr-1" />
          招募(50灵石)
        </Button>
      </div>

      {/* 主区域：左侧等级导航 + 右侧弟子列表（长方形卡片） */}
      <div className="disciple-panel-layout flex-1 min-h-0">
        {/* 左侧：等级分布导航（像导航栏一样） */}
        <div className="disciple-level-nav">
          {statusNavItems.map(item => (
            <button
              key={item.value}
              className={`disciple-level-nav-item ${statusFilter === item.value ? 'disciple-level-nav-item-active' : ''}`}
              onClick={() => setStatusFilter(item.value)}
              title={`${item.label} ${item.count}人`}
            >
              <span className="disciple-level-nav-count">{item.count}</span>
              <span className="disciple-level-nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* 右侧：弟子列表（长方形卡片，可滚动） */}
        <div className="disciple-list-area">
          {filteredDisciples.length === 0 ? (
            <div className="text-center text-sect-jade/40 text-xs py-6">
              暂无弟子
            </div>
          ) : filteredDisciples.map(disciple => {
            const isFollowed = followedDiscipleIds.includes(disciple.id);
            const breakthroughRequired = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
            const cultivationPct = Math.min(100, (disciple.realmProgress / breakthroughRequired) * 100);
            const satisfactionPct = Math.max(0, Math.min(100, disciple.satisfaction));
            const assignedBuildingName = disciple.assignedBuilding
              ? getBuildingById(disciple.assignedBuilding)?.name
              : null;

            return (
              <div
                key={disciple.id}
                className="disciple-rect-card"
                onClick={() => setSelectedDiscipleId(disciple.id)}
              >
                {/* 关注按钮 */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleFollowDisciple(disciple.id);
                  }}
                  className={`disciple-rect-follow ${isFollowed ? 'disciple-rect-follow-active' : ''}`}
                  title={isFollowed ? '取消关注' : '关注弟子'}
                >
                  <Heart size={12} fill={isFollowed ? 'currentColor' : 'none'} strokeWidth={1.8} />
                </button>

                {/* 左侧：头像 */}
                <div className="disciple-rect-avatar">
                  <SimpleAvatar
                    seed={disciple.avatarSeed}
                    size={48}
                    status={disciple.status}
                    realm={disciple.realm}
                    name={disciple.name}
                  />
                </div>

                {/* 右侧：等级、修为、双进度条 */}
                <div className="disciple-rect-body">
                  {/* 头部：姓名 + 身份 + 境界 */}
                  <div className="disciple-rect-header">
                    <span className="disciple-rect-name">{disciple.name}</span>
                    <Badge variant={getStatusVariant(disciple.status)} size="sm">
                      {DiscipleStatusNames[disciple.status]}
                    </Badge>
                    <span className={`text-[10px] ${getRealmColor(disciple.realm)}`}>
                      {getRealmDisplay(disciple)}
                    </span>
                  </div>

                  {/* 中部：等级、修为、贡献、归属建筑 */}
                  <div className="disciple-rect-meta">
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-sect-herb-light/60" />
                      贡献{Math.floor(disciple.contributionPoints)}
                    </span>
                    {assignedBuildingName && (
                      <span className="flex items-center gap-0.5 truncate">
                        <Building2 size={10} className="text-sect-gold/60" />
                        {assignedBuildingName}
                      </span>
                    )}
                  </div>

                  {/* 底部：双进度条（修练值 + 满意度） */}
                  <div className="disciple-rect-progress">
                    <div className="disciple-progress-row">
                      <span className="disciple-progress-label">修为</span>
                      <div className="disciple-progress-track">
                        <div
                          className="disciple-progress-fill disciple-progress-fill-cultivation"
                          style={{ width: `${cultivationPct}%` }}
                        />
                      </div>
                      <span className="disciple-progress-value">
                        {Math.floor(disciple.realmProgress)}/{breakthroughRequired}
                      </span>
                    </div>
                    <div className="disciple-progress-row">
                      <span className="disciple-progress-label">满意</span>
                      <div className="disciple-progress-track">
                        <div
                          className="disciple-progress-fill disciple-progress-fill-satisfaction"
                          style={{ width: `${satisfactionPct}%` }}
                        />
                      </div>
                      <span className="disciple-progress-value">
                        {Math.floor(disciple.satisfaction)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              <DiscipleAvatar seed={selectedDisciple.avatarSeed} size={64} status={selectedDisciple.status} realm={selectedDisciple.realm} name={selectedDisciple.name} />
              <div>
                <h2 className="font-display text-xl text-sect-gold">
                  {selectedDisciple.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusVariant(selectedDisciple.status)}>
                    {DiscipleStatusNames[selectedDisciple.status]}
                  </Badge>
                  <span className={`text-sm ${getRealmColor(selectedDisciple.realm)}`}>
                    {getRealmDisplay(selectedDisciple)}
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
              <button
                onClick={() => setDetailTab('experience')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  detailTab === 'experience'
                    ? 'text-sect-gold border-b-2 border-sect-gold'
                    : 'text-sect-jade/60 hover:text-sect-jade'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  人物经历
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
                              <div className="text-red-400 pt-1 border-t border-sect-gold/20 flex items-center gap-1.5">
                                <SectIcon name="warning" size={14} strokeWidth={1.8} />
                                <span>满意度低于60%，弟子可能离开！</span>
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
                      {Math.floor(selectedDisciple.realmProgress)} / {getStageBreakthroughRequired(selectedDisciple.realm, selectedDisciple.realmStage)}
                      <span className="ml-2 text-sect-gold/70">
                        {Math.min(100, Math.floor((selectedDisciple.realmProgress / getStageBreakthroughRequired(selectedDisciple.realm, selectedDisciple.realmStage)) * 100))}%
                      </span>
                      {selectedDisciple.realmProgress >= getStageBreakthroughRequired(selectedDisciple.realm, selectedDisciple.realmStage) && (
                        <span className="ml-2 text-sect-gold">可突破</span>
                      )}
                    </span>
                  </div>
                  <ProgressBar
                    value={selectedDisciple.realmProgress}
                    max={getStageBreakthroughRequired(selectedDisciple.realm, selectedDisciple.realmStage)}
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
                {/* 战力总览（带悬浮明细） */}
                <Tooltip
                  content={
                    <div className="space-y-2 text-xs min-w-[220px]">
                      <div className="font-medium text-sect-gold mb-1">战力构成</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sect-jade/60">基础战力</span>
                          <span className="text-sect-jade">{(selectedDisciple.attack * 2 + selectedDisciple.defense + selectedDisciple.maxHp * 0.1).toFixed(0)}</span>
                        </div>
                        {selectedDisciple.learnedTechnique && selectedDisciple.learnedTechnique.combatBonus > 0 && (
                          <div className="flex justify-between text-green-400">
                            <span>{selectedDisciple.learnedTechnique.name}</span>
                            <span>+{selectedDisciple.learnedTechnique.combatBonus}%</span>
                          </div>
                        )}
                        {selectedDisciple.learnedBattles.filter(b => b.isLearned).map((b, i) => (
                          <div key={i} className="flex justify-between text-green-400">
                            <span>{b.name}</span>
                            <span>+{b.combatBonus}%</span>
                          </div>
                        ))}
                        <div className="border-t border-sect-gold/20 pt-1 flex justify-between">
                          <span className="text-sect-gold">总战力</span>
                          <span className="text-sect-gold font-bold">{calculateDiscipleCombatPower(selectedDisciple).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  }
                  position="top"
                >
                  <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20 cursor-help">
                    <div className="flex items-center gap-2">
                      <Sword size={16} className="text-red-400/50" />
                      <span className="text-sect-jade/80 text-sm">综合战力</span>
                      <span className="font-display text-sect-gold ml-auto">
                        {calculateDiscipleCombatPower(selectedDisciple).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Tooltip>
                
                {/* 战斗属性（带悬浮明细） */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2">
                    <Swords size={16} />
                    战斗属性
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 生命 - 悬浮显示灵力（修炼速度作为灵力参考） */}
                    <Tooltip
                      content={
                        <div className="space-y-1 text-xs min-w-[180px]">
                          <div className="font-medium text-sect-gold mb-1">生命值明细</div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">基础生命</span>
                            <span className="text-sect-jade">100 + 体质×5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">境界加成</span>
                            <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 50}</span>
                          </div>
                          {CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)?.effects.hpBonus ? (
                            <div className="flex justify-between text-green-400">
                              <span>体质加成</span>
                              <span>+{CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)!.effects.hpBonus}</span>
                            </div>
                          ) : null}
                          <div className="border-t border-sect-gold/20 pt-1 flex justify-between">
                            <span className="text-sect-jade/60">灵力（修炼效率）</span>
                            <span className="text-sect-gold">{selectedDisciple.cultivationSpeed.toFixed(1)}/月</span>
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart size={14} className="text-red-500/70" />
                          <span className="text-sect-jade/60 text-xs">生命/灵力</span>
                        </div>
                        <div className="text-sect-jade font-medium">{selectedDisciple.maxHp}</div>
                        <div className="text-[10px] text-sect-gold/60">灵力 {selectedDisciple.cultivationSpeed.toFixed(1)}/月</div>
                      </div>
                    </Tooltip>
                    
                    {/* 攻击 */}
                    <Tooltip
                      content={
                        <div className="space-y-1 text-xs min-w-[180px]">
                          <div className="font-medium text-sect-gold mb-1">攻击明细</div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">基础攻击</span>
                            <span className="text-sect-jade">10 + 根骨×0.5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">境界加成</span>
                            <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 20}</span>
                          </div>
                          {CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)?.effects.attackBonus ? (
                            <div className="flex justify-between text-green-400">
                              <span>体质加成</span>
                              <span>+{CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)!.effects.attackBonus}</span>
                            </div>
                          ) : null}
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Sword size={14} className="text-red-400/70" />
                          <span className="text-sect-jade/60 text-xs">攻击</span>
                        </div>
                        <div className="text-sect-jade font-medium">{selectedDisciple.attack}</div>
                      </div>
                    </Tooltip>
                    
                    {/* 防御 */}
                    <Tooltip
                      content={
                        <div className="space-y-1 text-xs min-w-[180px]">
                          <div className="font-medium text-sect-gold mb-1">防御明细</div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">基础防御</span>
                            <span className="text-sect-jade">5 + 体质×0.3</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">境界加成</span>
                            <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 15}</span>
                          </div>
                        </div>
                      }
                      position="top"
                    >
                      <div className="p-2 rounded bg-sect-ink-light/50 cursor-help hover:bg-sect-ink-light/70 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={14} className="text-blue-400/70" />
                          <span className="text-sect-jade/60 text-xs">防御</span>
                        </div>
                        <div className="text-sect-jade font-medium">{selectedDisciple.defense}</div>
                      </div>
                    </Tooltip>
                    
                    {/* 闪避 */}
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Wind size={14} className="text-cyan-400/70" />
                        <span className="text-sect-jade/60 text-xs">闪避</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.dodge}%</div>
                    </div>
                    
                    {/* 暴击 */}
                    <div className="p-2 rounded bg-sect-ink-light/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-yellow-400/70" />
                        <span className="text-sect-jade/60 text-xs">暴击</span>
                      </div>
                      <div className="text-sect-jade font-medium">{selectedDisciple.crit}%</div>
                    </div>
                  </div>
                </div>
                
                {/* 功法加成（带悬浮） */}
                <Tooltip
                  content={
                    <div className="space-y-2 text-xs min-w-[240px]">
                      <div className="font-medium text-sect-gold mb-1">功法详情</div>
                      {selectedDisciple.learnedTechnique ? (
                        <>
                          <div className="text-sect-jade/80">{selectedDisciple.learnedTechnique.name}</div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">类型</span>
                            <span className="text-sect-gold">{selectedDisciple.learnedTechnique.type === 'technique' ? '功法' : '战技'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">品阶</span>
                            <span className="text-sect-gold">{selectedDisciple.learnedTechnique.tier}</span>
                          </div>
                          {selectedDisciple.learnedTechnique.attribute && (
                            <div className="flex justify-between">
                              <span className="text-sect-jade/60">属性</span>
                              <span className="text-sect-gold">{selectedDisciple.learnedTechnique.attribute}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-green-400">
                            <span>修炼加成</span>
                            <span>+{selectedDisciple.learnedTechnique.cultivationBonus}%</span>
                          </div>
                          <div className="flex justify-between text-green-400">
                            <span>战力加成</span>
                            <span>+{selectedDisciple.learnedTechnique.combatBonus}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sect-jade/60">学习状态</span>
                            <span className={selectedDisciple.learnedTechnique.isLearned ? 'text-green-400' : 'text-yellow-400'}>
                              {selectedDisciple.learnedTechnique.isLearned ? '已学成' : `学习中 ${selectedDisciple.learnedTechnique.progress}%`}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sect-jade/50">尚未学习功法</div>
                      )}
                    </div>
                  }
                  position="top"
                >
                  <div>
                    <h3 className="font-display text-sect-gold mb-3 flex items-center gap-2 cursor-help">
                      <BookOpen size={16} />
                      功法加成
                    </h3>
                    {selectedDisciple.learnedTechnique ? (
                      <div className="p-3 rounded bg-sect-ink-light/50 border border-sect-gold/20 cursor-help">
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
                </Tooltip>
                
                {/* 战技加成 */}
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

            {/* 人物经历页 */}
            {detailTab === 'experience' && (
              <div className="space-y-4">
                {/* 人物形象描述 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2 text-sm">
                    <User size={16} />
                    人物形象
                  </h3>
                  <p className="text-sect-jade/70 text-sm leading-relaxed">
                    {selectedDisciple.name}，{Math.floor(selectedDisciple.age)}岁，{getRealmDisplay(selectedDisciple)}修士。
                    {selectedDisciple.talentDisplay?.nickname && selectedDisciple.talentDisplay.nickname !== '凡夫俗子' && `世人称其「${selectedDisciple.talentDisplay.nickname}」。`}
                    {selectedDisciple.talentDisplay?.rootBoneDesc}，{selectedDisciple.talentDisplay?.spiritRhythmDesc}，
                    {selectedDisciple.talentDisplay?.constitutionDesc}，{selectedDisciple.talentDisplay?.daoFateDesc}。
                    {CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId) && `身具${CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId)!.name}，`}
                    于第{selectedDisciple.joinDate?.year ?? '?'}年{selectedDisciple.joinDate?.month ?? '?'}月入宗，现为{DiscipleStatusNames[selectedDisciple.status]}。
                  </p>
                </div>

                {/* 师承关系 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2 text-sm">
                    <BookOpen size={16} />
                    师承交友
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sect-jade/50 text-xs w-12">师傅</span>
                      {selectedDisciple.master ? (
                        <Badge variant="gold" size="sm">{selectedDisciple.master}</Badge>
                      ) : (
                        <span className="text-sect-jade/40 text-xs italic">尚无师承</span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sect-jade/50 text-xs w-12 mt-0.5">好友</span>
                      {(selectedDisciple.friends?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedDisciple.friends.map((fname, idx) => (
                            <Badge key={idx} variant="herb" size="sm">{fname}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sect-jade/40 text-xs italic">尚无好友</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 大比经历 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2 text-sm">
                    <Swords size={16} />
                    大比经历
                  </h3>
                  {selectedDisciple.tournamentHistory && selectedDisciple.tournamentHistory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDisciple.tournamentHistory.map((record, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded bg-sect-ink-light/40">
                          <span className="text-sect-jade/50 shrink-0">第{record.year}年</span>
                          <div className="flex-1">
                            <span className="text-sect-jade/80">
                              {record.scope === 'sect' ? '山门' : '宗门'}{record.frequency}大比
                            </span>
                            <span className={`ml-2 font-medium ${record.rank === 1 ? 'text-yellow-400' : record.rank === 2 ? 'text-gray-300' : record.rank === 3 ? 'text-orange-400' : 'text-sect-jade/50'}`}>
                              {record.rank === 1 ? '冠军' : record.rank === 2 ? '亚军' : record.rank === 3 ? '季军' : '第' + record.rank + '名'}
                            </span>
                            {record.rewards.length > 0 && (
                              <div className="text-green-400/80 mt-0.5">
                                奖励：{record.rewards.join('、')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sect-jade/40 text-xs italic">尚未参加过大比</div>
                  )}
                </div>

                {/* 资质总评 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2 text-sm">
                    <Star size={16} />
                    资质总评
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-1.5 rounded bg-sect-ink-light/40">
                      <span className="text-sect-jade/50">根骨</span>
                      <span className="text-sect-gold">{selectedDisciple.hiddenTalents?.rootBone ?? '-'}</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-sect-ink-light/40">
                      <span className="text-sect-jade/50">灵韵</span>
                      <span className="text-sect-gold">{selectedDisciple.hiddenTalents?.spiritRhythm ?? '-'}</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-sect-ink-light/40">
                      <span className="text-sect-jade/50">体质</span>
                      <span className="text-sect-gold">{selectedDisciple.hiddenTalents?.constitution ?? '-'}</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-sect-ink-light/40">
                      <span className="text-sect-jade/50">道缘</span>
                      <span className="text-sect-gold">{selectedDisciple.hiddenTalents?.daoFate ?? '-'}</span>
                    </div>
                  </div>
                  {/* 灵根详情 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedDisciple.hiddenTalents?.spiritRoots ?? []).map((root, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded bg-sect-ink-light/40 text-sect-jade/70">
                        {SpiritRootNames[root.type]}灵根 · {root.quality}
                      </span>
                    ))}
                  </div>
                </div>
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
