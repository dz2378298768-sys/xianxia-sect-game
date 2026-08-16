import { create } from 'zustand';

/**
 * 精简后的面板类型（从11个合并到6个）
 * affairs = overview + economy + rules + elders + combat
 * disciples = 弟子管理
 * buildings = 建造 + 分配
 * world = 世界探索 + 外交 + 试炼
 * activities = 活动
 * warehouse = 库房 + 商店
 */
export type PanelType = 'affairs' | 'disciples' | 'buildings' | 'world' | 'activities' | 'warehouse';

// 宗门信息抽屉的标签页
export type SectInfoTab = 'overview' | 'elders';

interface UIState {
  activePanel: PanelType | null;  // null 代表山景主视图
  selectedDiscipleId: string | null;
  selectedBuildingId: string | null;
  showNotifications: boolean;
  sidebarCollapsed: boolean;
  // 左上角"修仙宗门"抽屉
  sectInfoOpen: boolean;
  sectInfoTab: SectInfoTab;
  showShop: boolean;
  showOpeningGuide: boolean;
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
  activePanel: null,
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