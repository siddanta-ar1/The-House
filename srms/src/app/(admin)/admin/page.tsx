import { LoginForm } from './LoginForm'

export default async function AdminLoginPage(props: { searchParams: Promise<{ redirect?: string }> }) {
    const searchParams = await props.searchParams;
    const redirectTo = searchParams.redirect || '/admin/dashboard'

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-secondary)]">
            <LoginForm redirectTo={redirectTo} />
        </div>
    )
}
