import { ReactNode } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { getRestaurantFeatures } from '@/lib/features'
import { FeatureProvider } from '@/lib/contexts/FeatureContext'

export default async function TableLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ tableSlug: string }>
}) {
    const { tableSlug } = await params
    const supabase = await createAdminClient()

    // Look up restaurant from the table's QR token
    const { data: tableData } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('qr_token', tableSlug)
        .single()

    const features = tableData?.restaurant_id
        ? await getRestaurantFeatures(tableData.restaurant_id)
        : null

    return (
        <FeatureProvider features={features}>
            {children}
        </FeatureProvider>
    )
}
