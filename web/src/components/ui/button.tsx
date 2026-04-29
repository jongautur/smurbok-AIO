import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  primary:     'text-white hover:opacity-90',
  secondary:   'hover:opacity-80',
  ghost:       'hover:opacity-70',
  destructive: 'text-white hover:opacity-90',
}

const variantVars: Record<Variant, React.CSSProperties> = {
  primary:     { backgroundColor: 'var(--accent)',  color: 'var(--accent-fg)' },
  secondary:   { backgroundColor: 'var(--border)',  color: 'var(--text-primary)' },
  ghost:       { backgroundColor: 'transparent',    color: 'var(--text-muted)' },
  destructive: { backgroundColor: 'var(--danger)',  color: '#fff' },
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', style, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center gap-1.5 font-medium rounded-md
        transition-opacity disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
      style={{ ...variantVars[variant], ...style }}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
