import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { MountainScene } from '@/components/MountainScene';
import { TopBar } from '@/components/TopBar';
import { SideNav } from '@/components/SideNav';
import { MainMenu } from '@/components/MainMenu';
import { MonthlyReportModal } from '@/components/MonthlyReportModal';
import { VictoryModal } from '@/components/VictoryModal';
import { BuildingsPanel } from '@/components/BuildingsPanel';
import { DisciplesPanel } from '@/components/DisciplesPanel';
import { EconomyPanel } from '@/components/EconomyPanel';
import { WarehousePanel } from '@/components/WarehousePanel';
import { EldersPanel } from '@/components/EldersPanel';
import { OverviewPanel } from '@/components/OverviewPanel';
import { AllocationPanel } from '@/components/AllocationPanel';
import { RulesPanel } from '@/components/RulesPanel';
import { SectInfoDrawer } from '@/components/SectInfoDrawer';
import { WorldPanel } from '@/components/WorldPanel';
import { ActivitiesPanel } from '@/components/ActivitiesPanel';
import { OrientationOverlay } from '@/components/OrientationOverlay';
import { EventFeed } from '@/components/EventFeed';
import { ShopPanel } from '@/components/ShopPanel';
import { OpeningGuideModal } from '@/components/OpeningGuideModal';

const GameLayout: React.FC = () => {
  const { buildings, gameStarted, showMainMenu, startGame, newGame, showReport, loadFromSlot } = useGameStore();
  const { activePanel, setActivePanel, selectedBuildingId, setSelectedBuildingId } = useUIStore();

  const renderPanel = () => {
    switch (activePanel) {
      case 'overview': return <OverviewPanel />;
      case 'disciples': return <DisciplesPanel />;
      case 'buildings': return <BuildingsPanel />;
      case 'economy': return <EconomyPanel />;
      case 'warehouse': return <WarehousePanel />;
      case 'elders': return <EldersPanel />;
      case 'allocation': return <AllocationPanel />;
      case 'rules': return <RulesPanel />;
      case 'world': return <WorldPanel />;
      case 'activities': return <ActivitiesPanel />;
      case null: return null;
      default: return null;
    }
  };

  if (showMainMenu) {
    return (
      <MainMenu
        onStartNew={(name) => newGame(name)}
        onContinue={(slotIndex) => {
          // 优先从存档槽位读取；读取失败则继续当前自动存档
          if (!loadFromSlot(slotIndex)) {
            startGame();
          }
        }}
      />
    );
  }

  if (!gameStarted) return null;

  // 统一使用手机端布局：左侧 SideNav + 全屏面板；底部导航已合并到 SideNav，去除重复入口
  return (
    <div className="h-full w-full sect-bg flex flex-col overflow-hidden overflow-x-hidden">
      <OrientationOverlay />
      <TopBar />

      <SectInfoDrawer />

      {/* 核心内容区 */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* 山景背景 */}
        <MountainScene
          buildings={buildings.filter(b => b.status !== 'locked')}
          onBuildingClick={(id) => { setSelectedBuildingId(id); setActivePanel('buildings'); }}
        />

        {/* 山门右下角：宗门事件 feed */}
        <EventFeed />

        {/* 左侧侧边栏导航（手机端导航） */}
        <SideNav />

        {/* 中央全屏面板：仅在有面板时渲染，避免遮挡山门主界面 */}
        {activePanel !== null && (
          <div
            className="absolute scroll-panel-dark compact-fullscreen-panel slide-in-up overflow-y-auto overflow-x-hidden"
            style={{ left: 'var(--side-nav-width)', right: 0, top: '44px', bottom: '0', zIndex: 20 }}
          >
            {renderPanel()}
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showReport && <MonthlyReportModal />}

      {/* 飞升胜利弹窗 */}
      <VictoryModal />

      {/* 坊市商店 */}
      <ShopPanel />

      {/* 开局提醒：灵石获取途径（需求3） */}
      <OpeningGuideModal />
    </div>
  );
};

export default GameLayout;
