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

  const { canPromote, nextLevel } = canPromoteSect();
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

  // 维护费与产出按真实公式计算（含等级/工人/管理者），不再读 L1 基础值。
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

        {nextLevel && nextLevelReq && (
          <div className="scroll-panel-dark p-3">
            <div className="text-sm text-[var(--gold-200)] mb-2">
              下一阶段：{SectLevelNames[nextLevel]}
            </div>
            <div className="space-y-1 text-xs">
              <div className={`flex justify-between ${reputation >= nextLevelReq.reputation ? 'text-green-400' : 'text-red-400'}`}>
                <span>声望</span><span>{Math.floor(reputation)} / {nextLevelReq.reputation}</span>
              </div>
              <div className={`flex justify-between ${spiritStones >= nextLevelReq.spiritStones ? 'text-green-400' : 'text-red-400'}`}>
                <span>灵石</span><span>{Math.floor(spiritStones)} / {nextLevelReq.spiritStones}</span>
              </div>
              {nextLevelReq.discipleCount && (
                <div className={`flex justify-between ${disciples.length >= nextLevelReq.discipleCount ? 'text-green-400' : 'text-red-400'}`}>
                  <span>弟子数量</span><span>{disciples.length} / {nextLevelReq.discipleCount}</span>
                </div>
              )}
              {nextLevelReq.elderCount !== undefined && (
                <div className={`flex justify-between ${elderCount >= nextLevelReq.elderCount ? 'text-green-400' : 'text-red-400'}`}>
                  <span>长老数量</span><span>{elderCount} / {nextLevelReq.elderCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-[var(--ink-400)]">
                消耗：{nextLevelReq.promotionCost} 灵石
                {nextLevelReq.promotionContribution ? ` + ${nextLevelReq.promotionContribution} 贡献` : ''}
              </div>
              <button
                className="btn-ink text-xs"
                disabled={!canPromote}
                onClick={promoteSect}
              >
                {canPromote ? '晋升' : '条件未达成'}
              </button>
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
