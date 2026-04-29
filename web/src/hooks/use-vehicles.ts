import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { VehicleListItem } from '@/types'

export type { VehicleListItem }

export function useVehicles(archived = false) {
  return useQuery({
    queryKey: ['vehicles', archived ? 'archived' : 'active'],
    queryFn: () =>
      api
        .get<{ items: VehicleListItem[] }>('/vehicles', { params: archived ? { archived: 'true' } : undefined })
        .then((r) => r.data.items),
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      make: string
      model: string
      year: number
      licensePlate: string
      vin?: string
      color?: string
      fuelType?: string
    }) => api.post<VehicleListItem>('/vehicles', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'active'] })
    },
  })
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      make?: string
      model?: string
      year?: number
      licensePlate?: string
      vin?: string
      color?: string
      fuelType?: string
    }) =>
      api.patch<VehicleListItem>(`/vehicles/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
    },
  })
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/vehicles/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

export function useRestoreVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/vehicles/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/vehicles/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

export function useUndeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/vehicles/${id}/undelete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}
