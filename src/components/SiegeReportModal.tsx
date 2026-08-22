import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { Sword, Shield } from 'lucide-react';

/**
 * 围攻战报：本宗被攻或击退来犯时由 gameStore 推入 uiStore.siegeReport。
 * 显示攻方、战斗结果、损失明细（灵石/声望/弟子）。
 */
export const SiegeReportModal: React.FC = () => {
  const report = useUIStore(s => s.siegeReport);
  const setSiegeReport = useUIStore(s => s.setSiegeReport);

  if (!report) return null;

  const handleClose = () => setSiegeReport(null);

  // 攻方名字折叠展示（多于 4 个时显示前 4 个 + 省略号）
  const attackerNames = report.attackers.slice(0, 4).join('、') +
    (report.attackers.length > 4 ? ` 等${report.attackers.length}家` : '');

  const repText = report.repLoss === 0
    ? '—'
    : report.repLoss < 0
      ? `+${-report.repLoss}`
      : `-${report.repLoss}`;

  const repColorClass = report.repLoss < 0
    ? 'text-emerald-300'
    : report.repLoss > 0
      ? 'text-red-300'
      : 'text-[var(--ink-300)]';

  // 战力对比条
  const renderPowerBar = () => {
    const our = report.ourPower ?? 0;
    const enemy = report.enemyPower ?? 0;
    const total = our + enemy || 1;
    const ourPct = (our / total) * 100;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-blue-400 font-medium">我方 {our.toLocaleString()}</span>
          <span className="text-red-400 font-medium">敌方 {enemy.toLocaleString()}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'rgba(13,17,23,0.5)' }}>
          <div
            className="h-full rounded-l-full transition-all"
            style={{ width: `${ourPct}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
          />
          <div
            className="h-full rounded-r-full transition-all"
            style={{ width: `${100 - ourPct}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
      onClick={handleClose}
      data-testid="siege-report-modal"
    >
      <div
        className="scroll-panel-dark slide-in-up max-w-md w-full p-4 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--gold-400)]/20">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                report.isPlayerVictory
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-300'
              }`}
            >
              {report.isPlayerVictory ? '击退' : '被破'}
            </span>
            <h3 className="font-display text-base text-[var(--gold-200)]">{report.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--ink-400)] hover:text-[var(--gold-300)] p-1"
            title="关闭"
          >
            ✕
          </button>
        </div>

        <div className="text-[11px] text-[var(--ink-300)]">
          第 {report.date.year} 年 {['春', '夏', '秋', '冬'][report.date.month - 1]}
        </div>

        {/* 战力对比 */}
        {(report.ourPower !== undefined || report.enemyPower !== undefined) && (
          <div className="p-3 rounded border border-[var(--gold-400)]/15 bg-[rgba(13,17,23,0.6)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Sword size={14} className="text-red-400/50" />
              <span className="text-[10px] font-medium text-[var(--ink-300)]">战力对比</span>
            </div>
            {renderPowerBar()}
          </div>
        )}

        {/* 战斗详情 */}
        <div className="text-xs leading-relaxed text-[var(--ink-200)] bg-[rgba(13,17,23,0.6)] border border-[var(--gold-400)]/15 rounded p-3">
          {report.description}
        </div>

        {/* 攻方列表 */}
        <div>
          <div className="text-[10px] text-[var(--ink-400)] mb-1">攻方宗门</div>
          <div className="text-xs text-[var(--gold-200)] break-words">
            {attackerNames}
          </div>
        </div>

        {/* 损失明细 */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="rounded border border-[var(--gold-400)]/20 bg-[rgba(13,17,23,0.5)] p-2 text-center">
            <div className="text-[10px] text-[var(--ink-400)]">灵石</div>
            <div className={`text-sm font-bold mt-1 ${report.stoneLoss > 0 ? 'text-red-300' : 'text-[var(--ink-300)]'}`}>
              {report.stoneLoss > 0 ? `-${report.stoneLoss}` : '—'}
            </div>
          </div>
          <div className="rounded border border-[var(--gold-400)]/20 bg-[rgba(13,17,23,0.5)] p-2 text-center">
            <div className="text-[10px] text-[var(--ink-400)]">声望</div>
            <div className={`text-sm font-bold mt-1 ${repColorClass}`}>
              {repText}
            </div>
          </div>
          <div className="rounded border border-[var(--gold-400)]/20 bg-[rgba(13,17,23,0.5)] p-2 text-center">
            <div className="text-[10px] text-[var(--ink-400)]">阵亡弟子</div>
            <div className={`text-sm font-bold mt-1 ${report.deadDisciples > 0 ? 'text-red-300' : 'text-[var(--ink-300)]'}`}>
              {report.deadDisciples > 0 ? `-${report.deadDisciples}` : '—'}
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="mt-1 w-full py-2 rounded text-sm font-semibold bg-[var(--gold-300)]/15 border border-[var(--gold-300)]/40 text-[var(--gold-200)] hover:bg-[var(--gold-300)]/25 transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
};