import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { SectLevelNames } from '@/types/game';
import { Gem, Star, Calendar, Bell, Menu, Sparkles, Home, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export const TopBar: React.FC = () => {
  const { year, month, sectLevel, reputation, spiritStones, notifications, returnToMenu, nextMonth } = useGameStore();
  const { toggleNotifications, toggleSidebar } = useUIStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const spiritStonesClass = spiritStones < 0 ? 'text-red-400' : 'text-sect-gold';
  
  return (
    <header className="h-16 border-b border-sect-gold/20 bg-sect-ink-dark/80 backdrop-blur-sm flex items-center px-4 sticky top-0 z-40">
      <button
        onClick={toggleSidebar}
        className="hidden max-lg:block p-2 text-sect-jade/60 hover:text-sect-gold mr-2"
      >
        <Menu size={20} />
      </button>
      
      <div className="flex items-center gap-2">
        <Sparkles className="text-sect-gold" size={24} />
        <span className="font-display text-xl text-gold-gradient hidden sm:block">
          宗门录
        </span>
      </div>
      
      <div className="divider-gold w-px h-8 mx-4 hidden md:block" />
      
      <div className="flex items-center gap-1 text-sect-jade/80">
        <Calendar size={16} className="text-sect-gold/80" />
        <span className="font-display">
          第 {year} 年 {month} 月
        </span>
      </div>
      
      <div className="ml-4">
        <Button onClick={nextMonth} size="sm" variant="gold">
          <FastForward size={14} className="mr-1" />
          推进一月
        </Button>
      </div>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-1.5">
          <Star size={16} className="text-yellow-400" />
          <span className="text-sect-jade/60 text-sm hidden sm:inline">声望</span>
          <span className="font-display text-yellow-300">{reputation}</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Gem size={16} className="text-sect-spirit" />
          <span className="text-sect-jade/60 text-sm hidden sm:inline">灵石</span>
          <span className={cn('font-display', spiritStonesClass)}>
            {Math.floor(spiritStones)}
          </span>
        </div>
        
        <div className="divider-gold w-px h-6 hidden md:block" />
        
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-sect-jade/60">宗门</span>
          <span className="font-display text-sect-gold text-sm">
            {SectLevelNames[sectLevel]}
          </span>
        </div>
        
        <button
          onClick={toggleNotifications}
          className="relative p-2 text-sect-jade/60 hover:text-sect-gold transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-sect-pill text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        <button
          onClick={returnToMenu}
          className="p-2 text-sect-jade/60 hover:text-sect-gold transition-colors"
          title="返回主菜单"
        >
          <Home size={20} />
        </button>
      </div>
    </header>
  );
};
