import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'gold' | 'spirit' | 'herb' | 'pill' | 'default';
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'gold',
  size = 'md',
  showText = false,
  className,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    gold: 'bg-gradient-to-r from-sect-gold-dark to-sect-gold-light',
    spirit: 'bg-gradient-to-r from-purple-700 to-purple-400',
    herb: 'bg-gradient-to-r from-green-700 to-green-400',
    pill: 'bg-gradient-to-r from-orange-700 to-orange-400',
    default: 'bg-gradient-to-r from-gray-600 to-gray-400',
  };
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
  };
  
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('progress-bar', sizeClasses[size])}>
        <div
          className={cn('progress-fill', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <div className="text-xs text-sect-jade/60 mt-1 text-right">
          {Math.floor(value)} / {max}
        </div>
      )}
    </div>
  );
};
