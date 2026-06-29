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
        <div className="px-4 py-3 border-b border-sect-gold/10">
          <h3 className="font-display text-sect-gold text-lg flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-sect-gold/10">{footer}</div>
      )}
    </div>
  );
};
