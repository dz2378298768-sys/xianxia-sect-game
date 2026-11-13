import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { MountainScene } from '@/components/MountainScene';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { MainMenu } from '@/components/MainMenu';
import { MonthlyReportModal } from '@/components/MonthlyReportModal';
import { VictoryModal } from '@/components/VictoryModal';
import { BuildingsPanel } from '@/components/BuildingsPanel';
import { DisciplesPanel } from '@/components/DisciplesPanel';
import { WarehousePanel } from '@/components/WarehousePanel';
import { OverviewPanel } from '@/components/OverviewPanel';
import { RulesPanel } from '@/components/RulesPanel';
import { SectInfoDrawer } from '@/components/SectInfoDrawer';
import { WorldPanel } from '@/components/WorldPanel';
import { ActivitiesPanel } from '@/components/ActivitiesPanel';
import { OrientationOverlay } from '@/components/OrientationOverlay';
import { EventFeed } from '@/components/EventFeed';
import { EventHistoryModal } from '@/components/EventHistoryModal';
import { TasksPanel } from '@/components/TasksPanel';
import { useDevice } from '@/hooks/useDevice';
import { useModalPause } from '@/hooks/useModalPause';
import { ReportBadge } from '@/components/ReportBadge';
import { TimeControls } from '@/components/TimeControls';
import { GameClock } from '@/components/GameClock';
import { EventModal } from '@/components/EventModal';
import { ShopPanel } from '@/components/ShopPanel';
import { OpeningGuideModal } from '@/components/OpeningGuideModal';
import { SiegeReportModal } from '@/components/SiegeReportModal';
import { SectCombatPanel } from '@/components/SectCombatPanel';
import { ChoiceEventModal } from '@/components/ChoiceEventModal';
import { ExplorationEncounterModal } from '@/components/ExplorationModal';
import { EconomyPanel } from '@/components/EconomyPanel';
import { EldersPanel } from '@/components/EldersPanel';
import { AllocationPanel } from '@/components/AllocationPanel';
import { SectIcon } from '@/components/icons/SectIcons';
import { playClick, playConfirm, playCancel, playNotify, playLevelUp, playError } from '@/utils/sound';
import { playBGM, hasBGMStarted } from '@/utils/audio';

/**
 * 合并面板容器：affairs = overview + economy + rules + elders + combat
 * 使用标签页切换子面板
 */
const AffairsPanel: React.FC = () => {
  const [tab, setTab] = React.useState<'overview' | 'economy' | 'rules' | 'elders' | 'combat'>('overview');
  const tabs = [
    { key: 'overview' as const, label: '总览' },
    { key: 'economy' as const, label: '经济' },
    { key: 'rules' as const, label: '门规' },
    { key: 'elders' as const, label: '长老' },
    { key: 'combat' as const, label: '战力' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/30'
                : 'text-sect-jade/60 hover:text-sect-jade/80 border border-transparent'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {tab === 'overview' && <OverviewPanel />}
        {tab === 'economy' && <EconomyPanel />}
        {tab === 'rules' && <RulesPanel />}
        {tab === 'elders' && <EldersPanel />}
        {tab === 'combat' && <SectCombatPanel />}
      </div>
    </div>
  );
};

/**
 * 建造面板合并容器：buildings + allocation
 */
const BuildingsPanelContainer: React.FC = () => {
  const [tab, setTab] = React.useState<'buildings' | 'allocation'>('buildings');

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-2 pt-2 pb-1">
        <button
          className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
            tab === 'buildings'
              ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/30'
              : 'text-sect-jade/60 hover:text-sect-jade/80 border border-transparent'
          }`}
          onClick={() => setTab('buildings')}
        >建造</button>
        <button
          className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
            tab === 'allocation'
              ? 'bg-sect-gold/20 text-sect-gold border border-sect-gold/30'
              : 'text-sect-jade/60 hover:text-sect-jade/80 border border-transparent'
          }`}
          onClick={() => setTab('allocation')}
        >分配</button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {tab === 'buildings' && <BuildingsPanel />}
        {tab === 'allocation' && <AllocationPanel />}
      </div>
    </div>
  );
};

/**
 * 主界面速览：左上角常驻三枚数值胶囊，点击直达对应面板。
 * 数据只取已有状态，避免与顶栏重复展示。
 */
