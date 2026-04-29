import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface StorageDocument {
  id: string
  label: string
  type: string
  fileSizeBytes: number | null
  vehicleId: string
  vehicleLabel: string
}

export interface StorageUsage {
  files: {
    usedBytes: number
    usedMB: number
    limitMB: number
    percent: number
  }
  documents: {
    count: number
    limit: number
  }
  vehicles: {
    count: number
    limit: number
  }
  topDocuments: StorageDocument[]
}

export function useStorage() {
  return useQuery<StorageUsage>({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageUsage>('/storage').then((r) => r.data),
  })
}
