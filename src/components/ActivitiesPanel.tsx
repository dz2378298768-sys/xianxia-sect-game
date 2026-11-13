import React from 'react';
import { TournamentPanel } from '@/components/TournamentPanel';
import { SectIcon } from '@/components/icons/SectIcons';

/**
 * 活动面板：聚合「山门大比」与「宗门大比」两类赛事
 * 两个大比各自带标题与配置，这里只保留面板级标题，避免重复层级
 */
export const ActivitiesPanel: React.FC = () => {
  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2 border-b border-sect-ink-light/20 pb-2">
        <span className="p-1.5 rounded-lg bg-sect-gold/10">
          <SectIcon name="battle" size={18} strokeWidth={1.8} className="text-sect-gold" />
        </span>
        <div>
          <h1 className="font-display text-base text-gold-gradient">宗门活动</h1>
          <p className="text-sect-jade/50 text-[10px]">管理山门大比与天下宗门大比</p>
        </div>
      </div>

      <TournamentPanel scope="sect" />
      <TournamentPanel scope="inter-sect" />
    </div>
  );
};
