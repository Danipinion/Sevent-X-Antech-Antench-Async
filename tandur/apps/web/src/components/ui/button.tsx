import React from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseStyles =
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
  'bg-[#185b32] hover:bg-[#124827] active:bg-[#0e3a1f] text-white disabled:bg-gray-200 disabled:text-gray-400',
  secondary:
    'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 disabled:bg-gray-100 disabled:text-gray-400',
  outline:
    'border border-green-600 text-green-600 bg-white hover:bg-green-50 active:bg-green-600 active:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:bg-white',
  dark:
    'bg-green-950 hover:bg-green-900 active:bg-green-800 text-white disabled:bg-gray-200 disabled:text-gray-400',
  ghost:
    'bg-transparent text-gray-700 hover:text-green-600 active:bg-green-600 active:text-white disabled:text-gray-300 disabled:bg-transparent',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white disabled:bg-gray-200 disabled:text-gray-400',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-basef',
  lg: 'px-6 py-3 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';