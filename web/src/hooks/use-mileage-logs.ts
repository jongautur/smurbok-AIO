import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MileageLog } from '@/types'

export type { MileageLog }

export function useMileageLogs(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'mileage-logs'],
    queryFn: () =>
      api.get<{ items: MileageLog[] }>(`/vehicles/${vehicleId}/mileage-logs`).then((r) => r.data.items),
  })
}

export function useAddMileageLog(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { mileage: number; date: string; note?: string }) =>
      api.post(`/vehicles/${vehicleId}/mileage-logs`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useDeleteMileageLog(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/mileage-logs/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUndeleteMileageLog(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/mileage-logs/${id}/undelete`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}
