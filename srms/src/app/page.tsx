import { redirect } from 'next/navigation'

export default function Home() {
    // Redirect root to staff admin login, since customers use /t/[tableSlug]
    redirect('/admin')
}
