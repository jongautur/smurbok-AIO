/** Build a locale-prefixed path. IS (default) has no prefix; EN gets /en/... */
export function lp(locale: string, path: string): string {
  return locale === 'is' ? path : `/${locale}${path}`
}
