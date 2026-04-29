type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' },
  success: { backgroundColor: '#d1fae5', color: '#065f46' },
  warn:    { backgroundColor: '#fef3c7', color: '#92400e' },
  danger:  { backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' },
  muted:   { backgroundColor: 'color-mix(in srgb, var(--border) 80%, transparent)', color: 'var(--text-muted)' },
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  )
}
