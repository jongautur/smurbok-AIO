import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['is', 'en'],
  defaultLocale: 'is',
  localeDetection: false,
  localePrefix: 'as-needed',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
