import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // Only protect /admin/* routes (except the login page itself)
    const { pathname } = request.nextUrl;

    // Allow the login page through
    if (pathname === '/admin') {
        return NextResponse.next();
    }

    // Create a server-side Supabase client that reads cookies from the request
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response = NextResponse.next({
                            request: { headers: request.headers },
                        });
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Validate the session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // No valid session — redirect to admin login
        const loginUrl = new URL('/admin', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path+'],
};
