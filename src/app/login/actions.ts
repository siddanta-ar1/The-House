'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { checkRateLimit, RATE_LIMIT_RULES } from '@/lib/ratelimit'

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

    // Rate limit: 5 attempts per 15 minutes per IP
    const rateLimitError = await checkRateLimit('LOGIN', RATE_LIMIT_RULES.LOGIN.requests, RATE_LIMIT_RULES.LOGIN.windowSeconds)
    if (rateLimitError) {
        return { error: 'Too many login attempts. Please wait 15 minutes before trying again.' }
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
