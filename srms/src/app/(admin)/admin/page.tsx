import { redirect } from 'next/navigation'

// /admin now redirects to the dashboard — login has moved to /login
export default function AdminIndexPage() {
    redirect('/admin/dashboard')
}
