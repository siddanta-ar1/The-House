// lib/auth.ts
// Unified role resolution helper — replaces the 10-line auth pattern
// duplicated across every admin/staff page.
'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getJwtClaims } from '@/lib/supabase/jwt'
import { redirect } from 'next/navigation'
import type { RoleName } from '@/types/database'

export interface CurrentUser {
    id: string
    email: string
    restaurantId: string
    role: RoleName
}

/**
 * Get the current authenticated user with role and restaurant_id.
 *
 * Strategy:
 *  1. First try JWT custom claims (no DB roundtrip — set by 004_jwt_claims_hook.sql)
 *  2. Fall back to admin DB lookup if claims are missing (e.g. token not yet refreshed)
 *
 * Redirects to /admin if not authenticated, /unauthorized if no restaurant.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin')
    }

    // Try JWT claims first (fast path — no DB call)
    const claims = await getJwtClaims()
    if (claims?.restaurant_id && claims?.app_role) {
        return {
            id: user.id,
            email: user.email || '',
            restaurantId: claims.restaurant_id,
            role: claims.app_role as RoleName,
        }
    }

    // Fallback: admin DB lookup (needed when JWT hasn't refreshed yet)
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id, roles(name)')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) {
        redirect('/unauthorized')
    }

    const roleName = (userData.roles as unknown as { name: string } | null)?.name || 'waiter'

    return {
        id: user.id,
        email: user.email || '',
        restaurantId: userData.restaurant_id,
        role: roleName as RoleName,
    }
}

/**
 * Require a specific role (or set of roles).
 * Redirects to /unauthorized if the user doesn't have the required role.
 */
export async function requireRole(...allowedRoles: RoleName[]): Promise<CurrentUser> {
    const currentUser = await getCurrentUser()

    if (!allowedRoles.includes(currentUser.role)) {
        redirect('/unauthorized')
    }

    return currentUser
}

/**
 * Lightweight auth check — returns CurrentUser or null (no redirect).
 * Useful for the root `/` page where we want to check without forcing login.
 */
export async function getOptionalUser(): Promise<CurrentUser | null> {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Try JWT claims first
    const claims = await getJwtClaims()
    if (claims?.restaurant_id && claims?.app_role) {
        return {
            id: user.id,
            email: user.email || '',
            restaurantId: claims.restaurant_id,
            role: claims.app_role as RoleName,
        }
    }

    // Fallback DB lookup
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id, roles(name)')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) return null

    const roleName = (userData.roles as unknown as { name: string } | null)?.name || 'waiter'

    return {
        id: user.id,
        email: user.email || '',
        restaurantId: userData.restaurant_id,
        role: roleName as RoleName,
    }
}
