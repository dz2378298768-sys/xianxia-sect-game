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
  DiscipleStatus, DiscipleStatusNames, RealmNames, RealmOrder, SpiritRootNames, getRealmDisplay,
  AmbitionNames, AmbitionDescriptions, AMBITION_EFFECTS,
  PersonalityNames, BackgroundStoryNames, BACKGROUND_EFFECTS,
} from '@/types/disciple';
import type { Realm, DiscipleBackpackItem, Ambition, Personality } from '@/types/disciple';
import { BuildingTypeNames } from '@/types/building';
import type { ContributionLogType } from '@/types/game';
import { SectLevelDiscipleCap } from '@/types/game';
import { ArtifactTypeNames } from '@/types/artifact';
import { TalismanTypeNames } from '@/types/talisman';
import { BeastTypeNames } from '@/types/beast';
import { PillTypeNames } from '@/types/pill';
import type { PillType } from '@/types/pill';
import { PILL_CONFIGS } from '@/data/pills';
import {
  User, Heart, Sparkles, BookOpen, Calendar, Star,
  UserPlus, X, Building2, Sword, Shield,
  Zap, Target, Activity, Smile, Frown, Wind, Swords, Flame, ChevronUp, LogOut,
  History, ArrowDownUp, Backpack,
  Compass, Hammer, ScrollText, Users, Gift, Trophy, Package, Hand, Circle, ClipboardList,
} from 'lucide-react';
import { calculateDiscipleCombatPower, calculateDiscipleCombatPowerBreakdown, getStageBreakthroughRequired, calculateRecruitCost, getRecruitRefreshCost, ADULT_AGE, getBreakthroughSuccessRate, calculateDiscipleWelfareCost } from '@/utils/gameLogic';
import { CombatPowerBreakdownView } from '@/components/CombatPowerBreakdown';
import { CONSTITUTIONS, RARITY_COLORS, RARITY_NAMES } from '@/data/constitutions';
import { SectIcon } from '@/components/icons/SectIcons';
import { getRootBoneEffectiveness } from '@/data/buildings';
import { applySatisfactionPenalty } from '@/domain/balance';
import { getEffectiveWishStoneCost } from '@/utils/wishes';
import { getDiscipleSpecialty, SpecialtyNames, SpecialtyDescriptions, SPECIALTY_BUILDINGS } from '@/domain/specialty';
import { Section, StatCell, DetailBar, DetailRow, DetailChip } from '@/components/DiscipleDetailSections';
import { cn } from '@/lib/utils';

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

/** 满意度进度条取色：与 getSatisfactionColor 使用同一套阈值，低满意度一眼可见红色 */
function getSatisfactionTone(satisfaction: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (satisfaction >= 80) return 'green';
  if (satisfaction >= 60) return 'yellow';
  if (satisfaction >= 40) return 'orange';
  return 'red';
}

function getSatisfactionIcon(satisfaction: number) {
  if (satisfaction >= 80) return <Smile size={16} className="text-green-400" />;
  if (satisfaction >= 60) return <Smile size={16} className="text-yellow-400" />;
  return <Frown size={16} className="text-red-400" />;
}

/** 心愿代价文案 */
function formatWishCost(cost: { spiritStones?: number; pillType?: string }): string {
  const parts: string[] = [];
  if (cost.spiritStones) parts.push(`${cost.spiritStones} 灵石`);
  if (cost.pillType) {
    const name = PillTypeNames[cost.pillType as keyof typeof PillTypeNames] ?? cost.pillType;
    parts.push(`${name} ×1`);
  }
  return parts.length > 0 ? parts.join(' + ') : '无需花费';
}

// 获取灵根品质样式
function getSpiritRootQualityClass(quality: number): string {
  if (quality >= 90) return 'spirit-root-legendary';
  if (quality >= 75) return 'spirit-root-epic';
  if (quality >= 55) return 'spirit-root-rare';
  if (quality >= 35) return 'spirit-root-uncommon';
  return 'text-gray-300';
}

/** 性格的效果说明（详情页展示用） */
const PERSONALITY_EFFECT_TEXT: Record<Personality, string> = {
  diligent: '修炼速度 +5%',
  lazy: '修炼速度 -5%',
  aggressive: '战力 +5%，满意度易波动',
  peaceful: '满意度更稳定',
  greedy: '对灵石奖励更敏感',
  generous: '对宗门贡献更积极',
  loner: '容易被离间，更易叛逃',
  friendly: '容易结交朋友',
};

/** 详情弹窗的 Tab 配置 */
const DISCIPLE_DETAIL_TABS = [
  { key: 'overview' as const, label: '概览', icon: <Activity size={14} /> },
  { key: 'combat' as const, label: '战斗', icon: <Swords size={14} /> },
  { key: 'experience' as const, label: '经历', icon: <History size={14} /> },
  { key: 'inventory' as const, label: '装备', icon: <Backpack size={14} /> },
];

/** 装备槽行：已装备显示名称 + 卸下按钮；未装备显示选择框 */
const EquipmentSlotRow: React.FC<{
  label: string;
  equippedName?: string | null;
  onUnequip: () => void;
  options: { value: string; label: string }[];
  onEquip: (value: string) => void;
}> = ({ label, equippedName, onUnequip, options, onEquip }) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="w-8 shrink-0 text-[10px] text-sect-jade/45">{label}</span>
    {equippedName ? (
      <>
        <span className="min-w-0 flex-1 truncate text-[12px] text-sect-gold">{equippedName}</span>
        <button
          onClick={onUnequip}
          className="h-9 shrink-0 rounded border border-red-500/40 px-2.5 text-[10px] text-red-300 hover:bg-red-500/10"
        >
          卸下
        </button>
      </>
    ) : (
      <select
        className="h-9 min-w-0 flex-1 rounded border border-sect-gold/30 bg-[rgba(13,17,23,0.6)] px-1.5 text-[11px] text-sect-jade"
        value=""
        onChange={e => { if (e.target.value) onEquip(e.target.value); }}
      >
        <option value="">— 选择装备 —</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )}
  </div>
);

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

/** 计算有效修炼速度（含 buff/功法加成 + 满意度惩罚，与实际月度增长一致） */
function getEffectiveCultivationSpeed(disciple: any): { base: number; effective: number; totalBonus: number; satMultiplier: number } {
  const base = disciple.cultivationSpeed;
  const rootBoneEff = getRootBoneEffectiveness(disciple.hiddenTalents?.rootBone ?? 50);
  // buff 加成（居所/讲经堂等）
  const buffSum = (disciple.buffs ?? [])
    .filter((b: any) => b.type === 'cultivation')
    .reduce((sum: number, b: any) => sum + b.value, 0);
  // 功法加成
  let techniqueBonus = 0;
  if (disciple.learnedTechnique) {
    const t = disciple.learnedTechnique;
    techniqueBonus = t.isLearned ? t.cultivationBonus : t.cultivationBonus * (t.progress / 100);
  }
  // 旧秘籍系统的修炼加成（与月度结算一致，也受根骨发挥比例约束）
  const secretBonus = (disciple.learnedSecrets ?? [])
    .reduce((sum: number, s: any) => sum + (s.cultivationBonus || 0), 0);
  const totalBonus = (buffSum + techniqueBonus + secretBonus) * rootBoneEff;
  const clampedBonus = Math.max(-50, Math.min(250, totalBonus));
  const satMultiplier = applySatisfactionPenalty(base, disciple.satisfaction) / base;
  // 与月度修炼保持一致：志向提供额外修炼速度
  const ambitionMult = disciple.ambition
    ? AMBITION_EFFECTS[disciple.ambition as Ambition].cultivationMult
    : 1;
  const effective = base * satMultiplier * (1 + clampedBonus / 100) * ambitionMult;
  return { base, effective, totalBonus: clampedBonus, satMultiplier };
}

/** 跨境界突破时可用的对应丹药（与月末结算的消耗表一致） */
const BREAKTHROUGH_PILL_MAP: Record<string, PillType> = {
  foundation: 'foundation_pill',
  golden: 'golden_pill',
  nascent: 'nascent_pill',
  spirit: 'spirit_pill',
};

