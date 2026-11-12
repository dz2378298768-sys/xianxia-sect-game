import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  /** 触发元素外层容器的样式（例如在 flex 布局中让触发器占满剩余宽度） */
  wrapperClassName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
  wrapperClassName,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const tooltipWidth = tooltip?.offsetWidth || 200;
    const tooltipHeight = tooltip?.offsetHeight || 80;

    let x = 0, y = 0;
    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2 - tooltipWidth / 2;
        y = rect.top - tooltipHeight - 8;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2 - tooltipWidth / 2;
        y = rect.bottom + 8;
        break;
      case 'left':
        x = rect.left - tooltipWidth - 8;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        x = rect.right + 8;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
    }

    // 确保不超出视口
    const padding = 8;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipWidth - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipHeight - padding));

    setCoords({ x, y });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  // 手机上无法 hover：点击切换显示，点空白处关闭，避免 tooltip 卡在屏幕上
  useEffect(() => {
    if (!isVisible) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-block', wrapperClassName)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(v => !v)}
    >
      {children}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            'fixed z-[9999] max-w-[min(24rem,calc(100vw-16px))] px-3 py-2 text-xs rounded-lg bg-sect-ink-dark border border-sect-gold/30 text-sect-jade pointer-events-none shadow-lg whitespace-normal break-words leading-relaxed',
            'animate-fade-in',
            className
          )}
          style={{ left: coords.x, top: coords.y }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
};