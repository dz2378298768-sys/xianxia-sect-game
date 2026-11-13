import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { TasksPanel } from '@/components/TasksPanel';
import { SectIcon } from '@/components/icons/SectIcons';
import { MiniAvatar } from '@/components/ui/Avatar';
import { DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import type { Disciple } from '@/types/disciple';
import type { Notification, ReportKind } from '@/types/game';
import { ReportKindNames } from '@/types/game';
import { GAME_EVENT_MAP } from '@/data/events';
import { TASKS } from '@/data/tasks';
import { canClaimTask } from '@/domain/taskEngine';
import type { TaskStateView } from '@/types/task';

type RailModal = 'tasks' | 'events' | 'reports' | 'followed' | null;

interface RailItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  dot?: boolean;
  tone?: 'gold' | 'amber' | 'jade';
  onClick: () => void;
}

/** 左侧状态入口：图标 + 名称 + 数量，30px 高 */
const RailItem: React.FC<RailItemProps> = ({ icon, label, count, dot, tone = 'gold', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`quick-rail-item quick-rail-item-${tone}`}
    title={label}
  >
    <span className="quick-rail-icon">{icon}</span>
    <span className="quick-rail-label">{label}</span>
    {typeof count === 'number' && count > 0 && (
      <span className="quick-rail-count">{count}</span>
    )}
    {dot && <span className="quick-rail-dot" />}
    <SectIcon name="arrowRight" size={11} strokeWidth={2} className="quick-rail-chevron" />
  </button>
);

/**
 * 主界面左侧状态栏：任务 / 异闻 / 报告 / 宗门事件 / 关注弟子
 * 全部收成 30px 小条，点开才是弹窗；面板打开时整栏隐藏。
 */
