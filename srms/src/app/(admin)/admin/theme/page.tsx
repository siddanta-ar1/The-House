import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import ThemeCustomizer from '@/components/admin/ThemeCustomizer'

export const revalidate = 0

export default async function AdminThemePage() {
    await getCurrentUser()
    const supabase = await createServerClient()

    // We assume there's one settings row for simplicity (or we'd fetch by restaurant_id)
    const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

    if (!settings) {
        // In production we'd create a default row here if it didn't exist
        return <div className="p-8 text-center text-gray-500">No settings configuration found in database.</div>
    }

    return <ThemeCustomizer initialSettings={settings} />
}
