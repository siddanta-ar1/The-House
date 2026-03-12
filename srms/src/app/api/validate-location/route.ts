import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Haversine formula to calculate distance between two coordinates in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export async function POST(request: NextRequest) {
    try {
        const { restaurantId, latitude, longitude } = await request.json()

        if (!restaurantId || !latitude || !longitude) {
            return NextResponse.json({ error: 'Missing location parameters' }, { status: 400 })
        }

        const supabase = await createServerClient()

        // Fetch the restaurant settings and coordinates
        // Assuming restaurants table has lat/lng or it is stored in settings features JSON
        const { data: settings } = await supabase
            .from('settings')
            .select('features')
            .eq('restaurant_id', restaurantId)
            .single()

        if (!settings) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
        }

        // Default values fallback
        const features = (settings.features || {}) as Record<string, number | boolean | string>
        const geofenceEnabled = features.geofenceEnabled || false
        const radiusMeters = Number(features.geofenceRadiusMeters) || 100
        // These would normally be stored in DB per restaurant, hardcoded mock for DB lack of column:
        const restaurantLat = Number(features.restaurantLat) || 0
        const restaurantLng = Number(features.restaurantLng) || 0

        if (!geofenceEnabled) {
            return NextResponse.json({ valid: true, message: 'Geofencing disabled' })
        }

        // If coords are strictly 0, we haven't configured the GPS yet
        if (restaurantLat === 0 && restaurantLng === 0) {
            return NextResponse.json({ valid: true, message: 'Geofencing not fully configured' })
        }

        const distance = getDistance(latitude, longitude, restaurantLat, restaurantLng)

        if (distance <= radiusMeters) {
            return NextResponse.json({ valid: true, distance })
        } else {
            return NextResponse.json({
                valid: false,
                distance,
                error: `You are ${Math.round(distance)}m away. You must be within ${radiusMeters}m to order.`
            }, { status: 403 })
        }

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
