import { redirect } from 'next/navigation'

// Redirect bare / to default locale
export default function RootPage() {
  redirect('/is')
}