export const DisciplesPanel: React.FC = () => {
  const {
    disciples, recruitDisciple, recruitCandidates,
    recruitConfirmDisciple, clearRecruitCandidates, spiritStones, getBuildingById,
    sectLevel,
    followedDiscipleIds, toggleFollowDisciple, canPromoteDisciple, promoteDisciple, kickDisciple,
    contributionLogs,
    equipItem, unequipItem, giveItemToDisciple, takeItemFromDisciple,
    artifactInventory, talismanInventory, beastInventory, pillInventory,
    encourageDaoPartners, toggleEncourageDaoPartners,
    wishes, acceptWish, rejectWish,
    year, distributeWelfare, welfareLastUsed,
  } = useGameStore();
  const { selectedDiscipleId, setSelectedDiscipleId } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<DiscipleStatus | 'all'>('all');
  const [realmFilter, setRealmFilter] = useState<Realm | 'all'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'combat' | 'joinDate'>('default');
  const [followOnly, setFollowOnly] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'combat' | 'experience' | 'inventory'>('overview');
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitResultMsg, setRecruitResultMsg] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState(false);
  const [showContributionLog, setShowContributionLog] = useState(false);
  const [showWelfare, setShowWelfare] = useState(false);
  const [giveKind, setGiveKind] = useState<'pill' | 'artifact' | 'talisman' | 'beast'>('pill');
  const [wishMsg, setWishMsg] = useState<string | null>(null);
  // 批量操作
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // 切换弟子时重置详情弹窗的局部状态：页签、贡献流水弹窗、驱逐二次确认，
  // 避免把上一个弟子的界面状态带到下一个人身上
  React.useEffect(() => {
    setDetailTab('overview');
    setShowContributionLog(false);
    setKickConfirm(false);
  }, [selectedDiscipleId]);

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
    if (followOnly) list = list.filter(d => followedDiscipleIds.includes(d.id));
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
  }, [disciples, statusFilter, realmFilter, followOnly, followedDiscipleIds, sortBy]);

  const selectedDisciple = disciples.find(d => d.id === selectedDiscipleId);
  const apprenticeList = selectedDisciple
    ? disciples.filter(d => d.master === selectedDisciple.name)
    : [];
  const pendingWish = selectedDisciple
    ? wishes.find(w => w.discipleId === selectedDisciple.id && w.status === 'pending')
    : undefined;
  // 师徒联动：师傅在宗门内时，心愿灵石花费减半展示
  const wishMaster = selectedDisciple?.master
    ? disciples.find(d => d.name === selectedDisciple.master)
    : undefined;
  const wishEffectiveCost = pendingWish
    ? { ...pendingWish.cost, spiritStones: getEffectiveWishStoneCost(pendingWish.cost, !!wishMaster) }
    : null;
  // 专精为派生值，直接由天赋/性格/背景推导
  const selectedSpecialty = selectedDisciple ? getDiscipleSpecialty(selectedDisciple) : null;
  // 列表内快速标记有待答复心愿的弟子
  const pendingWishDiscipleIds = new Set(
    wishes.filter(w => w.status === 'pending').map(w => w.discipleId),
  );

  const discipleCap = SectLevelDiscipleCap[sectLevel];
  const atDiscipleCap = discipleCap !== null && disciples.length >= discipleCap;
  const childCount = disciples.filter(d => d.age < ADULT_AGE).length;
  const refreshCost = getRecruitRefreshCost(sectLevel);
  const canRecruit = spiritStones >= refreshCost && !atDiscipleCap;

  const handleRecruit = () => {
    // 有候选就直接打开（候选已在上次生成时扣费，直接查看不重复扣）；否则生成候选并扣刷新费
    if (recruitCandidates.length > 0) {
      setShowRecruitModal(true);
      return;
    }
    if (atDiscipleCap) {
      setRecruitResultMsg(`宗门弟子已达上限（${discipleCap} 人），请先晋升宗门等级`);
      setTimeout(() => setRecruitResultMsg(null), 2500);
      return;
    }
    if (spiritStones < refreshCost) {
      setRecruitResultMsg(`灵石不足（生成候选人需 ${refreshCost} 灵石）`);
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
    <div className="panel-sheet h-full min-h-0 !gap-2">
      {/* 顶部：人数概览 + 四个操作，页内不再放大标题 */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="min-w-0 truncate text-[11.5px] text-[var(--ink-400)]">
          共 {disciples.length} 名{discipleCap !== null ? ` / 上限 ${discipleCap}` : ''}
          {childCount > 0 ? ` · 稚子 ${childCount}` : ''} · 当前 {filteredDisciples.length} 名
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="filter-chip"
            onClick={toggleEncourageDaoPartners}
            title={encourageDaoPartners ? '道侣每月有概率诞下子嗣' : '道侣不再生育'}
          >
            <Heart size={12} className={encourageDaoPartners ? 'text-rose-300' : 'text-[var(--ink-400)]'} />
            道侣{encourageDaoPartners ? '开' : '关'}
          </button>
          <button
            type="button"
            className={`filter-chip ${batchMode ? 'filter-chip-active' : ''}`}
            onClick={() => {
              setBatchMode(!batchMode);
              if (batchMode) setSelectedIds(new Set());
            }}
          >
            {batchMode ? '退出批量' : '批量'}
          </button>
          <button
            type="button"
            className="filter-chip"
            onClick={handleRecruit}
            disabled={!canRecruit}
            title={atDiscipleCap ? `弟子已达上限 ${discipleCap} 人` : `刷新候选 ${refreshCost} 灵石`}
          >
            <UserPlus size={12} />
            招募
          </button>
          <button type="button" className="filter-chip" onClick={() => setShowWelfare(true)}>
            <Sparkles size={12} />
            福利
          </button>
        </div>
      </div>
      {recruitResultMsg && (
        <span className="text-[11.5px] text-rose-300">{recruitResultMsg}</span>
      )}

      {/* 批量操作栏 */}
      {batchMode && (
        <div className="flex items-center gap-2 px-1 py-1.5 rounded bg-white/5 shrink-0">
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              if (selectedIds.size === filteredDisciples.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(filteredDisciples.map(d => d.id)));
              }
            }}
          >
            {selectedIds.size === filteredDisciples.length ? '取消全选' : '全选'}
          </Button>
          <span className="text-xs text-sect-jade/60">已选 {selectedIds.size} 人</span>
          <div className="flex-1" />
          <Button
            variant="ghost" size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => {
              selectedIds.forEach(id => {
                const d = disciples.find(d => d.id === id);
                if (d && d.status !== 'elder') {
                  promoteDisciple(id);
                }
              });
              setSelectedIds(new Set());
            }}
          >
            <ChevronUp size={14} className="mr-1" />
            批量晋升
          </Button>
        </div>
      )}

      {/* 筛选：横向胶囊一排，不再用左侧窄栏 */}
      <div className="disciple-filter-bar shrink-0">
        {statusNavItems.map(item => (
          <button
            key={item.value}
            type="button"
            className={`filter-chip ${statusFilter === item.value ? 'filter-chip-active' : ''}`}
            onClick={() => setStatusFilter(item.value)}
          >
            {item.label}
            <span className="filter-chip-count">{item.count}</span>
          </button>
        ))}
        <span className="disciple-filter-sep" />
        <select
          className="filter-select"
          value={realmFilter}
          onChange={e => setRealmFilter(e.target.value as Realm | 'all')}
        >
          <option value="all">境界·全部</option>
          {realmNavItems.filter(i => i.value !== 'all').map(i => (
            <option key={i.value} value={i.value}>{i.label}（{i.count}）</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'default' | 'combat' | 'joinDate')}
        >
          <option value="default">排序·默认</option>
          <option value="combat">排序·战力</option>
          <option value="joinDate">排序·入宗</option>
        </select>
        <button
          type="button"
          className={`filter-chip ${followOnly ? 'filter-chip-active' : ''}`}
          onClick={() => setFollowOnly(!followOnly)}
        >
          <Heart size={11} fill={followOnly ? 'currentColor' : 'none'} />
          关注
        </button>
      </div>

      {/* 弟子列表：两列密排，一屏约 8 人，点开才是详情弹窗 */}
      <div className="disciple-list-grid flex-1 min-h-0">

          {filteredDisciples.length === 0 ? (
            <div className="text-center text-sect-jade/40 text-xs py-6">
              暂无弟子
            </div>
          ) : filteredDisciples.map(disciple => {
            const isFollowed = followedDiscipleIds.includes(disciple.id);
            const breakthroughRequired = getStageBreakthroughRequired(disciple.realm, disciple.realmStage);
            const cultivationPct = Math.min(100, (disciple.realmProgress / breakthroughRequired) * 100);
            const assignedBuildingName = disciple.assignedBuilding
              ? getBuildingById(disciple.assignedBuilding)?.name
              : null;

            const isSelected = selectedIds.has(disciple.id);
            return (
              <div
                key={disciple.id}
                className={`disciple-rect-card ${isSelected ? 'ring-1 ring-gold-400/50' : ''} ${batchMode ? 'pl-5' : ''}`}
                onClick={() => {
                  if (batchMode) {
                    const next = new Set(selectedIds);
                    if (next.has(disciple.id)) next.delete(disciple.id);
                    else next.add(disciple.id);
                    setSelectedIds(next);
                  } else {
                    setSelectedDiscipleId(disciple.id);
                    setWishMsg(null);
                  }
                }}
              >
                {/* 批量选择框 */}
                {batchMode && (
                  <div className="absolute left-0.5 top-0.5 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(disciple.id)) next.delete(disciple.id);
                        else next.add(disciple.id);
                        setSelectedIds(next);
                      }}
                      className="w-4 h-4 rounded border-white/30 bg-white/10 accent-amber-500 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                )}
                {/* 头像 */}
                <SimpleAvatar
                  seed={disciple.avatarSeed}
                  size={32}
                  status={disciple.status}
                  realm={disciple.realm}
                  name={disciple.name}
                />

                {/* 关注：贴卡片右上角，不占正文行高 */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleFollowDisciple(disciple.id);
                  }}
                  className={`disciple-follow-inline ${isFollowed ? 'is-on' : ''}`}
                  title={isFollowed ? '取消关注' : '关注弟子'}
                >
                  <Heart size={10} fill={isFollowed ? 'currentColor' : 'none'} strokeWidth={1.8} />
                </button>

                {/* 主体：名号 + 身份/归属 + 修为条 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 pr-5">
                    <span className="truncate font-display text-[12.5px] text-[var(--ink-100)]">{disciple.name}</span>
                    <span className={`shrink-0 text-[11px] ${getRealmColor(disciple.realm)}`}>{getRealmDisplay(disciple)}</span>
                    {pendingWishDiscipleIds.has(disciple.id) && (
                      <Sparkles size={10} className="shrink-0 text-amber-300" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--ink-400)]">
                    <span className="shrink-0">{DiscipleStatusNames[disciple.status]}</span>
                    {assignedBuildingName && <span className="truncate">· {assignedBuildingName}</span>}
                    <span className="ml-auto shrink-0 font-mono text-[var(--ink-300)]">{Math.floor(disciple.satisfaction)}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cultivationPct}%`, background: 'linear-gradient(90deg, #8fbf8f, #5f9f7f)' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {/* 弟子福利：从总览移到弟子页，与管理动作放在一起 */}
      <Modal isOpen={showWelfare} onClose={() => setShowWelfare(false)} title="弟子福利" size="sm">
        <p className="mb-2 text-[12px] text-[var(--ink-400)]">每 5 年可发放一次，提升全体弟子满意度</p>
        <div className="flex gap-2">
          {[1, 2, 3].map(level => {
            const yearsSinceLastUse = year - welfareLastUsed;
            const cooldownRemaining = welfareLastUsed > 0 && yearsSinceLastUse < 5 ? 5 - yearsSinceLastUse : 0;
            const disabled = cooldownRemaining > 0;
            const activeCount = disciples.filter(d => d.status !== 'mortal').length;
            const { cost, satisfactionGain } = calculateDiscipleWelfareCost(activeCount, level);
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                className={`flex-1 rounded-lg border border-[rgba(212,168,87,0.28)] bg-[rgba(255,255,255,0.03)] px-2 py-2 text-center ${disabled ? 'opacity-40' : 'active:bg-[rgba(212,168,87,0.12)]'}`}
                onClick={() => {
                  const result = distributeWelfare(level);
                  if (!result.ok) alert(result.reason);
                  else if (result.cost !== undefined) alert(`发放了 ${result.cost} 灵石福利，全体弟子满意度 +${result.satisfactionGain}。`);
                }}
              >
                <span className="block text-[12.5px] text-[var(--gold-200)]">
                  {level === 1 ? '普通' : level === 2 ? '丰厚' : '优厚'}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--ink-400)]">
                  {disabled ? `冷却 ${cooldownRemaining}年` : `${cost}灵石 · +${satisfactionGain}`}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedDisciple}
        onClose={() => { setSelectedDiscipleId(null); setKickConfirm(false); setWishMsg(null); }}
        title="弟子详情"
        size="lg"
      >
        {selectedDisciple && (() => {
          const promoteInfo = canPromoteDisciple(selectedDisciple.id);
          const promoteHint = promoteInfo.canPromote && promoteInfo.nextStatus
            ? `晋升为${DiscipleStatusNames[promoteInfo.nextStatus]}${promoteInfo.minContribution ? `（需要${promoteInfo.minContribution}贡献）` : ''}`
            : (promoteInfo.reason || '无法晋升');
          // —— 派生数据（统一在这里算一次，避免各区块重复计算/展示不一致）——
          const breakthroughRequired = getStageBreakthroughRequired(selectedDisciple.realm, selectedDisciple.realmStage);
          const cultivationPct = Math.min(100, (selectedDisciple.realmProgress / breakthroughRequired) * 100);
          const canBreakthrough = selectedDisciple.realmProgress >= breakthroughRequired;
          // 突破成功率预估：基础值 + 若持有对应突破丹时的加成值
          const nextRealmForPill = RealmOrder[RealmOrder.indexOf(selectedDisciple.realm) + 1];
          const breakthroughPill = selectedDisciple.realmStage === 'late'
            ? BREAKTHROUGH_PILL_MAP[nextRealmForPill] ?? null
            : null;
          const heldPill = breakthroughPill
            ? pillInventory.find(p => p.type === breakthroughPill && p.quantity > 0)
            : undefined;
          const breakthroughRate = getBreakthroughSuccessRate(selectedDisciple);
          const breakthroughRateWithPill = heldPill
            ? getBreakthroughSuccessRate(selectedDisciple, true, PILL_CONFIGS[heldPill.type]?.breakthroughBonus ?? 0)
            : breakthroughRate;
          const satisfactionPct = Math.max(0, Math.min(100, selectedDisciple.satisfaction));
          const speedInfo = getEffectiveCultivationSpeed(selectedDisciple);
          const combatPower = calculateDiscipleCombatPower(selectedDisciple);
          const powerBreakdown = calculateDiscipleCombatPowerBreakdown(selectedDisciple);
          const constitution = CONSTITUTIONS.find(c => c.id === selectedDisciple.constitutionId);
          const talent = evaluateDiscipleTalentTier({
            ...selectedDisciple.hiddenTalents,
            spiritRoots: selectedDisciple.hiddenTalents.spiritRoots,
          });
          const assignedBuildingName = selectedDisciple.assignedBuilding
            ? getBuildingById(selectedDisciple.assignedBuilding)?.name ?? '未知堂口'
            : null;
          const buffList = selectedDisciple.buffs ?? [];
          const cultivationBuffSum = buffList
            .filter(b => b.type === 'cultivation')
            .reduce((sum, b) => sum + b.value, 0);
          const techniqueBonus = selectedDisciple.learnedTechnique
            ? (selectedDisciple.learnedTechnique.isLearned
              ? selectedDisciple.learnedTechnique.cultivationBonus
              : selectedDisciple.learnedTechnique.cultivationBonus * (selectedDisciple.learnedTechnique.progress / 100))
            : 0;
          const rootBoneEff = getRootBoneEffectiveness(selectedDisciple.hiddenTalents?.rootBone ?? 50);
          const ambitionMult = selectedDisciple.ambition
            ? AMBITION_EFFECTS[selectedDisciple.ambition].cultivationMult
            : 1;
          const backpackCount = selectedDisciple.backpack?.reduce((sum, b) => sum + b.quantity, 0) ?? 0;
          return (
            <div className="detail-bleed">
              {/* ===== 吸顶头（两行）：头像/身份/进度/操作 + Tab ===== */}
              <div className="relative sticky top-0 z-20 border-b border-sect-gold/25 bg-[#141e2d] px-2 pt-1.5 pb-1">
                {/* 第一行：头像 40 + 身份 + 修为/满意双进度 + 晋升/驱逐图标按钮 */}
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-sect-gold/12 blur-md" />
                    <DiscipleAvatar
                      seed={selectedDisciple.avatarSeed}
                      size={40}
                      status={selectedDisciple.status}
                      realm={selectedDisciple.realm}
                      name={selectedDisciple.name}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <h2 className="min-w-0 truncate font-display text-[14px] leading-tight text-gold-gradient">
                        {selectedDisciple.name}
                      </h2>
                      <Badge variant={getStatusVariant(selectedDisciple.status)} className="shrink-0">
                        {DiscipleStatusNames[selectedDisciple.status]}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] leading-tight">
                      <span className={cn('shrink-0 font-medium', getRealmColor(selectedDisciple.realm))}>
                        {getRealmDisplay(selectedDisciple)}
                      </span>
                      {selectedDisciple.talentDisplay?.nickname && (
                        <>
                          <span className="shrink-0 text-sect-jade/25">|</span>
                          <span className="min-w-0 truncate italic text-sect-jade/55">
                            「{selectedDisciple.talentDisplay.nickname}」
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 修为 / 满意度：上下叠放，约占 1/3 宽 */}
                  <div className="w-[34%] min-w-[150px] shrink-0 space-y-1">
                    <DetailBar
                      compact
                      label="修为"
                      pct={cultivationPct}
                      detail={`${Math.floor(selectedDisciple.realmProgress)}/${breakthroughRequired}`}
                      extra={canBreakthrough ? (
                        <span className="shrink-0 rounded-sm bg-sect-gold/20 px-1 text-[9px] leading-tight text-sect-gold">可突破</span>
                      ) : undefined}
                    />
                    {/* 突破成功率：与结算同一公式，持丹时同时给出含丹药的期望值 */}
                    <div className="flex items-center justify-between text-[10px] leading-tight px-0.5">
                      <span className="text-sect-jade/50">突破成功率</span>
                      <span className="text-sect-gold font-medium">
                        {Math.round(breakthroughRate)}%
                        {heldPill && breakthroughRateWithPill > breakthroughRate && (
                          <span className="text-sect-jade/60 font-normal"> · 持丹 {Math.round(breakthroughRateWithPill)}%</span>
                        )}
                      </span>
                    </div>
                    <DetailBar
                      compact
                      label="满意"
                      pct={satisfactionPct}
                      valueNode={(
                        <Tooltip
                          position="bottom"
                          content={(
                            <div className="space-y-2 text-xs min-w-[200px]">
                              <div className="mb-1 font-medium text-sect-gold">满意度明细</div>
                              <div className="flex justify-between border-b border-sect-gold/20 pb-2">
                                <span className="text-sect-jade/60">当前满意度</span>
                                <span className={cn('font-medium', getSatisfactionColor(selectedDisciple.satisfaction))}>
                                  {Math.floor(selectedDisciple.satisfaction)}%
                                </span>
                              </div>
                              {/* 满意度换算：让玩家知道这条数值具体影响了什么 */}
                              <div className="flex justify-between border-b border-sect-gold/20 pb-2">
                                <span className="text-sect-jade/60">修炼速度乘数</span>
                                <span className={cn('font-medium', speedInfo.satMultiplier >= 1 ? 'text-green-400' : 'text-orange-400')}>
                                  ×{speedInfo.satMultiplier.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-[10px] text-sect-jade/45 leading-tight">
                                满意度每低 10 点，修炼速度 -20%，最低 ×0.50；低于 30% 连续 3 个月可能叛逃
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
                                  <div className="flex items-center gap-1.5 border-t border-sect-gold/20 pt-1 text-red-400">
                                    <SectIcon name="warning" size={14} strokeWidth={1.8} />
                                    <span>满意度低于60%，弟子可能离开！</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        >
                          <span className={cn('cursor-help font-medium', getSatisfactionColor(selectedDisciple.satisfaction))}>
                            {Math.floor(selectedDisciple.satisfaction)}%
                          </span>
                        </Tooltip>
                      )}
                      tone={getSatisfactionTone(selectedDisciple.satisfaction)}
                      extra={getSatisfactionIcon(selectedDisciple.satisfaction)}
                    />
                  </div>

                  {/* 操作：晋升 / 驱逐（图标按钮，点击区 36px） */}
                  <div className="flex shrink-0 items-center gap-1">
                    {promoteInfo.canPromote && promoteInfo.nextStatus ? (
                      <Tooltip content={promoteHint} position="bottom">
                        <button
                          type="button"
                          title={promoteHint}
                          aria-label={promoteHint}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-sect-gold/40 bg-sect-gold/15 text-sect-gold transition-colors hover:bg-sect-gold/25"
                          onClick={() => {
                            const res = promoteDisciple(selectedDisciple.id);
                            if (!res.ok && res.reason) alert(res.reason);
                          }}
                        >
                          <ChevronUp size={16} />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip content={promoteHint} position="bottom">
                        <button
                          type="button"
                          title={promoteHint}
                          aria-label={promoteHint}
                          disabled
                          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md border border-sect-jade/15 text-sect-jade/30"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content={`将${selectedDisciple.name}逐出宗门`} position="bottom">
                      <button
                        type="button"
                        title={`将${selectedDisciple.name}逐出宗门`}
                        aria-label={`将${selectedDisciple.name}逐出宗门`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-red-500/40 text-red-300 transition-colors hover:bg-red-500/10"
                        onClick={() => setKickConfirm(true)}
                      >
                        <LogOut size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* 第二行：Tab 导航（随吸顶头固定，始终可见） */}
                <div className="mt-1 flex gap-1 rounded-lg bg-black/25 p-0.5">
                  {DISCIPLE_DETAIL_TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={cn(
                        'flex h-8 flex-1 items-center justify-center gap-1 rounded-md text-[11px] transition-colors',
                        detailTab === tab.key
                          ? 'border border-sect-gold/25 bg-sect-gold/15 text-sect-gold'
                          : 'text-sect-jade/50 hover:bg-white/5 hover:text-sect-jade/70'
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 驱逐二次确认：浮在内容区顶部，不撑高吸顶头 */}
                {kickConfirm && (
                  <div className="absolute inset-x-0 top-full z-30 flex items-center gap-1.5 border-b border-red-500/40 bg-[#1b1620] px-2 py-1.5 shadow-lg">
                    <LogOut size={13} className="shrink-0 text-red-400" />
                    <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-red-200">
                      确认逐出「{selectedDisciple.name}」？
                    </span>
                    <button
                      type="button"
                      className="h-8 shrink-0 rounded border border-red-500/60 px-2.5 text-[10px] text-red-200 hover:bg-red-500/15"
                      onClick={() => {
                        kickDisciple(selectedDisciple.id);
                        setKickConfirm(false);
                        setSelectedDiscipleId(null);
                      }}
                    >
                      确定
                    </button>
                    <button
                      type="button"
                      className="h-8 shrink-0 rounded border border-sect-jade/20 px-2.5 text-[10px] text-sect-jade/70 hover:bg-sect-jade/10"
                      onClick={() => setKickConfirm(false)}
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>

              {/* ===== Tab 内容（单列，375px 不横向溢出） ===== */}
              <div className="space-y-2.5 px-3 pt-2.5 pb-3">
                {/* ---------- 概览 ---------- */}
                {detailTab === 'overview' && (
                  <>
                    {/* 当前状态：志向 / 专精 / 堂口 / 师傅 / 心愿 统一收口 */}
                    <Section title="当前状态" icon={<Activity size={14} />}>
                      <div className="flex flex-wrap gap-1.5">
                        <DetailChip
                          icon={<Compass />}
                          label="志向"
                          value={selectedDisciple.ambition ? AmbitionNames[selectedDisciple.ambition] : '未定'}
                        />
                        <DetailChip
                          icon={<Hammer />}
                          label="专精"
                          value={selectedSpecialty ? SpecialtyNames[selectedSpecialty] : '无'}
                        />
                        <DetailChip icon={<Building2 />} label="堂口" value={assignedBuildingName ?? '未分配'} />
                        <DetailChip icon={<User />} label="师傅" value={selectedDisciple.master || '无师承'} />
                        <DetailChip
                          icon={<Sparkles />}
                          label="心愿"
                          value={pendingWish ? '待答复' : '无'}
                          valueClassName={pendingWish ? 'text-amber-300' : undefined}
                        />
                      </div>
                      {(selectedDisciple.ambition || selectedSpecialty) && (
                        <div className="mt-2 space-y-0.5 text-[9px] leading-snug text-sect-jade/40">
                          {selectedDisciple.ambition && (
                            <div>志向 · {AmbitionNames[selectedDisciple.ambition]}：{AmbitionDescriptions[selectedDisciple.ambition]}</div>
                          )}
                          {selectedSpecialty && (
                            <div>
                              专精 · {SpecialtyNames[selectedSpecialty]}：{SpecialtyDescriptions[selectedSpecialty]}
                              （适配堂口：{SPECIALTY_BUILDINGS[selectedSpecialty].map(t => BuildingTypeNames[t]).join('、')}）
                            </div>
                          )}
                        </div>
                      )}
                    </Section>

                    {/* 待应答心愿（含花费与应允/回绝） */}
                    {pendingWish && (
                      <Section
                        title="弟子心愿"
                        icon={<Sparkles size={14} />}
                        hint={`${pendingWish.expiresYear}年${pendingWish.expiresMonth}月前答复`}
                      >
                        <div className="text-[13px] leading-tight text-sect-jade/85">{pendingWish.title}</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-sect-jade/60">{pendingWish.description}</p>
                        <div className="mt-1.5 text-[10px] text-amber-300/80">
                          花费：{formatWishCost(wishEffectiveCost ?? pendingWish.cost)}
                        </div>
                        {wishMaster && (pendingWish.cost.spiritStones ?? 0) > 0 && (
                          <div className="mt-0.5 text-[9px] leading-snug text-sect-gold/60">
                            师傅 {wishMaster.name} 会代为贴补一半（实际 {wishEffectiveCost?.spiritStones ?? 0} 灵石）
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="gold"
                            className="h-9 flex-1 text-[11px]"
                            onClick={() => {
                              const r = acceptWish(pendingWish.id);
                              setWishMsg(r.ok ? null : (r.reason ?? null));
                            }}
                          >
                            应允
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 flex-1 text-[11px]"
                            onClick={() => { rejectWish(pendingWish.id); setWishMsg(null); }}
                          >
                            回绝
                          </Button>
                        </div>
                        {wishMsg && <div className="mt-1 text-[10px] text-rose-300">{wishMsg}</div>}
                      </Section>
                    )}

                    {/* 基础信息 */}
                    <Section title="基础信息" icon={<User size={14} />}>
                      <div className="grid grid-cols-2 gap-1.5">
                        <StatCell label="年龄" value={`${Math.floor(selectedDisciple.age)} 岁`} />
                        <StatCell label="寿元" value={`${Math.floor(selectedDisciple.maxAge)} 岁`} />
                        <StatCell label="贡献点" value={Math.floor(selectedDisciple.contributionPoints)} valueClassName="font-display text-sect-gold" />
                        <StatCell
                          label="入宗时间"
                          value={selectedDisciple.joinDate
                            ? `${selectedDisciple.joinDate.year}年${selectedDisciple.joinDate.month}月`
                            : '未知'}
                        />
                        {selectedDisciple.personality && (
                          <StatCell
                            label="性格"
                            value={PersonalityNames[selectedDisciple.personality]}
                            hint={PERSONALITY_EFFECT_TEXT[selectedDisciple.personality]}
                          />
                        )}
                        {selectedDisciple.background && (
                          <StatCell
                            label="出身"
                            value={BackgroundStoryNames[selectedDisciple.background]}
                            hint={BACKGROUND_EFFECTS[selectedDisciple.background].description}
                          />
                        )}
                      </div>
                      <button
                        onClick={() => setShowContributionLog(true)}
                        className="mt-2 flex h-9 w-full items-center justify-center gap-1 rounded border border-sect-gold/25 text-[11px] text-sect-gold/85 hover:bg-sect-gold/10"
                      >
                        <ClipboardList size={13} />
                        查看贡献流水
                      </button>
                    </Section>

                    {/* 资质与天赋（含灵根 / 特殊体质 / 综合评级） */}
                    <Section
                      title="资质与天赋"
                      icon={<Star size={14} />}
                      hint={(
                        <span className="text-sect-gold">
                          {getTalentTierLabel(talent.tier)} · {talent.score}
                        </span>
                      )}
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[200px]">
                              <div className="font-medium text-sect-gold">根骨 · {selectedDisciple.hiddenTalents.rootBone}</div>
                              <div className="text-sect-jade/80">决定修炼速度与突破成功率，根骨越高修炼越快、突破越稳。</div>
                              <div className="text-sect-gold">{selectedDisciple.talentDisplay.rootBoneDesc}</div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell
                              label="根骨"
                              value={selectedDisciple.hiddenTalents.rootBone}
                              hint={selectedDisciple.talentDisplay.rootBoneDesc}
                            />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[200px]">
                              <div className="font-medium text-sect-gold">灵韵 · {selectedDisciple.hiddenTalents.spiritRhythm}</div>
                              <div className="text-sect-jade/80">影响炼丹、炼器、符箓等产出的品质与成功率。</div>
                              <div className="text-sect-gold">{selectedDisciple.talentDisplay.spiritRhythmDesc}</div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell
                              label="灵韵"
                              value={selectedDisciple.hiddenTalents.spiritRhythm}
                              hint={selectedDisciple.talentDisplay.spiritRhythmDesc}
                            />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[200px]">
                              <div className="font-medium text-sect-gold">体质 · {selectedDisciple.hiddenTalents.constitution}</div>
                              <div className="text-sect-jade/80">影响生命上限与各项战斗属性。</div>
                              <div className="text-sect-gold">{selectedDisciple.talentDisplay.constitutionDesc}</div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell
                              label="体质"
                              value={selectedDisciple.hiddenTalents.constitution}
                              hint={selectedDisciple.talentDisplay.constitutionDesc}
                            />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[200px]">
                              <div className="font-medium text-sect-gold">道缘 · {selectedDisciple.hiddenTalents.daoFate}</div>
                              <div className="text-sect-jade/80">影响领悟功法战技的速度，以及获得稀有物品与机遇的概率。</div>
                              <div className="text-sect-gold">{selectedDisciple.talentDisplay.daoFateDesc}</div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell
                              label="道缘"
                              value={selectedDisciple.hiddenTalents.daoFate}
                              hint={selectedDisciple.talentDisplay.daoFateDesc}
                            />
                          </div>
                        </Tooltip>
                      </div>

                      {/* 灵根 */}
                      <div className="mt-2">
                        <div className="mb-1 text-[10px] text-sect-jade/45">灵根</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedDisciple.hiddenTalents.spiritRoots ?? []).length > 0 ? (
                            selectedDisciple.hiddenTalents.spiritRoots.map((root, idx) => (
                              <span
                                key={idx}
                                className={cn(
                                  'rounded border border-sect-gold/15 bg-black/25 px-2 py-1 text-[11px]',
                                  getSpiritRootQualityClass(root.quality)
                                )}
                              >
                                {SpiritRootNames[root.type]}灵根 · {root.quality}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] italic text-sect-jade/40">无灵根</span>
                          )}
                        </div>
                      </div>

                      {/* 特殊体质 */}
                      {constitution && (
                        <div className="mt-2 rounded-md border border-sect-gold/10 bg-black/25 px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-[11px] font-medium', RARITY_COLORS[constitution.rarity])}>
                              {constitution.name}
                            </span>
                            <span className="text-[9px] text-sect-jade/40">{RARITY_NAMES[constitution.rarity]}</span>
                          </div>
                          <div className="mt-0.5 text-[9px] leading-snug text-sect-jade/50">
                            {constitution.description}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] leading-snug">
                            {constitution.effects.cultivationBonus ? (
                              <span className="text-green-400">修炼速度 +{constitution.effects.cultivationBonus}%</span>
                            ) : null}
                            {constitution.effects.attackBonus ? (
                              <span className="text-red-400">攻击 +{constitution.effects.attackBonus}</span>
                            ) : null}
                            {constitution.effects.defenseBonus ? (
                              <span className="text-blue-400">防御 +{constitution.effects.defenseBonus}</span>
                            ) : null}
                            {constitution.effects.hpBonus ? (
                              <span className="text-pink-400">生命 +{constitution.effects.hpBonus}</span>
                            ) : null}
                            {constitution.effects.critBonus ? (
                              <span className="text-yellow-400">暴击 +{constitution.effects.critBonus}%</span>
                            ) : null}
                            {constitution.effects.dodgeBonus ? (
                              <span className="text-cyan-400">闪避 +{constitution.effects.dodgeBonus}%</span>
                            ) : null}
                            {constitution.effects.breakthroughBonus ? (
                              <span className="text-purple-400">突破成功率 +{constitution.effects.breakthroughBonus}%</span>
                            ) : null}
                            {constitution.effects.lifespanBonus ? (
                              <span className="text-sect-gold">寿元 +{constitution.effects.lifespanBonus}</span>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </Section>

                    {/* 修炼速度拆解 */}
                    <Section
                      title="修炼速度"
                      icon={<Wind size={14} />}
                      hint={(
                        <span className="font-display text-[12px] text-sect-gold">
                          {speedInfo.effective.toFixed(1)}/月
                        </span>
                      )}
                    >
                      <div className="space-y-1">
                        <DetailRow label="基础速度" value={`${speedInfo.base.toFixed(1)}/月`} />
                        {cultivationBuffSum !== 0 && (
                          <DetailRow
                            label="居所/增益"
                            value={`${cultivationBuffSum > 0 ? '+' : ''}${cultivationBuffSum}%`}
                            valueClassName={cultivationBuffSum > 0 ? 'text-green-400' : 'text-red-400'}
                          />
                        )}
                        {techniqueBonus !== 0 && (
                          <DetailRow
                            label={`功法${selectedDisciple.learnedTechnique ? ` · ${selectedDisciple.learnedTechnique.name}` : ''}`}
                            value={`${techniqueBonus > 0 ? '+' : ''}${techniqueBonus.toFixed(0)}%`}
                            valueClassName={techniqueBonus > 0 ? 'text-green-400' : 'text-red-400'}
                          />
                        )}
                        <DetailRow label="根骨效能" value={`×${rootBoneEff}`} />
                        <DetailRow
                          label="满意度修正"
                          value={`×${speedInfo.satMultiplier.toFixed(2)}`}
                          valueClassName={speedInfo.satMultiplier < 1 ? 'text-red-400' : 'text-sect-jade/80'}
                        />
                        {selectedDisciple.ambition && (
                          <DetailRow
                            label={`志向 · ${AmbitionNames[selectedDisciple.ambition]}`}
                            value={`×${ambitionMult}`}
                            valueClassName={ambitionMult >= 1 ? 'text-green-400' : 'text-red-400'}
                          />
                        )}
                        <div className="border-t border-sect-gold/15 pt-1">
                          <DetailRow
                            label="每月修为增长"
                            value={`≈${Math.floor(speedInfo.effective)}/月`}
                            valueClassName="font-display text-sect-gold"
                          />
                        </div>
                      </div>
                    </Section>

                    {/* 增益效果（完整列表，含剩余月数） */}
                    <Section
                      title="增益效果"
                      icon={<Flame size={14} />}
                      hint={`${buffList.length} 项`}
                    >
                      {buffList.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {buffList.map(buff => (
                            <span
                              key={buff.id}
                              className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 text-[10px] text-amber-200/90"
                            >
                              <span className="min-w-0 truncate">{buff.name}</span>
                              <span className="shrink-0 text-amber-200/60">+{buff.value}%</span>
                              <span className="shrink-0 text-sect-jade/40">{buff.remainingMonths}月</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] italic text-sect-jade/40">当前无增益效果</div>
                      )}
                    </Section>
                  </>
                )}

                {/* ---------- 战斗 ---------- */}
                {detailTab === 'combat' && (
                  <>
                    <Section
                      title="综合战力"
                      icon={<Sword size={14} />}
                      hint={(
                        <span className="font-display text-[13px] text-sect-gold">
                          {combatPower.toLocaleString()}
                        </span>
                      )}
                    >
                      <Tooltip
                        wrapperClassName="block w-full"
                        content={(
                          <div className="min-w-[220px] p-1">
                            <CombatPowerBreakdownView breakdown={powerBreakdown} />
                          </div>
                        )}
                        position="top"
                      >
                        <div className="min-h-[36px] w-full cursor-help">
                          {(() => {
                            const total = powerBreakdown.total || 1;
                            const segments = [
                              { pct: (powerBreakdown.realmBase / total) * 100, color: '#3b82f6' },
                              {
                                pct: ((powerBreakdown.basePower - powerBreakdown.realmBase * (1 + powerBreakdown.talentBonus / 100)) / total) * 100,
                                color: '#f59e0b',
                              },
                              { pct: (powerBreakdown.basePower * (powerBreakdown.bookBonusTotal / 100) / total) * 100, color: '#10b981' },
                              { pct: (powerBreakdown.equipmentBonus / total) * 100, color: '#ef4444' },
                            ];
                            return (
                              <div className="flex h-2 overflow-hidden rounded-full bg-black/40">
                                {segments.map((s, i) => s.pct > 0 ? (
                                  <div key={i} style={{ width: `${s.pct}%`, background: s.color }} />
                                ) : null)}
                              </div>
                            );
                          })()}
                          <div className="mt-1 text-[9px] text-sect-jade/40">
                            境界基础 / 身份倍率 / 功法战技 / 装备，点击查看构成明细
                          </div>
                        </div>
                      </Tooltip>
                    </Section>

                    <Section title="战斗属性" icon={<Swords size={14} />}>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[170px]">
                              <div className="mb-1 font-medium text-sect-gold">生命值明细</div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">基础生命</span>
                                <span className="text-sect-jade">100 + 体质×5</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">境界加成</span>
                                <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 50}</span>
                              </div>
                              {constitution?.effects.hpBonus ? (
                                <div className="flex justify-between text-green-400">
                                  <span>体质加成</span>
                                  <span>+{constitution.effects.hpBonus}</span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        >
                          <div>
                            <StatCell label="生命" icon={<Heart />} value={selectedDisciple.maxHp} valueClassName="text-rose-200" />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[180px]">
                              <div className="mb-1 font-medium text-sect-gold">灵力 · 修炼效率</div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">基础速度</span>
                                <span className="text-sect-jade">{speedInfo.base.toFixed(1)}/月</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">满意度修正</span>
                                <span className={speedInfo.satMultiplier < 1 ? 'text-red-400' : 'text-green-400'}>
                                  ×{speedInfo.satMultiplier.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">居所/功法/根骨/志向</span>
                                <span className={speedInfo.totalBonus < 0 ? 'text-red-400' : 'text-green-400'}>
                                  {speedInfo.totalBonus > 0 ? '+' : ''}{speedInfo.totalBonus}%
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-sect-gold/20 pt-1">
                                <span className="text-sect-jade/60">每月修为增长</span>
                                <span className="text-sect-gold">{speedInfo.effective.toFixed(1)}/月</span>
                              </div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell
                              label="灵力（修炼效率/月）"
                              icon={<Wind />}
                              value={`${speedInfo.effective.toFixed(1)}/月`}
                              valueClassName="text-cyan-200"
                            />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[170px]">
                              <div className="mb-1 font-medium text-sect-gold">攻击明细</div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">基础攻击</span>
                                <span className="text-sect-jade">10 + 根骨×0.5</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">境界加成</span>
                                <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 20}</span>
                              </div>
                              {constitution?.effects.attackBonus ? (
                                <div className="flex justify-between text-green-400">
                                  <span>体质加成</span>
                                  <span>+{constitution.effects.attackBonus}</span>
                                </div>
                              ) : null}
                            </div>
                          )}
                        >
                          <div>
                            <StatCell label="攻击" icon={<Sword />} value={selectedDisciple.attack} />
                          </div>
                        </Tooltip>
                        <Tooltip
                          content={(
                            <div className="space-y-1 text-xs min-w-[170px]">
                              <div className="mb-1 font-medium text-sect-gold">防御明细</div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">基础防御</span>
                                <span className="text-sect-jade">5 + 体质×0.3</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sect-jade/60">境界加成</span>
                                <span className="text-sect-jade">+{RealmOrder.indexOf(selectedDisciple.realm) * 15}</span>
                              </div>
                            </div>
                          )}
                        >
                          <div>
                            <StatCell label="防御" icon={<Shield />} value={selectedDisciple.defense} />
                          </div>
                        </Tooltip>
                        <StatCell label="闪避" icon={<Wind />} value={`${selectedDisciple.dodge}%`} />
                        <StatCell label="暴击" icon={<Zap />} value={`${selectedDisciple.crit}%`} />
                      </div>
                    </Section>

                    <Section title="功法" icon={<BookOpen size={14} />}>
                      {selectedDisciple.learnedTechnique ? (
                        <>
                          <div className="mb-1.5 min-w-0 truncate text-[13px] text-sect-jade/85">
                            {selectedDisciple.learnedTechnique.name}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <StatCell label="类型" value={selectedDisciple.learnedTechnique.type === 'technique' ? '功法' : '战技'} />
                            <StatCell label="品阶" value={selectedDisciple.learnedTechnique.tier} />
                            {selectedDisciple.learnedTechnique.attribute && (
                              <StatCell label="属性" value={selectedDisciple.learnedTechnique.attribute} />
                            )}
                            <StatCell
                              label="修炼加成"
                              value={`+${selectedDisciple.learnedTechnique.cultivationBonus}%`}
                              valueClassName="text-green-400"
                            />
                            <StatCell
                              label="战力加成"
                              value={`+${selectedDisciple.learnedTechnique.combatBonus}%`}
                              valueClassName="text-green-400"
                            />
                            <StatCell
                              label="学习状态"
                              value={selectedDisciple.learnedTechnique.isLearned
                                ? '已学成'
                                : `学习中 ${selectedDisciple.learnedTechnique.progress}%`}
                              valueClassName={selectedDisciple.learnedTechnique.isLearned ? 'text-green-400' : 'text-yellow-400'}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] italic text-sect-jade/40">尚未学习功法</div>
                      )}
                    </Section>

                    <Section
                      title="战技"
                      icon={<Swords size={14} />}
                      hint={`${selectedDisciple.learnedBattles.length} 本`}
                    >
                      {selectedDisciple.learnedBattles.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedDisciple.learnedBattles.map((battle, index) => (
                            <div key={index} className="rounded-md border border-sect-gold/10 bg-black/25 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-[12px] text-sect-jade/85">{battle.name}</span>
                                <Badge variant="pill" size="sm" className="shrink-0">
                                  {battle.isLearned ? '已学成' : '学习中'}
                                </Badge>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[10px] text-sect-jade/60">
                                <span>战力加成 +{battle.combatBonus}%</span>
                                <span>学习进度 {battle.progress}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] italic text-sect-jade/40">尚未学习战技</div>
                      )}
                    </Section>

                    {selectedDisciple.learningBook && (
                      <Section title="正在学习" icon={<Target size={14} />}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-[13px] text-sect-jade/85">
                            {selectedDisciple.learningBook.name}
                          </span>
                          <Badge variant="herb" size="sm" className="shrink-0">学习中</Badge>
                        </div>
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between text-[10px] text-sect-jade/60">
                            <span>学习进度</span>
                            <span>{selectedDisciple.learningBook.progress}% / 100%</span>
                          </div>
                          <ProgressBar value={selectedDisciple.learningBook.progress} max={100} color="herb" />
                        </div>
                      </Section>
                    )}

                    {(selectedDisciple.learnedSecrets?.length ?? 0) > 0 && (
                      <Section
                        title="已学秘籍"
                        icon={<ScrollText size={14} />}
                        hint={`${selectedDisciple.learnedSecrets.length} 本`}
                      >
                        <div className="space-y-1">
                          {selectedDisciple.learnedSecrets.map((secret, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 rounded bg-black/20 px-2 py-1.5"
                            >
                              <span className="min-w-0 truncate text-[11px] text-violet-300">{secret.name}</span>
                              <span className="shrink-0 text-[10px] text-green-400">
                                修炼 +{secret.cultivationBonus}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}
                  </>
                )}

                {/* ---------- 经历 ---------- */}
                {detailTab === 'experience' && (
                  <>
                    <Section title="人物形象" icon={<User size={14} />}>
                      <p className="text-[11px] leading-relaxed text-sect-jade/70">
                        {selectedDisciple.name}，{Math.floor(selectedDisciple.age)}岁，{getRealmDisplay(selectedDisciple)}修士。
                        {selectedDisciple.talentDisplay?.nickname && selectedDisciple.talentDisplay.nickname !== '凡夫俗子'
                          ? `世人称其「${selectedDisciple.talentDisplay.nickname}」。`
                          : ''}
                        {constitution ? `身具${constitution.name}，` : ''}
                        于第{selectedDisciple.joinDate?.year ?? '?'}年{selectedDisciple.joinDate?.month ?? '?'}月入宗，现为{DiscipleStatusNames[selectedDisciple.status]}。
                      </p>
                    </Section>

                    <Section title="师承交友" icon={<Users size={14} />}>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-2">
                          <span className="w-8 shrink-0 pt-0.5 text-[10px] text-sect-jade/45">师傅</span>
                          <div className="flex min-w-0 flex-wrap items-center gap-1">
                            {selectedDisciple.master ? (
                              <>
                                <Badge variant="gold" size="sm">{selectedDisciple.master}</Badge>
                                {!disciples.some(d => d.name === selectedDisciple.master) && (
                                  <span className="text-[10px] italic text-sect-jade/40">已不在宗门</span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] italic text-sect-jade/40">尚无师承</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-8 shrink-0 pt-0.5 text-[10px] text-sect-jade/45">徒弟</span>
                          <div className="min-w-0 flex-1">
                            {apprenticeList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {apprenticeList.map(d => (
                                  <Badge key={d.id} variant="herb" size="sm">{d.name}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-sect-jade/40">
                                尚未收徒（需核心/长老身份，且境界高于对方）
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-8 shrink-0 pt-0.5 text-[10px] text-sect-jade/45">好友</span>
                          <div className="min-w-0 flex-1">
                            {(selectedDisciple.friends?.length ?? 0) > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {selectedDisciple.friends.map((fname, idx) => (
                                  <Badge key={idx} variant="herb" size="sm">{fname}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-sect-jade/40">尚无好友</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-8 shrink-0 pt-0.5 text-[10px] text-sect-jade/45">道侣</span>
                          <div className="min-w-0 flex-1">
                            {selectedDisciple.daoPartner ? (
                              <Badge variant="gold" size="sm">{selectedDisciple.daoPartner}</Badge>
                            ) : (
                              <span className="text-[11px] italic text-sect-jade/40">尚未结为道侣</span>
                            )}
                          </div>
                        </div>
                        {(selectedDisciple.parents?.length ?? 0) > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="w-8 shrink-0 pt-0.5 text-[10px] text-sect-jade/45">血脉</span>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                              {selectedDisciple.parents!.map((pname, idx) => (
                                <Badge key={idx} variant="spirit" size="sm">{pname}</Badge>
                              ))}
                              <span className="text-[10px] text-sect-jade/50">
                                第 {selectedDisciple.generation ?? 2} 代嫡传
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Section>

                    <Section title="人物事件" icon={<History size={14} />}>
                      {(() => {
                        // 合并贡献流水 + 大比历史，按时间倒序构建事件时间线
                        const myLogs = contributionLogs.filter(l => l.discipleId === selectedDisciple.id).slice(0, 100);
                        const tournaments = selectedDisciple.tournamentHistory || [];

                        // 事件类型 → 线性图标 + 颜色（不使用 emoji）
                        const eventMeta: Record<string, { icon: React.ReactNode; color: string }> = {
                          work:          { icon: <Hammer size={12} />, color: 'text-amber-300' },
                          deduct:        { icon: <Package size={12} />, color: 'text-rose-300' },
                          library:       { icon: <BookOpen size={12} />, color: 'text-cyan-300' },
                          learn_secret:  { icon: <ScrollText size={12} />, color: 'text-violet-300' },
                          trial_reward:  { icon: <Swords size={12} />, color: 'text-emerald-300' },
                          tournament:    { icon: <Trophy size={12} />, color: 'text-yellow-300' },
                          promotion:     { icon: <ChevronUp size={12} />, color: 'text-orange-300' },
                          manual_adjust: { icon: <Hand size={12} />, color: 'text-fuchsia-300' },
                          other:         { icon: <Circle size={12} />, color: 'text-sect-jade/70' },
                        };

                        type EventItem = {
                          year: number;
                          month: number;
                          sortKey: number;
                          icon: React.ReactNode;
                          color: string;
                          body: React.ReactNode;
                        };
                        const events: EventItem[] = [];

                        myLogs.forEach(log => {
                          const meta = eventMeta[log.type] || eventMeta.other;
                          const positive = log.amount >= 0;
                          events.push({
                            year: log.date.year,
                            month: log.date.month,
                            sortKey: log.date.year * 12 + log.date.month,
                            icon: meta.icon,
                            color: meta.color,
                            body: (
                              <>
                                <span className="text-[11px] leading-snug text-sect-jade/80">{log.description}</span>
                                <span className={`ml-1.5 shrink-0 tabular-nums text-[10px] ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                                  {positive ? '+' : ''}{log.amount}贡献
                                </span>
                              </>
                            ),
                          });
                        });

                        tournaments.forEach(record => {
                          const rankText = record.rank === 1 ? '冠军' : record.rank === 2 ? '亚军' : record.rank === 3 ? '季军' : '第' + record.rank + '名';
                          const rankColor = record.rank === 1 ? 'text-yellow-400' : record.rank === 2 ? 'text-gray-300' : record.rank === 3 ? 'text-orange-400' : 'text-sect-jade/50';
                          events.push({
                            year: record.year,
                            month: 12, // 大比通常在年底，排在该年后部
                            sortKey: record.year * 12 + 12,
                            icon: <Trophy size={12} />,
                            color: 'text-yellow-300',
                            body: (
                              <>
                                <span className="text-[11px] leading-snug text-sect-jade/80">
                                  参加{record.scope === 'sect' ? '山门' : '宗门'}{record.frequency}大比
                                </span>
                                <span className={`ml-1.5 shrink-0 text-[10px] font-medium ${rankColor}`}>{rankText}</span>
                                {record.rewards.length > 0 && (
                                  <div className="mt-0.5 text-[10px] text-green-400/80">
                                    奖励：{record.rewards.join('、')}
                                  </div>
                                )}
                              </>
                            ),
                          });
                        });

                        events.sort((a, b) => b.sortKey - a.sortKey);

                        if (events.length === 0) {
                          return <div className="text-[11px] italic text-sect-jade/40">暂无人物事件记录</div>;
                        }

                        return (
                          <div className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
                            {events.map((evt, idx) => (
                              <div key={idx}>
                                <div className="mb-0.5 text-[9px] text-sect-jade/40">
                                  第{evt.year}年{evt.month}月
                                </div>
                                <div className="flex items-start gap-1.5 rounded bg-black/25 px-1.5 py-1">
                                  <span className={cn('mt-0.5 shrink-0', evt.color)}>{evt.icon}</span>
                                  <div className="min-w-0 flex-1 break-words">{evt.body}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </Section>
                  </>
                )}

                {/* ---------- 装备 ---------- */}
                {detailTab === 'inventory' && (
                  <>
                    <Section title="装备槽" icon={<Sword size={14} />}>
                      <div className="space-y-1.5">
                        <EquipmentSlotRow
                          label="法器"
                          equippedName={selectedDisciple.equippedArtifact ? ArtifactTypeNames[selectedDisciple.equippedArtifact] : null}
                          onUnequip={() => unequipItem(selectedDisciple.id, 'artifact')}
                          options={artifactInventory
                            .filter(a => a.quantity > 0)
                            .map(a => ({ value: a.type, label: `${ArtifactTypeNames[a.type]} ×${a.quantity}` }))}
                          onEquip={value => equipItem(selectedDisciple.id, 'artifact', value)}
                        />
                        <EquipmentSlotRow
                          label="符箓"
                          equippedName={selectedDisciple.equippedTalisman ? TalismanTypeNames[selectedDisciple.equippedTalisman] : null}
                          onUnequip={() => unequipItem(selectedDisciple.id, 'talisman')}
                          options={talismanInventory
                            .filter(t => t.quantity > 0)
                            .map(t => ({ value: t.type, label: `${TalismanTypeNames[t.type]} ×${t.quantity}` }))}
                          onEquip={value => equipItem(selectedDisciple.id, 'talisman', value)}
                        />
                        <EquipmentSlotRow
                          label="灵兽"
                          equippedName={selectedDisciple.equippedBeast ? BeastTypeNames[selectedDisciple.equippedBeast] : null}
                          onUnequip={() => unequipItem(selectedDisciple.id, 'beast')}
                          options={beastInventory
                            .filter(b => b.quantity > 0)
                            .map(b => ({ value: b.type, label: `${BeastTypeNames[b.type]} ×${b.quantity}` }))}
                          onEquip={value => equipItem(selectedDisciple.id, 'beast', value)}
                        />
                      </div>
                    </Section>

                    <Section
                      title="弟子背包"
                      icon={<Backpack size={14} />}
                      hint={`${backpackCount} 件`}
                    >
                      {selectedDisciple.backpack && selectedDisciple.backpack.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedDisciple.backpack.map((bp: DiscipleBackpackItem, i: number) => {
                            // 原材料使用特殊存储格式：kind='artifact'，itemType 前缀为 "material:"
                            const isMaterial = bp.kind === 'artifact' && String(bp.itemType).startsWith('material:');
                            const materialRealName = isMaterial ? String(bp.itemType).slice('material:'.length) : '';
                            let itemName: string;
                            let kindLabel: string;
                            let kindColor: string;
                            if (isMaterial) {
                              itemName = materialRealName;
                              kindLabel = '材';
                              kindColor = 'text-emerald-300';
                            } else {
                              itemName =
                                bp.kind === 'pill' ? (PillTypeNames as Record<string, string>)[bp.itemType] :
                                bp.kind === 'artifact' ? (ArtifactTypeNames as Record<string, string>)[bp.itemType] :
                                bp.kind === 'talisman' ? (TalismanTypeNames as Record<string, string>)[bp.itemType] :
                                (BeastTypeNames as Record<string, string>)[bp.itemType];
                              kindLabel =
                                bp.kind === 'pill' ? '丹' : bp.kind === 'artifact' ? '器' : bp.kind === 'talisman' ? '符' : '兽';
                              kindColor =
                                bp.kind === 'pill' ? 'text-green-300' :
                                bp.kind === 'artifact' ? 'text-purple-300' :
                                bp.kind === 'talisman' ? 'text-cyan-300' : 'text-orange-300';
                            }
                            return (
                              <div
                                key={i}
                                className="flex min-w-0 items-center gap-2 rounded-md border border-sect-gold/10 bg-black/25 px-2 py-1"
                              >
                                <span className={cn('shrink-0 rounded bg-sect-ink/60 px-1.5 py-0.5 text-[10px]', kindColor)}>
                                  {kindLabel}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[12px] text-sect-gold">{itemName}</span>
                                <span className="shrink-0 text-[10px] text-sect-jade/60">×{bp.quantity}</span>
                                <button
                                  className="h-9 shrink-0 rounded border border-amber-500/30 px-2.5 text-[10px] text-amber-300 hover:bg-amber-500/15"
                                  onClick={() => takeItemFromDisciple(selectedDisciple.id, bp.kind, bp.itemType, 1)}
                                  title="取回 1 件到宗门仓库"
                                >
                                  取回
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] italic text-sect-jade/40">背包空空如也</div>
                      )}
                    </Section>

                    <Section title="给予物品" icon={<Gift size={14} />}>
                      <div className="flex gap-1.5">
                        {(['pill', 'artifact', 'talisman', 'beast'] as const).map(k => (
                          <button
                            key={k}
                            className={cn(
                              'h-9 flex-1 rounded border text-[10px] transition-colors',
                              giveKind === k
                                ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                                : 'border-sect-jade/15 text-sect-jade/45 hover:text-sect-jade/70'
                            )}
                            onClick={() => setGiveKind(k)}
                          >
                            {k === 'pill' ? '丹药' : k === 'artifact' ? '法器' : k === 'talisman' ? '符箓' : '灵兽'}
                          </button>
                        ))}
                      </div>
                      <select
                        className="mt-1.5 h-9 w-full rounded border border-amber-500/20 bg-[rgba(13,17,23,0.6)] px-2 text-[11px] text-sect-jade"
                        value=""
                        onChange={e => {
                          if (e.target.value) {
                            giveItemToDisciple(selectedDisciple.id, giveKind, e.target.value, 1);
                          }
                        }}
                      >
                        <option value="">— 选择物品给予 —</option>
                        {giveKind === 'pill' && pillInventory.filter(i => i.quantity > 0).map(i => (
                          <option key={i.type} value={i.type}>{PillTypeNames[i.type as keyof typeof PillTypeNames]} ×{i.quantity}</option>
                        ))}
                        {giveKind === 'artifact' && artifactInventory.filter(i => i.quantity > 0).map(i => (
                          <option key={i.type} value={i.type}>{ArtifactTypeNames[i.type]} ×{i.quantity}</option>
                        ))}
                        {giveKind === 'talisman' && talismanInventory.filter(i => i.quantity > 0).map(i => (
                          <option key={i.type} value={i.type}>{TalismanTypeNames[i.type]} ×{i.quantity}</option>
                        ))}
                        {giveKind === 'beast' && beastInventory.filter(i => i.quantity > 0).map(i => (
                          <option key={i.type} value={i.type}>{BeastTypeNames[i.type]} ×{i.quantity}</option>
                        ))}
                      </select>
                    </Section>
                  </>
                )}
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
                刷新候选 {refreshCost} 灵石 · 招收按天赋计价 · 当前灵石 {Math.floor(spiritStones)}
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
                    const hireCost = calculateRecruitCost(c);
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
                            disabled={spiritStones < hireCost}
                            onClick={() => {
                              const res = recruitConfirmDisciple(c);
                              if (res && !res.ok) {
                                setRecruitResultMsg(res.reason || '招收失败');
                                setTimeout(() => setRecruitResultMsg(null), 2000);
                              }
                            }}
                          >
                            招入（{hireCost} 灵石）
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
                    if (spiritStones < refreshCost) {
                      setRecruitResultMsg(`灵石不足（换一批需 ${refreshCost} 灵石）`);
                      setTimeout(() => setRecruitResultMsg(null), 2000);
                      return;
                    }
                    recruitDisciple({ refresh: true });  // 重新生成一轮候选人，并扣刷新费
                  }}
                  disabled={spiritStones < refreshCost}
                  title={`换一批（${refreshCost} 灵石）`}
                >
                  <UserPlus size={12} className="mr-1" /> 换一批 ({refreshCost})
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
