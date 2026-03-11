import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Standard mock orders API for potential external POS integrations
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const status = searchParams.get('status')

    // Require API Key in header for external access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SRMS_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurant_id' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    let query = supabase
        .from('orders')
        .select(`
            id, 
            status, 
            total_amount, 
            created_at,
            table_id,
            order_items (
                id, menu_item_id, quantity, unit_price, notes
            )
        `)
        .eq('restaurant_id', restaurantId)

    if (status) {
        query = query.eq('status', status)
    }

    // Limit to latest 50 orders in an API call
    query = query.order('created_at', { ascending: false }).limit(50)

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data })
}
