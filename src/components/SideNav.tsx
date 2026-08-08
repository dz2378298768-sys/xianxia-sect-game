import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { PanelType } from '@/store/uiStore';
import { useGameStore } from '@/store/gameStore';
import { SectIcon, IconName } from '@/components/icons/SectIcons';

type NavKey = PanelType | null | 'sect';

interface NavItem {
  key: NavKey;
  icon: IconName;
  label: string;
}

// 完整侧边导航列表：山门 + 所有面板 + 中央“下一月”按钮
const NAV_ITEMS: NavItem[] = [
  { key: 'overview',   icon: 'chart',      label: '总览' },
  { key: null,         icon: 'mountain',   label: '山门' },
  { key: 'disciples',  icon: 'disciple',   label: '弟子' },
  { key: 'allocation', icon: 'group',      label: '分配' },
  { key: 'elders',     icon: 'balance',    label: '长老' },
  { key: 'buildings',  icon: 'building',   label: '建造' },
  { key: 'rules',      icon: 'scroll',     label: '门规' },
  { key: 'warehouse',  icon: 'warehouse',  label: '库房' },
  { key: 'economy',    icon: 'gem',        label: '经济' },
  { key: 'world',      icon: 'world',      label: '世界' },
  { key: 'activities', icon: 'battle',     label: '活动' },
];

export const SideNav: React.FC = () => {
  const { activePanel, setActivePanel, sectInfoOpen, setSectInfoOpen } = useUIStore();
  const { nextMonth } = useGameStore();

  const handleNavClick = (item: NavItem) => {
    if (item.key === 'sect') {
      // 宗门按键：切换宗门信息抽屉（全屏）
      setSectInfoOpen(!sectInfoOpen);
    } else {
      // 其他按键：关闭宗门抽屉，切换面板
      if (sectInfoOpen) setSectInfoOpen(false);
      setActivePanel(item.key as PanelType | null);
    }
  };

  const isItemActive = (item: NavItem) => {
    if (item.key === 'sect') return sectInfoOpen;
    return !sectInfoOpen && activePanel === item.key;
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item);
    return (
      <button
        key={item.key ?? 'mountain'}
        className={`side-nav-item ${isActive ? 'side-nav-item-active' : ''}`}
        onClick={() => handleNavClick(item)}
        title={item.label}
      >
        <SectIcon name={item.icon} size={18} strokeWidth={1.8} />
        <span className="side-nav-label">{item.label}</span>
        {isActive && <span className="side-nav-indicator" />}
      </button>
    );
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 z-30 side-nav-wrap flex flex-col items-center py-2 overflow-hidden">
      {/* 上半部分：功能导航（高度不足时可滚动，避免挤出下一月按钮） */}
      <div className="flex flex-col gap-1 w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">
        {NAV_ITEMS.map(renderNavItem)}
      </div>

      {/* 下半部分：推进下一回合（固定在底部，不可压缩） */}
      <div className="w-full flex-shrink-0">
        <button
          className="side-nav-item side-nav-next-turn"
          onClick={nextMonth}
          title="推进至下一月"
        >
          <SectIcon name="nextMonth" size={20} strokeWidth={2} />
          <span className="side-nav-label">下一月</span>
        </button>
      </div>
    </div>
  );
};
