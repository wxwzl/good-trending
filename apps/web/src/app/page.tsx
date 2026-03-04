// Redirect root to default locale
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/en')
}
