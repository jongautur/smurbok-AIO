import { useAuth } from '@/providers/auth-provider'

export function useDateLocale(): string {
  const { appUser } = useAuth()
  return appUser?.language === 'en' ? 'en-GB' : 'is-IS'
}