const HomeHud: React.FC = () => {
  const disciples = useGameStore(s => s.disciples);
  const buildings = useGameStore(s => s.buildings);
  const lastNet = useGameStore(s => {
    const last = s.spiritStoneHistory[s.spiritStoneHistory.length - 1];
    return last ? last.netIncome : null;
  });
  const setActivePanel = useUIStore(s => s.setActivePanel);

  const activeBuildings = buildings.filter(b => b.status === 'active').length;

  return (
    <div className="home-hud">
      <button className="home-hud-chip" onClick={() => setActivePanel('disciples')} title="查看弟子">
        <SectIcon name="disciple" size={13} strokeWidth={1.8} />
        <span className="home-hud-label">弟子</span>
        <b className="home-hud-value">{disciples.length}</b>
      </button>
      <button className="home-hud-chip" onClick={() => setActivePanel('buildings')} title="查看建造">
        <SectIcon name="building" size={13} strokeWidth={1.8} />
        <span className="home-hud-label">建筑</span>
        <b className="home-hud-value">{activeBuildings}/{buildings.length}</b>
      </button>
      <button className="home-hud-chip" onClick={() => setActivePanel('affairs')} title="查看宗务">
        <SectIcon name={lastNet !== null && lastNet < 0 ? 'trendDown' : 'trendUp'} size={13} strokeWidth={1.8} />
        <span className="home-hud-label">月净</span>
        <b className={`home-hud-value ${lastNet === null ? '' : lastNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {lastNet === null ? '—' : `${lastNet >= 0 ? '+' : ''}${lastNet}`}
        </b>
      </button>
    </div>
  );
};

const GameLayout: React.FC = () => {
  const { buildings, gameStarted, showMainMenu, startGame, newGame, reportView, loadFromSlot } = useGameStore();
  const { activePanel, setActivePanel, selectedBuildingId, setSelectedBuildingId, mobileSidePanel, setMobileSidePanel } = useUIStore();
  const device = useDevice();
  const isCompact = device.isCompact;

  // 面板动画状态
  const [panelAnim, setPanelAnim] = React.useState<'enter' | 'exit' | 'idle'>('idle');
  const prevPanelRef = React.useRef<typeof activePanel>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activePanel && activePanel !== prevPanelRef.current) {
      // 新面板打开
      setPanelAnim('enter');
      const timer = setTimeout(() => setPanelAnim('idle'), 350);
      prevPanelRef.current = activePanel;
      return () => clearTimeout(timer);
    } else if (!activePanel) {
      setPanelAnim('idle');
      prevPanelRef.current = null;
    }
  }, [activePanel]);

  // 游戏开始后，在首次用户点击时启动 BGM + 音效
  React.useEffect(() => {
    if (!gameStarted) return;

    const handler = () => {
      // 首次交互启动 BGM
      if (!hasBGMStarted()) {
        playBGM();
      }
    };

    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, [gameStarted]);

  const renderPanel = () => {
    switch (activePanel) {
      case 'affairs': return <AffairsPanel />;
      case 'disciples': return <DisciplesPanel />;
      case 'buildings': return <BuildingsPanelContainer />;
      case 'world': return <WorldPanel />;
      case 'activities': return <ActivitiesPanel />;
      case 'warehouse': return <WarehousePanel />;
      case null: return null;
      default: return null;
    }
  };

  if (showMainMenu) {
    return (
      <MainMenu
        onStartNew={(name) => newGame(name)}
        onContinue={(slotIndex) => {
          if (!loadFromSlot(slotIndex)) {
            startGame();
          }
        }}
      />
    );
  }

  if (!gameStarted) return null;

  return (
    <div className="h-full w-full sect-bg flex flex-col overflow-hidden overflow-x-hidden">
      <GameClock />
      <OrientationOverlay />
      {/* 常驻 HUD：顶栏 + 时间栏在所有游戏界面（含面板、任务浮层）之上保持可见 */}
      <div className="game-hud">
        <TopBar />
        <TimeControls />
      </div>
      <SectInfoDrawer />

      {/* 核心内容区 */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* 山景背景 */}
        <MountainScene
          buildings={buildings.filter(b => b.status !== 'locked')}
          onBuildingClick={(id) => { setSelectedBuildingId(id); setActivePanel('buildings'); }}
        />

        {/* 主界面速览（打开面板时隐藏） */}
        {activePanel === null && mobileSidePanel !== 'tasks' && <HomeHud />}

        {/* 桌面端：左侧任务与异闻浮动面板（位于速览胶囊下方） */}
        {!isCompact && activePanel === null && <TasksPanel />}

        {/* 山门右下角：宗门事件 feed（打开面板时隐藏，避免遮挡） */}
        {activePanel === null && mobileSidePanel !== 'tasks' && <EventFeed />}
        <ReportBadge />

        {/* 紧凑布局：任务入口（内容区右上，位于时间条下方） */}
        {isCompact && activePanel === null && mobileSidePanel !== 'tasks' && (
          <button
            className="absolute right-2 top-2 z-30 px-3.5 py-2 rounded-full scroll-panel-dark text-[var(--gold-200)] text-[12px] btn-press"
            onClick={() => setMobileSidePanel('tasks')}
            title="任务与异闻"
          >
            任务
          </button>
        )}

        {/* 全屏面板：底部导航触发 */}
        {activePanel !== null && (
          <div
            ref={panelRef}
            className={`absolute inset-0 z-20 bg-[var(--ink-900)] flex flex-col overflow-hidden ${panelAnim === 'enter' ? 'panel-enter' : ''}`}
          >
            {/* 面板头部：标题 + 关闭按钮 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-sect-ink-light/30">
              <span className="text-[12.5px] font-display text-sect-gold">
                {activePanel === 'affairs' && '宗务'}
                {activePanel === 'disciples' && '弟子'}
                {activePanel === 'buildings' && '建造'}
                {activePanel === 'world' && '世界'}
                {activePanel === 'activities' && '活动'}
                {activePanel === 'warehouse' && '库房'}
              </span>
              <button
                className="text-sect-jade/60 hover:text-sect-jade text-[12px] px-2.5 py-1.5 -mr-1"
                onClick={() => setActivePanel(null)}
              >
                关闭
              </button>
            </div>
            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 panel-scrollbar pb-[70px]">
              {renderPanel()}
            </div>
          </div>
        )}
        {/* 移动端：任务与异闻浮层（放在内容区内，天然让出顶部时间 HUD） */}
        {isCompact && mobileSidePanel === 'tasks' && (
          <div className="absolute inset-0 z-30 scroll-panel-dark p-2 pb-16">
            <TasksPanel mobileMode />
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <BottomNav />


      {/* 模态框 */}
      {reportView && <MonthlyReportModal />}

      {/* 随机事件弹窗 */}
      <EventModal />

      {/* 飞升胜利弹窗 */}
      <VictoryModal />
      <ShopPanel />
      <OpeningGuideModal />
      <SiegeReportModal />
      <ChoiceEventModal />
      <ExplorationEncounterModal />
      <EventHistoryModal />
      <SectCollapseModal />
      <ReturnToMenuConfirmModal />
    </div>
  );
};

/** 宗门灭亡弹窗 */
const SectCollapseModal: React.FC = () => {
  const { sectCollapsed, sectCollapseReason, sectName, newGame, returnToMenu } = useGameStore();
  useModalPause('sect-collapse', sectCollapsed);
  if (!sectCollapsed) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
      <div className="scroll-panel-dark slide-in-up max-w-sm w-full p-6 flex flex-col gap-4 text-center">
        <div className="text-4xl">💀</div>
        <h2 className="font-display text-xl" style={{ color: 'var(--gold-200)' }}>道统断绝</h2>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--ink-300)' }}>
          {sectCollapseReason}
        </div>
        <div className="flex gap-2">
          <button className="btn-ink flex-1 text-xs" onClick={() => newGame(sectName || '')}>
            重新开局
          </button>
          <button className="btn-ink flex-1 text-xs" onClick={returnToMenu}>
            返回主菜单
          </button>
        </div>
      </div>
    </div>
  );
};

/** 返回主菜单确认弹窗 */
const ReturnToMenuConfirmModal: React.FC = () => {
  const { returnToMenuConfirm, setReturnToMenuConfirm, returnToMenu } = useGameStore();

  useModalPause('return-to-menu', returnToMenuConfirm);

  if (!returnToMenuConfirm) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
      <div className="scroll-panel-dark slide-in-up max-w-sm w-full p-6 flex flex-col gap-4 text-center">
        {/* 顶部装饰 */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--gold-400)]/60" />
          <span className="text-[var(--gold-400)]/60 text-[10px]">◆</span>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--gold-400)]/60" />
        </div>

        {/* 图标 */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
          style={{ background: 'rgba(212,168,87,0.12)', border: '1px solid rgba(212,168,87,0.2)' }}>
          <SectIcon name="mountain" size={24} strokeWidth={1.6} />
        </div>

        {/* 标题 */}
        <h2 className="font-display text-lg" style={{ color: 'var(--gold-200)' }}>
          返回主菜单
        </h2>

        {/* 提示文字 */}
        <div className="text-xs leading-relaxed px-3 py-3 rounded"
          style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(212,168,87,0.1)', color: 'var(--ink-300)' }}>
          确定返回主菜单？当前进度不会自动保存。
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            className="flex-1 text-xs px-3 py-2.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(13,17,23,0.6)',
              border: '1px solid rgba(212,168,87,0.2)',
              color: 'var(--gold-300)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,87,0.5)'; e.currentTarget.style.background = 'rgba(212,168,87,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,168,87,0.2)'; e.currentTarget.style.background = 'rgba(13,17,23,0.6)'; }}
            onClick={() => setReturnToMenuConfirm(false)}
          >
            取消
          </button>
          <button
            className="flex-1 text-xs px-3 py-2.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(180,60,50,0.15)',
              border: '1px solid rgba(180,60,50,0.3)',
              color: '#e8857a',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,60,50,0.6)'; e.currentTarget.style.background = 'rgba(180,60,50,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(180,60,50,0.3)'; e.currentTarget.style.background = 'rgba(180,60,50,0.15)'; }}
            onClick={() => {
              setReturnToMenuConfirm(false);
              returnToMenu();
            }}
          >
            确认返回
          </button>
        </div>

        {/* 底部装饰 */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--gold-400)]/40" />
          <span className="text-[var(--gold-400)]/40 text-[8px]">◇</span>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--gold-400)]/40" />
        </div>
      </div>
    </div>
  );
};

export default GameLayout;