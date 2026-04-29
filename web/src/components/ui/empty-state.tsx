interface EmptyStateProps {
  icon: React.ReactNode
  message: string
  action?: React.ReactNode
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="mb-3" style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{message}</p>
      {action}
    </div>
  )
}
