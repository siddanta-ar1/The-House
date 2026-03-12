import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import { LoginForm } from './LoginForm'

// Role → landing page map
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export default async function LoginPage(props: { searchParams: Promise<{ redirect?: string }> }) {
    const searchParams = await props.searchParams
    const redirectTo = searchParams.redirect || '/admin/dashboard'

    // If already logged in, redirect to appropriate dashboard
    const currentUser = await getOptionalUser()
    if (currentUser) {
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
            <LoginForm redirectTo={redirectTo} />
        </div>
    )
}
