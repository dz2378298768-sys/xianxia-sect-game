import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { calculateSectCombatPower, calculateDiscipleCombatPower, calculateBuildingMaintenance, calculateBuildingOutput } from '@/utils/gameLogic';
import {
  SectLevelNames, SectLevelDescriptions, SectLevelOrder,
  SectLevelRequirementsMap,
} from '@/types/game';
import { BuildingTypeNames } from '@/types/building';

export const OverviewPanel: React.FC = () => {
  const {
    year, month, sectLevel, reputation, spiritStones,
    disciples, buildings, nextMonth,
    canPromoteSect, promoteSect,
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

  const totalMaintenance = buildings.reduce((sum, b) => {
    if (b.status !== 'active') return sum;
    return sum + calculateBuildingMaintenance(b);
  }, 0);

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
              {nextLevelReq.promotionContribution !== undefined && nextLevelReq.promotionContribution > 0 && (
                <RequirementBar
                  label="贡献"
                  current={useGameStore.getState().sectContribution || 0}
                  required={nextLevelReq.promotionContribution}
                  color="bg-yellow-500/70"
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
                {nextLevelReq.promotionContribution ? (
                  <span className="ml-1 text-yellow-400">+ {nextLevelReq.promotionContribution} 贡献</span>
                ) : null}
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
    </div>
  );
};
