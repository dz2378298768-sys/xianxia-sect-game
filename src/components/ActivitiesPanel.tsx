import React from 'react';
import { TournamentPanel } from '@/components/TournamentPanel';
import { SectIcon } from '@/components/icons/SectIcons';

/**
 * 活动面板：聚合「山门大比」与「宗门大比」两类赛事
 *
 * 从原 DisciplesPanel（山门大比）与 WorldPanel（宗门大比）中抽出，
 * 统一放在左侧导航的「活动」入口下，避免遮挡弟子/世界主列表。
 */
export const ActivitiesPanel: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl text-gold-gradient flex items-center gap-2">
          <SectIcon name="battle" size={20} strokeWidth={1.8} className="text-sect-gold" />
          宗门活动
        </h1>
        <p className="text-sect-jade/60 text-xs mt-1">
          管理山门大比与天下宗门大比两类赛事
        </p>
      </div>

      {/* 山门大比：本宗门内部弟子比试 */}
      <div>
        <h2 className="font-display text-lg text-gold-gradient mb-3 flex items-center gap-2">
          <SectIcon name="battle" size={18} strokeWidth={1.8} className="text-sect-gold" />
          山门大比
        </h2>
        <TournamentPanel scope="sect" />
      </div>

      {/* 宗门大比：天下宗门之间的比试 */}
      <div>
        <h2 className="font-display text-lg text-gold-gradient mb-3 flex items-center gap-2">
          <SectIcon name="world" size={18} strokeWidth={1.8} className="text-sect-gold" />
          宗门大比
        </h2>
        <TournamentPanel scope="inter-sect" />
      </div>
    </div>
  );
};
