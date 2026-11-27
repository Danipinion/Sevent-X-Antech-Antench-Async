import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'green' | 'brown' | 'yellow' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'green',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap';

  const colors = {
    green: 'bg-[#E6F4EA] text-[#1E4D2B]',
    brown: 'bg-[#F5EBE0] text-[#5C3D2E]',
    yellow: 'bg-[#FFF1CC] text-[#B7791F]',
    orange: 'bg-[#F5A50A] text-[#3D2400]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`${baseStyles} ${colors[color]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};