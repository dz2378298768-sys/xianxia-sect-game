import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { SectIcon } from '@/components/icons/SectIcons';
import { MiniAvatar } from '@/components/ui/Avatar';
import { DiscipleStatusNames, RealmNames } from '@/types/disciple';
import type { Disciple } from '@/types/disciple';

interface Quest {
  id: string;
  type: 'main' | 'daily' | 'side';
  title: string;
  progress: string;
  target: number;
  current: number;
  rewards: { contribution: number; spiritStones: number };
}

interface Props {
  mobileMode?: boolean;
}

// 弟子迷你头像统一使用 ui/Avatar


export const TasksPanel: React.FC<Props> = ({ mobileMode }) => {
  const { disciples, buildings, reputation, followedDiscipleIds, toggleFollowDisciple } = useGameStore();
  const { setMobileSidePanel, setSelectedDiscipleId } = useUIStore();
  const [activeTab, setActiveTab] = useState<'quest' | 'event'>('quest');

  const quests: Quest[] = [
    {
      id: '1',
      type: 'main',
      title: '提升宗门等级',
      progress: '将宗门等级提升至 小有名气',
      target: 500,
      current: Math.floor(reputation),
      rewards: { contribution: 200, spiritStones: 300 },
    },
    {
      id: '2',
      type: 'daily',
      title: '招收弟子',
      progress: `招收弟子 (${Math.min(disciples.length, 5)}/5)`,
      target: 5,
      current: Math.min(disciples.length, 5),
      rewards: { contribution: 50, spiritStones: 100 },
    },
    {
      id: '3',
      type: 'side',
      title: '炼制丹药',
      progress: `炼制丹药 (0/3)`,
      target: 3,
      current: 0,
      rewards: { contribution: 80, spiritStones: 50 },
    },
  ];

  const followedDisciples = followedDiscipleIds
    .map(id => disciples.find(d => d.id === id))
    .filter((d): d is Disciple => !!d);

  const hasFollowed = followedDisciples.length > 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'main': return <span className="seal-badge">主线</span>;
      case 'daily': return <span className="jade-badge">日常</span>;
      case 'side': return <span className="px-2 py-0.5 bg-[rgba(212,168,87,0.15)] text-[var(--gold-200)] text-[11px] rounded border border-[rgba(212,168,87,0.3)]">支线</span>;
      default: return null;
    }
  };

  // 根据是否有关注弟子，调整任务区高度
  const followedHeight = mobileMode ? 0 : (hasFollowed ? Math.min(68 + followedDisciples.length * 24, 180) : 52);
  const taskMaxH = mobileMode
    ? 'max-h-[calc(100vh-200px)]'
    : `max-h-[calc(100vh-280px-${followedHeight}px)]`;

  const containerClass = mobileMode
    ? 'w-full flex flex-col'
    : 'absolute top-36 right-3 w-64 max-h-[calc(100vh-160px)] scroll-panel-dark slide-in-right flex flex-col overflow-hidden';
  const containerStyle = mobileMode ? {} : { zIndex: 20 };

  return (
    <div className={containerClass} style={containerStyle}>
      {/* 标签页 */}
      <div className="flex border-b border-[rgba(212,168,87,0.3)] shrink-0">
        <button
          className={`tab-btn ${activeTab === 'quest' ? 'active' : ''}`}
          onClick={() => setActiveTab('quest')}
        >
          <SectIcon name="scroll" size={14} strokeWidth={1.8} className="inline-block align-middle" /> 任务
        </button>
        <button
          className={`tab-btn ${activeTab === 'event' ? 'active' : ''}`}
          onClick={() => setActiveTab('event')}
        >
          <SectIcon name="talisman" size={14} strokeWidth={1.8} className="inline-block align-middle" /> 事件
        </button>
        {mobileMode && (
          <button className="text-[var(--ink-400)] hover:text-[var(--gold-300)] px-3 flex items-center"
            onClick={() => setMobileSidePanel('tasks')}>
            <SectIcon name="close" size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className={`p-3 overflow-y-auto ${taskMaxH} flex-1 min-h-0`}>
        {activeTab === 'quest' ? (
          <div className="space-y-2">
            {quests.map(quest => (
              <div key={quest.id} className="quest-item">
                <div className="flex items-center justify-between mb-1">
                  {getTypeLabel(quest.type)}
                </div>
                <div className="font-display text-sm text-[var(--gold-200)] mb-1">{quest.title}</div>
                <div className="text-xs text-[var(--ink-300)] mb-2">{quest.progress}</div>
                <div className="scroll-progress mb-2">
                  <div
                    className="scroll-progress-fill bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)]"
                    style={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--ink-400)] flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <SectIcon name="crystal" size={13} strokeWidth={1.8} className="text-[var(--violet)]" />
                      {quest.rewards.contribution}
                    </span>
                    <span className="flex items-center gap-1">
                      <SectIcon name="gem" size={13} strokeWidth={1.8} className="text-[var(--gold-300)]" />
                      {quest.rewards.spiritStones}
                    </span>
                  </div>
                  <button className="text-xs text-[var(--gold-300)] hover:text-[var(--gold-200)] transition-colors flex items-center gap-1">
                    前往
                    <SectIcon name="arrowRight" size={12} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="quest-item">
              <div className="font-display text-sm text-[var(--cinnabar)] mb-1 flex items-center gap-1.5">
                <SectIcon name="warning" size={14} strokeWidth={1.8} />
                杂役堂维护费即将到期
              </div>
              <div className="text-xs text-[var(--ink-300)]">下个月需支付 15 灵石维护费</div>
            </div>
            <div className="quest-item">
              <div className="font-display text-sm text-[var(--azure)] mb-1 flex items-center gap-1.5">
                <SectIcon name="bulb" size={14} strokeWidth={1.8} />
                可建造新建筑
              </div>
              <div className="text-xs text-[var(--ink-300)]">丹堂已解锁，可前往建造</div>
            </div>
            <div className="quest-item">
              <div className="font-display text-sm text-[var(--jade-light)] mb-1 flex items-center gap-1.5">
                <SectIcon name="book" size={14} strokeWidth={1.8} />
                藏经阁新功法
              </div>
              <div className="text-xs text-[var(--ink-300)]">《引气诀》可供弟子学习</div>
            </div>
          </div>
        )}
      </div>

      {/* 常驻：关注弟子（悬浮状态） */}
      {!mobileMode && (
        <>
          <div className="scroll-title !mt-0 shrink-0 !py-2">
            <span className="text-base">星</span>
            <span className="text-[11px]">关注</span>
            <span className="ml-auto text-[10px] text-[var(--ink-400)]">{followedDisciples.length}</span>
          </div>
          <div className="px-2.5 pb-2.5 shrink-0 overflow-y-auto scroll-panel-dark" style={{ maxHeight: 150 }}>
            {!hasFollowed ? (
              <div className="text-[10px] text-[var(--ink-400)] text-center py-1.5 leading-relaxed">
                弟子列表中关注弟子，状态在此常驻
              </div>
            ) : (
              <div className="space-y-1">
                {followedDisciples.map(d => (
                  <div
                    key={d.id}
                    className="group flex items-center gap-1.5 p-1 rounded hover:bg-sect-gold/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedDiscipleId(d.id)}
                    title={`${d.name} · ${RealmNames[d.realm]} · ${DiscipleStatusNames[d.status]}`}
                  >
                    <MiniAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={24} />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="text-[10.5px] font-display text-[var(--gold-200)] truncate">
                        {d.name}
                      </span>
                      <span className="text-[9.5px] text-[var(--ink-400)] truncate shrink-0">
                        {RealmNames[d.realm]}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFollowDisciple(d.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-sect-gold/80"
                      title="取消关注"
                    >
                      <SectIcon name="close" size={10} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
