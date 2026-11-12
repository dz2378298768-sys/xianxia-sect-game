import React, { useCallback } from 'react';
import { useUIStore, PanelType } from '@/store/uiStore';
import { SectIcon, IconName } from '@/components/icons/SectIcons';

interface NavItem {
  key: PanelType;
  icon: IconName;
  label: string;
}

// 精简后的底部导航：6 个核心面板（时间推进交给顶部常驻时间栏）
const NAV_ITEMS: NavItem[] = [
  { key: 'affairs',    icon: 'chart',     label: '宗务' },
  { key: 'disciples',  icon: 'disciple',  label: '弟子' },
  { key: 'buildings',  icon: 'building',  label: '建造' },
  { key: 'world',      icon: 'world',     label: '世界' },
  { key: 'activities', icon: 'battle',    label: '活动' },
  { key: 'warehouse',  icon: 'warehouse', label: '库房' },
];

export const BottomNav: React.FC = () => {
  const { activePanel, setActivePanel } = useUIStore();

  const handleNavClick = useCallback((key: PanelType) => {
    // 点击已激活的面板 → 关闭
    if (activePanel === key) {
      setActivePanel(null);
    } else {
      setActivePanel(key);
    }
  }, [activePanel, setActivePanel]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bottom-nav-wrap">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item, i) => {
          const isActive = activePanel === item.key;
          return (
            <button
              key={item.key}
              className={`nav-pill nav-pill-compact btn-press ${isActive ? 'nav-pill-active' : ''}`}
              onClick={() => handleNavClick(item.key)}
              title={item.label}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className={`nav-pill-icon ${isActive ? 'nav-pill-icon-active' : ''}`}>
                <SectIcon name={item.icon} size={18} strokeWidth={1.8} />
              </span>
              <span className={`nav-pill-label ${isActive ? 'nav-pill-label-active' : ''}`}>
                {item.label}
              </span>
              {isActive && <span className="nav-pill-glow" />}
            </button>
          );
        })}

        {/* 中央推进按钮已移除：时间由顶部常驻时间栏自动推进，暂停/倍速也在那里 */}
      </div>
    </div>
  );
};