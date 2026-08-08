import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDevice } from '@/hooks/useDevice';
import { useGameStore } from '@/store/gameStore';
import { calculateSectCombatPower, calculateBuildingMaintenance, calculateBuildingOutput } from '@/utils/gameLogic';
import {
  SectLevelNames, SectLevelDescriptions, SectLevelOrder,
  SectLevelRequirementsMap,
} from '@/types/game';
import { SectIcon } from '@/components/icons/SectIcons';

/**
 * 单个需求进度条行组件
 */
const RequirementRow: React.FC<{
  label: string;
  current: number;
  required: number;
  color: string;
  displayBool?: boolean;
}> = ({ label, current, required, color, displayBool }) => {
  const met = current >= required;
  const pct = required > 0 ? Math.min(100, (current / required) * 100) : 100;
  const display = displayBool ? (met ? '✓' : '✗') : `${current}/${required}`;
  return (
    <div className="flex items-center gap-1 text-[9px]">
      <span className="w-14 flex-shrink-0 text-[var(--ink-300)]">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--ink-dark)] rounded-full overflow-hidden border border-[var(--gold-dark)]/20">
        <div
          className={`h-full rounded-full transition-all duration-300 ${met ? 'bg-green-500/80' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-12 flex-shrink-0 text-right font-mono ${met ? 'text-green-400' : 'text-red-400'}`}>
        {display}
      </span>
    </div>
  );
};

/**
 * 宗门信息抽屉：全屏显示，顶部三栏（宗门等级 / 经济概览 / 弟子分布）
 */
