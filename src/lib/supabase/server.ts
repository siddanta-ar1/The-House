// lib/supabase/server.ts
// Server-side Supabase client for Server Components and Server Actions
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
    const cookieStore = await cookies()

    return createSSRServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method is called from Server Components
                        // which cannot set cookies. This can be safely ignored
                        // if middleware is refreshing user sessions.
                    }
                },
            },
        }
    )
}

import { createClient } from '@supabase/supabase-js'

// Admin client with service role key — bypasses RLS
// USE WITH EXTREME CAUTION: only in server-side operations that need full access
export async function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    )
}
