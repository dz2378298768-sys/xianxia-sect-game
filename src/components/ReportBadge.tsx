import React from 'react';
import { useGameStore } from '@/store/gameStore';
import type { ReportKind } from '@/types/game';
import { ReportKindNames } from '@/types/game';
import { ScrollText } from 'lucide-react';

/** 右下角报告未读入口：即使未强制弹出，也能随时打开月/季/年报 */
export const ReportBadge: React.FC = () => {
  const {
    monthlyReport, quarterlyReport, annualReport,
    unreadReports, openReport, reportSettings,
    pendingEvents, openEvent,
  } = useGameStore();

  const items: { kind: ReportKind; available: boolean }[] = [
    { kind: 'monthly', available: !!monthlyReport },
    { kind: 'quarterly', available: !!quarterlyReport },
    { kind: 'annual', available: !!annualReport },
  ];

  const anyAvailable = items.some(i => i.available);
  if (!anyAvailable && pendingEvents.length === 0) return null;

  // 未读去重：同一批数据会在月/季/年三级同时置为未读，只提示最高一级
  const highlightKind = (['annual', 'quarterly', 'monthly'] as ReportKind[])
    .find(kind => unreadReports[kind] && items.some(i => i.kind === kind && i.available));

  return (
    <div className="absolute right-2 z-[19] flex flex-col items-end gap-1" style={{ bottom: 84 }}>
      {pendingEvents.length > 0 && (
        <button
          onClick={() => openEvent(pendingEvents[0].eventId)}
          className="flex items-center gap-1 px-2 py-1 rounded border border-amber-400/40 bg-black/70 text-amber-300 text-[11px] hover:bg-amber-400/15 transition-colors"
        >
          <ScrollText size={12} />
          待处理异闻 {pendingEvents.length}
        </button>
      )}
      {items.filter(i => i.available).map(i => (
        <button
          key={i.kind}
          onClick={() => openReport(i.kind)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
            highlightKind === i.kind
              ? 'border-sect-gold/50 bg-black/70 text-sect-gold'
              : 'border-white/10 bg-black/60 text-sect-jade/50 hover:text-sect-gold'
          }`}
        >
          <ScrollText size={12} />
          {ReportKindNames[i.kind]}
          {highlightKind === i.kind && <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" />}
        </button>
      ))}
    </div>
  );
};
