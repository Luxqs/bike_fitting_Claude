import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner(): React.JSX.Element {
  return (
    <svg
      className="animate-spin h-4 w-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500 ' +
    'disabled:bg-brand-200 disabled:text-brand-400',
  secondary:
    'bg-white text-brand-600 border border-brand-600 hover:bg-brand-50 active:bg-brand-100 ' +
    'focus-visible:ring-brand-500 disabled:border-brand-200 disabled:text-brand-300',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 ' +
    'focus-visible:ring-gray-400 disabled:text-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
    'focus-visible:ring-red-500 disabled:bg-red-200 disabled:text-red-400',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  className = '',
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed select-none';

  const classes = [
    baseClasses,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={classes}
      aria-busy={loading}
    >
      {loading ? (
        <Spinner />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
