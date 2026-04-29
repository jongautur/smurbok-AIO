import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md'
}

const paddingStyles = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
}

export function Card({
  padding = 'md',
  className = '',
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border ${paddingStyles[padding]} ${className}`}
      style={{
        backgroundColor: 'var(--surface-raised)',
        borderColor: 'var(--border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
