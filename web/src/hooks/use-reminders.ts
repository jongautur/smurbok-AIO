import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Reminder {
  id: string
  vehicleId: string
  type: string
  dueDate: string | null
  dueMileage: number | null
  status: 'PENDING' | 'DONE' | 'SNOOZED'
  note: string | null
}

export function useReminders(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'reminders'],
    queryFn: () =>
      api.get<{ items: Reminder[] }>(`/vehicles/${vehicleId}/reminders`).then((r) => r.data.items),
  })
}

export function useAddReminder(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: string
      dueDate?: string
      dueMileage?: number
      note?: string
    }) => api.post<Reminder>(`/vehicles/${vehicleId}/reminders`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useUpdateReminder(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; dueDate?: string; note?: string }) =>
      api.patch<Reminder>(`/reminders/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useDeleteReminder(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}
