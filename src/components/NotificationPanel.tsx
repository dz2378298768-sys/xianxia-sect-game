import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Bell, CheckCircle, AlertTriangle, Info, XCircle, X
} from 'lucide-react';

export const NotificationPanel: React.FC = () => {
  const { notifications, markNotificationRead } = useGameStore();
  const { showNotifications, toggleNotifications } = useUIStore();
  
  if (!showNotifications) return null;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-green-400" />;
      case 'warning': return <AlertTriangle size={18} className="text-yellow-400" />;
      case 'danger': return <XCircle size={18} className="text-red-400" />;
      default: return <Info size={18} className="text-blue-400" />;
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <>
      <div 
        className="fixed inset-0 z-30 bg-black/30"
        onClick={toggleNotifications}
      />
      <div className="fixed top-16 right-4 z-40 w-80 max-h-96 scroll-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sect-gold/10">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-sect-gold" />
            <span className="font-display text-sect-gold">通知</span>
            {unreadCount > 0 && (
              <Badge variant="pill" size="sm">{unreadCount} 条未读</Badge>
            )}
          </div>
          <button 
            onClick={toggleNotifications}
            className="text-sect-jade/50 hover:text-sect-jade"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sect-jade/40">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y divide-sect-gold/5">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-sect-gold/5 ${
                    !notification.read ? 'bg-sect-gold/5' : ''
                  }`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-sect-jade">
                        {notification.title}
                      </div>
                      <div className="text-xs text-sect-jade/60 mt-0.5">
                        {notification.content}
                      </div>
                      <div className="text-xs text-sect-jade/40 mt-1">
                        第 {notification.timestamp.year} 年 {notification.timestamp.month} 季度
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-sect-gold mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
