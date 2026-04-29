import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', style, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-md px-3 py-2 text-sm border outline-none transition-colors
          focus:ring-2 ${className}`}
        style={{
          backgroundColor: 'var(--surface-raised)',
          borderColor: error ? 'var(--danger)' : 'var(--border)',
          color: 'var(--text-primary)',
          // @ts-expect-error CSS custom property
          '--tw-ring-color': 'var(--accent)',
          ...style,
        }}
        {...props}
      />
      {error && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  ),
)

Input.displayName = 'Input'
