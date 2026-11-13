import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
  hoverable?: boolean;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  footer,
  hoverable = false,
  icon,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'card-ancient',
        hoverable && 'hover:border-sect-gold/40 cursor-pointer',
        className
      )}
      {...props}
    >
      {title && (
        <div className="card-head px-2 pb-2 mb-2 border-b border-[rgba(212,168,87,0.1)]">
          <h3 className="font-display text-[13px] tracking-[0.5px] text-[var(--gold-300)] flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </h3>
        </div>
      )}
      <div className="card-body p-2">{children}</div>
      {footer && (
        <div className="card-foot px-2 py-2 mt-2 border-t border-[rgba(212,168,87,0.1)]">{footer}</div>
      )}
    </div>
  );
};
