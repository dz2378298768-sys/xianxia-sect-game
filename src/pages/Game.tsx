import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { OverviewPanel } from '@/components/OverviewPanel';
import { DisciplesPanel } from '@/components/DisciplesPanel';
import { BuildingsPanel } from '@/components/BuildingsPanel';
import { EconomyPanel } from '@/components/EconomyPanel';
import { WarehousePanel } from '@/components/WarehousePanel';
import { RulesPanel } from '@/components/RulesPanel';
import { EldersPanel } from '@/components/EldersPanel';
import { MonthlyReportModal } from '@/components/MonthlyReportModal';
import { NotificationPanel } from '@/components/NotificationPanel';
import { AllocationPanel } from '@/components/AllocationPanel';
import { MainMenu } from '@/components/MainMenu';

const GameLayout: React.FC = () => {
  const { activePanel } = useUIStore();
  const { 
    gameStarted, showMainMenu, 
    startGame, newGame 
  } = useGameStore();
  
  const renderPanel = () => {
    switch (activePanel) {
      case 'overview': return <OverviewPanel />;
      case 'disciples': return <DisciplesPanel />;
      case 'buildings': return <BuildingsPanel />;
      case 'economy': return <EconomyPanel />;
      case 'warehouse': return <WarehousePanel />;
      case 'rules': return <RulesPanel />;
      case 'elders': return <EldersPanel />;
      case 'allocation': return <AllocationPanel />;
      default: return <OverviewPanel />;
    }
  };
  
  if (showMainMenu) {
    return (
      <MainMenu 
        onStartNew={newGame}
        onContinue={startGame}
      />
    );
  }
  
  if (!gameStarted) {
    return null;
  }
  
  return (
    <div className="h-full w-full paper-bg flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderPanel()}
          </div>
        </main>
      </div>
      <MonthlyReportModal />
      <NotificationPanel />
    </div>
  );
};

export default GameLayout;
