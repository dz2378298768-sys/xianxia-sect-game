import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingUp, TrendingDown, Users, Sparkles,
  Star, CheckCircle, XCircle, Skull, DoorOpen, ScrollText, Bell, BellOff,

} from 'lucide-react';
import type { MonthlyReport, ReportKind } from '@/types/game';
import { ReportKindNames } from '@/types/game';
import { GAME_EVENT_MAP } from '@/data/events';
import { EventRarityColors, EventRarityNames } from '@/types/event';

const reportTitles: Record<ReportKind, string> = {
  monthly: '月度简报',
  quarterly: '季度总结',
  annual: '年度总结',
};

export const MonthlyReportModal: React.FC = () => {
  const {
    monthlyReport, reportView, dismissReport, openReport,
    quarterlyReport, annualReport,
    reportSettings, setReportSetting,
    pendingEvents, openEvent, eventHistory,
  } = useGameStore();

  // 月/季/年报需要玩家阅读，期间由 Modal 统一暂停时间
  if (!monthlyReport || !reportView) return null;

  const periodic = reportView === 'quarterly'
    ? quarterlyReport
    : reportView === 'annual'
      ? annualReport
      : null;
  const report: MonthlyReport | null = periodic
    ? (periodic.months[periodic.months.length - 1] ?? monthlyReport)
    : monthlyReport;
  if (!report) return null;

  const totalIncome = periodic
    ? periodic.totalIncome
    : report.spiritStoneIncome.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = periodic
    ? periodic.totalExpense
    : report.spiritStoneExpense.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalIncome - totalExpense;
  const reputationChange = periodic ? periodic.reputationChange : report.reputationChange;

  const months: MonthlyReport[] = periodic ? periodic.months : [report];
  const allBreakthroughs = months.flatMap(m => m.breakthroughs);
  const successBreakthroughs = allBreakthroughs.filter(b => b.success);
  const failedBreakthroughs = allBreakthroughs.filter(b => !b.success);
  const allPromotions = months.flatMap(m => m.promotions);
  const allNewDisciples = months.flatMap(m => m.newDisciples);
  const allDepartures = months.flatMap(m => m.departures ?? []);
  const allEvents = months.flatMap(m => m.events);

  const subtitle = periodic
    ? `第 ${periodic.year} 年 · ${periodic.startMonth}–${periodic.endMonth} 月`
    : `第 ${report.date.year} 年 ${report.date.month} 月`;

  const tabs: { kind: ReportKind; available: boolean }[] = [
    { kind: 'monthly', available: !!monthlyReport },
    { kind: 'quarterly', available: !!quarterlyReport },
    { kind: 'annual', available: !!annualReport },
  ];

  return (
    <Modal
      isOpen={!!reportView}
      onClose={dismissReport}
      title={`${reportTitles[reportView]} · ${subtitle}`}
      size="lg"
    >
      <div className="space-y-2">
        {/* 报告类型切换 */}
        <div className="flex gap-1.5">
          {tabs.map(t => (
            <button
              key={t.kind}
              disabled={!t.available}
              onClick={() => t.available && openReport(t.kind)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                reportView === t.kind
                  ? 'bg-sect-gold/20 border-sect-gold/50 text-sect-gold'
                  : t.available
                    ? 'bg-black/20 border-sect-gold/20 text-sect-jade/70 hover:text-sect-gold'
                    : 'bg-black/10 border-white/5 text-sect-jade/25 cursor-not-allowed'
              }`}
            >
              {ReportKindNames[t.kind]}
            </button>
          ))}
        </div>

        {/* 概览行 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="text-green-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">收入</span>
            </div>
            <div className="font-display text-sm text-green-400">+{totalIncome}</div>
          </div>
          <div className="text-center px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="text-red-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">支出</span>
            </div>
            <div className="font-display text-sm text-red-400">-{totalExpense}</div>
          </div>
          <div className="text-center px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center justify-center gap-1">
              <Star className="text-yellow-400" size={12} />
              <span className="text-[10px] text-sect-jade/60">声望</span>
            </div>
            <div className={`font-display text-sm ${reputationChange >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {reputationChange >= 0 ? '+' : ''}{reputationChange}
            </div>
          </div>
        </div>

        {/* 周期统计 */}
        {periodic && (
          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
            <div className="rounded bg-black/20 px-1 py-1">
              <div className="text-sect-jade/50">突破</div>
              <div className="text-sect-gold">{periodic.breakthroughCount}</div>
            </div>
            <div className="rounded bg-black/20 px-1 py-1">
              <div className="text-sect-jade/50">晋升</div>
              <div className="text-sect-gold">{periodic.promotionCount}</div>
            </div>
            <div className="rounded bg-black/20 px-1 py-1">
              <div className="text-sect-jade/50">新弟子</div>
              <div className="text-sect-gold">{periodic.newDiscipleCount}</div>
            </div>
            <div className="rounded bg-black/20 px-1 py-1">
              <div className="text-sect-jade/50">异闻</div>
              <div className="text-sect-gold">{periodic.eventCount}</div>
            </div>
          </div>
        )}

        {/* 本月异闻：待处理事件 */}
        {reportView === 'monthly' && pendingEvents.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <ScrollText size={12} />
              本月异闻 · 待处置 ({pendingEvents.length})
            </h3>
            <div className="space-y-1">
              {pendingEvents.map(p => {
                const cfg = GAME_EVENT_MAP[p.eventId];
                if (!cfg) return null;
                return (
                  <div key={p.eventId} className="flex items-center justify-between gap-2 rounded bg-black/25 px-2 py-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span style={{ color: EventRarityColors[cfg.rarity] }} className="text-xs font-display">
                          {cfg.title}
                        </span>
                        <span className="text-[10px] text-sect-jade/40">{EventRarityNames[cfg.rarity]}</span>
                      </div>
                      <div className="text-[11px] text-sect-jade/60 truncate">{cfg.description}</div>
                    </div>
                    <Button
                      className="text-[11px] px-2 py-0.5 shrink-0"
                      onClick={() => { dismissReport(); openEvent(p.eventId); }}
                    >
                      处理
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 异闻记录 */}
        {allEvents.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <ScrollText size={12} />
              异闻记录 ({allEvents.length})
            </h3>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {allEvents.slice(-12).map((e, i) => (
                <div key={i} className="text-[11px] text-sect-jade/70 px-1.5 py-0.5 rounded bg-white/[0.03]">
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 新入弟子 */}
        {allNewDisciples.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Users size={12} />
              新入弟子 ({allNewDisciples.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {allNewDisciples.slice(-12).map(d => (
                <Badge key={d.id} variant="herb">{d.name} · {d.status}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* 突破记录 */}
        {allBreakthroughs.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Sparkles size={12} />
              突破记录 ({allBreakthroughs.length})
            </h3>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {successBreakthroughs.map((b, i) => (
                <div key={`success-${i}`} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-500/10">
                  <CheckCircle size={12} className="text-green-400 shrink-0" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{b.discipleName}</span> 突破至 {b.to}
                  </span>
                </div>
              ))}
              {failedBreakthroughs.map((b, i) => (
                <div key={`fail-${i}`} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-500/10">
                  <XCircle size={12} className="text-red-400 shrink-0" />
                  <span className="text-sect-jade/80">
                    <span className="text-sect-jade">{b.discipleName}</span> 突破 {b.to} 失败
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 晋升记录 */}
        {allPromotions.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <Users size={12} />
              晋升记录 ({allPromotions.length})
            </h3>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {allPromotions.slice(-10).map((p, i) => (
                <div key={i} className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-500/10">
                  <Badge variant="spirit">{p.to}</Badge>
                  <span className="text-sect-jade/80">
                    <span className="text-sect-gold">{p.discipleName}</span> 从 {p.from} 晋升
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 离宗记录：死亡/叛逃/卸任 */}
        {allDepartures.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <DoorOpen size={12} />
              离宗记录 ({allDepartures.length})
            </h3>
            <div className="space-y-1">
              {allDepartures.map((d, i) => (
                <div key={i} className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                  d.reason === 'death' ? 'bg-gray-500/10' :
                  d.reason === 'defect' ? 'bg-red-500/10' :
                  'bg-orange-500/10'
                }`}>
                  {d.reason === 'death' ? (
                    <Skull size={12} className="text-gray-400 shrink-0" />
                  ) : d.reason === 'defect' ? (
                    <DoorOpen size={12} className="text-red-400 shrink-0" />
                  ) : (
                    <DoorOpen size={12} className="text-orange-400 shrink-0" />
                  )}
                  <span className="text-sect-jade/80">
                    <span className={
                      d.reason === 'death' ? 'text-gray-400' :
                      d.reason === 'defect' ? 'text-red-300' :
                      'text-orange-300'
                    }>{d.name}</span>
                    <span className="text-sect-jade/50"> · {d.status}</span>
                    <span className="text-sect-jade/60"> — {d.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 收支明细（仅月报显示） */}
        {reportView === 'monthly' && report.spiritStoneIncome.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 text-xs">收支明细</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="text-sect-jade/60 text-[10px] mb-0.5">收入</div>
                {report.spiritStoneIncome.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span className="truncate">{item.source}</span>
                    <span className="text-green-400 ml-1 shrink-0">+{item.amount}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <div className="text-sect-jade/60 text-[10px] mb-0.5">支出</div>
                {report.spiritStoneExpense.map((item, i) => (
                  <div key={i} className="flex justify-between text-sect-jade/80">
                    <span className="truncate">{item.source}</span>
                    <span className="text-red-400 ml-1 shrink-0">-{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 最近事件历史（月报） */}
        {reportView === 'monthly' && eventHistory.length > 0 && (
          <div>
            <h3 className="font-display text-sect-gold mb-1 flex items-center gap-1 text-xs">
              <ScrollText size={12} />
              往期异闻
            </h3>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {eventHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="text-[11px] text-sect-jade/60 px-1.5 py-0.5">
                  第 {h.year} 年 {h.month} 月 · {h.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 弹出设置 */}
        <div className="rounded border border-sect-gold/15 bg-black/20 px-2 py-1.5">
          <div className="text-[10px] text-sect-jade/50 mb-1">到点是否强制弹出（关闭后仍会在右下角显示未读入口）</div>
          <div className="flex flex-wrap gap-1.5">
            {(['monthly', 'quarterly', 'annual'] as ReportKind[]).map(kind => (
              <button
                key={kind}
                onClick={() => setReportSetting(kind, !reportSettings[kind])}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
                  reportSettings[kind]
                    ? 'border-sect-gold/50 bg-sect-gold/15 text-sect-gold'
                    : 'border-white/10 bg-black/20 text-sect-jade/50'
                }`}
              >
                {reportSettings[kind] ? <Bell size={11} /> : <BellOff size={11} />}
                {ReportKindNames[kind]}强制弹出
              </button>
            ))}
          </div>
        </div>

        {/* 底部汇总 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-sect-gold/10">
          <div className="text-sect-jade/60 text-xs">
            净收益：
            <span className={`font-display ml-1 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome}
            </span>
          </div>
          <Button onClick={dismissReport} className="text-xs px-3 py-1">知道了</Button>
        </div>
      </div>
    </Modal>
  );
};
