import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SectIcon } from '@/components/icons/SectIcons';
import type { Notification } from '@/types/game';

/**
 * 山门右下角：宗门事件 feed
 * 展示新弟子加入、弟子突破、晋升、大比结果、宗门升级、重要事件等
 */
export const EventFeed: React.FC = () => {
  const { notifications, markNotificationRead } = useGameStore();
  const [collapsed, setCollapsed] = useState(false);

  // 过滤出宗门相关事件（剔除纯月报明细类），保留突破/晋升/大比/宗门升级/新弟子/弟子离去/灵石告急等
  const sectEvents = useMemo(() => {
    const IMPORTANT_TITLE_PREFIXES = [
      '新弟子加入',
      '突破成功',
      '突破失败',
      '弟子晋升',
      '弟子分配',
      '弟子离去',
      '弟子不满',
      '宗门晋升',
      '山门',
      '宗门',
      '灵石告急',
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
      <div className="event-feed event-feed-collapsed">
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
    <div className="event-feed">
      <div className="event-feed-header">
        <span className="event-feed-title">
          <SectIcon name="disciple" size={12} strokeWidth={2} />
          宗门事件
          {unreadCount > 0 && (
            <span className="event-feed-unread-badge">{unreadCount}</span>
          )}
        </span>
        <button
          className="event-feed-toggle"
          onClick={() => setCollapsed(true)}
          title="收起"
        >
          <SectIcon name="close" size={12} strokeWidth={2} />
        </button>
      </div>
      <div className="event-feed-list">
        {recentEvents.length === 0 ? (
          <div className="event-feed-empty">山门清平，暂无事件</div>
        ) : (
          recentEvents.map(n => (
            <div
              key={n.id}
              className={`event-feed-item ${!n.read ? 'event-feed-item-unread' : ''}`}
              onClick={() => { if (!n.read) markNotificationRead(n.id); }}
            >
              <span className={`event-feed-dot ${dotClass(n.type)}`} />
              <div className="event-feed-content">
                <span className="event-feed-title-text">{n.title}</span>
                <span className="event-feed-desc">{n.content}</span>
                <div className="event-feed-time">
                  第 {n.timestamp.year} 年 {n.timestamp.month} 月
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
