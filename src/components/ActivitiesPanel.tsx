import React from 'react';
import { TournamentPanel } from '@/components/TournamentPanel';
import { SectIcon } from '@/components/icons/SectIcons';

/**
 * 活动面板：聚合「山门大比」与「宗门大比」两类赛事
 */
export const ActivitiesPanel: React.FC = () => {
  return (
    <div className="space-y-5 p-3">
      {/* 面板标题 */}
      <div className="flex items-center gap-2 border-b border-sect-ink-light/20 pb-2">
        <span className="p-1.5 rounded-lg bg-sect-gold/10">
          <SectIcon name="battle" size={18} strokeWidth={1.8} className="text-sect-gold" />
        </span>
        <div>
          <h1 className="font-display text-base text-gold-gradient">宗门活动</h1>
          <p className="text-sect-jade/50 text-[10px]">管理山门大比与天下宗门大比</p>
        </div>
      </div>

      {/* 山门大比 */}
      <div className="scroll-panel-dark p-3">
        <div className="flex items-center gap-2 mb-3">
          <SectIcon name="battle" size={16} strokeWidth={1.8} className="text-sect-gold" />
          <h2 className="font-display text-xs text-sect-gold tracking-wider">山门大比</h2>
        </div>
        <TournamentPanel scope="sect" />
      </div>

      {/* 宗门大比 */}
      <div className="scroll-panel-dark p-3">
        <div className="flex items-center gap-2 mb-3">
          <SectIcon name="world" size={16} strokeWidth={1.8} className="text-sect-gold" />
          <h2 className="font-display text-xs text-sect-gold tracking-wider">宗门大比</h2>
        </div>
        <TournamentPanel scope="inter-sect" />
      </div>
    </div>
  );
};