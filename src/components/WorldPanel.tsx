import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectIcon } from '@/components/icons/SectIcons';
import { SimpleAvatar } from '@/components/ui/Avatar';
import {
  SectAlignmentNames, SectRelationNames, SectLevelNames,
  DiplomaticStatusNames,
  TrialTypeNames, TrialTypeIcons, TrialDifficultyNames,
} from '@/types/game';
import type { OtherSect, SectAlignment, SectRelation, DiplomaticStatus, Trial, TrialDifficulty } from '@/types/game';
import type { Disciple } from '@/types/disciple';
import { calculateDiscipleCombatPower, calculateSectCombatPower } from '@/utils/gameLogic';
import { getRealmDisplay, DiscipleStatusNames } from '@/types/disciple';
import { EXPLORATION_REGIONS } from '@/data/exploration';
import { Compass, Lock, Map } from 'lucide-react';

// 境界颜色
function getRealmColor(realm: string): string {
  const colors: Record<string, string> = {
    mortal: 'text-[var(--ink-300)]',
    qi: 'text-blue-400',
    foundation: 'text-[var(--jade-light)]',
    golden: 'text-[var(--gold-300)]',
    nascent: 'text-purple-400',
    spirit: 'text-[var(--cinnabar)]',
  };
  return colors[realm] || 'text-[var(--ink-300)]';
}

// 阵营对应的图片
const ALIGNMENT_IMAGE: Record<SectAlignment, string> = {
  righteous: '/world/sect-righteous.jpg',
  demonic: '/world/sect-demonic.jpg',
  neutral: '/world/sect-neutral.jpg',
};

// 关系对应的图标
const RELATION_ICON: Record<SectRelation, 'talisman' | 'crystal' | 'balance' | 'warning' | 'sword'> = {
  ally: 'talisman',
  friendly: 'crystal',
  neutral: 'balance',
  wary: 'warning',
  hostile: 'sword',
};

// 外交状态对应的样式
const DIPLO_STYLE: Record<DiplomaticStatus, string> = {
  neutral: 'text-[var(--ink-300)] border-[var(--ink-400)]/30',
  ally: 'text-[var(--jade-light)] border-[var(--jade-light)]/40',
  rival: 'text-red-400 border-red-400/40',
  vassal: 'text-[var(--gold-300)] border-[var(--gold-300)]/40',
};

// 难度样式
const DIFF_STYLE: Record<TrialDifficulty, string> = {
  easy: 'text-[var(--jade-light)] border-[var(--jade-light)]/30 bg-[var(--jade-light)]/10',
  normal: 'text-[var(--gold-300)] border-[var(--gold-300)]/30 bg-[var(--gold-300)]/10',
  hard: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  extreme: 'text-red-400 border-red-400/30 bg-red-400/10',
};

