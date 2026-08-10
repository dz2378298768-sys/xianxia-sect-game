import { create } from 'zustand';

export type PanelType = 'overview' | 'disciples' | 'buildings' | 'economy' | 'warehouse' | 'rules' | 'elders' | 'allocation' | 'world' | 'activities';

// 宗门信息抽屉的标签页：修炼（OverviewPanel）+ 宗门战（EldersPanel）
export type SectInfoTab = 'overview' | 'elders';

interface UIState {
  activePanel: PanelType | null;  // null 代表山景主视图（无中央面板覆盖）
  selectedDiscipleId: string | null;
  selectedBuildingId: string | null;
  showNotifications: boolean;
  sidebarCollapsed: boolean;
  // 左上角"修仙宗门"抽屉
  sectInfoOpen: boolean;
  sectInfoTab: SectInfoTab;
  showShop: boolean;
  // 开局提醒弹窗（需求3）：新游戏开始时展示灵石获取途径
  showOpeningGuide: boolean;
  // 围攻战报弹窗：本宗被攻时展示战斗详情与物资损失
  siegeReport: import('./siegeReport').SiegeReportData | null;

  setActivePanel: (panel: PanelType | null) => void;
  setSelectedDiscipleId: (id: string | null) => void;
  setSelectedBuildingId: (id: string | null) => void;
  toggleNotifications: () => void;
  toggleSidebar: () => void;
  setSectInfoOpen: (open: boolean) => void;
  toggleSectInfo: () => void;
  setSectInfoTab: (tab: SectInfoTab) => void;
  toggleShop: () => void;
  setShopOpen: (open: boolean) => void;
  setShowOpeningGuide: (open: boolean) => void;
  setSiegeReport: (report: import('./siegeReport').SiegeReportData | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: null,  // 初始显示山景主界面
  selectedDiscipleId: null,
  selectedBuildingId: null,
  showNotifications: false,
  sidebarCollapsed: false,
  sectInfoOpen: false,
  sectInfoTab: 'overview',
  showShop: false,
  showOpeningGuide: false,
  siegeReport: null,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedDiscipleId: (id) => set({ selectedDiscipleId: id }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  toggleNotifications: () => set(state => ({ showNotifications: !state.showNotifications })),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSectInfoOpen: (open) => set({ sectInfoOpen: open }),
  toggleSectInfo: () => set(state => ({ sectInfoOpen: !state.sectInfoOpen })),
  setSectInfoTab: (tab) => set({ sectInfoTab: tab }),
  toggleShop: () => set(state => ({ showShop: !state.showShop })),
  setShopOpen: (open) => set({ showShop: open }),
  setShowOpeningGuide: (open) => set({ showOpeningGuide: open }),
  setSiegeReport: (report) => set({ siegeReport: report }),
}));
