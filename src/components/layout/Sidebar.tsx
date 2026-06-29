import React from 'react';
import { useUIStore, PanelType } from '@/store/uiStore';
import { 
  Home, Users, Building2, TrendingUp, FlaskConical, 
  ScrollText, Crown, X, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { id: PanelType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '宗门总览', icon: <Home size={20} /> },
  { id: 'disciples', label: '弟子管理', icon: <Users size={20} /> },
  { id: 'allocation', label: '弟子分配', icon: <UserPlus size={20} /> },
  { id: 'buildings', label: '建筑设施', icon: <Building2 size={20} /> },
  { id: 'economy', label: '经济收支', icon: <TrendingUp size={20} /> },
  { id: 'warehouse', label: '仓库', icon: <FlaskConical size={20} /> },
  { id: 'rules', label: '门规戒律', icon: <ScrollText size={20} /> },
  { id: 'elders', label: '长老院', icon: <Crown size={20} /> },
];

export const Sidebar: React.FC = () => {
  const { activePanel, setActivePanel, sidebarCollapsed, toggleSidebar } = useUIStore();
  
  return (
    <>
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 w-56 border-r border-sect-gold/20 bg-sect-ink-dark/90 backdrop-blur-sm',
        'transform transition-transform duration-300',
        'flex flex-col',
        sidebarCollapsed 
          ? '-translate-x-full lg:-translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none' 
          : 'translate-x-0'
      )}>
        <div className="p-4 border-b border-sect-gold/10 flex items-center justify-between hidden max-lg:flex">
          <span className="font-display text-sect-gold">导航</span>
          <button onClick={toggleSidebar} className="text-sect-jade/60 hover:text-sect-gold">
            <X size={18} />
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePanel(item.id);
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded transition-all duration-200',
                'text-left',
                activePanel === item.id
                  ? 'bg-sect-gold/15 text-sect-gold border-l-2 border-sect-gold shadow-gold'
                  : 'text-sect-jade/70 hover:bg-sect-gold/5 hover:text-sect-jade border-l-2 border-transparent'
              )}
            >
              <span className={activePanel === item.id ? 'text-sect-gold' : ''}>
                {item.icon}
              </span>
              <span className="font-display text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-sect-gold/10">
          <div className="text-xs text-sect-jade/40 text-center">
            天道酬勤，道法自然
          </div>
        </div>
      </aside>
    </>
  );
};
