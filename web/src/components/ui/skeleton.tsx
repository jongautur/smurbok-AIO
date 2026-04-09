export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
  )
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
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
