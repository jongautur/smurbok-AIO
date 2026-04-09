import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { VehicleListItem } from '@/types'

export type { VehicleListItem }

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () =>
      api.get<VehicleListItem[]>('/vehicles').then((r) => {
        if (!Array.isArray(r.data)) throw new Error('Unexpected response from /vehicles')
        return r.data
      }),
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
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
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
