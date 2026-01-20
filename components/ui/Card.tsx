/**
 * Card Component - Enterprise Design System
 * Reusable card component with consistent styling
 */

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ 
  children, 
  variant = 'default', 
  padding = 'md',
  className = '',
  hover = false,
  onClick
}: CardProps) {
  const baseClasses = 'rounded-xl bg-white transition-all duration-200';
  
  const variantClasses = {
    default: 'shadow-md border border-gray-200',
    elevated: 'shadow-lg border border-gray-200',
    bordered: 'border-2 border-gray-300'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const hoverClasses = hover || onClick ? 'hover:shadow-xl cursor-pointer' : '';
  const clickClasses = onClick ? 'active:scale-[0.98]' : '';
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${clickClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
