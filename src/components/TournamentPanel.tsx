import React, { useState } from 'react';
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
  TournamentFrequencyIntervals,
} from '@/types/tournament';
import { getDivisionName } from '@/utils/tournament';
import type { Realm, DiscipleStatus } from '@/types/disciple';
import { RealmOrder, RealmNames, DiscipleStatusNames } from '@/types/disciple';
import type { PillType } from '@/types/pill';
import { PillTypeNames } from '@/types/pill';

interface TournamentPanelProps {
  scope: 'sect' | 'inter-sect';
}

const FREQUENCIES: TournamentFrequency[] = ['yearly', 'every5years', 'every10years'];
const REWARD_TYPES: TournamentRewardType[] = ['contribution', 'spiritStones', 'reputation', 'pill'];
const REALM_DIVISIONS: { kind: 'realm'; value: Realm }[] = RealmOrder.map(r => ({ kind: 'realm', value: r }));
const STATUS_DIVISIONS: { kind: 'status'; value: DiscipleStatus }[] = (['servant', 'outer', 'inner', 'core', 'elder'] as DiscipleStatus[]).map(s => ({ kind: 'status', value: s }));
const ALL_DIVISION: TournamentDivision = { kind: 'all', value: 'all' };
const PILL_OPTIONS: PillType[] = ['foundation_pill', 'golden_pill', 'nascent_pill', 'spirit_pill', 'recovery_pill', 'longevity_pill'];
const RANK_LABELS: Record<1 | 2 | 3, string> = { 1: '冠军', 2: '亚军', 3: '季军' };
const RANK_COLORS: Record<1 | 2 | 3, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-orange-400',
};

