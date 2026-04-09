import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface CarMake { id: number; name: string }
interface CarModel { id: number; name: string }

export function useCarMakes() {
  return useQuery({
    queryKey: ['ref', 'makes'],
    queryFn: () => api.get<CarMake[]>('/ref/makes').then((r) => r.data),
    staleTime: Infinity,
  })
}

export function useCarModels(makeId: number | null) {
  return useQuery({
    queryKey: ['ref', 'models', makeId],
    queryFn: () => api.get<CarModel[]>(`/ref/makes/${makeId}/models`).then((r) => r.data),
    enabled: makeId != null,
    staleTime: Infinity,
  })
}
