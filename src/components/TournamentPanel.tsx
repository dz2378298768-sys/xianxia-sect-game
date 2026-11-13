import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SectIcon } from '@/components/icons/SectIcons';
import { useGameStore } from '@/store/gameStore';
import type {
  TournamentDivision, TournamentFrequency,
  TournamentReward, TournamentRewardType, TournamentResult,
} from '@/types/tournament';
import {
  TournamentFrequencyNames, TournamentRewardTypeNames,
  TournamentFrequencyIntervals, TournamentFrequencyMonths,
} from '@/types/tournament';
import {
  getDivisionName, generateInterSectRewards, rewardToText,
  canManuallyHoldTournament, estimateOpponentRange, discipleMatchesDivision,
} from '@/utils/tournament';
import type { Realm, DiscipleStatus } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames } from '@/types/disciple';
import { ADULT_AGE, calculateDiscipleCombatPower } from '@/utils/gameLogic';
import type { PillType } from '@/types/pill';
import { PillTypeNames } from '@/types/pill';
import type { TalismanType } from '@/types/talisman';
import { TalismanTypeNames } from '@/types/talisman';
import type { ArtifactType } from '@/types/artifact';
import { ArtifactTypeNames } from '@/types/artifact';

interface TournamentPanelProps {
  scope: 'sect' | 'inter-sect';
}

const FREQUENCIES: TournamentFrequency[] = ['yearly', 'every5years', 'every10years'];
const REWARD_TYPES: TournamentRewardType[] = ['contribution', 'spiritStones', 'reputation', 'pill', 'talisman', 'artifact'];
const REALM_DIVISIONS: { kind: 'realm'; value: Realm }[] = RealmOrder.map(r => ({ kind: 'realm', value: r }));
const STATUS_DIVISIONS: { kind: 'status'; value: DiscipleStatus }[] = (['servant', 'outer', 'inner', 'core', 'elder'] as DiscipleStatus[]).map(s => ({ kind: 'status', value: s }));
const ALL_DIVISION: TournamentDivision = { kind: 'all', value: 'all' };
const PILL_OPTIONS: PillType[] = ['foundation_pill', 'golden_pill', 'nascent_pill', 'spirit_pill', 'recovery_pill', 'longevity_pill', 'detox_pill', 'qi_gathering_pill', 'body_forging_pill'];
const TALISMAN_OPTIONS: TalismanType[] = ['fire_talisman', 'ice_talisman', 'thunder_talisman', 'heal_talisman', 'teleport_talisman', 'stealth_talisman', 'ward_talisman', 'sword_talisman', 'divine_talisman'];
const ARTIFACT_OPTIONS: ArtifactType[] = ['flying_sword', 'defensive_shield', 'attack_talisman', 'spirit_bottle', 'space_ring', 'thunder_pearl', 'bagua_mirror', 'demon_pagoda'];
const RANK_LABELS: Record<1 | 2 | 3, string> = { 1: '冠军', 2: '亚军', 3: '季军' };
const RANK_COLORS: Record<1 | 2 | 3, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-orange-400',
};

/** 下一次自动举办的年月：若今年的举办月已过，则顺延到下一年 */
function nextTriggerLabel(
  frequency: TournamentFrequency,
  lastYear: number,
  currentYear: number,
  currentMonth: number,
): string {
  const interval = TournamentFrequencyIntervals[frequency];
  const month = TournamentFrequencyMonths[frequency];
  let next = lastYear > 0 ? lastYear + interval : currentYear;
  if (next < currentYear || (next === currentYear && currentMonth > month)) next = currentYear + 1;
  return `第${next}年${month}月`;
}

/** 下拉选择器外壳，统一外观 */
const SelectShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {children}
    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sect-gold/50 text-[8px] pointer-events-none">▼</span>
  </div>
);

