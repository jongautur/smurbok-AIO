import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardSummary {
  counts: {
    vehicles: number
    totalServiceRecords: number
    pendingReminders: number
    overdueReminders: number
  }
  vehicles: {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string
    latestMileage: number | null
  }[]
  upcomingReminders: {
    id: string
    vehicleId: string
    vehicleName: string
    type: string
    dueDate: string | null
    dueMileage: number | null
    status: string
    isOverdue: boolean
  }[]
  recentActivity: {
    id: string
    vehicleId: string
    vehicleName: string
    types: string[]
    customType: string | null
    date: string
    mileage: number
    shop: string | null
  }[]
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard').then((r) => r.data),
  })
}
