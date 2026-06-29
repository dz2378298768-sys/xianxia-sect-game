import { create } from 'zustand';

export type PanelType = 'overview' | 'disciples' | 'buildings' | 'economy' | 'warehouse' | 'rules' | 'elders' | 'allocation';

interface UIState {
  activePanel: PanelType;
  selectedDiscipleId: string | null;
  selectedBuildingId: string | null;
  showNotifications: boolean;
  sidebarCollapsed: boolean;
  
  setActivePanel: (panel: PanelType) => void;
  setSelectedDiscipleId: (id: string | null) => void;
  setSelectedBuildingId: (id: string | null) => void;
  toggleNotifications: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'overview',
  selectedDiscipleId: null,
  selectedBuildingId: null,
  showNotifications: false,
  sidebarCollapsed: false,
  
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedDiscipleId: (id) => set({ selectedDiscipleId: id }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  toggleNotifications: () => set(state => ({ showNotifications: !state.showNotifications })),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
