import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) => {
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
          'relative w-full scroll-border rounded-lg overflow-hidden',
          sizeClasses[size],
          'animate-modal-fade-in',
          'modal-body',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-sect-gold/20 modal-header">
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
        <div className="p-4 max-h-[85vh] overflow-y-auto modal-content pb-[70px]">
          {children}
        </div>
      </div>
    </div>
  );
};
