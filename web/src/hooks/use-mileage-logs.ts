import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

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
