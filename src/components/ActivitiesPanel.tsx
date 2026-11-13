import React, { useState } from 'react';
import { TournamentPanel } from '@/components/TournamentPanel';
import { SectIcon } from '@/components/icons/SectIcons';
import { Modal } from '@/components/ui/Modal';
import { useGameStore } from '@/store/gameStore';
import type { TournamentScope } from '@/types/tournament';

interface EventEntry {
  scope: TournamentScope;
  name: string;
  desc: string;
  icon: 'sword' | 'trophy';
}

const EVENTS: EventEntry[] = [
  { scope: 'sect', name: '山门大比', desc: '本门弟子按境界分组切磋，决出三甲', icon: 'sword' },
  { scope: 'inter-sect', name: '天下宗门大比', desc: '与天下宗门同台较量，名次越高奖励越厚', icon: 'trophy' },
];

/**
 * 活动面板：先给两条赛事入口（一屏看全），点开才是完整赛程弹窗。
 * 之前把两套大比 UI 直接堆在页面里，第一屏只看得到标题。
 */
export const ActivitiesPanel: React.FC = () => {
  const { tournamentHistory } = useGameStore();
  const [openScope, setOpenScope] = useState<TournamentScope | null>(null);

  const current = EVENTS.find(e => e.scope === openScope);

  return (
    <div className="panel-sheet">
      <p className="text-[11.5px] text-[var(--ink-400)]">宗门赛事与天下大比，点开查看赛制、奖励与历届榜单</p>

      {EVENTS.map(entry => {
        const last = (tournamentHistory ?? []).find(h => h.scope === entry.scope);
        return (
          <button
            key={entry.scope}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-[rgba(212,168,87,0.2)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-left active:bg-[rgba(212,168,87,0.1)]"
            onClick={() => setOpenScope(entry.scope)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,168,87,0.14)] text-[var(--gold-300)]">
              <SectIcon name={entry.icon} size={18} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[13.5px] text-[var(--gold-200)]">{entry.name}</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-[var(--ink-400)]">{entry.desc}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-500)]">
                {last
                  ? `上届 第${last.date.year}年${last.date.month}月 · 冠军 ${last.champion}${last.ourChampionName ? `（本宗 ${last.ourChampionName}）` : ''}`
                  : '尚未举办过'}
              </span>
            </span>
            <span className="shrink-0 text-[11.5px] text-[var(--gold-300)]">查看 ›</span>
          </button>
        );
      })}

      <Modal
        isOpen={openScope !== null}
        onClose={() => setOpenScope(null)}
        title={current?.name ?? '赛事'}
        size="xl"
      >
        {openScope && <TournamentPanel scope={openScope} />}
      </Modal>
    </div>
  );
};
