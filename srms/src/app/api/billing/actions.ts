'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { SplitType } from '@/types/database'

interface SplitBillResult {
    splitId?: string
    splits?: { label: string; amount: number; total: number }[]
    error?: string
}

export async function createBillSplit(
    sessionId: string,
    splitType: SplitType,
    splitCount: number
): Promise<SplitBillResult> {
    const supabase = await createAdminClient()

    // Get all orders for this session
    const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total_amount, tax_amount, tip_amount, seat_id, subtotal_amount')
        .eq('session_id', sessionId)
        .neq('status', 'cancelled')

    if (ordersErr || !orders?.length) {
        return { error: 'No orders found for this session.' }
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const totalTax = orders.reduce((sum, o) => sum + Number(o.tax_amount), 0)
    const totalTip = orders.reduce((sum, o) => sum + Number(o.tip_amount), 0)

    // Create the bill split record
    const { data: billSplit, error: splitErr } = await supabase
        .from('bill_splits')
        .insert({
            session_id: sessionId,
            split_type: splitType,
            total_amount: totalAmount,
            split_count: splitCount,
        })
        .select()
        .single()

    if (splitErr || !billSplit) {
        return { error: 'Failed to create bill split.' }
    }

    const splits: { label: string; amount: number; total: number }[] = []

    if (splitType === 'even') {
        // Split evenly by splitCount
        const amountPerPerson = Math.round((totalAmount / splitCount) * 100) / 100
        const taxPerPerson = Math.round((totalTax / splitCount) * 100) / 100
        const tipPerPerson = Math.round((totalTip / splitCount) * 100) / 100

        for (let i = 1; i <= splitCount; i++) {
            const isLast = i === splitCount
            // Last person absorbs rounding difference
            const itemAmount = isLast
                ? totalAmount - amountPerPerson * (splitCount - 1)
                : amountPerPerson

            await supabase.from('bill_split_items').insert({
                bill_split_id: billSplit.id,
                label: `Guest ${i}`,
                amount: itemAmount - taxPerPerson - tipPerPerson,
                tax_amount: taxPerPerson,
                tip_amount: tipPerPerson,
                total_amount: itemAmount,
            })

            splits.push({ label: `Guest ${i}`, amount: itemAmount, total: itemAmount })
        }
    } else if (splitType === 'by_seat') {
        // Split by seat — group orders by seat_id
        const seatTotals = new Map<string, { amount: number; tax: number; tip: number }>()

        for (const order of orders) {
            const seatKey = order.seat_id || 'shared'
            const existing = seatTotals.get(seatKey) || { amount: 0, tax: 0, tip: 0 }
            existing.amount += Number(order.subtotal_amount)
            existing.tax += Number(order.tax_amount)
            existing.tip += Number(order.tip_amount)
            seatTotals.set(seatKey, existing)
        }

        let seatNum = 1
        for (const [seatId, totals] of seatTotals.entries()) {
            const total = totals.amount + totals.tax + totals.tip

            await supabase.from('bill_split_items').insert({
                bill_split_id: billSplit.id,
                seat_id: seatId === 'shared' ? null : seatId,
                label: `Seat ${seatNum}`,
                amount: totals.amount,
                tax_amount: totals.tax,
                tip_amount: totals.tip,
                total_amount: total,
            })

            splits.push({ label: `Seat ${seatNum}`, amount: total, total })
            seatNum++
        }
    }

    return { splitId: billSplit.id, splits }
}

export async function payBillSplitItem(
    splitItemId: string,
    paymentMethod: 'cash' | 'card'
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('bill_split_items')
        .update({
            payment_status: 'paid',
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
        })
        .eq('id', splitItemId)

    if (error) {
        return { success: false, error: 'Payment update failed.' }
    }

    return { success: true }
}