// 下次触发年份
function nextTriggerYear(frequency: TournamentFrequency, lastYear: number, currentYear: number): number {
  const interval = TournamentFrequencyIntervals[frequency];
  if (lastYear > 0) {
    const next = lastYear + interval;
    return next > currentYear ? next : currentYear;
  }
  return currentYear;
}

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
  const { disciples, otherSects, year, month } = store;

  const [rewardEditorsOpen, setRewardEditorsOpen] = useState<Record<TournamentFrequency, boolean>>({
    yearly: false, every5years: false, every10years: false,
  });
  // 手动举办后展示的弹窗结果
  const [popupResult, setPopupResult] = useState<TournamentResult | null>(null);

  const toggleEditor = (f: TournamentFrequency) => setRewardEditorsOpen(prev => ({
    ...prev, [f]: !prev[f],
  }));

  const title = isSect ? '山门大比' : '宗门大比';
  const desc = isSect
    ? '本宗弟子间的内部比武。年度、五年、十年大比可同时开启，各自独立配置分组与奖励。'
    : '与天下其他宗门弟子同台竞技。三种频率可同时开启，各自独立配置分组与奖励。';

  // 统计某分组下的参赛人数
  const getParticipantCount = (division: TournamentDivision) => {
    if (division.kind === 'all') return disciples.length;
    if (division.kind === 'realm') return disciples.filter(d => d.realm === division.value).length;
    return disciples.filter(d => d.status === division.value).length;
  };

  return (
    <Card>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <SectIcon name="battle" size={20} strokeWidth={1.8} className="text-sect-gold" />
        <h2 className="font-display text-lg text-gold-gradient">{title}</h2>
      </div>
      <p className="text-sect-jade/50 text-xs mb-5 leading-relaxed">{desc}</p>

      <div className="space-y-5">
        {FREQUENCIES.map(freq => {
          const freqConfig = config[freq];
          const lastResult = results[freq];
          const lastYear = lastYears[freq];
          const participantCount = getParticipantCount(freqConfig.division);
          const editorOpen = rewardEditorsOpen[freq];
          // CD 判断：与 shouldTournamentTrigger 逻辑一致
          const interval = TournamentFrequencyIntervals[freq];
          const inCooldown = freqConfig.enabled && lastYear > 0 && (year - lastYear < interval);

          const handleToggleEnabled = () => {
            updateFreqConfig(freq, { enabled: !freqConfig.enabled });
          };

          const handleDivisionChange = (division: TournamentDivision) => {
            updateFreqConfig(freq, { division });
          };

          const handleRewardChange = (rank: 1 | 2 | 3, field: 'type' | 'amount' | 'pillType', value: string | number) => {
            const existing = freqConfig.rewards.find(r => r.rank === rank);
            let newReward: TournamentReward;
            if (field === 'type') {
              const type = value as TournamentRewardType;
              newReward = {
                rank,
                type,
                amount: existing?.amount ?? 100,
                pillType: type === 'pill' ? (existing?.pillType ?? 'foundation_pill') : undefined,
              };
            } else if (field === 'amount') {
              newReward = {
                ...(existing ?? { rank, type: 'contribution' as TournamentRewardType }),
                amount: Number(value) || 0,
              } as TournamentReward;
            } else {
              newReward = {
                ...(existing ?? { rank, type: 'pill' as TournamentRewardType, amount: 1 }),
                pillType: value as PillType,
              } as TournamentReward;
            }
            // 合并：覆盖同名次项
            const newRewards = freqConfig.rewards.filter(r => r.rank !== rank);
            if (newReward.amount > 0) newRewards.push(newReward);
            updateFreqConfig(freq, { rewards: newRewards });
          };

          return (
            <div
              key={freq}
              className={`p-3 rounded-lg border transition-all ${
                freqConfig.enabled
                  ? 'border-sect-gold/40 bg-sect-gold/5'
                  : 'border-sect-jade/15 bg-sect-ink-light/20'
              }`}
            >
              {/* 频率标题 + 开关 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SectIcon name="nextMonth" size={15} strokeWidth={1.8} className="text-sect-gold/80" />
                  <span className="font-display text-sm text-sect-gold">
                    {TournamentFrequencyNames[freq]}
                  </span>
                  <Badge variant={freqConfig.enabled ? 'gold' : 'default'} size="sm">
                    {freqConfig.enabled ? '已开启' : '已关闭'}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleEnabled}>
                  {freqConfig.enabled ? '关闭' : '开启'}
                </Button>
              </div>

              <div className="space-y-3">
                {/* 比拼分组 */}
                <div>
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
                  <div className="text-[10px] text-sect-jade/40 mt-0.5">
                    「{getDivisionName(freqConfig.division)}」· 本宗可参赛 {participantCount} 人
                    {!isSect && ` · 对手宗门 ${otherSects.length} 个`}
                  </div>
                </div>

                {/* 奖励配置 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] text-sect-jade/60 flex items-center gap-1.5">
                      <SectIcon name="trophy" size={12} strokeWidth={1.8} className="text-sect-gold/70" />
                      获胜奖励
                    </div>
                    <button
                      disabled={!freqConfig.enabled}
                      onClick={() => toggleEditor(freq)}
                      className={`text-[11px] text-sect-gold/80 hover:text-sect-gold ${!freqConfig.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {editorOpen ? '收起' : '编辑'}
                    </button>
                  </div>

                  {!editorOpen ? (
                    <div className="space-y-0.5">
                      {([1, 2, 3] as const).map(rank => {
                        const rewardList = freqConfig.rewards.filter(r => r.rank === rank);
                        return (
                          <div key={rank} className="flex items-start gap-2 text-[11px]">
                            <span className={`${RANK_COLORS[rank]} font-medium w-10 shrink-0`}>{RANK_LABELS[rank]}</span>
                            {rewardList.length > 0 ? (
                              <span className="text-sect-jade/80 leading-relaxed">
                                {rewardList.map(r => (
                                  r.type === 'pill'
                                    ? `${PillTypeNames[r.pillType as PillType] ?? '丹药'} ×${r.amount}`
                                    : `${TournamentRewardTypeNames[r.type]} +${r.amount}`
                                )).join('、')}
                              </span>
                            ) : (
                              <span className="text-sect-jade/40 italic">无奖励</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-2 rounded bg-sect-ink-light/30 border border-sect-gold/15">
                      {([1, 2, 3] as const).map(rank => {
                        const list = freqConfig.rewards.filter(r => r.rank === rank);
                        // 为每个名次显示 2 个槽位：基础 + 额外
                        const slots = list.length === 0 ? [null] : list;
                        return (
                          <div key={rank} className="space-y-1">
                            <div className={`${RANK_COLORS[rank]} text-[11px] font-medium`}>{RANK_LABELS[rank]}</div>
                            {slots.map((_r, i) => {
                              const reward = list[i];
                              const key = `${rank}-${i}`;
                              // 对于超过已有数量的新 slot 提供添加按钮
                              if (!reward && i === 0) {
                                // 空槽位：展示添加器
                                return (
                                  <div key={key} className="flex items-center gap-1.5 flex-wrap pl-2">
                                    <select
                                      value="contribution"
                                      onChange={e => handleRewardChange(rank, 'type', e.target.value)}
                                      className="bg-sect-ink text-sect-jade text-[10px] rounded px-1 py-0 border border-sect-gold/30"
                                    >
                                      {REWARD_TYPES.map(t => (
                                        <option key={t} value={t}>{TournamentRewardTypeNames[t]}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min={0}
                                      value={0}
                                      onChange={e => handleRewardChange(rank, 'amount', e.target.value)}
                                      placeholder="数量"
                                      className="bg-sect-ink text-sect-jade text-[10px] rounded px-1 py-0 border border-sect-gold/30 w-12"
                                    />
                                  </div>
                                );
                              }
                              if (!reward) return null;
                              return (
                                <div key={key} className="flex items-center gap-1.5 flex-wrap pl-2">
                                  <select
                                    value={reward.type}
                                    onChange={e => handleRewardChange(rank, 'type', e.target.value)}
                                    className="bg-sect-ink text-sect-jade text-[10px] rounded px-1 py-0 border border-sect-gold/30"
                                  >
                                    {REWARD_TYPES.map(t => (
                                      <option key={t} value={t}>{TournamentRewardTypeNames[t]}</option>
                                    ))}
                                  </select>
                                  {reward.type === 'pill' && (
                                    <select
                                      value={reward.pillType ?? 'foundation_pill'}
                                      onChange={e => handleRewardChange(rank, 'pillType', e.target.value)}
                                      className="bg-sect-ink text-sect-jade text-[10px] rounded px-1 py-0 border border-sect-gold/30"
                                    >
                                      {PILL_OPTIONS.map(p => (
                                        <option key={p} value={p}>{PillTypeNames[p]}</option>
                                      ))}
                                    </select>
                                  )}
                                  <input
                                    type="number"
                                    min={0}
                                    value={reward.amount}
                                    onChange={e => handleRewardChange(rank, 'amount', e.target.value)}
                                    className="bg-sect-ink text-sect-jade text-[10px] rounded px-1 py-0 border border-sect-gold/30 w-12"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 底部：时间信息 + 立即举办 */}
                <div className="flex items-center justify-between pt-2 border-t border-sect-gold/10">
                  <div className="text-[10px] text-sect-jade/40 leading-tight">
                    <div>{lastYear > 0 ? `上次：第${lastYear}年` : '尚未举办过'}</div>
                    {freqConfig.enabled && (
                      <div>
                        {inCooldown
                          ? `冷却中：第${nextTriggerYear(freq, lastYear, year)}年正月可再次举办`
                          : `下次自动：第${nextTriggerYear(freq, lastYear, year)}年正月`}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      const result = trigger(freq);
                      if (result) {
                        setPopupResult(result);
                      }
                    }}
                    disabled={participantCount === 0 || !freqConfig.enabled || inCooldown}
                  >
                    <SectIcon name="sword" size={12} strokeWidth={2} />
                    <span className="ml-1">{inCooldown ? '冷却中' : '立即举办'}</span>
                  </Button>
                </div>

                {/* 该频率上次结果 */}
                {lastResult && (
                  <TournamentResultView result={lastResult} />
                )}
              </div>
            </div>
          );
        })}
      </div>

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
        {result.ourChampionName && (
          <span className="text-sect-jade/70 truncate">· {result.ourChampionName}</span>
        )}
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

      {/* 关键对战 */}
      {result.matches.length > 0 && (
        <details className="text-[10px]">
          <summary className="text-sect-jade/50 cursor-pointer hover:text-sect-jade">关键对战</summary>
          <div className="mt-0.5 space-y-0.5 pl-2">
            {result.matches.map((m, i) => (
              <div key={i} className="text-sect-jade/60">
                第{m.round}轮：{m.ourName}
                <span className={m.ourWin ? 'text-green-400' : 'text-red-400'}>
                  {m.ourWin ? ' 胜 ' : ' 负 '}
                </span>
                {m.opponentName}（{m.opponentSectName}）
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
