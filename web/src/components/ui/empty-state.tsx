interface EmptyStateProps {
  icon: string
  message: string
  action?: React.ReactNode
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  )
}
