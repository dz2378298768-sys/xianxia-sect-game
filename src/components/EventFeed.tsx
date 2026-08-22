import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { DiscipleStatusNames, getRealmDisplay } from '@/types/disciple';
import type { Notification } from '@/types/game';

/**
 * 山门右下角：宗门事件 feed
 * 展示新弟子加入、弟子突破、晋升、大比结果、宗门升级、重要事件等
 */
export const EventFeed: React.FC = () => {
  const { notifications, markNotificationRead, followedDiscipleIds, disciples } = useGameStore();
  const [collapsed, setCollapsed] = useState(false);

  // 已关注弟子列表（按关注顺序，缺失弟子自动忽略）
  const followedDisciples = useMemo(
    () => followedDiscipleIds
      .map(id => disciples.find(d => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d),
    [followedDiscipleIds, disciples],
  );

  // 过滤出宗门相关事件
  const sectEvents = useMemo(() => {
    const IMPORTANT_TITLE_PREFIXES = [
      '新弟子加入', '突破成功', '突破失败', '弟子晋升',
      '弟子分配', '弟子离去', '弟子不满', '宗门晋升',
      '山门', '宗门', '灵石告急',
    ];
    return notifications.filter(n =>
      IMPORTANT_TITLE_PREFIXES.some(p => n.title.startsWith(p)),
    );
  }, [notifications]);

  const recentEvents = sectEvents.slice(0, 20);
  const unreadCount = recentEvents.filter(n => !n.read).length;

  const dotClass = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'event-feed-dot-success';
      case 'warning': return 'event-feed-dot-warning';
      case 'danger':  return 'event-feed-dot-danger';
      default:        return 'event-feed-dot-info';
    }
  };

  if (collapsed) {
    return (
      <div className="event-feed event-feed-collapsed fade-in">
        <button
          className="event-feed-header w-full"
          onClick={() => setCollapsed(false)}
          title="展开宗门事件"
        >
          <span className="event-feed-title">
            <SectIcon name="disciple" size={12} strokeWidth={2} />
            宗门事件
          </span>
          {unreadCount > 0 && (
            <span className="event-feed-unread-badge">{unreadCount}</span>
          )}
          <SectIcon name="arrowRight" size={12} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="event-feed slide-in-up">
      <div className="event-feed-header">
        <span className="event-feed-title">
          <SectIcon name="disciple" size={12} strokeWidth={2} />
          宗门事件
          {unreadCount > 0 && (
            <span className="event-feed-unread-badge">{unreadCount}</span>
          )}
        </span>
        <button
          className="event-feed-toggle btn-press"
          onClick={() => setCollapsed(true)}
          title="收起"
        >
          <SectIcon name="close" size={12} strokeWidth={2} />
        </button>
      </div>
      <div className="event-feed-list">
        {/* 已关注弟子区（简化） */}
        {followedDisciples.length > 0 && (
          <div className="px-2 py-1.5 border-b border-sect-ink-light/20 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] text-sect-jade/60 mb-1">
              <SectIcon name="disciple" size={10} strokeWidth={2} />
              已关注
            </div>
            <div className="flex flex-wrap gap-1.5">
              {followedDisciples.map(d => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sect-ink-light/30 text-[9px] text-sect-jade/80"
                >
                  <span className="font-medium text-sect-gold/80">{d.name}</span>
                  <span className="text-sect-jade/40">{DiscipleStatusNames[d.status]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 事件列表 */}
        {recentEvents.length === 0 ? (
          <div className="event-feed-empty fade-in">山门清平，暂无事件</div>
        ) : (
          <div className="divide-y divide-sect-ink-light/10">
            {recentEvents.map((n, i) => (
              <div
                key={n.id}
                className={`event-feed-item btn-press ${!n.read ? 'event-feed-item-unread' : ''}`}
                style={{ animationDelay: `${i * 20}ms` }}
                onClick={() => { if (!n.read) markNotificationRead(n.id); }}
              >
                <span className={`event-feed-dot ${dotClass(n.type)}`} />
                <div className="event-feed-content min-w-0">
                  <span className="event-feed-title-text">{n.title}</span>
                  <span className="event-feed-desc">{n.content}</span>
                  <div className="event-feed-time">
                    第 {n.timestamp.year} 年 {['春', '夏', '秋', '冬'][n.timestamp.month - 1]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};