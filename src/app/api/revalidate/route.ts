import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Webhook for revalidating Next.js cache
export async function POST(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')

    if (secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { path, type } = body

        if (!path) {
            return NextResponse.json({ message: 'Missing path in body' }, { status: 400 })
        }

        // type can be 'page' or 'layout' (defaults to 'page')
        revalidatePath(path, type === 'layout' ? 'layout' : 'page')
        return NextResponse.json({ revalidated: true, now: Date.now(), path })
    } catch {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 })
    }
}
