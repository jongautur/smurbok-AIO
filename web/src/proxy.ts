import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['is', 'en'],
  defaultLocale: 'is',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
