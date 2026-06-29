import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'spirit' | 'herb' | 'pill' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
}) => {
  const variants = {
    gold: 'bg-sect-gold/20 text-sect-gold border-sect-gold/30',
    spirit: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    herb: 'bg-green-500/20 text-green-300 border-green-500/30',
    pill: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    default: 'bg-sect-jade/10 text-sect-jade/80 border-sect-jade/20',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
