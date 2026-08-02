import React from 'react';
import { useDevice } from '@/hooks/useDevice';
import { SectIcon } from '@/components/icons/SectIcons';

/**
 * 手机竖屏时显示旋转提示遮罩
 * 仅在移动端 + 竖屏时显示
 */
export const OrientationOverlay: React.FC = () => {
  const { isMobile, isPortrait } = useDevice();

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--ink-900)] select-none">
      <div className="animate-pulse mb-6">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--gold-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      </div>
      <h2 className="font-display text-xl text-[var(--gold-200)] mb-2 tracking-widest">请横置设备</h2>
      <p className="text-sm text-[var(--ink-300)] text-center px-8">
        本游戏为横屏模式，旋转您的设备以获得最佳体验
      </p>
      <div className="mt-8 flex items-center gap-2 text-[var(--gold-400)] animate-bounce">
        <SectIcon name="mobile" size={24} strokeWidth={1.8} />
        <SectIcon name="arrowRight" size={20} strokeWidth={1.8} />
        <span className="font-display text-xl">横屏</span>
      </div>
    </div>
  );
};
