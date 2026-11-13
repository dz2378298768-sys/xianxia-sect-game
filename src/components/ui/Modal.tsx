import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useModalPause } from '@/hooks/useModalPause';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 固定在底部的操作区：不随内容滚动，长内容也能直接点到按钮 */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}) => {
  // 所有模态弹窗在打开期间统一暂停游戏时间
  const modalId = useId();
  useModalPause(modalId, isOpen);

  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 modal-overlay">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full flex flex-col max-h-[85vh] scroll-border rounded-lg overflow-hidden',
          sizeClasses[size],
          'animate-modal-fade-in',
          'modal-body',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-sect-gold/20 modal-header shrink-0">
            <h2 className="font-display text-lg text-gold-gradient">{title}</h2>
            <button
              onClick={onClose}
              aria-label="关闭"
              className="flex h-9 w-9 -my-1 -mr-2 items-center justify-center rounded text-sect-jade/60 transition-colors hover:text-sect-gold"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto modal-content flex-1 min-h-0">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-4 py-2.5 border-t border-sect-gold/20 modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