export const TournamentPanel: React.FC<TournamentPanelProps> = ({ scope }) => {
  const isSect = scope === 'sect';
  const store = useGameStore();

  const updateFreqConfig = isSect
    ? store.updateSectTournamentFreqConfig
    : store.updateInterSectTournamentFreqConfig;
  const trigger = isSect
    ? store.triggerSectTournament
    : store.triggerInterSectTournament;
  const config = isSect ? store.sectTournamentConfig : store.interSectTournamentConfig;
  const results = isSect ? store.lastSectTournamentResults : store.lastInterSectTournamentResults;
  const lastYears = isSect ? store.lastSectTournamentYears : store.lastInterSectTournamentYears;
  const {
    disciples, otherSects, year, month, spiritStones,
    pillInventory, talismanInventory, artifactInventory, tournamentHistory,
  } = store;

  // 三个频率用标签页切换，避免六个配置块堆在一起滚不完
  const [activeFreq, setActiveFreq] = useState<TournamentFrequency>('yearly');
  const [editorOpen, setEditorOpen] = useState(false);
  // 手动举办后展示的弹窗结果
  const [popupResult, setPopupResult] = useState<TournamentResult | null>(null);

  const title = isSect ? '山门大比' : '宗门大比';
  const desc = isSect
    ? '本宗弟子间的内部比武，奖赏从宗门库存发放。三种频率各自独立配置分组与奖励。'
    : '与天下其他宗门弟子同台竞技，对手实力随对方宗门强弱变化。三种频率各自独立配置分组与奖励。';

  const freqConfig = config[activeFreq];
  const lastResult = results[activeFreq];
  const lastYear = lastYears[activeFreq];
  const inCooldown = !canManuallyHoldTournament(activeFreq, freqConfig, year, lastYear);
  // 没有其他宗门时，宗门大比没有对手可打
  const noRivals = !isSect && otherSects.length === 0;
  const canHold = freqConfig.enabled && !inCooldown && !noRivals;

  // 可参赛弟子（未成年不参赛），按战力排序便于预告"我方最强"
  const participants = useMemo(
    () => disciples
      .filter(d => d.age >= ADULT_AGE && discipleMatchesDivision(d, freqConfig.division))
      .map(d => ({ id: d.id, name: d.name, realm: d.realm, power: calculateDiscipleCombatPower(d) }))
      .sort((a, b) => b.power - a.power),
    [disciples, freqConfig.division],
  );
  const participantCount = participants.length;
  const ourBest = participants[0]?.power ?? 0;

  // 敌方预估：按分组对应境界与在场宗门实力估算
  // 「全员」分组按参赛人数最多的境界估算，避免被单个高境界弟子抬高预期
  const opponentRange = useMemo(() => {
    const div = freqConfig.division;
    const statusRealm: Record<DiscipleStatus, Realm> = {
      mortal: 'mortal', servant: 'mortal', outer: 'qi', inner: 'foundation', core: 'golden', elder: 'nascent',
    };
    const counts = new Map<Realm, number>();
    participants.forEach(p => counts.set(p.realm, (counts.get(p.realm) ?? 0) + 1));
    let dominantRealm: Realm = 'foundation';
    let dominantCount = 0;
    counts.forEach((n, realm) => { if (n > dominantCount) { dominantCount = n; dominantRealm = realm; } });
    const realm: Realm = div.kind === 'realm'
      ? div.value
      : div.kind === 'status'
        ? statusRealm[div.value]
        : dominantRealm;
    return estimateOpponentRange(realm, otherSects);
  }, [freqConfig.division, otherSects, participants]);

  const verdict = (() => {
    if (!isSect && participantCount > 0) {
      if (ourBest >= opponentRange[1]) return { text: '优势在我', tone: 'text-emerald-400' };
      if (ourBest >= (opponentRange[0] + opponentRange[1]) / 2) return { text: '势均力敌', tone: 'text-yellow-400' };
      if (ourBest >= opponentRange[0]) return { text: '处于劣势', tone: 'text-orange-400' };
      return { text: '凶多吉少', tone: 'text-red-400' };
    }
    return null;
  })();

  // 山门大比：冠军奖赏的预计支出与库存缺口
  const championRewards = freqConfig.rewards.filter(r => r.rank === 1);
  const estStoneCost = isSect
    ? championRewards.filter(r => r.type === 'spiritStones').reduce((n, r) => n + r.amount, 0)
    : 0;
  const shortage = (() => {
    if (!isSect) return null;
    if (estStoneCost > spiritStones) return `灵石不足（需 ${estStoneCost}，现有 ${Math.floor(spiritStones)}）`;
    for (const r of championRewards) {
      if (r.type === 'pill' && r.pillType) {
        const stock = pillInventory.find(p => p.type === r.pillType)?.quantity ?? 0;
        if (stock < r.amount) return `${PillTypeNames[r.pillType]}库存不足（需 ${r.amount}）`;
      }
      if (r.type === 'talisman' && r.talismanType) {
        const stock = talismanInventory.find(t => t.type === r.talismanType)?.quantity ?? 0;
        if (stock < r.amount) return `${TalismanTypeNames[r.talismanType as TalismanType] ?? '符箓'}库存不足（需 ${r.amount}）`;
      }
      if (r.type === 'artifact' && r.artifactType) {
        const stock = artifactInventory.find(a => a.type === r.artifactType)?.quantity ?? 0;
        if (stock < r.amount) return `${ArtifactTypeNames[r.artifactType as ArtifactType] ?? '法器'}库存不足（需 ${r.amount}）`;
      }
    }
    return null;
  })();

  const history = (tournamentHistory ?? []).filter(h => h.scope === scope).slice(0, 6);

  const handleToggleEnabled = () => updateFreqConfig(activeFreq, { enabled: !freqConfig.enabled });
  const handleDivisionChange = (division: TournamentDivision) => updateFreqConfig(activeFreq, { division });

  const handleRewardChange = (
    index: number,
    field: 'type' | 'amount' | 'pillType' | 'talismanType' | 'artifactType',
    value: string | number,
  ) => {
    const newRewards = freqConfig.rewards.map((r, i) => {
      if (i !== index) return r;
      if (field === 'type') {
        const type = value as TournamentRewardType;
        return {
          ...r,
          type,
          amount: Math.max(1, r.amount ?? 1),
          pillType: type === 'pill' ? (r.pillType ?? 'foundation_pill') : undefined,
          talismanType: type === 'talisman' ? (r.talismanType ?? 'fire_talisman') : undefined,
          artifactType: type === 'artifact' ? (r.artifactType ?? 'flying_sword') : undefined,
        } as TournamentReward;
      }
      if (field === 'amount') return { ...r, amount: Math.max(0, Number(value) || 0) } as TournamentReward;
      if (field === 'pillType') return { ...r, pillType: value as PillType } as TournamentReward;
      return { ...r, [field]: value } as TournamentReward;
    });
    updateFreqConfig(activeFreq, { rewards: newRewards });
  };

  const addReward = (rank: 1 | 2 | 3) => {
    updateFreqConfig(activeFreq, {
      rewards: [...freqConfig.rewards, { rank, type: 'contribution', amount: 50 }],
    });
  };

  const removeReward = (index: number) => {
    updateFreqConfig(activeFreq, { rewards: freqConfig.rewards.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-2">
        <SectIcon name="battle" size={20} strokeWidth={1.8} className="text-sect-gold" />
        <h2 className="font-display text-lg text-gold-gradient">{title}</h2>
      </div>
      <p className="text-sect-jade/50 text-xs mb-3 leading-relaxed">{desc}</p>

      {/* 频率标签页 */}
      <div className="flex gap-1 mb-3">
        {FREQUENCIES.map(freq => {
          const cfg = config[freq];
          const active = freq === activeFreq;
          return (
            <button
              key={freq}
              onClick={() => { setActiveFreq(freq); setEditorOpen(false); }}
              className={`flex-1 px-1 py-1.5 rounded-md text-[11px] transition-all border ${
                active
                  ? 'bg-sect-gold/15 text-sect-gold border-sect-gold/40'
                  : 'text-sect-jade/60 border-transparent hover:text-sect-jade hover:bg-sect-jade/10'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {TournamentFrequencyNames[freq].replace('每', '').replace('一比', '')}
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.enabled ? 'bg-emerald-400' : 'bg-sect-jade/25'}`} />
              </span>
            </button>
          );
        })}
      </div>

      <div className={`p-3 rounded-lg border transition-all ${
        freqConfig.enabled
          ? 'border-sect-gold/40 bg-sect-gold/5'
          : 'border-sect-jade/15 bg-sect-ink-light/20'
      }`}>
        {/* 频率标题 + 开关 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-sect-gold">{TournamentFrequencyNames[activeFreq]}</span>
            <Badge variant={freqConfig.enabled ? 'gold' : 'default'} size="sm">
              {freqConfig.enabled ? '已开启' : '已关闭'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleToggleEnabled}>
            {freqConfig.enabled ? '关闭' : '开启'}
          </Button>
        </div>

        {/* 分组 */}
        <div className="mb-2">
          <div className="text-[11px] text-sect-jade/60 mb-1.5 flex items-center gap-1.5">
            <SectIcon name="disciple" size={12} strokeWidth={1.8} className="text-sect-gold/70" />
            比拼分组
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              disabled={!freqConfig.enabled}
              onClick={() => handleDivisionChange(ALL_DIVISION)}
              className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                freqConfig.division.kind === 'all'
                  ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
                  : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10 border border-transparent'
              } ${!freqConfig.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              全员
            </button>
            {REALM_DIVISIONS.map(d => (
              <button
                key={`realm-${d.value}`}
                disabled={!freqConfig.enabled}
                onClick={() => handleDivisionChange(d)}
                className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                  freqConfig.division.kind === 'realm' && freqConfig.division.value === d.value
                    ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
                    : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10 border border-transparent'
                } ${!freqConfig.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {RealmNames[d.value]}
              </button>
            ))}
            {STATUS_DIVISIONS.map(d => (
              <button
                key={`status-${d.value}`}
                disabled={!freqConfig.enabled}
                onClick={() => handleDivisionChange(d)}
                className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                  freqConfig.division.kind === 'status' && freqConfig.division.value === d.value
                    ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/40'
                    : 'text-sect-jade/60 hover:text-sect-jade hover:bg-sect-jade/10 border border-transparent'
                } ${!freqConfig.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {DiscipleStatusNames[d.value]}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-sect-jade/40 mt-1">
            「{getDivisionName(freqConfig.division)}」· 可参赛 {participantCount} 人
            {participantCount > 0 && ` · 最强 ${ourBest.toLocaleString()}`}
          </div>
        </div>

        {/* 战况预告 */}
        {freqConfig.enabled && participantCount > 0 && (
          <div className="mb-2 px-2 py-1.5 rounded bg-sect-ink-light/30 border border-sect-gold/15 text-[10px] leading-relaxed">
            {isSect ? (
              <span className="text-sect-jade/70">
                冠军奖赏：{championRewards.length > 0
                  ? championRewards.map(r => rewardToText(r)).join('、')
                  : '无'}
                {estStoneCost > 0 && <span className="text-amber-400/80">（预计支出 {estStoneCost} 灵石）</span>}
                {shortage && <span className="text-red-400"> · {shortage}</span>}
              </span>
            ) : (
              <span className="text-sect-jade/70">
                对手约 {opponentRange[0].toLocaleString()} ~ {opponentRange[1].toLocaleString()} 战力
                {verdict && <span className={`ml-1 ${verdict.tone}`}>· {verdict.text}</span>}
              </span>
            )}
          </div>
        )}

        {/* 奖励配置 */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] text-sect-jade/60 flex items-center gap-1.5">
              <SectIcon name="trophy" size={12} strokeWidth={1.8} className="text-sect-gold/70" />
              {isSect ? '获胜奖励（可从库存增删）' : '本届奖励（每年自动生成）'}
            </div>
            {isSect && (
              <button
                disabled={!freqConfig.enabled}
                onClick={() => setEditorOpen(o => !o)}
                className={`text-[11px] text-sect-gold/80 hover:text-sect-gold ${!freqConfig.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {editorOpen ? '收起编辑' : '编辑'}
              </button>
            )}
          </div>

          {(() => {
            const rewards = isSect ? freqConfig.rewards : generateInterSectRewards(activeFreq, year);
            return (
              <div className="space-y-1">
                {([1, 2, 3] as const).map(rank => {
                  const rows = rewards
                    .map((r, i) => ({ r, i }))
                    .filter(x => x.r.rank === rank);
                  return (
                    <div key={rank} className="flex items-start gap-2 text-[11px]">
                      <span className={`${RANK_COLORS[rank]} font-medium w-10 shrink-0`}>{RANK_LABELS[rank]}</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        {rows.length === 0 && <span className="text-sect-jade/40 italic">无奖励</span>}
                        {rows.map(({ r, i }) => (
                          editorOpen && isSect ? (
                            <div key={i} className="flex items-center gap-1.5 flex-wrap">
                              <SelectShell>
                                <select
                                  value={r.type}
                                  onChange={e => handleRewardChange(i, 'type', e.target.value)}
                                  className="appearance-none bg-sect-ink/80 text-sect-jade text-[10px] rounded-md px-2 py-1 pr-5 border border-sect-gold/30 outline-none cursor-pointer"
                                >
                                  {REWARD_TYPES.map(t => (
                                    <option key={t} value={t}>{TournamentRewardTypeNames[t]}</option>
                                  ))}
                                </select>
                              </SelectShell>
                              {r.type === 'pill' && (
                                <SelectShell>
                                  <select
                                    value={r.pillType ?? 'foundation_pill'}
                                    onChange={e => handleRewardChange(i, 'pillType', e.target.value)}
                                    className="appearance-none bg-sect-ink/80 text-sect-jade text-[10px] rounded-md px-2 py-1 pr-5 border border-sect-gold/30 outline-none cursor-pointer"
                                  >
                                    {PILL_OPTIONS.map(p => <option key={p} value={p}>{PillTypeNames[p]}</option>)}
                                  </select>
                                </SelectShell>
                              )}
                              {r.type === 'talisman' && (
                                <SelectShell>
                                  <select
                                    value={r.talismanType ?? 'fire_talisman'}
                                    onChange={e => handleRewardChange(i, 'talismanType', e.target.value)}
                                    className="appearance-none bg-sect-ink/80 text-sect-jade text-[10px] rounded-md px-2 py-1 pr-5 border border-sect-gold/30 outline-none cursor-pointer"
                                  >
                                    {TALISMAN_OPTIONS.map(t => <option key={t} value={t}>{TalismanTypeNames[t]}</option>)}
                                  </select>
                                </SelectShell>
                              )}
                              {r.type === 'artifact' && (
                                <SelectShell>
                                  <select
                                    value={r.artifactType ?? 'flying_sword'}
                                    onChange={e => handleRewardChange(i, 'artifactType', e.target.value)}
                                    className="appearance-none bg-sect-ink/80 text-sect-jade text-[10px] rounded-md px-2 py-1 pr-5 border border-sect-gold/30 outline-none cursor-pointer"
                                  >
                                    {ARTIFACT_OPTIONS.map(a => <option key={a} value={a}>{ArtifactTypeNames[a]}</option>)}
                                  </select>
                                </SelectShell>
                              )}
                              <input
                                type="number"
                                min={0}
                                value={r.amount}
                                onChange={e => handleRewardChange(i, 'amount', e.target.value)}
                                className="bg-sect-ink/80 text-sect-jade text-[10px] rounded-md px-2 py-1 border border-sect-gold/30 outline-none w-14 text-center"
                              />
                              <button
                                onClick={() => removeReward(i)}
                                className="text-[10px] text-red-400/80 hover:text-red-300 px-1"
                                title="删除该奖励"
                              >
                                删除
                              </button>
                            </div>
                          ) : (
                            <span key={i} className="text-sect-jade/80">{rewardToText(r)}</span>
                          )
                        ))}
                        {editorOpen && isSect && (
                          <button
                            onClick={() => addReward(rank)}
                            className="text-[10px] text-sect-gold/70 hover:text-sect-gold px-1"
                          >
                            ＋ 添加奖励
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="text-[10px] text-amber-400/60 italic pl-12">
                  {isSect ? '※ 按实际名次发奖，实物奖赏会交给获奖弟子' : '※ 每年奖励随年份自动变化'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 底部：时间信息 + 立即举办 */}
        <div className="flex items-center justify-between pt-2 border-t border-sect-gold/10">
          <div className="text-[10px] text-sect-jade/40 leading-tight">
            <div>{lastYear > 0 ? `上次：第${lastYear}年` : '尚未举办过'}</div>
            {freqConfig.enabled && (
              <div>
                自动：{nextTriggerLabel(activeFreq, lastYear, year, month)}
                {month === TournamentFrequencyMonths[activeFreq] && !inCooldown && '（就是本月）'}
              </div>
            )}
            {participantCount === 0 && <div className="text-amber-400/70">该分组暂无可参赛弟子</div>}
            {noRivals && <div className="text-amber-400/70">天下暂无其他宗门</div>}
          </div>
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              const result = trigger(activeFreq);
              if (result) setPopupResult(result);
            }}
            disabled={!canHold || participantCount === 0}
          >
            <SectIcon name="sword" size={12} strokeWidth={2} />
            <span className="ml-1">
              {!freqConfig.enabled ? '已关闭' : noRivals ? '无对手' : inCooldown ? '冷却中' : '立即举办'}
            </span>
          </Button>
        </div>

        {/* 该频率上次结果 */}
        {lastResult && <TournamentResultView result={lastResult} />}
      </div>

      {/* 历届榜单 */}
      {history.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] text-sect-gold/80 mb-1.5 flex items-center gap-1.5">
            <SectIcon name="trophy" size={12} strokeWidth={1.8} />
            历届榜单
          </div>
          <div className="space-y-1">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-sect-ink-light/20">
                <span className="text-sect-jade/40 shrink-0 tabular-nums">{h.date.year}年{h.date.month}月</span>
                <span className="text-sect-jade/60 shrink-0">{h.divisionName}</span>
                <span className="flex-1 min-w-0 truncate text-sect-jade/80">
                  冠军 {h.champion}（{h.championSect}）
                  {h.ourChampionName && <span className="text-sect-gold/80"> · 本宗夺冠</span>}
                </span>
                <span className={`shrink-0 ${h.ourRank > 0 ? 'text-sect-gold/80' : 'text-sect-jade/40'}`}>
                  {h.ourRank > 0 ? `第${h.ourRank}名` : '未入三甲'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 手动举办后展示本届大比细节弹窗 */}
      <Modal
        isOpen={popupResult !== null}
        onClose={() => setPopupResult(null)}
        title="本届大比战报"
        size="md"
      >
        {popupResult && <TournamentResultView result={popupResult} current />}
      </Modal>
    </Card>
  );
};

const TournamentResultView: React.FC<{ result: TournamentResult; current?: boolean }> = ({ result, current = false }) => {
  const rankText = result.ourRank === 0 ? '未入三甲' : `第${result.ourRank}名`;
  const rankColor = result.ourRank === 1 ? 'text-yellow-400' : result.ourRank === 2 ? 'text-gray-300' : result.ourRank === 3 ? 'text-orange-400' : 'text-sect-jade/50';
  const scopeText = result.scope === 'sect' ? '山门' : '宗门';
  const freqText = result.frequency === 'yearly' ? '年度' : result.frequency === 'every5years' ? '五年' : '十年';
  const sessionLabel = current ? '本届' : '上届';

  return (
    <div className={`p-2.5 rounded-lg bg-sect-ink-light/30 border border-sect-gold/20 ${current ? '' : 'mt-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-display text-xs text-sect-gold flex items-center gap-1.5">
          <SectIcon name="trophy" size={13} strokeWidth={1.8} />
          {sessionLabel}{scopeText}{freqText}战报
        </div>
        <span className="text-[10px] text-sect-jade/50">第{result.date.year}年{result.date.month}月</span>
      </div>

      <div className="flex items-center gap-3 mb-1.5 text-[11px]">
        <span className="text-sect-jade/60">本宗成绩：</span>
        <span className={`font-display font-bold ${rankColor}`}>{rankText}</span>
        {result.ourRank > 0 && (result.ourPodiumName || result.ourChampionName) && (
          <span className="text-sect-jade/70 truncate">· {result.ourPodiumName ?? result.ourChampionName}</span>
        )}
        <span className="text-[10px] text-sect-jade/40 ml-auto">参赛 {result.ourParticipantCount} 人</span>
      </div>

      {/* 三甲 */}
      <div className="flex gap-1.5 mb-1.5">
        {result.topThree.map((f, i) => (
          <div key={i} className={`flex-1 text-center p-1 rounded text-[10px] ${
            f.isOurs ? 'bg-sect-gold/15 border border-sect-gold/40' : 'bg-sect-ink-light/50'
          }`}>
            <div className={RANK_COLORS[(i + 1) as 1 | 2 | 3]}>
              {RANK_LABELS[(i + 1) as 1 | 2 | 3]}
            </div>
            <div className="text-sect-jade truncate">{f.name}</div>
            <div className="text-sect-jade/40 truncate">{f.sectName}</div>
          </div>
        ))}
      </div>

      {/* 奖励 */}
      {result.rewardSummary.length > 0 && (
        <div className="text-[10px] text-green-400 mb-1.5">
          奖励：{result.rewardSummary.join('、')}
        </div>
      )}
      {result.payout && (result.payout.spiritStones > 0 || result.payout.pills > 0 || result.payout.talismans > 0 || result.payout.artifacts > 0) && (
        <div className="text-[10px] text-amber-400/80 mb-1.5">
          实际发放：
          {[
            result.payout.spiritStones > 0 ? `灵石 ${result.payout.spiritStones}` : '',
            result.payout.pills > 0 ? `丹药 ${result.payout.pills}` : '',
            result.payout.talismans > 0 ? `符箓 ${result.payout.talismans}` : '',
            result.payout.artifacts > 0 ? `法器 ${result.payout.artifacts}` : '',
          ].filter(Boolean).join('、')}
        </div>
      )}

      {/* 关键对战 */}
      {result.matches.length > 0 && (
        <details className="text-[10px]">
          <summary className="text-sect-jade/50 cursor-pointer hover:text-sect-jade">关键对战</summary>
          <div className="mt-0.5 space-y-0.5 pl-2">
            {result.matches.map((m, i) => (
              <div key={i} className="text-sect-jade/60 flex items-center justify-between">
                <span>
                  第{m.round}轮：{m.ourName}
                  <span className={m.ourWin ? 'text-green-400' : 'text-red-400'}>
                    {m.ourWin ? ' 胜 ' : ' 负 '}
                  </span>
                  {m.opponentName}（{m.opponentSectName}）
                </span>
                <span className="text-[9px] text-sect-jade/40 font-mono">
                  {m.ourPower.toLocaleString()} vs {m.opponentPower.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
