import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { calculateSectCombatPower, calculateDiscipleCombatPower, calculateBuildingMaintenance, calculateBuildingOutput } from '@/utils/gameLogic';
import {
  SectLevelNames, SectLevelDescriptions, SectLevelOrder,
  SectLevelRequirementsMap, SectSchoolNames, SectSchoolDescriptions,
  SCHOOL_TALENT_TREES, CalamityTypeNames,
} from '@/types/game';
import type { SectHistoryEntry, SectSchool } from '@/types/game';
import { BuildingTypeNames } from '@/types/building';

const HISTORY_TYPE_STYLES: Record<SectHistoryEntry['type'], { icon: string; color: string }> = {
  building_upgrade: { icon: '▲', color: 'text-blue-400' },
  sect_promote: { icon: '★', color: 'text-amber-400' },
  war_victory: { icon: '✦', color: 'text-green-400' },
  war_defeat: { icon: '✖', color: 'text-red-400' },
  disciple_death: { icon: '☼', color: 'text-stone-400' },
  disciple_defect: { icon: '⚠', color: 'text-orange-500' },
  building_event: { icon: '◇', color: 'text-cyan-400' },
  disciple_choice: { icon: '◆', color: 'text-amber-300' },
};

export const OverviewPanel: React.FC = () => {
  const {
    year, month, sectLevel, reputation, spiritStones,
    disciples, buildings, nextMonth,
    canPromoteSect, promoteSect,
    sectHistory,
    sectSchool, unlockedTalents, selectSchool, unlockTalent,
    sectFortune, activeCalamity, calamityWarnings,
    priceMultipliers,
    expansionCount, expandSect, distributeWelfare,
  } = useGameStore();

  const { canPromote, nextLevel, reasons } = canPromoteSect();
  const currentLevelIndex = SectLevelOrder.indexOf(sectLevel);
  const nextLevelReq = nextLevel ? SectLevelRequirementsMap[nextLevel] : null;

  const sectCombatPowerResult = calculateSectCombatPower(disciples, buildings);
  const sectCombatPower = sectCombatPowerResult.totalPower;
  const activeBuildings = buildings.filter(b => b.status === 'active').length;

  const servantCount = disciples.filter(d => d.status === 'servant').length;
  const outerCount = disciples.filter(d => d.status === 'outer').length;
  const innerCount = disciples.filter(d => d.status === 'inner').length;
  const coreCount = disciples.filter(d => d.status === 'core').length;
  const elderCount = disciples.filter(d => d.status === 'elder').length;

  const DISCIPLE_MAINTENANCE_COST: Record<string, number> = {
    servant: 2,
    outer: 2,
    inner: 4,
    core: 6,
    elder: 10,
  };
  const discipleMaintenance = disciples.reduce(
    (sum, d) => sum + (DISCIPLE_MAINTENANCE_COST[d.status] || 0),
    0,
  );

  const totalMaintenance = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    return sum + calculateBuildingMaintenance(b);
  }, 0) + discipleMaintenance;

  const totalOutput = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    const assigned = disciples.filter(d => b.assignedDisciples.includes(d.id));
    return sum + calculateBuildingOutput(b, assigned).spiritStones;
  }, 0);

  const netIncome = totalOutput - totalMaintenance;

  const RequirementBar: React.FC<{
    label: string;
    current: number;
    required: number;
    icon?: React.ReactNode;
    color: string;
  }> = ({ label, current, required, icon, color }) => {
    const pct = required > 0 ? Math.min(100, (current / required) * 100) : 100;
    const met = current >= required;
    const displayText = required === 1 ? (met ? '✓' : '✗') : `${Math.floor(current)} / ${required}`;
    return (
      <div className="flex items-center gap-3">
        <div className="w-20 flex-shrink-0 text-xs text-[var(--ink-300)] flex items-center gap-1">
          {icon}{label}
        </div>
        <div className="flex-1 h-2.5 bg-[var(--ink-dark)] rounded-full overflow-hidden border border-[var(--gold-dark)]/20">
          <div
            className={`h-full rounded-full transition-all duration-500 ${met ? 'bg-green-500/80' : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={`w-24 flex-shrink-0 text-right text-xs font-mono ${met ? 'text-green-400' : 'text-red-400'}`}>
          {displayText}
        </div>
        <div className={`w-5 flex-shrink-0 text-center text-sm ${met ? 'text-green-400' : 'text-red-400'}`}>
          {met ? '✓' : '✗'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 宗门等级 */}
      <div className="scroll-title">
        <span className="text-lg">宗</span>
        <span>宗门等级</span>
        <span className="seal-badge ml-2">{SectLevelNames[sectLevel]}</span>
      </div>
      <div className="p-3">
        <p className="text-sm text-[var(--ink-300)] italic mb-3">{SectLevelDescriptions[sectLevel]}</p>

        {nextLevel && nextLevelReq ? (
          <div className="scroll-panel-dark p-4">
            {/* 下一阶段标题 */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-[var(--gold-200)] font-display">
                <span className="text-[var(--jade-light)] mr-1">→</span>
                下一阶段：{SectLevelNames[nextLevel]}
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full border ${canPromote ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                {canPromote ? '条件达成' : '条件未达成'}
              </div>
            </div>

            {/* 需求进度条 */}
            <div className="space-y-2.5">
              <RequirementBar
                label="声望"
                current={reputation}
                required={nextLevelReq.reputation}
                color="bg-amber-500/70"
              />
              <RequirementBar
                label="灵石"
                current={spiritStones}
                required={nextLevelReq.spiritStones}
                color="bg-cyan-500/70"
              />
              {nextLevelReq.discipleCount && (
                <RequirementBar
                  label="弟子数"
                  current={disciples.length}
                  required={nextLevelReq.discipleCount}
                  color="bg-violet-500/70"
                />
              )}
              {nextLevelReq.elderCount !== undefined && (
                <RequirementBar
                  label="长老数"
                  current={elderCount}
                  required={nextLevelReq.elderCount}
                  color="bg-rose-500/70"
                />
              )}
              {nextLevelReq.level2Buildings && (
                <RequirementBar
                  label="Lv2建筑"
                  current={buildings.filter(b => b.level >= 2 && b.status === 'active').length}
                  required={nextLevelReq.level2Buildings}
                  color="bg-blue-500/70"
                />
              )}
              {nextLevelReq.level3Buildings && (
                <RequirementBar
                  label="Lv3建筑"
                  current={buildings.filter(b => b.level >= 3 && b.status === 'active').length}
                  required={nextLevelReq.level3Buildings}
                  color="bg-indigo-500/70"
                />
              )}
              {nextLevelReq.allLevel2 && (
                <RequirementBar
                  label="全建筑Lv2"
                  current={buildings.filter(b => b.status === 'active').every(b => b.level >= 2) ? 1 : 0}
                  required={1}
                  color="bg-blue-500/70"
                />
              )}
              {nextLevelReq.goldenDisciple && (
                <RequirementBar
                  label="金丹期弟子"
                  current={disciples.some(d => d.realm === 'golden' || d.realm === 'nascent' || d.realm === 'spirit') ? 1 : 0}
                  required={1}
                  color="bg-amber-500/70"
                />
              )}
              {nextLevelReq.nascentDisciple && (
                <RequirementBar
                  label="元婴期弟子"
                  current={disciples.some(d => d.realm === 'nascent' || d.realm === 'spirit') ? 1 : 0}
                  required={1}
                  color="bg-purple-500/70"
                />
              )}
              {nextLevelReq.spiritDisciple && (
                <RequirementBar
                  label="化神期弟子"
                  current={disciples.some(d => d.realm === 'spirit') ? 1 : 0}
                  required={1}
                  color="bg-emerald-500/70"
                />
              )}
            </div>

            {/* 未达成原因 */}
            {!canPromote && reasons.length > 0 && (
              <div className="mt-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="text-[10px] text-red-400 mb-1 flex items-center gap-1">
                  <span>⚠</span> 缺少以下条件：
                </div>
                <div className="flex flex-wrap gap-1">
                  {reasons.map((reason, idx) => (
                    <span key={idx} className="text-[10px] text-red-300 bg-red-500/10 px-2 py-0.5 rounded">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 消耗与晋升按钮 */}
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[var(--gold-dark)]/20">
              <div className="text-xs text-[var(--ink-400)]">
                <span className="text-[var(--ink-300)]">晋升消耗：</span>
                <span className="text-amber-400">{nextLevelReq.promotionCost} 灵石</span>
              </div>
              <button
                className={`btn-ink text-sm px-4 py-1.5 ${canPromote ? '' : 'opacity-50 cursor-not-allowed'}`}
                disabled={!canPromote}
                onClick={promoteSect}
              >
                {canPromote ? '晋升宗门' : '条件未达成'}
              </button>
            </div>
          </div>
        ) : (
          <div className="scroll-panel-dark p-4 text-center text-sm text-[var(--gold-300)]">
            已达宗门最高等级
          </div>
        )}
      </div>

      {/* 宗门传承 */}
      <div className="scroll-title">
        <span className="text-lg">承</span>
        <span>宗门传承</span>
      </div>
      <div className="p-3">
        {!sectSchool ? (
          <div className="scroll-panel-dark p-3">
            <div className="text-xs text-sect-jade/60 mb-2">选择宗门流派（首次晋升时解锁）</div>
            <div className="grid grid-cols-2 gap-2">
              {(['sword', 'pill', 'array', 'artifact', 'balance'] as SectSchool[]).map(school => (
                <button
                  key={school}
                  className="p-2 rounded bg-sect-ink-light/50 hover:bg-sect-ink-light/80 text-left transition-colors border border-transparent hover:border-sect-gold/30"
                  onClick={() => selectSchool(school)}
                >
                  <div className="text-xs font-medium text-sect-gold">{SectSchoolNames[school]}</div>
                  <div className="text-[10px] text-sect-jade/60 mt-0.5 leading-relaxed">{SectSchoolDescriptions[school]}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="scroll-panel-dark p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-sect-gold">{SectSchoolNames[sectSchool]}</span>
              <span className="text-[10px] text-sect-jade/60">{SectSchoolDescriptions[sectSchool]}</span>
            </div>
            {/* 天赋树 */}
            <div className="text-xs text-sect-jade/60 mb-2">天赋树</div>
            <div className="grid grid-cols-2 gap-2">
              {SCHOOL_TALENT_TREES[sectSchool].map(talent => {
                const isUnlocked = unlockedTalents.includes(talent.id);
                const canUnlock = !isUnlocked && talent.prerequisites.every(p => unlockedTalents.includes(p));
                return (
                  <div key={talent.id} className={`p-2 rounded text-xs ${isUnlocked ? 'bg-green-500/10 border border-green-500/30' : canUnlock ? 'bg-sect-ink-light/50 border border-sect-gold/20 cursor-pointer hover:bg-sect-ink-light/80' : 'bg-sect-ink-light/30 opacity-50'}`}
                    onClick={() => canUnlock && unlockTalent(talent.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isUnlocked ? 'text-green-400' : 'text-sect-jade'}`}>{talent.name}</span>
                      {isUnlocked && <span className="text-green-400">✓</span>}
                    </div>
                    <div className="text-sect-jade/50 mt-0.5">{talent.description}</div>
                    {canUnlock && talent.spiritStoneCost > 0 && (
                      <div className="text-amber-400/70 mt-1">消耗 灵石{talent.spiritStoneCost}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 经济概览 */}
      <div className="scroll-title">
        <span className="text-lg">财</span>
        <span>经济概览</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="scroll-panel-dark p-3 text-center">
            <div className="text-xs text-[var(--ink-400)]">月收入</div>
            <div className="font-display text-lg text-green-400">+{totalOutput}</div>
          </div>
          <div className="scroll-panel-dark p-3 text-center">
            <div className="text-xs text-[var(--ink-400)]">月支出</div>
            <div className="font-display text-lg text-red-400">-{totalMaintenance}</div>
          </div>
        </div>
        <div className={`text-center font-display text-lg mt-3 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          月净收益 {netIncome >= 0 ? '+' : ''}{netIncome}
        </div>
      </div>

      {/* 宗门气运 + 物价波动 */}
      <div className="scroll-title">
        <span className="text-lg">运</span>
        <span>宗门气运 & 物价</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="scroll-panel-dark p-3">
            <div className="text-xs text-sect-jade/60 mb-1">宗门气运</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-sect-ink-light rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${(sectFortune + 100) / 2}%`,
                  background: sectFortune > 0 ? 'linear-gradient(90deg, #84cc16, #22c55e)' : 'linear-gradient(90deg, #ef4444, #f97316)',
                }} />
              </div>
              <span className={`text-xs font-mono ${sectFortune > 0 ? 'text-green-400' : sectFortune < 0 ? 'text-red-400' : 'text-sect-jade/60'}`}>
                {sectFortune > 0 ? '+' : ''}{Math.round(sectFortune)}
              </span>
            </div>
            {activeCalamity && (
              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                <div className="text-[10px] text-red-400 font-medium">{CalamityTypeNames[activeCalamity.type]}</div>
                <div className="text-[10px] text-sect-jade/60">{activeCalamity.description}</div>
              </div>
            )}
            {calamityWarnings.length > 0 && (
              <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <div className="text-[10px] text-amber-400 font-medium">天灾预警</div>
                <div className="text-[10px] text-sect-jade/60">{calamityWarnings[0].warningDescription}</div>
              </div>
            )}
          </div>
          <div className="scroll-panel-dark p-3">
            <div className="text-xs text-sect-jade/60 mb-1">物价波动</div>
            <div className="text-[10px] text-sect-jade/50">
              {Object.keys(priceMultipliers).length === 0 ? (
                <span>暂无数据</span>
              ) : (
                <div className="space-y-1">
                  {Object.entries(priceMultipliers).slice(0, 6).map(([id, mult]) => (
                    <div key={id} className="flex justify-between">
                      <span className="text-sect-jade/60">{id.replace(/^material:/, '').replace(/^product:/, '')}</span>
                      <span className={mult > 1 ? 'text-red-400' : mult < 1 ? 'text-green-400' : 'text-sect-jade/60'}>
                        {mult > 1 ? `+${Math.round((mult - 1) * 100)}%` : mult < 1 ? `${Math.round((mult - 1) * 100)}%` : '基准价'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 宗门扩张与福利 */}
      <div className="scroll-title">
        <span className="text-lg">扩</span>
        <span>宗门扩张 & 福利</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="scroll-panel-dark p-3">
            <div className="text-xs text-sect-jade/60 mb-1">宗门扩张</div>
            <div className="text-[10px] text-sect-jade/50 mb-1">已扩张 {expansionCount} 次，下次需 {500 + expansionCount * 300} 灵石</div>
            <div className="text-[10px] text-emerald-400/80 mb-2">当前加成：全局产出 +{expansionCount * 5}%</div>
            <button
              className="btn-ink text-xs px-3 py-1 w-full"
              onClick={() => {
                const result = expandSect();
                if (!result.ok) alert(result.reason);
              }}
            >
              扩张宗门（{500 + expansionCount * 300}灵石）
            </button>
          </div>
          <div className="scroll-panel-dark p-3">
            <div className="text-xs text-sect-jade/60 mb-1">弟子福利</div>
            <div className="text-[10px] text-sect-jade/50 mb-2">发放福利提升全体弟子满意度</div>
            <div className="flex gap-1">
              {[1, 2, 3].map(level => (
                <button
                  key={level}
                  className="btn-ink text-[10px] px-2 py-1 flex-1"
                  onClick={() => {
                    const result = distributeWelfare(level);
                    if (!result.ok) alert(result.reason);
                  }}
                >
                  {level === 1 ? '普通' : level === 2 ? '丰厚' : '优厚'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 弟子分布 */}
      <div className="scroll-title">
        <span className="text-lg">众</span>
        <span>弟子分布</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--jade-light)]">{outerCount}</div>
            <div className="text-xs text-[var(--ink-400)]">外门</div>
          </div>
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--gold-300)]">{innerCount}</div>
            <div className="text-xs text-[var(--ink-400)]">内门</div>
          </div>
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--violet)]">{coreCount}</div>
            <div className="text-xs text-[var(--ink-400)]">核心</div>
          </div>
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--ink-300)]">{servantCount}</div>
            <div className="text-xs text-[var(--ink-400)]">杂役</div>
          </div>
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--cinnabar)]">{elderCount}</div>
            <div className="text-xs text-[var(--ink-400)]">长老</div>
          </div>
          <div className="scroll-panel-dark p-2">
            <div className="text-[var(--gold-200)]">{Math.floor(sectCombatPower).toLocaleString()}</div>
            <div className="text-xs text-[var(--ink-400)]">总战力</div>
          </div>
        </div>
      </div>

      {/* 宗门历史 */}
      <div className="scroll-title">
        <span className="text-lg">史</span>
        <span>宗门历史</span>
      </div>
      <div className="p-3">
        {sectHistory.length === 0 ? (
          <div className="scroll-panel-dark p-4 text-center text-sm text-[var(--ink-400)]">
            暂无历史记录
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sectHistory.slice(0, 50).map(entry => {
              const style = HISTORY_TYPE_STYLES[entry.type];
              return (
                <div key={entry.id} className="scroll-panel-dark p-2.5 flex gap-2.5">
                  <div className={`flex-shrink-0 text-sm ${style.color} mt-0.5`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--ink-200)]">{entry.title}</span>
                      <span className="text-[10px] text-[var(--ink-400)] flex-shrink-0">
                        第{entry.date.year}年{entry.date.month}月
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-300)] mt-1 leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
