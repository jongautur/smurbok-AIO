export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'color-mix(in srgb, var(--border) 80%, transparent)' }}
    />
  )
}

export function VehicleCardSkeleton() {
  return (
    <div className="rounded-lg px-4 py-3 border" style={{ backgroundColor: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-24" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <Skeleton className="h-7 w-36" />
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  )
}
