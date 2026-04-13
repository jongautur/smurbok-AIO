import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Document {
  id: string
  vehicleId: string
  type: string
  label: string
  fileUrl: string
  expiresAt: string | null
  createdAt: string
}

export function useDocuments(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'documents'],
    queryFn: () =>
      api.get<{ items: Document[] }>(`/vehicles/${vehicleId}/documents`).then((r) => r.data.items),
  })
}

export function useUploadDocument(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post<Document>(`/vehicles/${vehicleId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export function useDeleteDocument(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] })
    },
  })
}

export async function openDocument(id: string, download = false) {
  const { data } = await api.get<{ token: string }>(`/documents/${id}/link`)
  const base = process.env.NEXT_PUBLIC_API_URL
  const url = `${base}/documents/file?token=${data.token}${download ? '&download=1' : ''}`
  window.open(url, '_blank')
}

