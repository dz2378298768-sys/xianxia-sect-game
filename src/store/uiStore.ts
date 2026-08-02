import { create } from 'zustand';

export type PanelType = 'overview' | 'disciples' | 'buildings' | 'economy' | 'warehouse' | 'rules' | 'elders' | 'allocation' | 'world' | 'activities';

// 移动端可切换的侧边面板类型
export type MobileSidePanel = 'stats' | 'tasks' | null;

// 宗门信息抽屉的标签页：修炼（OverviewPanel）+ 宗门战（EldersPanel）
export type SectInfoTab = 'overview' | 'elders';

interface UIState {
  activePanel: PanelType | null;  // null 代表山景主视图（无中央面板覆盖）
  selectedDiscipleId: string | null;
  selectedBuildingId: string | null;
  showNotifications: boolean;
  sidebarCollapsed: boolean;
  mobileSidePanel: MobileSidePanel;
  // 左上角"修仙宗门"抽屉
  sectInfoOpen: boolean;
  sectInfoTab: SectInfoTab;
  showShop: boolean;

  setActivePanel: (panel: PanelType | null) => void;
  setSelectedDiscipleId: (id: string | null) => void;
  setSelectedBuildingId: (id: string | null) => void;
  toggleNotifications: () => void;
  toggleSidebar: () => void;
  setMobileSidePanel: (panel: MobileSidePanel) => void;
  setSectInfoOpen: (open: boolean) => void;
  toggleSectInfo: () => void;
  setSectInfoTab: (tab: SectInfoTab) => void;
  toggleShop: () => void;
  setShopOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: null,  // 初始显示山景主界面
  selectedDiscipleId: null,
  selectedBuildingId: null,
  showNotifications: false,
  sidebarCollapsed: false,
  mobileSidePanel: null,
  sectInfoOpen: false,
  sectInfoTab: 'overview',
  showShop: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedDiscipleId: (id) => set({ selectedDiscipleId: id }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  toggleNotifications: () => set(state => ({ showNotifications: !state.showNotifications })),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidePanel: (panel) => set(state => ({ mobileSidePanel: state.mobileSidePanel === panel ? null : panel })),
  setSectInfoOpen: (open) => set({ sectInfoOpen: open }),
  toggleSectInfo: () => set(state => ({ sectInfoOpen: !state.sectInfoOpen })),
  setSectInfoTab: (tab) => set({ sectInfoTab: tab }),
  toggleShop: () => set(state => ({ showShop: !state.showShop })),
  setShopOpen: (open) => set({ showShop: open }),
}));
