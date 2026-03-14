'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function generateEodReportAction(restaurantId: string, reportDate: string) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.rpc('generate_eod_report', {
        p_restaurant_id: restaurantId,
        p_report_date: reportDate,
    })
    if (error) return { error: error.message }
    return { data }
}

export async function getEodReportsAction(restaurantId: string, limit = 30) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('report_date', { ascending: false })
        .limit(limit)
    return { data: data || [] }
}

export async function getEodReportAction(reportId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('id', reportId)
        .single()
    return { data }
}