export const QuickRail: React.FC = () => {
  const {
    disciples, buildings, reputation, spiritStones, sectLevel, otherSects, beastInventory, gameWon,
    taskCounters, monthlyTaskCounters, claimedTasks, monthlyTaskIds,
    pendingEvents, openEvent,
    monthlyReport, quarterlyReport, annualReport, unreadReports, openReport,
    notifications, markNotificationRead,
    followedDiscipleIds, toggleFollowDisciple,
  } = useGameStore();
  const { setSelectedDiscipleId, setActivePanel } = useUIStore();

  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<RailModal>(null);

  // 与任务面板同一口径：可领取数量
  const view: TaskStateView = {
    sectLevel, reputation, spiritStones, disciples, buildings, otherSects, beastInventory, gameWon,
    taskCounters, monthlyTaskCounters, claimedTasks, monthlyTaskIds,
  };
  const claimableCount = useMemo(
    () => TASKS.filter(t => (t.type !== 'monthly' || monthlyTaskIds.includes(t.id)) && canClaimTask(t, view).ok).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectLevel, reputation, spiritStones, disciples, buildings, otherSects, beastInventory, gameWon, taskCounters, monthlyTaskCounters, claimedTasks, monthlyTaskIds],
  );

  // 宗门事件：与事件流同一过滤口径
  const sectEvents = useMemo(() => {
    const PREFIXES = [
      '新弟子加入', '突破成功', '突破失败', '弟子晋升',
      '弟子分配', '弟子离去', '弟子不满', '宗门晋升',
      '山门', '宗门', '灵石告急', '异闻现世', '事件自行发展',
    ];
    return notifications.filter(n =>
      PREFIXES.some(p => n.title.startsWith(p))
      || Object.values(GAME_EVENT_MAP).some(e => e.title === n.title),
    ).slice(0, 40);
  }, [notifications]);
  const eventUnread = sectEvents.filter(n => !n.read).length;

  const reportKinds = useMemo(() => {
    const list: ReportKind[] = [];
    if (monthlyReport) list.push('monthly');
    if (quarterlyReport) list.push('quarterly');
    if (annualReport) list.push('annual');
    return list;
  }, [monthlyReport, quarterlyReport, annualReport]);
  const hasUnreadReport = reportKinds.some(k => unreadReports[k]);

  const followedDisciples = useMemo(
    () => followedDiscipleIds
      .map(id => disciples.find(d => d.id === id))
      .filter((d): d is Disciple => !!d),
    [followedDiscipleIds, disciples],
  );

  const dotClass = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-400';
      case 'warning': return 'bg-amber-400';
      case 'danger': return 'bg-red-400';
      default: return 'bg-sky-400';
    }
  };

  const openDisciple = (id: string) => {
    setSelectedDiscipleId(id);
    setActivePanel('disciples');
    setOpen(null);
  };

  return (
    <>
      <div className={`quick-rail ${collapsed ? 'quick-rail-collapsed' : ''}`}>
        <button
          type="button"
          className="quick-rail-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? '展开状态栏' : '收起状态栏'}
        >
          <SectIcon name={collapsed ? 'arrowRight' : 'minus'} size={12} strokeWidth={2} />
          {collapsed && claimableCount + eventUnread + pendingEvents.length > 0 && (
            <span className="quick-rail-collapsed-dot" />
          )}
        </button>

        {collapsed ? (
          <button type="button" className="quick-rail-stub" onClick={() => setCollapsed(false)} title="展开状态栏">
            <span className="[writing-mode:vertical-rl] tracking-[2px] text-[11px] text-[var(--gold-200)]">状态</span>
          </button>
        ) : (
          <div className="quick-rail-list">
            <RailItem
              icon={<SectIcon name="scroll" size={13} strokeWidth={1.8} />}
              label="任务"
              count={claimableCount}
              onClick={() => setOpen('tasks')}
            />
            <RailItem
              icon={<SectIcon name="warning" size={13} strokeWidth={1.8} />}
              label="异闻"
              count={pendingEvents.length}
              tone="amber"
              onClick={() => {
                if (pendingEvents.length > 0) openEvent(pendingEvents[0].eventId);
                else setOpen('events');
              }}
            />
            <RailItem
              icon={<SectIcon name="scrollText" size={13} strokeWidth={1.8} />}
              label="报告"
              dot={hasUnreadReport}
              onClick={() => setOpen('reports')}
            />
            <RailItem
              icon={<SectIcon name="list" size={13} strokeWidth={1.8} />}
              label="事件"
              count={eventUnread}
              tone="jade"
              onClick={() => setOpen('events')}
            />
            <RailItem
              icon={<SectIcon name="disciple" size={13} strokeWidth={1.8} />}
              label="关注"
              count={followedDisciples.length}
              tone="jade"
              onClick={() => setOpen('followed')}
            />
          </div>
        )}
      </div>

      {/* 任务：直接复用任务面板，密排模式 */}
      <Modal isOpen={open === 'tasks'} onClose={() => setOpen(null)} title="任务" size="lg">
        <TasksPanel dense />
      </Modal>

      {/* 宗门事件：一屏 8 条 */}
      <Modal isOpen={open === 'events'} onClose={() => setOpen(null)} title="宗门事件" size="lg">
        {sectEvents.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[var(--ink-400)]">山门清平，暂无事件</div>
        ) : (
          <div>
            {sectEvents.map(n => (
              <button
                type="button"
                key={n.id}
                onClick={() => { if (!n.read) markNotificationRead(n.id); }}
                className="flex w-full items-center gap-2.5 py-2 text-left border-b border-[rgba(212,168,87,0.08)] last:border-0"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(n.type)}`} />
                <span className="w-[104px] shrink-0 truncate text-[12.5px] text-[var(--ink-100)]">{n.title}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink-400)]">{n.content}</span>
                <span className="shrink-0 text-[11px] text-[var(--ink-500)]">{n.timestamp.year}年{n.timestamp.month}月</span>
                {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cinnabar)]" />}
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* 报告：月/季/年 */}
      <Modal isOpen={open === 'reports'} onClose={() => setOpen(null)} title="经营报告" size="sm">
        {reportKinds.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--ink-400)]">暂无报告</div>
        ) : (
          <div>
            {reportKinds.map(kind => (
              <button
                type="button"
                key={kind}
                onClick={() => { openReport(kind); setOpen(null); }}
                className="flex w-full items-center gap-2.5 py-2.5 text-left border-b border-[rgba(212,168,87,0.08)] last:border-0"
              >
                <SectIcon name="scrollText" size={15} strokeWidth={1.8} className="text-[var(--gold-300)]" />
                <span className="flex-1 text-[13px] text-[var(--ink-100)]">{ReportKindNames[kind]}</span>
                {unreadReports[kind] && <span className="h-1.5 w-1.5 rounded-full bg-[var(--cinnabar)]" />}
                <SectIcon name="arrowRight" size={12} strokeWidth={2} className="text-[var(--ink-400)]" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* 关注弟子 */}
      <Modal isOpen={open === 'followed'} onClose={() => setOpen(null)} title="关注弟子" size="md">
        {followedDisciples.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--ink-400)]">还没有关注的弟子</div>
        ) : (
          <div>
            {followedDisciples.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-2.5 py-1.5 border-b border-[rgba(212,168,87,0.08)] last:border-0"
              >
                <button
                  type="button"
                  onClick={() => openDisciple(d.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <MiniAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[var(--ink-100)]">{d.name}</span>
                    <span className="block text-[11.5px] text-[var(--ink-400)]">
                      {getRealmDisplay(d)} · {DiscipleStatusNames[d.status]}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFollowDisciple(d.id)}
                  className="shrink-0 rounded px-2 py-1 text-[11.5px] text-[var(--ink-400)] hover:text-[var(--gold-300)]"
                >
                  取消关注
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};
