'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { ServiceRequestType } from '@/types/database'

export async function createServiceRequest(
    sessionId: string,
    restaurantId: string,
    requestType: ServiceRequestType,
    message?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    // Rate limit: max 3 pending requests per session
    const { count } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('status', 'pending')

    if (count && count >= 3) {
        return { success: false, error: 'You have too many pending requests. Please wait for a response.' }
    }

    const { error } = await supabase
        .from('service_requests')
        .insert({
            session_id: sessionId,
            restaurant_id: restaurantId,
            request_type: requestType,
            message: message || null,
        })

    if (error) {
        console.error('Service request error:', error)
        return { success: false, error: 'Failed to send request. Please try again.' }
    }

    return { success: true }
}

export async function acknowledgeServiceRequest(
    requestId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('service_requests')
        .update({
            status: 'acknowledged',
            acknowledged_by: userId,
        })
        .eq('id', requestId)
        .eq('status', 'pending')

    if (error) {
        return { success: false, error: 'Failed to acknowledge request.' }
    }
    return { success: true }
}

export async function completeServiceRequest(
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('service_requests')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

    if (error) {
        return { success: false, error: 'Failed to complete request.' }
    }
    return { success: true }
}
