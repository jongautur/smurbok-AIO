import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

export default withNextIntl({
  turbopack: {
    root: new URL('.', import.meta.url).pathname,
  },
})
