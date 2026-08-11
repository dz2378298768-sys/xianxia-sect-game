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
import type { Realm } from '@/types/disciple';
import type { ContributionLogType } from '@/types/game';
import {
  User, Heart, Sparkles, BookOpen, Calendar, Star,
  UserPlus, X, Building2, Sword, Shield,
  Zap, Target, Activity, Smile, Frown, Wind, Swords, Flame, ChevronUp, LogOut,
  History, ArrowDownUp
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

// 弟子综合天赋评级（用于候选卡边框颜色）
// 综合考虑：灵根最高品质 / 四大天赋平均 / 单项极值 三者加权
export type TalentTier = 'fodder' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export function evaluateDiscipleTalentTier(t: {
  rootBone: number; spiritRhythm: number; constitution: number; daoFate: number;
  spiritRoots?: { quality: number }[] | null;
}): { tier: TalentTier; score: number } {
  const maxAttr = Math.max(t.rootBone, t.spiritRhythm, t.constitution, t.daoFate);
  const avgAttr = (t.rootBone + t.spiritRhythm + t.constitution + t.daoFate) / 4;
  const maxRootQuality =
    t.spiritRoots && t.spiritRoots.length > 0
      ? t.spiritRoots.reduce((m, r) => Math.max(m, r.quality), 0)
      : 50; // 无灵根按普通凡根算
  // 加权得分：灵根品质 40% + 平均 35% + 单项极值 25%
  const score = Math.round(maxRootQuality * 0.4 + avgAttr * 0.35 + maxAttr * 0.25);
  let tier: TalentTier = 'common';
  if (score >= 96) tier = 'mythic';
  else if (score >= 88) tier = 'legendary';
  else if (score >= 76) tier = 'epic';
  else if (score >= 64) tier = 'rare';
  else if (score >= 52) tier = 'uncommon';
  else if (score >= 40) tier = 'common';
  else tier = 'fodder';
  return { tier, score };
}

export function getTalentTierLabel(tier: TalentTier): string {
  switch (tier) {
    case 'mythic': return '仙苗';
    case 'legendary': return '绝世';
    case 'epic': return '天骄';
    case 'rare': return '英才';
    case 'uncommon': return '良好';
    case 'common': return '平庸';
    case 'fodder': return '凡俗';
  }
}

// 候选卡边框 + 标签样式：不同天赋等级不同颜色
export function getTalentCardClasses(tier: TalentTier): {
  cardBorder: string; cardRing: string; tag: string;
} {
  switch (tier) {
    case 'mythic':
      return {
        cardBorder: 'border-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.45)]',
        cardRing: 'ring-2 ring-fuchsia-300/60',
        tag: 'bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-300/40',
      };
    case 'legendary':
      return {
        cardBorder: 'border-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.45)]',
        cardRing: 'ring-2 ring-yellow-200/50',
        tag: 'bg-yellow-500/20 text-yellow-100 border border-yellow-300/50',
      };
    case 'epic':
      return {
        cardBorder: 'border-violet-300 shadow-[0_0_8px_rgba(167,139,250,0.4)]',
        cardRing: 'ring-2 ring-violet-300/40',
        tag: 'bg-violet-500/20 text-violet-100 border border-violet-300/40',
      };
    case 'rare':
      return {
        cardBorder: 'border-sky-300 shadow-[0_0_6px_rgba(125,211,252,0.35)]',
        cardRing: 'ring-2 ring-sky-300/30',
        tag: 'bg-sky-500/20 text-sky-100 border border-sky-300/40',
      };
    case 'uncommon':
      return {
        cardBorder: 'border-emerald-300/70',
        cardRing: '',
        tag: 'bg-emerald-500/15 text-emerald-200 border border-emerald-300/30',
      };
    case 'fodder':
      return {
        cardBorder: 'border-zinc-500/40',
        cardRing: '',
        tag: 'bg-zinc-500/15 text-zinc-300 border border-zinc-400/30',
      };
    case 'common':
    default:
      return {
        cardBorder: 'border-sect-gold/20',
        cardRing: '',
        tag: 'bg-sect-ink-light/40 text-sect-jade/80 border border-sect-gold/15',
      };
  }
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
  const {
    disciples, recruitDisciple, recruitCandidates, recruitCostPerDisciple, recruitRefreshCost,
    recruitConfirmDisciple, clearRecruitCandidates, spiritStones, getBuildingById,
    followedDiscipleIds, toggleFollowDisciple, canPromoteDisciple, promoteDisciple, kickDisciple,
    contributionLogs,
  } = useGameStore();
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<DiscipleStatus | 'all'>('all');
  const [realmFilter, setRealmFilter] = useState<Realm | 'all'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'combat' | 'joinDate'>('default');
  const [detailTab, setDetailTab] = useState<'basic' | 'combat' | 'experience'>('basic');
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitResultMsg, setRecruitResultMsg] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState(false);
  const [showContributionLog, setShowContributionLog] = useState(false);

  // 左侧等级分布导航：按 status 分组
  const statusNavItems: { value: DiscipleStatus | 'all'; label: string; count: number }[] = [
    { value: 'all',     label: '全部', count: disciples.length },
    { value: 'servant', label: '杂役', count: disciples.filter(d => d.status === 'servant').length },
    { value: 'outer',   label: '外门', count: disciples.filter(d => d.status === 'outer').length },
    { value: 'inner',   label: '内门', count: disciples.filter(d => d.status === 'inner').length },
    { value: 'core',    label: '核心', count: disciples.filter(d => d.status === 'core').length },
    { value: 'elder',   label: '长老', count: disciples.filter(d => d.status === 'elder').length },
  ];

  // 境界筛选导航：按 realm 分组
  const realmNavItems: { value: Realm | 'all'; label: string; count: number }[] = [
    { value: 'all',         label: '全部', count: disciples.length },
    ...RealmOrder.map(r => ({
      value: r as Realm,
      label: RealmNames[r as Realm],
      count: disciples.filter(d => d.realm === r).length,
    })).filter(item => item.count > 0),
  ];

  // 筛选 + 排序
  const filteredDisciples = React.useMemo(() => {
    let list = disciples;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (realmFilter !== 'all') list = list.filter(d => d.realm === realmFilter);
    if (sortBy === 'combat') {
      list = [...list].sort((a, b) => calculateDiscipleCombatPower(b) - calculateDiscipleCombatPower(a));
    } else if (sortBy === 'joinDate') {
      list = [...list].sort((a, b) => {
        const aTime = a.joinDate.year * 12 + a.joinDate.month;
        const bTime = b.joinDate.year * 12 + b.joinDate.month;
        return aTime - bTime; // 最早入宗的排前面
      });
    }
    return list;
  }, [disciples, statusFilter, realmFilter, sortBy]);

  const selectedDisciple = disciples.find(d => d.id === selectedDiscipleId);

  const canRecruit = spiritStones >= recruitCostPerDisciple;

  const handleRecruit = () => {
    // 有候选就直接打开（候选已在上次生成时扣费，直接查看不重复扣）；否则调用 recruitDisciple 生成候选并扣 50
    if (recruitCandidates.length > 0) {
      setShowRecruitModal(true);
      return;
    }
    if (spiritStones < recruitCostPerDisciple) {
      setRecruitResultMsg(`灵石不足（生成候选人需 ${recruitCostPerDisciple} 灵石）`);
      setTimeout(() => setRecruitResultMsg(null), 2500);
      return;
    }
    const { candidates } = recruitDisciple();
    if (candidates && candidates.length > 0) {
      setShowRecruitModal(true);
    } else {
      setRecruitResultMsg('未能招募到合适的候选人');
      setTimeout(() => setRecruitResultMsg(null), 2000);
    }
  };

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
          onClick={handleRecruit}
          disabled={!canRecruit}
        >
          <UserPlus size={14} className="mr-1" />
          招募({recruitCostPerDisciple}灵石/人)
        </Button>
        {recruitResultMsg && (
          <span className="text-xs text-rose-300 ml-2">{recruitResultMsg}</span>
        )}
      </div>

      {/* 主区域：左侧等级导航 + 右侧弟子列表（长方形卡片） */}
      <div className="disciple-panel-layout flex-1 min-h-0">
        {/* 左侧：等级导航 + 境界筛选 + 排序 */}
        <div className="disciple-level-nav">
          {/* 身份筛选 */}
          <div className="text-[10px] text-sect-gold/50 px-1 pt-1 pb-0.5">身份</div>
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

          {/* 境界筛选 */}
          <div className="text-[10px] text-sect-gold/50 px-1 pt-2 pb-0.5">境界</div>
          {realmNavItems.map(item => (
            <button
              key={item.value}
              className={`disciple-level-nav-item ${realmFilter === item.value ? 'disciple-level-nav-item-active' : ''}`}
              onClick={() => setRealmFilter(item.value)}
              title={`${item.label} ${item.count}人`}
            >
              <span className="disciple-level-nav-count">{item.count}</span>
              <span className="disciple-level-nav-label">{item.label}</span>
            </button>
          ))}

          {/* 排序 */}
          <div className="text-[10px] text-sect-gold/50 px-1 pt-2 pb-0.5">排序</div>
          <button
            className={`disciple-level-nav-item ${sortBy === 'default' ? 'disciple-level-nav-item-active' : ''}`}
            onClick={() => setSortBy('default')}
            title="默认顺序"
          >
            <ArrowDownUp size={12} className="opacity-50" />
            <span className="disciple-level-nav-label">默认</span>
          </button>
          <button
            className={`disciple-level-nav-item ${sortBy === 'combat' ? 'disciple-level-nav-item-active' : ''}`}
            onClick={() => setSortBy('combat')}
            title="按战力降序"
          >
            <Sword size={12} className="opacity-50" />
            <span className="disciple-level-nav-label">战力</span>
          </button>
          <button
            className={`disciple-level-nav-item ${sortBy === 'joinDate' ? 'disciple-level-nav-item-active' : ''}`}
            onClick={() => setSortBy('joinDate')}
            title="按入宗时间排序"
          >
            <Calendar size={12} className="opacity-50" />
            <span className="disciple-level-nav-label">入宗</span>
          </button>
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
        onClose={() => { setSelectedDiscipleId(null); setKickConfirm(false); }}
        title="弟子详情"
        size="lg"
      >
        {selectedDisciple && (() => {
          const promoteInfo = canPromoteDisciple(selectedDisciple.id);
          return (
            <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DiscipleAvatar seed={selectedDisciple.avatarSeed} size={64} status={selectedDisciple.status} realm={selectedDisciple.realm} name={selectedDisciple.name} />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl text-sect-gold">
                  {selectedDisciple.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
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
              {/* 操作按钮：晋升、驱逐 */}
              <div className="flex items-center gap-1.5 shrink-0">
                {promoteInfo.canPromote && promoteInfo.nextStatus && (
                  <Tooltip content={`晋升为${DiscipleStatusNames[promoteInfo.nextStatus]}${promoteInfo.minContribution ? `（需要${promoteInfo.minContribution}贡献）` : ''}`}>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => {
                        const res = promoteDisciple(selectedDisciple.id);
                        if (!res.ok && res.reason) {
                          alert(res.reason);
                        }
                      }}
                    >
                      <ChevronUp size={14} />
                      晋升
                    </Button>
                  </Tooltip>
                )}
                {!promoteInfo.canPromote && promoteInfo.reason && (
                  <Tooltip content={promoteInfo.reason}>
                    <Button variant="ghost" size="sm" disabled>
                      <ChevronUp size={14} />
                      晋升
                    </Button>
                  </Tooltip>
                )}
                {kickConfirm ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-red-300">确认驱逐？</span>
                    <Button
                      size="sm" variant="outline"
                      className="!border-red-500/60 !text-red-300 hover:!bg-red-500/10"
                      onClick={() => {
                        kickDisciple(selectedDisciple.id);
                        setKickConfirm(false);
                        setSelectedDiscipleId(null);
                      }}
                    >确认</Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setKickConfirm(false)}
                    >取消</Button>
                  </div>
                ) : (
                  <Tooltip content={`将${selectedDisciple.name}逐出宗门`}>
                    <Button
                      size="sm" variant="outline"
                      className="!border-red-500/40 !text-red-300 hover:!bg-red-500/10"
                      onClick={() => setKickConfirm(true)}
                    >
                      <LogOut size={14} />
                      驱逐
                    </Button>
                  </Tooltip>
                )}
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
                    <button
                      className="text-sect-jade/80 text-sm hover:text-sect-gold transition-colors flex items-center gap-1"
                      onClick={() => setShowContributionLog(true)}
                      title="点击查看贡献度流水"
                    >
                      贡献点 {Math.floor(selectedDisciple.contributionPoints)}
                      <History size={12} className="opacity-50" />
                    </button>
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

                {/* 人物事件：弟子在宗门内的活动记录 */}
                <div className="p-3 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20">
                  <h3 className="font-display text-sect-gold mb-2 flex items-center gap-2 text-sm">
                    <History size={16} />
                    人物事件
                  </h3>
                  {(() => {
                    // 合并贡献流水 + 大比历史，按时间排序构建事件时间线
                    const myLogs = contributionLogs.filter(l => l.discipleId === selectedDisciple.id).slice(0, 100);
                    const tournaments = selectedDisciple.tournamentHistory || [];

                    // 事件类型 → 图标颜色 + 标签
                    const eventMeta: Record<string, { icon: string; color: string }> = {
                      work:          { icon: '🔨', color: 'text-amber-300' },
                      deduct:        { icon: '📦', color: 'text-rose-300' },
                      library:       { icon: '📖', color: 'text-cyan-300' },
                      learn_secret:  { icon: '📜', color: 'text-violet-300' },
                      trial_reward:  { icon: '⚔️', color: 'text-emerald-300' },
                      tournament:    { icon: '🏆', color: 'text-yellow-300' },
                      promotion:     { icon: '⬆️', color: 'text-orange-300' },
                      manual_adjust: { icon: '✋', color: 'text-fuchsia-300' },
                      other:         { icon: '•',  color: 'text-sect-jade/70' },
                    };

                    type EventItem = { year: number; month: number; sortKey: number; content: React.ReactNode };
                    const events: EventItem[] = [];

                    // 贡献流水 → 事件
                    myLogs.forEach(log => {
                      const meta = eventMeta[log.type] || eventMeta.other;
                      const positive = log.amount >= 0;
                      events.push({
                        year: log.date.year,
                        month: log.date.month,
                        sortKey: log.date.year * 12 + log.date.month,
                        content: (
                          <div className="flex items-start gap-2 text-xs p-2 rounded bg-sect-ink-light/40">
                            <span className="shrink-0">{meta.icon}</span>
                            <div className="flex-1">
                              <span className={`font-medium ${meta.color}`}>{meta.icon === '•' ? '事件' : ''}</span>
                              <span className="text-sect-jade/80 ml-1">{log.description}</span>
                              <span className={`ml-2 tabular-nums ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {positive ? '+' : ''}{log.amount}贡献
                              </span>
                            </div>
                          </div>
                        ),
                      });
                    });

                    // 大比历史 → 事件
                    tournaments.forEach(record => {
                      const rankText = record.rank === 1 ? '冠军' : record.rank === 2 ? '亚军' : record.rank === 3 ? '季军' : '第' + record.rank + '名';
                      const rankColor = record.rank === 1 ? 'text-yellow-400' : record.rank === 2 ? 'text-gray-300' : record.rank === 3 ? 'text-orange-400' : 'text-sect-jade/50';
                      events.push({
                        year: record.year,
                        month: 12, // 大比通常在年底，排在该年后部
                        sortKey: record.year * 12 + 12,
                        content: (
                          <div className="flex items-start gap-2 text-xs p-2 rounded bg-sect-ink-light/40">
                            <span className="shrink-0">🏆</span>
                            <div className="flex-1">
                              <span className="text-sect-jade/80">
                                参加{record.scope === 'sect' ? '山门' : '宗门'}{record.frequency}大比
                              </span>
                              <span className={`ml-2 font-medium ${rankColor}`}>{rankText}</span>
                              {record.rewards.length > 0 && (
                                <div className="text-green-400/80 mt-0.5">奖励：{record.rewards.join('、')}</div>
                              )}
                            </div>
                          </div>
                        ),
                      });
                    });

                    // 按时间倒序排列（最近的在前）
                    events.sort((a, b) => b.sortKey - a.sortKey);

                    if (events.length === 0) {
                      return <div className="text-sect-jade/40 text-xs italic">暂无人物事件记录</div>;
                    }

                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                        {events.map((evt, idx) => (
                          <div key={idx}>
                            <div className="text-[10px] text-sect-jade/40 mb-0.5">
                              第{evt.year}年{evt.month > 12 ? '' : `${evt.month}月`}
                            </div>
                            {evt.content}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
              <Button variant="ghost" onClick={() => { setSelectedDiscipleId(null); setKickConfirm(false); }}>
                关闭
              </Button>
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* 招收候选弹窗 */}
      {showRecruitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', padding: 0 }}>
          <div
            className="relative overflow-hidden modal-body animate-modal-fade-in scroll-panel-dark"
            style={{ width: 'min(96vw, 900px)', maxHeight: '90vh', borderRadius: 6 }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-sect-gold/20 modal-header">
              <SectIcon name="disciple" size={14} strokeWidth={1.8} />
              <span className="font-display text-sm text-gold-gradient">招募候选人</span>
              <span className="text-[10px] text-sect-jade/60 ml-1">
                生成/刷新候选 {recruitRefreshCost} 灵石 · 招入免费 · 当前灵石 {Math.floor(spiritStones)}
              </span>
              <button
                className="ml-auto text-sect-jade/60 hover:text-sect-gold transition-colors"
                onClick={() => {
                  setShowRecruitModal(false);
                  clearRecruitCandidates();
                }}
              >
                <SectIcon name="close" size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 40px)' }}>
              {/* 结果提示 */}
              {recruitResultMsg && (
                <div className="mb-2 text-center text-[12px] text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded px-2 py-1">
                  {recruitResultMsg}
                </div>
              )}
              {recruitCandidates.length === 0 ? (
                <div className="text-sect-jade/50 italic text-sm py-8 text-center">没有候选人</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {recruitCandidates.map((c, i) => {
                    const t = c.hiddenTalents;
                    const maxAttr = Math.max(t.rootBone, t.spiritRhythm, t.constitution, t.daoFate);
                    const { tier, score } = evaluateDiscipleTalentTier(t);
                    const cls = getTalentCardClasses(tier);
                    return (
                      <div
                        key={i}
                        className={`p-2 rounded bg-sect-ink-light/30 flex flex-col gap-1.5 border-2 transition-all ${cls.cardBorder} ${cls.cardRing}`}
                      >
                        <div className="flex items-center gap-2">
                          <DiscipleAvatar seed={c.avatarSeed || 0} size={40} status={c.status} realm={c.realm} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <div className="font-display text-sm text-sect-gold truncate">{c.name}</div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${cls.tag}`}>
                                {getTalentTierLabel(tier)}·{score}
                              </span>
                            </div>
                            <div className="text-[10px] text-sect-jade/60 flex items-center gap-1">
                              {getRealmDisplay({ realm: c.realm, realmStage: c.realmStage })}
                              {maxAttr >= 85 && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">破格</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* 属性条 */}
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex justify-between"><span className="text-sect-jade/60">根骨</span><span className="text-sect-jade">{t.rootBone}</span></div>
                          <div className="flex justify-between"><span className="text-sect-jade/60">灵韵</span><span className="text-sect-jade">{t.spiritRhythm}</span></div>
                          <div className="flex justify-between"><span className="text-sect-jade/60">体质</span><span className="text-sect-jade">{t.constitution}</span></div>
                          <div className="flex justify-between"><span className="text-sect-jade/60">道缘</span><span className="text-sect-jade">{t.daoFate}</span></div>
                        </div>
                        {/* 灵根 */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(t.spiritRoots || []).slice(0, 3).map((r, idx) => (
                            <span key={idx} className={`text-[9px] px-1 py-0.5 rounded bg-sect-ink-light/40 ${getSpiritRootQualityClass(r.quality)}`}>
                              {SpiritRootNames[r.type]}{r.quality}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto pt-1 flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const res = recruitConfirmDisciple(c);
                              if (res && !res.ok) {
                                setRecruitResultMsg(res.reason || '招收失败');
                                setTimeout(() => setRecruitResultMsg(null), 2000);
                              }
                            }}
                          >
                            招入（免费）
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between pt-3 mt-2 border-t border-sect-gold/10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (spiritStones < recruitRefreshCost) {
                      setRecruitResultMsg(`灵石不足（换一批需 ${recruitRefreshCost} 灵石）`);
                      setTimeout(() => setRecruitResultMsg(null), 2000);
                      return;
                    }
                    recruitDisciple({ refresh: true });  // 重新生成一轮候选人，并扣 50 灵石
                  }}
                  disabled={spiritStones < recruitRefreshCost}
                  title={`换一批（${recruitRefreshCost} 灵石）`}
                >
                  <UserPlus size={12} className="mr-1" /> 换一批 ({recruitRefreshCost})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowRecruitModal(false);
                    clearRecruitCandidates();
                  }}
                >
                  完成
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 贡献度流水弹窗 */}
      {showContributionLog && selectedDisciple && (() => {
        const myLogs = contributionLogs.filter(l => l.discipleId === selectedDisciple.id).slice(0, 100);
        const LogTypeMeta: Record<ContributionLogType, { name: string; color: string }> = {
          work:          { name: '工作产出', color: 'text-amber-300' },
          deduct:        { name: '消耗扣除', color: 'text-rose-300' },
          library:       { name: '藏经推演', color: 'text-cyan-300' },
          learn_secret:  { name: '学习秘籍', color: 'text-violet-300' },
          trial_reward:  { name: '试炼奖励', color: 'text-emerald-300' },
          tournament:    { name: '大比奖励', color: 'text-yellow-300' },
          promotion:     { name: '晋升扣除', color: 'text-orange-300' },
          manual_adjust: { name: '手动调整', color: 'text-fuchsia-300' },
          other:         { name: '其他',     color: 'text-sect-jade/70' },
        };
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center modal-overlay"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
            onClick={() => setShowContributionLog(false)}
          >
            <div
              className="relative overflow-hidden modal-body animate-modal-fade-in scroll-panel-dark"
              style={{
                maxWidth: '560px', width: '90vw', maxHeight: '70vh',
                background: 'linear-gradient(180deg, rgba(18,24,36,0.98) 0%, rgba(12,16,24,0.98) 100%)',
                border: '1px solid rgba(212,168,87,0.3)', borderRadius: '12px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-3 border-b border-sect-gold/20">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-sect-gold" />
                  <span className="font-display text-sect-gold text-sm">
                    {selectedDisciple.name} · 贡献度流水
                  </span>
                  <span className="text-[10px] text-sect-jade/40">
                    （最近 {myLogs.length} 条）
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-sect-jade/60">
                    余额：<span className="text-sect-gold">{Math.floor(selectedDisciple.contributionPoints)}</span>
                  </span>
                  <button onClick={() => setShowContributionLog(false)} className="text-sect-jade/50 hover:text-sect-gold">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 流水列表 */}
              <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
                {myLogs.length === 0 ? (
                  <div className="text-center text-sect-jade/40 text-xs py-8">
                    暂无贡献度流水记录
                  </div>
                ) : (
                  <div className="space-y-1">
                    {myLogs.map(log => {
                      const meta = LogTypeMeta[log.type] || LogTypeMeta.other;
                      const positive = log.amount >= 0;
                      return (
                        <div key={log.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-sect-ink/30 border border-sect-gold/5">
                          <span className="text-[10px] text-sect-jade/50 shrink-0 w-16 tabular-nums">
                            {log.date.year}年{String(log.date.month).padStart(2, '0')}月
                          </span>
                          <span className={`shrink-0 w-16 text-[10px] font-medium ${meta.color}`}>
                            {meta.name}
                          </span>
                          <span className={`shrink-0 w-16 text-right text-xs tabular-nums ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {positive ? '+' : ''}{log.amount}
                          </span>
                          <span className="shrink-0 w-14 text-right text-[10px] text-sect-jade/50 tabular-nums">
                            余 {log.balance}
                          </span>
                          <span className="flex-1 text-xs text-sect-jade/80 truncate">
                            {log.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
