'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getIngredientsAction(restaurantId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true })
    return { data: data || [] }
}

export async function createIngredientAction(input: {
    restaurant_id: string
    name: string
    unit: string
    stock_quantity: number
    reorder_level: number
    cost_per_unit: number
    supplier?: string | null
}) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('ingredients')
        .insert(input)
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { data }
}

export async function updateIngredientAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('ingredients').update(updates).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { success: true }
}

export async function addStockMovementAction(input: {
    ingredient_id: string
    movement_type: string
    quantity: number
    notes?: string
    performed_by?: string | null
}) {
    const supabase = await createAdminClient()

    // Insert movement record
    const { error: moveErr } = await supabase
        .from('ingredient_movements')
        .insert(input)
    if (moveErr) return { error: moveErr.message }

    // Update stock
    const { data: ingredient } = await supabase
        .from('ingredients')
        .select('stock_quantity')
        .eq('id', input.ingredient_id)
        .single()

    if (ingredient) {
        const delta = input.movement_type === 'purchase' ? input.quantity : -input.quantity
        await supabase
            .from('ingredients')
            .update({ stock_quantity: Math.max(0, ingredient.stock_quantity + delta) })
            .eq('id', input.ingredient_id)
    }

    revalidatePath('/admin/ingredients')
    return { success: true }
}

export async function deleteIngredientAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { success: true }
}
