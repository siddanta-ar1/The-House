'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Map role names to their default landing pages
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export async function loginAction(prevState: { error: string | null }, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const explicitRedirect = formData.get('redirect') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const supabase = await createServerClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // If an explicit redirect was requested (e.g. from middleware), use it
    if (explicitRedirect && explicitRedirect !== '/admin/dashboard') {
        redirect(explicitRedirect)
    }

    // Otherwise, look up the user role and redirect to the correct dashboard
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('role_id, roles(name)')
        .eq('id', authData.user.id)
        .single()

    const roleName = (userData?.roles as unknown as { name: string } | null)?.name
    const landing = roleName ? ROLE_LANDING[roleName] || '/admin/dashboard' : '/admin/dashboard'

    redirect(landing)
}