export const SectInfoDrawer: React.FC = () => {
  const { sectInfoOpen, setSectInfoOpen } = useUIStore();
  const device = useDevice();
  const isCompact = device.isCompact;

  const {
    year, month, sectLevel, reputation, spiritStones,
    disciples, buildings,
    canPromoteSect, promoteSect,
  } = useGameStore();

  if (!sectInfoOpen) return null;

  const { canPromote, nextLevel } = canPromoteSect();
  const currentLevelIndex = SectLevelOrder.indexOf(sectLevel);
  const nextLevelReq = nextLevel ? SectLevelRequirementsMap[nextLevel] : null;

  const sectCombatPowerResult = calculateSectCombatPower(disciples, buildings);
  const sectCombatPower = sectCombatPowerResult.totalPower;

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

  // 紧凑模式：全屏；PC 模式：覆盖左侧 SectStatsPanel 位置
  const containerClass = isCompact
    ? 'absolute top-[44px] left-[var(--side-nav-width)] right-0 bottom-0 z-[35] scroll-panel-dark flex flex-col slide-in-left'
    : 'absolute top-[60px] left-3 z-[35] w-[420px] max-h-[calc(100vh-80px)] scroll-panel-dark flex flex-col slide-in-left';

  return (
    <>
      {/* 半透明遮罩：点击关闭 */}
      <div
        className="absolute inset-0 z-[34] sect-info-backdrop"
        onClick={() => setSectInfoOpen(false)}
      />

      <div className={containerClass}>
        {/* 头部：标题 + 关闭按钮 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(212,168,87,0.3)] sect-info-header">
          <div className="flex items-center gap-2">
            <SectIcon name="temple" size={18} strokeWidth={1.8} className="text-[var(--gold-300)]" />
            <span className="font-display text-[var(--gold-200)] text-sm">宗门总览</span>
            <span className="text-[10px] text-[var(--ink-400)]">
              {year}年{month}月
            </span>
          </div>
          <button
            className="text-[var(--ink-400)] hover:text-[var(--gold-300)] flex items-center p-1"
            onClick={() => setSectInfoOpen(false)}
            title="关闭"
          >
            <SectIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        {/* 内容区：上部三栏（宗门等级 / 经济概览 / 弟子分布），可滚动 */}
        <div className="flex-1 overflow-y-auto sect-info-content sect-three-col">
          {/* 三栏顶部概览 */}
          <div className="sect-overview-grid">
            {/* 第一块：宗门等级 */}
            <div className="sect-overview-block">
              <div className="sect-block-title">
                <SectIcon name="temple" size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
                <span>宗门等级</span>
                <span className="seal-badge ml-auto">{SectLevelNames[sectLevel]}</span>
              </div>
              <p className="text-[10px] text-[var(--ink-300)] italic leading-snug mb-1.5 line-clamp-2">
                {SectLevelDescriptions[sectLevel]}
              </p>
              {nextLevel && nextLevelReq && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[var(--gold-200)]">
                      → 下一阶段：{SectLevelNames[nextLevel]}
                    </div>
                    <div className={`text-[8px] px-1.5 py-0.5 rounded-full border ${canPromote ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                      {canPromote ? '达成' : '未达成'}
                    </div>
                  </div>
                  
                  {/* 动态条件列表 */}
                  <RequirementRow label="声望" current={Math.floor(reputation)} required={nextLevelReq.reputation} color="bg-amber-500/70" />
                  <RequirementRow label="灵石" current={Math.floor(spiritStones)} required={nextLevelReq.spiritStones} color="bg-cyan-500/70" />
                  {nextLevelReq.discipleCount && (
                    <RequirementRow label="弟子" current={disciples.length} required={nextLevelReq.discipleCount} color="bg-violet-500/70" />
                  )}
                  {nextLevelReq.elderCount !== undefined && (
                    <RequirementRow label="长老" current={elderCount} required={nextLevelReq.elderCount} color="bg-rose-500/70" />
                  )}
                  {nextLevelReq.promotionContribution !== undefined && nextLevelReq.promotionContribution > 0 && (
                    <RequirementRow label="贡献" current={Math.floor(useGameStore.getState().sectContribution || 0)} required={nextLevelReq.promotionContribution} color="bg-yellow-500/70" />
                  )}
                  {nextLevelReq.level2Buildings && (() => {
                    const lv2Count = buildings.filter(b => b.level >= 2 && b.status === 'active').length;
                    return <RequirementRow label="Lv2建筑" current={lv2Count} required={nextLevelReq.level2Buildings} color="bg-blue-500/70" />;
                  })()}
                  {nextLevelReq.level3Buildings && (() => {
                    const lv3Count = buildings.filter(b => b.level >= 3 && b.status === 'active').length;
                    return <RequirementRow label="Lv3建筑" current={lv3Count} required={nextLevelReq.level3Buildings} color="bg-indigo-500/70" />;
                  })()}
                  {nextLevelReq.allLevel2 && (() => {
                    const activeBuildings = buildings.filter(b => b.status === 'active');
                    const allLv2 = activeBuildings.every(b => b.level >= 2);
                    return <RequirementRow label="全建筑Lv2" current={allLv2 ? 1 : 0} required={1} color="bg-blue-500/70" displayBool />;
                  })()}
                  {nextLevelReq.goldenDisciple && (() => {
                    const hasGolden = disciples.some(d => d.realm === 'golden' || d.realm === 'nascent' || d.realm === 'spirit');
                    return <RequirementRow label="金丹期弟子" current={hasGolden ? 1 : 0} required={1} color="bg-amber-500/70" displayBool />;
                  })()}
                  {nextLevelReq.nascentDisciple && (() => {
                    const hasNascent = disciples.some(d => d.realm === 'nascent' || d.realm === 'spirit');
                    return <RequirementRow label="元婴期弟子" current={hasNascent ? 1 : 0} required={1} color="bg-purple-500/70" displayBool />;
                  })()}
                  {nextLevelReq.spiritDisciple && (() => {
                    const hasSpirit = disciples.some(d => d.realm === 'spirit');
                    return <RequirementRow label="化神期弟子" current={hasSpirit ? 1 : 0} required={1} color="bg-emerald-500/70" displayBool />;
                  })()}
                  
                  {/* 消耗与晋升按钮 */}
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[rgba(212,168,87,0.2)]">
                    <div className="text-[9px] text-[var(--ink-400)]">
                      <span className="text-amber-400">{nextLevelReq.promotionCost}</span> 灵石
                      {nextLevelReq.promotionContribution ? <span className="ml-0.5 text-yellow-400">+ {nextLevelReq.promotionContribution} 贡献</span> : null}
                    </div>
                    <button
                      className={`btn-ink text-[10px] px-2 py-0.5 ${canPromote ? '' : 'opacity-50 cursor-not-allowed'}`}
                      disabled={!canPromote}
                      onClick={promoteSect}
                    >
                      {canPromote ? '晋升' : '未达成'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 第二块：经济概览 */}
            <div className="sect-overview-block">
              <div className="sect-block-title">
                <SectIcon name="gem" size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
                <span>经济概览</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="text-center px-1.5 py-1 rounded border border-[rgba(212,168,87,0.15)] bg-[rgba(20,30,45,0.4)]">
                  <div className="text-[9px] text-[var(--ink-400)]">月收入</div>
                  <div className="font-display text-sm text-green-400">+{totalOutput}</div>
                </div>
                <div className="text-center px-1.5 py-1 rounded border border-[rgba(212,168,87,0.15)] bg-[rgba(20,30,45,0.4)]">
                  <div className="text-[9px] text-[var(--ink-400)]">月支出</div>
                  <div className="font-display text-sm text-red-400">-{totalMaintenance}</div>
                </div>
              </div>
              <div className={`text-center font-display text-sm mt-1.5 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                月净收益 {netIncome >= 0 ? '+' : ''}{netIncome}
              </div>
              <div className="text-center text-[9px] text-[var(--gold-200)] mt-1">
                灵石 {Math.floor(spiritStones).toLocaleString()} · 声望 {Math.floor(reputation)}
              </div>
            </div>

            {/* 第三块：弟子分布 */}
            <div className="sect-overview-block">
              <div className="sect-block-title">
                <SectIcon name="disciple" size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
                <span>弟子分布</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.1)] bg-[rgba(20,30,45,0.3)]">
                  <div className="text-[var(--ink-300)]">{servantCount}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">杂役</div>
                </div>
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.1)] bg-[rgba(20,30,45,0.3)]">
                  <div className="text-[var(--jade-light)]">{outerCount}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">外门</div>
                </div>
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.1)] bg-[rgba(20,30,45,0.3)]">
                  <div className="text-[var(--gold-300)]">{innerCount}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">内门</div>
                </div>
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.1)] bg-[rgba(20,30,45,0.3)]">
                  <div className="text-[var(--violet)]">{coreCount}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">核心</div>
                </div>
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.1)] bg-[rgba(20,30,45,0.3)]">
                  <div className="text-[var(--cinnabar)]">{elderCount}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">长老</div>
                </div>
                <div className="px-1 py-0.5 rounded border border-[rgba(212,168,87,0.25)] bg-[rgba(212,168,87,0.08)]">
                  <div className="text-[var(--gold-200)]">{disciples.length}</div>
                  <div className="text-[8px] text-[var(--ink-400)]">合计</div>
                </div>
              </div>
              <div className="text-center text-[10px] text-[var(--gold-200)] mt-1.5">
                总战力 {Math.floor(sectCombatPower).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="divider-gold !my-2" />

          {/* 下方提示 */}
          <div className="text-center text-[10px] text-[var(--ink-400)] py-1">
            点击左侧「宗门」按钮再次关闭
          </div>
        </div>
      </div>
    </>
  );
};
