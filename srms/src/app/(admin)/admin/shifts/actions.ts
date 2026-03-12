'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getActiveShiftsAction(restaurantId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('staff_shifts')
        .select('*, users(full_name, email, role)')
        .eq('restaurant_id', restaurantId)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
    return { data: data || [] }
}

export async function getRecentShiftsAction(restaurantId: string, limit = 50) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('staff_shifts')
        .select('*, users(full_name, email, role)')
        .eq('restaurant_id', restaurantId)
        .not('clock_out', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(limit)
    return { data: data || [] }
}

export async function approveShiftAction(shiftId: string, approvedBy: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('staff_shifts')
        .update({ is_approved: true, approved_by: approvedBy })
        .eq('id', shiftId)
    if (error) return { error: error.message }
    revalidatePath('/admin/shifts')
    return { success: true }
}

export async function forceClockOutAction(shiftId: string) {
    const supabase = await createAdminClient()
    const now = new Date().toISOString()

    // Get shift for hours calculation
    const { data: shift } = await supabase
        .from('staff_shifts')
        .select('clock_in, break_minutes')
        .eq('id', shiftId)
        .single()

    if (!shift) return { error: 'Shift not found' }

    const clockIn = new Date(shift.clock_in)
    const clockOut = new Date(now)
    const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000
    const hoursWorked = Math.max(0, (totalMinutes - (shift.break_minutes || 0)) / 60)

    const { error } = await supabase
        .from('staff_shifts')
        .update({ clock_out: now, hours_worked: Math.round(hoursWorked * 100) / 100 })
        .eq('id', shiftId)
    if (error) return { error: error.message }
    revalidatePath('/admin/shifts')
    return { success: true }
}
