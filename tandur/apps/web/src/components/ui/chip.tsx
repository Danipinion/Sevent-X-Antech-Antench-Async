import React from 'react';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'outline',
  size = 'md',
  className = '',
  onRemove,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none';

  const variants = {
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    filled:
      'bg-green-50 text-green-700 border border-green-600 hover:bg-green-100',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Hapus"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </span>
  );
};
