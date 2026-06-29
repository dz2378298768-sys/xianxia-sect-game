import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'gold',
  size = 'md',
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded transition-all duration-300 relative overflow-hidden';
  
  const variants = {
    gold: 'btn-gold',
    ghost: 'btn-ghost',
    outline: 'border border-sect-gold/40 text-sect-gold hover:bg-sect-gold/10 hover:border-sect-gold/60',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2 text-sm',
    lg: 'px-8 py-3 text-base',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
