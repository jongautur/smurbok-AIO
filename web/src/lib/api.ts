import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true, // send the httpOnly session cookie with every request
})

let _onUnauthorized: (() => void) | null = null

/** Called by AuthProvider to handle 401s globally (clear session + redirect). */
export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && _onUnauthorized) {
      _onUnauthorized()
    }
    return Promise.reject(err)
  },
)
