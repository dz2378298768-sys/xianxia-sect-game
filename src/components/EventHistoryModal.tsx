import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { ScrollText } from 'lucide-react';
import { useModalPause } from '@/hooks/useModalPause';

/** 事件记录：完整回顾已处理的随机异闻（含选择与结果），供移动端翻阅 */
export const EventHistoryModal: React.FC = () => {
  const eventHistory = useGameStore(s => s.eventHistory);
  const eventHistoryOpen = useUIStore(s => s.eventHistoryOpen);
  const setEventHistoryOpen = useUIStore(s => s.setEventHistoryOpen);

  // 翻阅事件记录时暂停时间
  useModalPause('event-history', eventHistoryOpen);

  if (!eventHistoryOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-3 py-6"
      onClick={() => setEventHistoryOpen(false)}
    >
      <div
        className="scroll-panel-dark slide-in-up w-full max-w-sm max-h-full flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--gold-dark)]/30 shrink-0">
          <span className="flex items-center gap-1.5 font-display text-sm text-[var(--gold-200)]">
            <ScrollText size={14} />
            事件记录
            <span className="text-[10px] text-[var(--ink-400)] font-normal">共 {eventHistory.length} 条</span>
          </span>
          <button
            className="text-[var(--ink-300)] hover:text-[var(--gold-200)] text-xs px-2 py-1"
            onClick={() => setEventHistoryOpen(false)}
          >
            关闭
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto panel-scrollbar px-2.5 py-2">
          {eventHistory.length === 0 ? (
            <div className="text-center text-[11px] text-[var(--ink-400)] py-10 leading-relaxed">
              尚无已处理的异闻
              <br />
              山门遇事、做出抉择后，会记录在此
            </div>
          ) : (
            <div className="space-y-2">
              {eventHistory.map((entry, i) => (
                <div
                  key={`${entry.eventId}-${entry.year}-${entry.month}-${i}`}
                  className="rounded-lg border border-[var(--gold-dark)]/20 bg-black/30 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-[13px] text-[var(--gold-200)] leading-snug">
                      {entry.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--ink-400)] tabular-nums pt-0.5">
                      第{entry.year}年{entry.month}月
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--jade-light)]">
                    选择：{entry.choiceLabel}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--ink-300)] leading-relaxed">
                    {entry.resultText}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
