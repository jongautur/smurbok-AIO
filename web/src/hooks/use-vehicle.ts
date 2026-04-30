import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { VehicleOverview, Timeline, ServiceRecord, Expense, MileageLog } from '@/types'

export type { ServiceRecord, Expense, MileageLog }

export function useVehicleOverview(id: string) {
  return useQuery({
    queryKey: ['vehicle', id, 'overview'],
    queryFn: () => api.get<VehicleOverview>(`/vehicles/${id}/overview`).then((r) => r.data),
  })
}

export function useServiceRecords(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'service-records'],
    queryFn: () =>
      api.get<{ items: ServiceRecord[] }>(`/vehicles/${vehicleId}/service-records`).then((r) => r.data.items),
  })
}

export function useExpenses(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'expenses'],
    queryFn: () =>
      api.get<{ items: Expense[] }>(`/vehicles/${vehicleId}/expenses`).then((r) => r.data.items),
  })
}

export function useVehicleTimeline(id: string, enabled = true) {
  return useQuery({
    queryKey: ['vehicle', id, 'timeline'],
    queryFn: () => api.get<Timeline>(`/vehicles/${id}/timeline`).then((r) => r.data),
    enabled,
  })
}

export function useAddServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      types: string[]
      customType?: string
      mileage: number
      date: string
      cost?: number
      shop?: string
      description?: string
      documentIds?: string[]
    }) =>
      api
        .post<ServiceRecord>(`/vehicles/${vehicleId}/service-records`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useAddExpense(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      category: string
      amount: number
      date: string
      description?: string
      mileage?: number
      litres?: number
      customCategory?: string
      recurringMonths?: number
      documentIds?: string[]
    }) =>
      api
        .post<Expense>(`/vehicles/${vehicleId}/expenses`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUpdateServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      types?: string[]
      customType?: string
      mileage?: number
      date?: string
      cost?: number
      shop?: string
      description?: string
      documentIds?: string[]
    }) =>
      api.patch<ServiceRecord>(`/service-records/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useDeleteServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/service-records/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUndeleteServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/service-records/${id}/undelete`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUpdateExpense(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      category?: string
      amount?: number
      date?: string
      description?: string
      litres?: number
      customCategory?: string
      recurringMonths?: number
      documentIds?: string[]
    }) =>
      api.patch<Expense>(`/expenses/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useDeleteExpense(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/expenses/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUndeleteExpense(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/expenses/${id}/undelete`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}
