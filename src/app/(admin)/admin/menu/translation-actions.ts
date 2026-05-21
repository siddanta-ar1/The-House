'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function upsertTranslation(
    entityType: string,
    entityId: string,
    languageCode: string,
    translatedText: string
): Promise<{ success?: boolean; error?: string }> {
    const { restaurantId } = await getCurrentUser()
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('translations')
        .upsert(
            {
                restaurant_id: restaurantId,
                language_code: languageCode,
                entity_type: entityType,
                entity_id: entityId,
                translated_text: translatedText,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'restaurant_id,language_code,entity_type,entity_id' }
        )

    if (error) return { error: error.message }
    revalidatePath(`/t`)
    return { success: true }
}

export async function getRestaurantTranslationConfig(): Promise<{
    translations: { language_code: string; entity_type: string; entity_id: string; translated_text: string }[]
    languages: { language_code: string; language_name: string }[]
}> {
    const { restaurantId } = await getCurrentUser()
    const supabase = await createAdminClient()

    const [{ data: translations }, { data: languages }] = await Promise.all([
        supabase
            .from('translations')
            .select('language_code, entity_type, entity_id, translated_text')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('supported_languages')
            .select('language_code, language_name')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order'),
    ])

    return { translations: translations || [], languages: languages || [] }
}

export async function ensureNepaliLanguage(): Promise<{ success?: boolean; error?: string }> {
    const { restaurantId } = await getCurrentUser()
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('supported_languages')
        .upsert(
            {
                restaurant_id: restaurantId,
                language_code: 'ne',
                language_name: 'नेपाली',
                is_default: false,
                is_active: true,
                sort_order: 20,
            },
            { onConflict: 'restaurant_id,language_code' }
        )

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}
