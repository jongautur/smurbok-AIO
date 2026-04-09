import axios from 'axios'
import { auth } from './firebase'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    try {
      const token = await Promise.race([
        user.getIdToken(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getIdToken timeout')), 5000),
        ),
      ])
      config.headers.Authorization = `Bearer ${token}`
    } catch {
      // Token fetch timed out or failed — send request without auth,
      // API returns 401, auth provider catches it and clears loading.
    }
  }
  return config
})
