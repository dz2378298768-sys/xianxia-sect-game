import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { calculateSectCombatPower } from '@/utils/gameLogic';
import { SectIcon } from '@/components/icons/SectIcons';
import { DiscipleStatusNames, RealmNames } from '@/types/disciple';
import type { Disciple } from '@/types/disciple';

interface Props {
  mobileMode?: boolean;
}

// 弟子迷你头像统一使用 ui/Avatar
import { MiniAvatar } from '@/components/ui/Avatar';



export const SectStatsPanel: React.FC<Props> = ({ mobileMode }) => {
  const {
    disciples, buildings, reputation,
    followedDiscipleIds, toggleFollowDisciple,
  } = useGameStore();
  const { setActivePanel, setMobileSidePanel, setSelectedDiscipleId } = useUIStore();

  const servantCount = disciples.filter(d => d.status === 'servant').length;
  const outerCount = disciples.filter(d => d.status === 'outer').length;
  const innerCount = disciples.filter(d => d.status === 'inner').length;
  const coreCount = disciples.filter(d => d.status === 'core').length;
  const sectCombatPower = calculateSectCombatPower(disciples, buildings);
  const combatPower = sectCombatPower.totalPower;
  const activeBuildings = buildings.filter(b => b.status === 'active').length;

  const followedDisciples = followedDiscipleIds
    .map(id => disciples.find(d => d.id === id))
    .filter((d): d is Disciple => !!d);

  const containerClass = mobileMode
    ? 'w-full'
    : 'absolute top-36 left-3 w-64 max-h-[calc(100vh-160px)] overflow-y-auto scroll-panel-dark slide-in-left';
  const containerStyle = mobileMode ? {} : { zIndex: 20 };

  return (
    <div className={containerClass} style={containerStyle}>
      {/* 宗门总览 */}
      <div className="scroll-title">
        <span className="text-lg">宗</span>
        <span>宗门总览</span>
        {mobileMode && (
          <button className="ml-auto text-[var(--ink-400)] hover:text-[var(--gold-300)] flex items-center"
            onClick={() => setMobileSidePanel('stats')}>
            <SectIcon name="close" size={16} strokeWidth={2} />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="space-y-0">
          <div className="status-row">
            <span className="status-label flex items-center gap-1.5">
              <SectIcon name="group" size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
              弟子数量
            </span>
            <span className="status-value text-[var(--gold-200)]">{disciples.length}</span>
          </div>
          <div className="status-row">
            <span className="status-label text-[var(--jade-light)]">内门弟子</span>
            <span className="status-value text-[var(--gold-200)]">{innerCount}</span>
          </div>
          <div className="status-row">
            <span className="status-label text-[var(--gold-300)]">外门弟子</span>
            <span className="status-value text-[var(--gold-200)]">{outerCount}</span>
          </div>
          <div className="status-row">
            <span className="status-label text-[var(--ink-300)]">杂役弟子</span>
            <span className="status-value text-[var(--gold-200)]">{servantCount}</span>
          </div>
          <div className="status-row">
            <span className="status-label text-[var(--violet)]">核心弟子</span>
            <span className="status-value text-[var(--gold-200)]">{coreCount}</span>
          </div>
          <div className="status-row">
            <span className="status-label flex items-center gap-1.5">
              <SectIcon name="building" size={14} strokeWidth={1.8} className="text-[var(--gold-300)]" />
              建筑数量
            </span>
            <span className="status-value text-[var(--gold-200)]">{activeBuildings}/{buildings.length}</span>
          </div>
          <div className="status-row">
            <span className="status-label flex items-center gap-1.5">
              <SectIcon name="battle" size={14} strokeWidth={1.8} className="text-[var(--cinnabar)]" />
              宗门战力
            </span>
            <span className="status-value text-[var(--gold-200)]">{Math.floor(combatPower).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 关注弟子（常驻显示） */}
      <div className="scroll-title">
        <span className="text-lg">星</span>
        <span>关注弟子</span>
        <span className="ml-auto text-[10px] text-[var(--ink-400)]">{followedDisciples.length}</span>
      </div>
      <div className="p-3">
        {followedDisciples.length === 0 ? (
          <div className="text-[11px] text-[var(--ink-400)] text-center py-3 leading-relaxed">
            暂无关注弟子
            <div className="text-[10px] text-[var(--ink-500)] mt-1">
              弟子列表中点击 ♥ 可关注弟子
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {followedDisciples.map(d => (
              <div
                key={d.id}
                className="group flex items-center gap-2 p-1.5 rounded hover:bg-sect-gold/10 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedDiscipleId(d.id);
                  if (mobileMode) setMobileSidePanel(null);
                }}
                title="点击查看详情"
              >
                <MiniAvatar seed={d.avatarSeed} name={d.name} status={d.status} realm={d.realm} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-display text-[var(--gold-200)] truncate">
                      {d.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--ink-400)] truncate leading-tight">
                    {DiscipleStatusNames[d.status]} · {RealmNames[d.realm]}
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleFollowDisciple(d.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-sect-gold/80 p-0.5"
                  title="取消关注"
                >
                  <SectIcon name="close" size={11} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      {!mobileMode && (
        <>
          <div className="scroll-title">
            <span className="text-lg">门</span>
            <span>快捷入口</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            <button className="btn-ghost-dark text-xs flex-col items-center gap-1 py-2" onClick={() => setActivePanel('overview')}>
              <SectIcon name="gear" size={18} strokeWidth={1.8} /><span>设定</span>
            </button>
            <button className="btn-ghost-dark text-xs flex-col items-center gap-1 py-2" onClick={() => setActivePanel('buildings')}>
              <SectIcon name="building" size={18} strokeWidth={1.8} /><span>建筑</span>
            </button>
            <button className="btn-ghost-dark text-xs flex-col items-center gap-1 py-2" onClick={() => setActivePanel('warehouse')}>
              <SectIcon name="warehouse" size={18} strokeWidth={1.8} /><span>库房</span>
            </button>
            <button className="btn-ghost-dark text-xs flex-col items-center gap-1 py-2" onClick={() => setActivePanel('activities')}>
              <SectIcon name="battle" size={18} strokeWidth={1.8} /><span>活动</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
