import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { calculateSectCombatPower, calculateDiscipleCombatPower, calculateBuildingMaintenance, calculateBuildingOutput, getSchoolTalentBonuses, calculateMonthlyReputationGrowth, getBuildingEffectMultiplier } from '@/utils/gameLogic';
import {
  SectLevelNames, SectLevelDescriptions, SectLevelReputationCap,
  SectLevelRequirementsMap, SectSchoolNames, SectSchoolDescriptions,
  SCHOOL_TALENT_TREES, CalamityTypeNames,
} from '@/types/game';
import type { SectHistoryEntry, SectSchool } from '@/types/game';
import { BuildingTypeNames } from '@/types/building';
import { computeDiscipleStipend } from '@/domain/balance';

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
    month, sectLevel, reputation, spiritStones,
    disciples, buildings, nextMonth,
    canPromoteSect, promoteSect,
    sectHistory,
    sectSchool, unlockedTalents, selectSchool, unlockTalent,
    sectFortune, activeCalamity, calamityWarnings, activeEffects,
    priceMultipliers,
    expansionCount,
    otherSects,
  } = useGameStore();

  const { canPromote, nextLevel } = canPromoteSect();
  const nextLevelReq = nextLevel ? SectLevelRequirementsMap[nextLevel] : null;

  // 与月末结算同一口径：流派战力加成 + 阵堂/山门/通天塔
  const schoolBonuses = getSchoolTalentBonuses(sectSchool, unlockedTalents);
  const sectCombatPowerResult = calculateSectCombatPower(disciples, buildings, schoolBonuses);
  const sectCombatPower = sectCombatPowerResult.totalPower;
  // 声望：当前等级上限、每月自然增长（与月末结算同一公式）、距下一阶段差额
  const reputationCap = SectLevelReputationCap[sectLevel];
  const repGrowth = calculateMonthlyReputationGrowth(disciples, sectCombatPower);
  const repGap = nextLevelReq ? Math.max(0, nextLevelReq.reputation - reputation) : 0;
  const repAtCap = reputation >= reputationCap;
  const activeBuildings = buildings.filter(b => b.status === 'active').length;

  const servantCount = disciples.filter(d => d.status === 'servant').length;
  const outerCount = disciples.filter(d => d.status === 'outer').length;
  const innerCount = disciples.filter(d => d.status === 'inner').length;
  const coreCount = disciples.filter(d => d.status === 'core').length;
  const elderCount = disciples.filter(d => d.status === 'elder').length;

  // 弟子月俸：与结算一致（汇总后按 1/3 折算取整）
  const discipleMaintenance = computeDiscipleStipend(disciples);

  // 交易中的宗门每月扣 10 灵石维护费
  const tradeMaintenance = otherSects.filter(s => s.tradeActive).length * 10;

  const totalMaintenance = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    return sum + calculateBuildingMaintenance(b);
  }, 0) + discipleMaintenance + tradeMaintenance;

  // 建筑灵石产出 × 流派加成，再乘宗门扩张加成（每扩张一次 +5%）
  const ssMul = 1 + (schoolBonuses.spiritStoneOutputBonus || 0) / 100;
  const expansionMul = 1 + expansionCount * 0.05;
  const buildingIncome = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    const assigned = disciples.filter(d => b.assignedDisciples.includes(d.id));
    const effectMul = getBuildingEffectMultiplier(activeEffects, b.type);
    return sum + Math.floor(calculateBuildingOutput(b, assigned).spiritStones * ssMul * effectMul);
  }, 0);

  // 附庸上贡：好感≥30 的附庸按「战力×5%×好感%」上贡（与结算一致）
  const tribute = otherSects
    .filter(s => s.diplomaticStatus === 'vassal' && (s.favorability ?? 50) >= 30)
    .reduce((sum, s) => sum + Math.floor(s.combatPower * 0.05 * ((s.favorability ?? 50) / 100)), 0);

  const totalOutput = Math.floor(buildingIncome * expansionMul) + tribute;

  const netIncome = totalOutput - totalMaintenance;

  // 当前天灾的持续效果剩余月数（到期后自动解除天灾状态）
  const calamityRemaining = activeCalamity
    ? activeEffects.find(e => e.sourceId === activeCalamity.id)?.remainingMonths ?? 0
    : 0;

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
    <div className="panel-sheet">
      <div className="overview-grid">
        <div className="overview-col">
          <div className="overview-col-title">宗门状态</div>
      {/* 宗门等级 */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          宗门等级
          <span className="seal-badge ml-1">{SectLevelNames[sectLevel]}</span>
        </h3>
        <p className="text-sm text-[var(--ink-300)] italic mb-3">{SectLevelDescriptions[sectLevel]}</p>

        {nextLevel && nextLevelReq ? (
          <div className="pt-1">
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[var(--ink-400)] -mt-1 pl-1">
                <span>自然增长 <span className="text-green-400 font-mono">+{repGrowth}/月</span></span>
                <span>本级上限 <span className="text-amber-400 font-mono">{reputationCap}</span></span>
                {repAtCap ? (
                  <span className="text-red-400">已达上限，需晋升才能继续增长</span>
                ) : repGap > 0 ? (
                  <span>距下一阶段还需 <span className="text-amber-400 font-mono">{repGap}</span></span>
                ) : (
                  <span className="text-green-400">下一阶段声望已达标</span>
                )}
              </div>
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

            {/* 消耗与晋升按钮 */}
            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-[rgba(212,168,87,0.12)]">
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
          <div className="py-4 text-center text-sm text-[var(--gold-300)]">
            已达宗门最高等级
            <div className="text-[10px] text-[var(--ink-400)] mt-1.5 font-normal">
              声望 {Math.floor(reputation)} / {reputationCap} · 自然增长 <span className="text-green-400 font-mono">+{repGrowth}/月</span>
            </div>
          </div>
        )}
      </section>

      {/* 宗门传承 */}
      <section className="panel-section">
        <h3 className="panel-section-title">宗门传承</h3>
        {!sectSchool ? (
          <div>
            <div className="text-[11px] text-[var(--ink-400)] mb-1">选择宗门流派（首次晋升时解锁）</div>
            {(['sword', 'pill', 'array', 'artifact', 'balance'] as SectSchool[]).map(school => (
              <button
                key={school}
                className="group flex w-full items-start gap-2.5 py-2 text-left border-b border-[rgba(212,168,87,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                onClick={() => selectSchool(school)}
              >
                <span className="mt-0.5 w-3 text-center text-[10px] text-[var(--gold-400)]/60">◇</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-[var(--gold-200)]">{SectSchoolNames[school]}</span>
                  <span className="block text-[10px] text-[var(--ink-400)] mt-0.5 leading-relaxed">{SectSchoolDescriptions[school]}</span>
                </span>
                <span className="flex-shrink-0 text-[10px] text-[var(--gold-300)] opacity-0 group-hover:opacity-100">选择</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-[var(--gold-200)]">{SectSchoolNames[sectSchool]}</span>
              <span className="text-[10px] text-[var(--ink-400)]">{SectSchoolDescriptions[sectSchool]}</span>
            </div>
            {/* 天赋树 */}
            <div className="text-[10px] text-[var(--ink-400)] mt-2">天赋树</div>
            {SCHOOL_TALENT_TREES[sectSchool].map(talent => {
              const isUnlocked = unlockedTalents.includes(talent.id);
              const canUnlock = !isUnlocked && talent.prerequisites.every(p => unlockedTalents.includes(p));
              return (
                <div
                  key={talent.id}
                  className={`flex items-start gap-2.5 py-2 border-b border-[rgba(212,168,87,0.06)] last:border-0 ${
                    canUnlock ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.02)]' : ''
                  } ${!isUnlocked && !canUnlock ? 'opacity-45' : ''}`}
                  onClick={() => canUnlock && unlockTalent(talent.id)}
                >
                  <span className={`mt-0.5 w-3 text-center text-[10px] ${isUnlocked ? 'text-green-400' : 'text-[var(--gold-400)]/60'}`}>
                    {isUnlocked ? '✓' : '◇'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-xs ${isUnlocked ? 'text-green-400' : 'text-[var(--ink-100)]'}`}>{talent.name}</span>
                    <span className="block text-[10px] text-[var(--ink-400)] mt-0.5 leading-relaxed">{talent.description}</span>
                  </span>
                  {canUnlock && talent.spiritStoneCost > 0 && (
                    <span className="flex-shrink-0 text-[10px] font-mono text-amber-400/80">{talent.spiritStoneCost} 灵石</span>
                  )}
                  {isUnlocked && <span className="flex-shrink-0 text-[10px] text-green-400/70">已习得</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 宗门气运 */}
      <section className="panel-section">
        <h3 className="panel-section-title">宗门气运</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)]">
            <div className="h-full rounded-full transition-all" style={{
              width: `${(sectFortune + 100) / 2}%`,
              background: sectFortune > 0 ? 'linear-gradient(90deg, #84cc16, #22c55e)' : 'linear-gradient(90deg, #ef4444, #f97316)',
            }} />
          </div>
          <span className={`text-sm font-mono ${sectFortune > 0 ? 'text-green-400' : sectFortune < 0 ? 'text-red-400' : 'text-[var(--ink-300)]'}`}>
            {sectFortune > 0 ? '+' : ''}{Math.round(sectFortune)}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-400)]">
          气运影响宗门吉凶——气运高时天灾概率降低，并可能触发正面机遇；气运低时天灾频发，需提前防备。
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--ink-500)]">
          行善、大比夺冠、晋升可提升气运；作恶、弟子叛逃或寿终会降低气运
        </p>
        {activeCalamity && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/25">
            <div className="text-[10px] text-red-400 font-medium">
              {CalamityTypeNames[activeCalamity.type]}
              {calamityRemaining > 0 && <span className="text-red-300/70 ml-1">（剩 {calamityRemaining} 月）</span>}
            </div>
            <div className="text-[10px] text-[var(--ink-300)]">{activeCalamity.description}</div>
          </div>
        )}
        {activeEffects.filter(e => e.kind === 'building').length > 0 && (
          <div className="mt-2 space-y-1">
            {activeEffects.filter(e => e.kind === 'building').map(e => (
              <div key={e.id} className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-[10px] text-cyan-300 font-medium">
                  {e.title}<span className="text-cyan-200/60 ml-1">剩 {e.remainingMonths} 月</span>
                </div>
                <div className="text-[10px] text-[var(--ink-300)]">
                  {e.outputMultiplier !== 1 && `产出 ×${e.outputMultiplier}`}
                  {e.outputMultiplier !== 1 && e.cultivationBonus > 0 && '、'}
                  {e.cultivationBonus > 0 && `${e.cultivationScope === 'inner' ? '内门及以上' : '全宗'}修炼 +${e.cultivationBonus}%`}
                </div>
              </div>
            ))}
          </div>
        )}
        {calamityWarnings.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <div className="text-[10px] text-amber-400 font-medium">天灾预警</div>
            <div className="text-[10px] text-[var(--ink-300)]">{calamityWarnings[0].warningDescription}</div>
          </div>
        )}
        {/* 物价：不再单独占一节，只在这里带一行，够看就行 */}
        {Object.keys(priceMultipliers).length > 0 && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-[rgba(212,168,87,0.08)] pt-2 text-[11.5px]">
            <span className="text-[var(--gold-300)]">本月物价</span>
            {Object.entries(priceMultipliers).slice(0, 2).map(([id, mult]) => (
              <span key={id} className="font-mono text-[var(--ink-300)]">
                {id.replace(/^material:/, '').replace(/^product:/, '')}
                <span className={mult > 1 ? 'text-red-400' : mult < 1 ? 'text-green-400' : 'text-[var(--ink-400)]'}>
                  {mult > 1 ? ` +${Math.round((mult - 1) * 100)}%` : mult < 1 ? ` ${Math.round((mult - 1) * 100)}%` : ' 基准'}
                </span>
              </span>
            ))}
          </div>
        )}
      </section>

        </div>

        <div className="overview-col">
          <div className="overview-col-title">门中概况</div>

      {/* 弟子分布 */}
      <section className="panel-section">
        <h3 className="panel-section-title">弟子分布</h3>
        <div className="disciple-dist grid grid-cols-6 gap-1.5 text-center">
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--ink-100)]">{outerCount}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">外门</div>
          </div>
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--ink-100)]">{innerCount}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">内门</div>
          </div>
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--ink-100)]">{coreCount}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">核心</div>
          </div>
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--ink-100)]">{servantCount}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">杂役</div>
          </div>
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--ink-100)]">{elderCount}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">长老</div>
          </div>
          <div className="stat-tile !px-1">
            <div className="font-display text-base leading-tight text-[var(--gold-200)]">{Math.floor(sectCombatPower).toLocaleString()}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-400)]">总战力</div>
          </div>
        </div>
      </section>

      {/* 宗门历史 */}
      <section className="panel-section history-span">
        <h3 className="panel-section-title">宗门历史</h3>
        {sectHistory.length === 0 ? (
          <div className="py-4 text-center text-sm text-[var(--ink-400)]">
            暂无历史记录
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {sectHistory.slice(0, 50).map(entry => {
              const style = HISTORY_TYPE_STYLES[entry.type];
              return (
                <div key={entry.id} className="py-2 flex gap-2.5 border-b border-[rgba(212,168,87,0.07)] last:border-0">
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
      </section>
        </div>
      </div>
    </div>
  );
};