// ===== 宗门卡片（含优化外交交互） =====
const WorldSectCard: React.FC<{ sect: OtherSect; ourCombatPower: number }> = ({ sect, ourCombatPower }) => {
  const store = useGameStore();
  const [showActions, setShowActions] = useState(false);
  const [giftAmount, setGiftAmount] = useState('100');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const showMsg = (msg: string) => { setActionMsg(msg); window.setTimeout(() => setActionMsg(null), 2500); };

  const bannerStyle: React.CSSProperties = sect.image
    ? { backgroundImage: `url(${sect.image})` }
    : { backgroundImage: `url(${ALIGNMENT_IMAGE[sect.alignment]})` };

  const fav = sect.favorability ?? 50;
  const favColor = fav >= 70 ? 'text-[var(--jade-light)]' : fav >= 40 ? 'text-[var(--gold-300)]' : 'text-red-400';
  const favBarColor = fav >= 70 ? 'from-[var(--jade-light)] to-[var(--jade)]' : fav >= 40 ? 'from-[var(--gold-500)] to-[var(--gold-300)]' : 'from-red-600 to-red-400';

  // 战力对比
  const powerRatio = ourCombatPower / Math.max(1, sect.combatPower);
  const powerLabel = powerRatio >= 1.3 ? '可压制' : powerRatio >= 1.0 ? '势均力敌' : powerRatio >= 0.5 ? '弱于对方' : '远弱于对方';
  const powerColor = powerRatio >= 1.3 ? 'text-[var(--jade-light)]' : powerRatio >= 1.0 ? 'text-[var(--gold-300)]' : 'text-red-400';

  return (
    <div className="world-sect-card">
      <div className="world-sect-banner" style={bannerStyle}>
        <span className={`world-sect-alignment-badge alignment-${sect.alignment}`}>
          {SectAlignmentNames[sect.alignment]}
        </span>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display text-sm text-[var(--gold-200)] truncate">{sect.name}</div>
        <span className="text-[10px] text-[var(--ink-400)] shrink-0 ml-2">{SectLevelNames[sect.level]}</span>
      </div>

      <div className="text-[11px] text-[var(--ink-300)] mb-2 leading-relaxed line-clamp-2">
        {sect.description}
      </div>

      {/* 战力详情 */}
      <div className="grid grid-cols-3 gap-1 text-[10px] text-center mb-1">
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">战力</div>
          <div className="text-[var(--cinnabar)] font-bold">{sect.combatPower.toLocaleString()}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">弟子</div>
          <div className="text-[var(--jade-light)] font-bold">{sect.discipleCount}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-1">
          <div className="text-[var(--ink-400)]">距离</div>
          <div className="text-[var(--gold-300)] font-bold">{sect.distance}里</div>
        </div>
      </div>

      {/* 战力对比 */}
      <div className="text-[10px] text-center mb-2">
        <span className="text-[var(--ink-400)]">本宗对比：</span>
        <span className={powerColor}>{powerLabel} ({(powerRatio * 100).toFixed(0)}%)</span>
      </div>

      {/* 好感度条 */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[var(--ink-400)] mb-0.5">
          <span className="flex items-center gap-1">
            <SectIcon name="crystal" size={11} strokeWidth={1.8} className={favColor} />
            好感度
          </span>
          <span className={favColor}>{fav}/100</span>
        </div>
        <div className="h-1 rounded-full bg-[rgba(30,40,60,0.6)] overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${favBarColor} transition-all`} style={{ width: `${fav}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] mb-2">
        <span className="text-[var(--ink-400)] flex items-center gap-1">
          <SectIcon name="book" size={11} strokeWidth={1.8} className="text-[var(--violet)]" />
          <span className="truncate">{sect.specialty}</span>
        </span>
        <span className={`relation-${sect.relation} flex items-center gap-1 font-medium`}>
          <SectIcon name={RELATION_ICON[sect.relation]} size={11} strokeWidth={1.8} />
          {SectRelationNames[sect.relation]}
        </span>
      </div>

      {/* 外交状态 + 交易状态 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded border ${DIPLO_STYLE[sect.diplomaticStatus ?? 'neutral']}`}>
          {DiplomaticStatusNames[sect.diplomaticStatus ?? 'neutral']}
        </span>
        {sect.tradeActive && (
          <span className="text-[10px] px-2 py-0.5 rounded border border-[var(--gold-300)]/40 text-[var(--gold-300)] flex items-center gap-0.5">
            <SectIcon name="gem" size={10} strokeWidth={1.8} />
            交易中
          </span>
        )}
      </div>

      {/* 互动按钮 */}
      <button
        onClick={() => setShowActions(!showActions)}
        className="w-full text-[11px] py-1.5 rounded border border-[var(--gold-300)]/30 text-[var(--gold-300)] hover:bg-[var(--gold-300)]/10 transition-colors flex items-center justify-center gap-1.5"
      >
        <SectIcon name="talisman" size={12} strokeWidth={1.8} />
        {showActions ? '收起互动' : '宗门互动'}
      </button>

      {/* 年度互动状态提示：每宗门每年只能互动一次 */}
      {sect.lastInteractionYear === store.year && (
        <div className="mt-1 text-[9px] text-center text-[var(--ink-500)]">
          今年已互动（每年仅一次）
        </div>
      )}

      {actionMsg && (
        <div className="mt-1.5 text-[10px] text-center text-[var(--gold-300)] bg-[var(--gold-300)]/10 rounded py-1">
          {actionMsg}
        </div>
      )}

      {showActions && (
        <div className="mt-2 space-y-2 p-2 rounded bg-[rgba(20,28,40,0.8)] border border-[var(--gold-300)]/15">
          {/* 赠送灵石 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">赠送灵石（加好感）</div>
            <div className="flex gap-1">
              <input
                type="number"
                className="flex-1 text-[11px] bg-[rgba(13,17,23,0.6)] border border-[var(--gold-300)]/20 rounded px-2 py-1 text-[var(--gold-200)] min-w-0"
                value={giftAmount}
                onChange={e => setGiftAmount(e.target.value)}
                placeholder="灵石数"
              />
              <button
                onClick={() => {
                  const amt = parseInt(giftAmount, 10);
                  if (Number.isNaN(amt) || amt <= 0) { showMsg('请输入有效数量'); return; }
                  const r = store.giftSpiritStonesToSect(sect.id, amt);
                  if (!r.ok) showMsg(r.reason || '赠送失败');
                  else showMsg(`赠送 ${amt} 灵石成功`);
                }}
                className="text-[10px] py-1 px-2 rounded bg-[var(--jade-light)]/15 text-[var(--jade-light)] hover:bg-[var(--jade-light)]/25 transition-colors border border-[var(--jade-light)]/30 whitespace-nowrap"
              >
                赠送
              </button>
            </div>
            <div className="text-[9px] text-[var(--ink-500)] mt-0.5">每50灵石+5好感，上限+20</div>
          </div>

          {/* 侮辱 */}
          <div>
            <button
              onClick={() => { store.insultSect(sect.id); showMsg('已侮辱对方，好感-15'); }}
              className="w-full text-[10px] py-1 rounded bg-red-400/15 text-red-400 hover:bg-red-400/25 transition-colors border border-red-400/30"
            >
              侮辱宗门（好感-15）
            </button>
          </div>

          {/* 外交状态：带条件 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">外交行动</div>
            <div className="grid grid-cols-2 gap-1">
              {/* 同盟 */}
              <button
                onClick={() => {
                  const r = store.requestAlliance(sect.id);
                  if (!r.ok) showMsg(r.reason || '条件不满足');
                  else showMsg('同盟缔结成功！');
                }}
                disabled={(sect.diplomaticStatus ?? 'neutral') === 'ally'}
                className={`text-[10px] py-1 rounded border transition-all flex items-center justify-center gap-1 disabled:opacity-40 ${
                  (sect.diplomaticStatus ?? 'neutral') === 'ally'
                    ? `${DIPLO_STYLE.ally} bg-current/10`
                    : 'text-[var(--jade-light)] border-[var(--jade-light)]/30 hover:bg-[var(--jade-light)]/10'
                }`}
              >
                <SectIcon name="talisman" size={10} strokeWidth={1.8} />
                同盟
              </button>
              {/* 宿敌 */}
              <button
                onClick={() => {
                  const r = store.declareRivalry(sect.id);
                  if (!r.ok) showMsg(r.reason || '条件不满足');
                  else showMsg('已宣布宿敌！');
                }}
                disabled={(sect.diplomaticStatus ?? 'neutral') === 'rival'}
                className={`text-[10px] py-1 rounded border transition-all flex items-center justify-center gap-1 disabled:opacity-40 ${
                  (sect.diplomaticStatus ?? 'neutral') === 'rival'
                    ? `${DIPLO_STYLE.rival} bg-current/10`
                    : 'text-red-400 border-red-400/30 hover:bg-red-400/10'
                }`}
              >
                <SectIcon name="sword" size={10} strokeWidth={1.8} />
                宿敌
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {/* 附庸（讨伐） */}
              <button
                onClick={() => {
                  const r = store.subjugateSect(sect.id);
                  showMsg(r.ok ? '讨伐成功！对方成为附庸' : (r.reason || '讨伐失败'));
                }}
                disabled={(sect.diplomaticStatus ?? 'neutral') === 'vassal'}
                className={`text-[10px] py-1 rounded border transition-all flex items-center justify-center gap-1 disabled:opacity-40 ${
                  (sect.diplomaticStatus ?? 'neutral') === 'vassal'
                    ? `${DIPLO_STYLE.vassal} bg-current/10`
                    : 'text-[var(--gold-300)] border-[var(--gold-300)]/30 hover:bg-[var(--gold-300)]/10'
                }`}
              >
                <SectIcon name="crystal" size={10} strokeWidth={1.8} />
                讨伐附庸
              </button>
              {/* 恢复中立 */}
              <button
                onClick={() => {
                  store.setSectDiplomaticStatus(sect.id, 'neutral');
                  showMsg('已恢复中立关系');
                }}
                disabled={(sect.diplomaticStatus ?? 'neutral') === 'neutral'}
                className={`text-[10px] py-1 rounded border transition-all flex items-center justify-center gap-1 disabled:opacity-40 ${
                  (sect.diplomaticStatus ?? 'neutral') === 'neutral'
                    ? `${DIPLO_STYLE.neutral} bg-current/10`
                    : 'text-[var(--ink-300)] border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
                }`}
              >
                <SectIcon name="balance" size={10} strokeWidth={1.8} />
                恢复中立
              </button>
            </div>
            <div className="text-[9px] text-[var(--ink-500)] mt-0.5 leading-tight">
              同盟需好感≥70且战力≥50% · 宿敌需好感≤30 · 附庸需战力≥130%且战胜
            </div>
          </div>

          {/* 交易 */}
          <div>
            <div className="text-[10px] text-[var(--ink-400)] mb-1">交易</div>
            <button
              onClick={() => {
                const ok = store.toggleSectTrade(sect.id);
                if (!ok && !sect.tradeActive) showMsg('灵石不足！需50灵石');
              }}
              className={`w-full text-[10px] py-1.5 rounded border transition-all flex items-center justify-center gap-1 ${
                sect.tradeActive
                  ? 'bg-[var(--gold-300)]/15 text-[var(--gold-300)] border-[var(--gold-300)]/40 hover:bg-[var(--gold-300)]/25'
                  : 'bg-[var(--ink-400)]/10 text-[var(--ink-300)] border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
              }`}
            >
              <SectIcon name="gem" size={11} strokeWidth={1.8} />
              {sect.tradeActive
                ? `结束交易（预估 +${Math.max(5, Math.floor(sect.combatPower * 0.003) + 5)} 灵石 / +1 声望）`
                : '开启交易（-50灵石）'}
            </button>
            <div className="text-[9px] text-[var(--ink-500)] mt-0.5 leading-tight">
              {sect.tradeActive
                ? `结束收益按对方当前战力结算：战力×0.3% + 5（最低5）+ 1 声望`
                : `开通消耗 50 灵石，结束时一次性获得少量灵石与 1 点声望`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== 试炼卡片 =====
const TrialCard: React.FC<{ trial: Trial }> = ({ trial }) => {
  const store = useGameStore();
  const [showDispatch, setShowDispatch] = useState(false);
  const { disciples } = useGameStore();

  // 可派遣弟子：非突破中、非学习秘籍、非试炼中，按战力降序
  const availableDisciples = useMemo(() =>
    [...disciples.filter(d => !d.onTrialId && !d.isBreakingThrough && !d.isLearningSecret)]
      .sort((a, b) => calculateDiscipleCombatPower(b) - calculateDiscipleCombatPower(a)),
    [disciples],
  );

  const assignedDisciple = trial.assignedDiscipleId
    ? disciples.find(d => d.id === trial.assignedDiscipleId)
    : null;

  const isCompleted = trial.status === 'completed';
  const isFailed = trial.status === 'failed';
  const isInProgress = trial.status === 'in_progress';

  return (
    <div className={`trial-card trial-card--${trial.difficulty} trial-card--${trial.status}`}>
      <div className="trial-card-header">
        <div className="flex items-center gap-1.5">
          <SectIcon name={TrialTypeIcons[trial.type] as any} size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
          <span className="font-display text-sm text-[var(--gold-200)]">{trial.name}</span>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${DIFF_STYLE[trial.difficulty]}`}>
          {TrialDifficultyNames[trial.difficulty]}
        </span>
      </div>

      <div className="text-[10px] text-[var(--ink-300)] mb-2 leading-relaxed line-clamp-2">
        {trial.description}
      </div>

      <div className="grid grid-cols-3 gap-1 text-[9px] text-center mb-2">
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-0.5">
          <div className="text-[var(--ink-400)]">类型</div>
          <div className="text-[var(--gold-300)]">{TrialTypeNames[trial.type]}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-0.5">
          <div className="text-[var(--ink-400)]">建议战力</div>
          <div className="text-[var(--cinnabar)]">{trial.requiredPower}</div>
        </div>
        <div className="bg-[rgba(30,40,60,0.6)] rounded px-1 py-0.5">
          <div className="text-[var(--ink-400)]">耗时</div>
          <div className="text-[var(--jade-light)]">{trial.durationMonths}月</div>
        </div>
      </div>

      {/* 奖励预览 */}
      <div className="text-[9px] text-[var(--ink-400)] mb-2">
        <span className="text-[var(--gold-300)]">奖励：</span>{trial.rewards.description}
      </div>

      {/* 进行中：进度条 */}
      {isInProgress && assignedDisciple && (
        <div className="mb-2">
          <div className="flex justify-between text-[9px] text-[var(--ink-400)] mb-0.5">
            <span className="text-[var(--jade-light)]">{assignedDisciple.name} 执行中</span>
            <span>{Math.floor(trial.progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[rgba(30,40,60,0.6)] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)] transition-all" style={{ width: `${trial.progress}%` }} />
          </div>
          <button
            onClick={() => store.cancelTrial(trial.id)}
            className="w-full mt-1.5 text-[10px] py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors"
          >
            取消试炼
          </button>
        </div>
      )}

      {/* 已完成/失败 */}
      {(isCompleted || isFailed) && (
        <div className={`text-center text-[10px] py-1 rounded ${isCompleted ? 'bg-[var(--jade-light)]/10 text-[var(--jade-light)]' : 'bg-red-400/10 text-red-400'}`}>
          {isCompleted ? '试炼完成' : '试炼失败'}
        </div>
      )}

      {/* 可用：派遣按钮 */}
      {trial.status === 'available' && (
        <button
          onClick={() => setShowDispatch(!showDispatch)}
          className="w-full text-[11px] py-1.5 rounded border border-[var(--gold-300)]/30 text-[var(--gold-300)] hover:bg-[var(--gold-300)]/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <SectIcon name="disciple" size={12} strokeWidth={1.8} />
          {showDispatch ? '收起' : '派遣弟子'}
        </button>
      )}

      {/* 弟子选择列表 */}
      {showDispatch && trial.status === 'available' && (
        <div className="mt-2 p-2 rounded bg-[rgba(20,28,40,0.8)] border border-[var(--gold-300)]/15 max-h-48 overflow-y-auto">
          {availableDisciples.length === 0 ? (
            <div className="text-center text-[10px] text-[var(--ink-400)] py-2">暂无可派遣弟子</div>
          ) : (
            availableDisciples.map(d => {
              const power = calculateDiscipleCombatPower(d);
              const powerOk = power >= trial.requiredPower;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    const r = store.dispatchDiscipleToTrial(trial.id, d.id);
                    if (!r.ok) { /* should not happen */ }
                    setShowDispatch(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--gold-300)]/10 transition-colors border border-transparent hover:border-[var(--gold-300)]/20 mb-0.5"
                >
                  <SimpleAvatar seed={d.avatarSeed} size={26} status={d.status} realm={d.realm} name={d.name} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] text-[var(--gold-200)] truncate">{d.name}</div>
                    <div className={`text-[9px] ${getRealmColor(d.realm)}`}>
                      {getRealmDisplay(d)} · {DiscipleStatusNames[d.status]}
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold ${powerOk ? 'text-[var(--jade-light)]' : 'text-orange-400'}`}>
                    {power}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ===== 探索游历子组件 =====
interface ExplorationSectionProps {
  disciples: Disciple[];
  trials: Trial[];
  initiateExploration: (regionId: string, discipleId: string) => { ok: boolean; reason?: string };
  unlockedRegions: string[];
  autoExploreRegions: Record<string, boolean>;
  toggleAutoExplore: (regionId: string) => void;
  explorationMapFragments: number;
  hasCompleteMap: boolean;
}

const ExplorationSection: React.FC<ExplorationSectionProps> = ({
  disciples, trials, initiateExploration, unlockedRegions,
  autoExploreRegions, toggleAutoExplore, explorationMapFragments, hasCompleteMap,
}) => {
  // 每个区域独立管理选择的弟子（key=regionId, value=discipleId）
  const [selectedByRegion, setSelectedByRegion] = useState<Record<string, string | null>>({});
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  // 探索区域配置
  const regions = EXPLORATION_REGIONS;

  // 进行中的探索试炼
  const activeExplorations = trials.filter(
    t => t.type.startsWith('explore_') && t.status === 'in_progress'
  );

  // 可派遣的弟子（非试炼中、非突破中），按战力降序
  const availableDisciples = [...disciples.filter(
    d => !d.onTrialId && !d.isBreakingThrough
  )].sort((a, b) => calculateDiscipleCombatPower(b) - calculateDiscipleCombatPower(a));

  const handleDispatch = (regionId: string) => {
    const discipleId = selectedByRegion[regionId];
    if (!discipleId || discipleId === '_open_') {
      setDispatchMsg('请先选择弟子');
      return;
    }
    const result = initiateExploration(regionId, discipleId);
    setDispatchMsg(result.ok ? '探索队伍已出发！' : (result.reason ?? '派遣失败'));
    if (result.ok) {
      setSelectedByRegion(prev => ({ ...prev, [regionId]: null }));
    }
    setTimeout(() => setDispatchMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 地图碎片进度 */}
      <div className="flex items-center gap-4 text-xs text-sect-jade/70 px-1">
        <div className="flex items-center gap-1">
          <Map size={14} className="text-sky-400" />
          <span>地图碎片：</span>
          <span className="text-sky-400 font-bold">{explorationMapFragments}/3</span>
          {explorationMapFragments >= 3 && (
            <span className="text-green-400 ml-1">✓ 已拼合</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Map size={14} className="text-amber-400" />
          <span>完整地图：</span>
          {hasCompleteMap ? (
            <span className="text-green-400 font-bold">已获得</span>
          ) : (
            <span className="text-sect-jade/40">未获得</span>
          )}
        </div>
      </div>

      {/* 进行中的探索 */}
      {activeExplorations.length > 0 && (
        <Card className="p-4">
          <h2 className="font-display text-base text-sky-400 mb-3 flex items-center gap-2">
            <Compass size={16} />
            探索进行中
          </h2>
          <div className="space-y-2">
            {activeExplorations.map(t => {
              const disciple = disciples.find(d => d.id === t.assignedDiscipleId);
              const progress = t.progress;
              return (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <Compass size={14} className="text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-sect-jade">{t.name}</div>
                    <div className="text-xs text-sect-jade/60">
                      弟子: {disciple?.name ?? '未知'} | 已进行 {t.durationMonths} 个月
                    </div>
                  </div>
                  <div className="text-xs text-sky-400">
                    {Math.round(progress)}%
                  </div>
                  <div className="w-16 h-1.5 rounded-full bg-gray-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 探索区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regions.map(region => {
          const isUnlocked = unlockedRegions.includes(region.id);
          const isActive = activeExplorations.some(t => t.type === region.trialType);
          return (
            <Card key={region.id} className={`p-4 ${!isUnlocked ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    !isUnlocked ? 'bg-gray-500/20' : 'bg-sky-500/20'
                  }`}>
                    {!isUnlocked ? (
                      <Lock size={20} className="text-gray-500" />
                    ) : (
                      <Compass size={20} className="text-sky-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-sect-jade">{region.name}</h3>
                    <div className="text-[10px] text-sect-jade/60 flex items-center gap-2">
                      <span>建议战力 ≥{region.minPower.toLocaleString()}</span>
                      <span>耗时 {region.baseDurationMonths}月</span>
                    </div>
                  </div>
                </div>
                {isUnlocked && (
                  <button
                    onClick={() => toggleAutoExplore(region.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all ${
                      autoExploreRegions[region.id]
                        ? 'bg-[rgba(74,122,107,0.2)] border-[var(--jade-light)]/50 text-[var(--jade-light)]'
                        : 'border-[var(--ink-400)]/30 text-[var(--ink-300)] hover:border-[var(--jade-light)]/30'
                    }`}
                    title={autoExploreRegions[region.id] ? '自动探索已开启' : '点击开启自动探索'}
                  >
                    <span className={autoExploreRegions[region.id] ? '' : 'opacity-40'}>自动</span>
                    <span className={`inline-block w-6 h-3 rounded-full relative transition-all ${
                      autoExploreRegions[region.id] ? 'bg-[var(--jade-light)]/60' : 'bg-[var(--ink-400)]/30'
                    }`}>
                      <span className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${
                        autoExploreRegions[region.id] ? 'left-3.5' : 'left-0.5'
                      }`} />
                    </span>
                  </button>
                )}
              </div>

              <p className="text-xs text-sect-jade/60 mb-3 leading-relaxed">
                {region.description}
              </p>

              {isUnlocked && !isActive ? (
                <div className="space-y-2">
                  {/* 选中弟子显示 */}
                  <button
                    onClick={() => setSelectedByRegion(prev => ({ ...prev, [region.id]: prev[region.id] ? null : '_open_' }))}
                    className="w-full text-xs px-2 py-1.5 rounded border border-white/20 text-sect-jade flex items-center justify-between transition-colors"
                    style={{
                      background: selectedByRegion[region.id] && selectedByRegion[region.id] !== '_open_'
                        ? 'rgba(56,189,248,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {selectedByRegion[region.id] && selectedByRegion[region.id] !== '_open_' ? (
                      <span>
                        {disciples.find(d => d.id === selectedByRegion[region.id])?.name ?? '选择弟子'}
                        <span className="text-sect-jade/50 ml-1">
                          战力 {Math.floor(calculateDiscipleCombatPower(
                            disciples.find(d => d.id === selectedByRegion[region.id])!
                          )).toLocaleString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sect-jade/50">选择派遣弟子...</span>
                    )}
                    <span className="text-sect-jade/40">{selectedByRegion[region.id] === '_open_' ? '▲' : '▼'}</span>
                  </button>

                  {/* 弟子列表（展开） */}
                  {selectedByRegion[region.id] === '_open_' && (
                    <div className="p-1.5 rounded border border-sky-500/20 bg-[rgba(20,28,40,0.95)] max-h-48 overflow-y-auto space-y-0.5">
                      {availableDisciples.length === 0 ? (
                        <div className="text-center text-[10px] text-sect-jade/40 py-2">暂无可派遣弟子</div>
                      ) : (
                        availableDisciples.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setSelectedByRegion(prev => ({ ...prev, [region.id]: d.id }))}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sky-500/10 transition-colors text-left"
                          >
                            <SimpleAvatar seed={d.avatarSeed} size={24} status={d.status} realm={d.realm} name={d.name} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-sect-jade truncate">{d.name}</div>
                              <div className="text-[9px] text-sect-jade/50">
                                {getRealmDisplay(d)} · {DiscipleStatusNames[d.status]}
                              </div>
                            </div>
                            <div className="text-[10px] text-sky-400 font-bold">
                              {Math.floor(calculateDiscipleCombatPower(d)).toLocaleString()}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleDispatch(region.id)}
                    disabled={!selectedByRegion[region.id] || selectedByRegion[region.id] === '_open_'}
                    className="w-full text-xs py-1.5 rounded transition-all"
                    style={{
                      background: selectedByRegion[region.id] && selectedByRegion[region.id] !== '_open_'
                        ? 'rgba(56,189,248,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${
                        selectedByRegion[region.id] && selectedByRegion[region.id] !== '_open_'
                          ? 'rgba(56,189,248,0.4)'
                          : 'rgba(255,255,255,0.1)'
                      }`,
                      color: selectedByRegion[region.id] && selectedByRegion[region.id] !== '_open_'
                        ? 'var(--gold-200)'
                        : 'var(--ink-400)',
                    }}
                  >
                    派遣探索
                  </button>
                  {dispatchMsg && (
                    <div className={`text-xs text-center ${dispatchMsg.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>
                      {dispatchMsg}
                    </div>
                  )}
                </div>
              ) : !isUnlocked ? (
                <div className="text-xs text-sect-jade/40 text-center py-2">
                  <Lock size={12} className="inline mr-1" />
                  {region.unlockHint}
                </div>
              ) : (
                <div className="text-xs text-sky-400 text-center py-2 animate-pulse">
                  探索中...
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ===== 主面板 =====
type WorldTab = 'sects' | 'trials' | 'exploration';

export const WorldPanel: React.FC = () => {
  const store = useGameStore();
  const { otherSects, trials, disciples, buildings, autoTrialEnabled, toggleAutoTrial, refreshTrials } = store;
  const [activeTab, setActiveTab] = useState<WorldTab>('sects');

  // 本宗战力
  const ourCombatPower = useMemo(
    () => calculateSectCombatPower(disciples, buildings).totalPower,
    [disciples, buildings],
  );

  // 统计
  const allyCount = otherSects.filter(s => s.relation === 'ally' || s.relation === 'friendly').length;
  const hostileCount = otherSects.filter(s => s.relation === 'hostile' || s.relation === 'wary').length;
  const righteousCount = otherSects.filter(s => s.alignment === 'righteous').length;
  const demonicCount = otherSects.filter(s => s.alignment === 'demonic').length;

  const allyDiploCount = otherSects.filter(s => s.diplomaticStatus === 'ally').length;
  const rivalDiploCount = otherSects.filter(s => s.diplomaticStatus === 'rival').length;
  const vassalDiploCount = otherSects.filter(s => s.diplomaticStatus === 'vassal').length;
  const tradeCount = otherSects.filter(s => s.tradeActive).length;

  // 试炼统计（排除探索类型试炼，探索有独立页签）
  const isNormalTrial = (t: Trial) => !t.type.startsWith('explore_');
  const availableTrials = trials.filter(t => t.status === 'available' && isNormalTrial(t));
  const inProgressTrials = trials.filter(t => t.status === 'in_progress' && isNormalTrial(t));
  const completedTrials = trials.filter(t => t.status === 'completed' && isNormalTrial(t));
  const failedTrials = trials.filter(t => t.status === 'failed' && isNormalTrial(t));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base text-gold-gradient flex items-center gap-2">
            <SectIcon name="world" size={20} strokeWidth={1.8} className="text-sect-gold" />
            天下大势
          </h1>
          <p className="text-sect-jade/60 text-xs mt-0.5">
            本宗战力 <span className="text-[var(--cinnabar)] font-bold">{ourCombatPower.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* 子页签 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('sects')}
          className={`px-4 py-2 rounded-lg text-sm font-display flex items-center gap-1.5 transition-all ${
            activeTab === 'sects'
              ? 'bg-[var(--gold-300)]/15 text-[var(--gold-300)] border border-[var(--gold-300)]/40'
              : 'text-[var(--ink-300)] border border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
          }`}
        >
          <SectIcon name="group" size={14} strokeWidth={1.8} />
          天下宗门
        </button>
        <button
          onClick={() => setActiveTab('trials')}
          className={`px-4 py-2 rounded-lg text-sm font-display flex items-center gap-1.5 transition-all ${
            activeTab === 'trials'
              ? 'bg-[var(--gold-300)]/15 text-[var(--gold-300)] border border-[var(--gold-300)]/40'
              : 'text-[var(--ink-300)] border border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
          }`}
        >
          <SectIcon name="sword" size={14} strokeWidth={1.8} />
          试炼
          {availableTrials.length > 0 && (
            <span className="text-[9px] bg-[var(--cinnabar)] text-white rounded-full px-1.5 py-0.5">{availableTrials.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('exploration')}
          className={`px-4 py-2 rounded-lg text-sm font-display flex items-center gap-1.5 transition-all ${
            activeTab === 'exploration'
              ? 'bg-[var(--gold-300)]/15 text-[var(--gold-300)] border border-[var(--gold-300)]/40'
              : 'text-[var(--ink-300)] border border-[var(--ink-400)]/20 hover:border-[var(--gold-300)]/30'
          }`}
        >
          <Compass size={14} className="text-sky-400" />
          探索游历
        </button>
      </div>

      {/* ===== 天下宗门页签 ===== */}
      {activeTab === 'sects' && (
        <>
          {/* 概览统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[rgba(212,168,87,0.15)]">
                  <SectIcon name="group" size={18} strokeWidth={1.8} className="text-sect-gold" />
                </div>
                <div>
                  <div className="text-sect-jade/60 text-xs">已知宗门</div>
                  <div className="font-display text-lg text-sect-gold">{otherSects.length}</div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[rgba(74,122,107,0.2)]">
                  <SectIcon name="crystal" size={18} strokeWidth={1.8} className="text-sect-jade-light" />
                </div>
                <div>
                  <div className="text-sect-jade/60 text-xs">盟友/友好</div>
                  <div className="font-display text-lg text-sect-jade-light">{allyCount}</div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[rgba(194,58,46,0.2)]">
                  <SectIcon name="sword" size={18} strokeWidth={1.8} className="text-red-400" />
                </div>
                <div>
                  <div className="text-sect-jade/60 text-xs">戒备/敌对</div>
                  <div className="font-display text-lg text-red-400">{hostileCount}</div>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[rgba(123,94,167,0.2)]">
                  <SectIcon name="balance" size={18} strokeWidth={1.8} className="text-sect-spirit" />
                </div>
                <div>
                  <div className="text-sect-jade/60 text-xs">正/魔</div>
                  <div className="font-display text-sm">
                    <span className="text-sect-jade-light">{righteousCount}</span>
                    <span className="text-sect-jade/40 mx-1">/</span>
                    <span className="text-red-400">{demonicCount}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 外交统计 */}
          {(allyDiploCount > 0 || rivalDiploCount > 0 || vassalDiploCount > 0 || tradeCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {allyDiploCount > 0 && (
                <div className="px-3 py-1 rounded-lg bg-[rgba(74,122,107,0.15)] border border-[var(--jade-light)]/30 text-xs text-[var(--jade-light)] flex items-center gap-1.5">
                  <SectIcon name="talisman" size={12} strokeWidth={1.8} />
                  同盟 {allyDiploCount}
                </div>
              )}
              {rivalDiploCount > 0 && (
                <div className="px-3 py-1 rounded-lg bg-[rgba(194,58,46,0.15)] border border-red-400/30 text-xs text-red-400 flex items-center gap-1.5">
                  <SectIcon name="sword" size={12} strokeWidth={1.8} />
                  宿敌 {rivalDiploCount}
                </div>
              )}
              {vassalDiploCount > 0 && (
                <div className="px-3 py-1 rounded-lg bg-[rgba(212,168,87,0.15)] border border-[var(--gold-300)]/30 text-xs text-[var(--gold-300)] flex items-center gap-1.5">
                  <SectIcon name="crystal" size={12} strokeWidth={1.8} />
                  附庸 {vassalDiploCount}
                </div>
              )}
              {tradeCount > 0 && (
                <div className="px-3 py-1 rounded-lg bg-[rgba(212,168,87,0.1)] border border-[var(--gold-300)]/20 text-xs text-[var(--gold-200)] flex items-center gap-1.5">
                  <SectIcon name="gem" size={12} strokeWidth={1.8} />
                  交易中 {tradeCount}
                </div>
              )}
            </div>
          )}

          {/* 宗门列表 */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm text-gold-gradient">天下宗门</h2>
                <Badge variant="default" size="sm">{otherSects.length} 个</Badge>
              </div>
            </div>

            <p className="text-sect-jade/50 text-xs mb-3 leading-relaxed">
              赠送灵石可提升好感，侮辱则降低好感。同盟需好感≥70且战力达标，宿敌需好感≤30，附庸需战力碾压并战胜对方。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherSects.map(sect => (
                <WorldSectCard key={sect.id} sect={sect} ourCombatPower={ourCombatPower} />
              ))}
            </div>

            {otherSects.length === 0 && (
              <div className="text-center py-8 text-sect-jade/40 text-sm">
                暂无天下宗门情报
              </div>
            )}
          </Card>
        </>
      )}

      {/* ===== 试炼页签 ===== */}
      {activeTab === 'trials' && (
        <>
          {/* 试炼统计 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[rgba(30,40,60,0.4)] rounded-lg p-2 text-center border border-[var(--gold-300)]/10">
              <div className="text-[10px] text-[var(--ink-400)]">可接取</div>
              <div className="font-display text-base text-[var(--gold-300)]">{availableTrials.length}</div>
            </div>
            <div className="bg-[rgba(30,40,60,0.4)] rounded-lg p-2 text-center border border-[var(--jade-light)]/10">
              <div className="text-[10px] text-[var(--ink-400)]">进行中</div>
              <div className="font-display text-base text-[var(--jade-light)]">{inProgressTrials.length}</div>
            </div>
            <div className="bg-[rgba(30,40,60,0.4)] rounded-lg p-2 text-center border border-[var(--jade-light)]/10">
              <div className="text-[10px] text-[var(--ink-400)]">已完成</div>
              <div className="font-display text-base text-[var(--jade-light)]">{completedTrials.length}</div>
            </div>
            <div className="bg-[rgba(30,40,60,0.4)] rounded-lg p-2 text-center border border-red-400/10">
              <div className="text-[10px] text-[var(--ink-400)]">已失败</div>
              <div className="font-display text-base text-red-400">{failedTrials.length}</div>
            </div>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm text-gold-gradient">试炼任务</h2>
                <Badge variant="default" size="sm">{trials.length} 项</Badge>
              </div>
              {/* 试炼操作按钮区 */}
              <div className="flex items-center gap-2">
                {/* 刷新试炼按钮 */}
                <button
                  onClick={() => refreshTrials()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-[var(--ink-400)]/30 text-[var(--ink-300)] hover:border-[var(--gold-400)]/50 hover:text-[var(--gold-300)] transition-all"
                  title="立即刷新试炼列表（按本宗当前战力重新生成）"
                >
                  <SectIcon name="sword" size={12} strokeWidth={1.8} />
                  <span>刷新试炼</span>
                </button>
                {/* 自动试炼开关 */}
                <button
                  onClick={() => toggleAutoTrial()}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    autoTrialEnabled
                      ? 'bg-[rgba(74,122,107,0.2)] border-[var(--jade-light)]/50 text-[var(--jade-light)]'
                      : 'border-[var(--ink-400)]/30 text-[var(--ink-300)] hover:border-[var(--jade-light)]/30'
                  }`}
                  title={autoTrialEnabled ? '已开启：每月自动派遣空闲弟子执行可完成的试炼' : '点击开启：每月自动派遣空闲弟子执行可完成的试炼'}
                >
                  <SectIcon name="talisman" size={12} strokeWidth={1.8} />
                  <span>自动试炼</span>
                  <span className={`ml-0.5 inline-block w-7 h-3.5 rounded-full relative transition-all ${
                    autoTrialEnabled ? 'bg-[var(--jade-light)]/60' : 'bg-[var(--ink-400)]/30'
                  }`}>
                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${
                      autoTrialEnabled ? 'left-4' : 'left-0.5'
                    }`} />
                  </span>
                </button>
              </div>
            </div>

            <p className="text-sect-jade/50 text-xs mb-3 leading-relaxed">
              每年自动刷新适合本宗战力的试炼任务。派遣弟子执行可获取灵石、声望、原料、贡献等奖励。
              弟子战力越高成功率越大，失败可能受伤修为倒退。
              {autoTrialEnabled && <span className="text-[var(--jade-light)]">已开启自动试炼：每月自动派遣空闲弟子执行可完成的试炼。</span>}
            </p>

            {trials.length === 0 ? (
              <div className="text-center py-8 text-sect-jade/40 text-sm">
                暂无试炼任务，点击"刷新试炼"或等待年度刷新
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 优先显示可接取和进行中，再显示已完成/失败 */}
                {[...availableTrials, ...inProgressTrials, ...completedTrials, ...failedTrials].map(trial => (
                  <TrialCard key={trial.id} trial={trial} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ===== 探索游历页签 ===== */}
      {activeTab === 'exploration' && (
        <ExplorationSection
          disciples={disciples}
          trials={trials}
          initiateExploration={store.initiateExploration}
          unlockedRegions={store.unlockedExplorationRegions}
          autoExploreRegions={store.autoExploreRegions}
          toggleAutoExplore={store.toggleAutoExplore}
          explorationMapFragments={store.explorationMapFragments}
          hasCompleteMap={store.hasCompleteMap}
        />
      )}
    </div>
  );
};
