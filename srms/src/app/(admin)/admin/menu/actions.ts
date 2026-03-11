'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCategoryAction(restaurantId: string, name: string, sortOrder: number, isVisible: boolean) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('menu_categories')
        .insert({
            restaurant_id: restaurantId,
            name,
            sort_order: sortOrder,
            is_visible: isVisible
        })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { data }
}

export async function updateCategoryAction(id: string, updates: any) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_categories')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function deleteCategoryAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function addItemAction(item: any) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { data }
}

export async function updateItemAction(id: string, updates: any) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function deleteItemAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}
