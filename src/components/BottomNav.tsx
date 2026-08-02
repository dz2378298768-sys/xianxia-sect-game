import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { PanelType } from '@/store/uiStore';
import { useDevice } from '@/hooks/useDevice';
import { useGameStore } from '@/store/gameStore';
import { SectIcon, IconName } from '@/components/icons/SectIcons';

// null 代表山景主界面（不显示中央面板）
type NavKey = PanelType | null;

interface NavItem {
  key: NavKey;
  icon: IconName;
  label: string;
}

// 左侧三项（去掉"山门"，山景为默认首屏；回到山景只要关闭面板即可）
const NAV_LEFT: NavItem[] = [
  { key: 'buildings', icon: 'building', label: '建造' },
  { key: 'disciples', icon: 'disciple', label: '弟子' },
  { key: 'rules', icon: 'scroll', label: '门规' },
];

// 右侧三项
const NAV_RIGHT: NavItem[] = [
  { key: 'warehouse', icon: 'warehouse', label: '库房' },
  { key: 'economy', icon: 'gem', label: '经济' },
  { key: 'world', icon: 'world', label: '世界' },
];

export const BottomNav: React.FC = () => {
  const { activePanel, setActivePanel } = useUIStore();
  const { nextMonth } = useGameStore();
  const device = useDevice();
  const isCompact = device.isCompact;
  const iconSize = isCompact ? 18 : 22;

  const renderNavItem = (item: NavItem) => {
    const isActive = activePanel === item.key;
    return (
      <button
        key={item.key ?? 'mountain'}
        className={`nav-pill ${isActive ? 'nav-pill-active' : ''} ${isCompact ? 'nav-pill-compact' : ''}`}
        onClick={() => setActivePanel(item.key)}
        title={item.label}
      >
        <span className={`nav-pill-icon ${isActive ? 'nav-pill-icon-active' : ''}`}>
          <SectIcon name={item.icon} size={iconSize} strokeWidth={1.8} />
        </span>
        <span className={`nav-pill-label ${isActive ? 'nav-pill-label-active' : ''}`}>
          {item.label}
        </span>
        {isActive && <span className="nav-pill-glow" />}
      </button>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bottom-nav-wrap">
      <div className="bottom-nav-inner">
        {/* 左侧导航 */}
        <div className="bottom-nav-group">
          {NAV_LEFT.map(renderNavItem)}
        </div>

        {/* 中央：推进下一回合 */}
        <span className="nav-next-turn-wrap">
        <button
          className={`nav-next-turn ${isCompact ? 'nav-next-turn-compact' : ''}`}
          onClick={nextMonth}
          title="推进至下一月"
        >
          <span className="nav-next-turn-icon">
            <SectIcon name="nextMonth" size={isCompact ? 18 : 22} strokeWidth={2} />
          </span>
          <span className="nav-next-turn-label">
            {isCompact ? '下一月' : '推进下一回合'}
          </span>
        </button>
        </span>

        {/* 右侧导航 */}
        <div className="bottom-nav-group">
          {NAV_RIGHT.map(renderNavItem)}
        </div>
      </div>
    </div>
  );
};
