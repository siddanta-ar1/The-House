'use client'

import { ReactNode } from 'react'
import { Utensils, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function WaiterLayoutClient({ children }: { children: ReactNode }) {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/admin')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-['var(--font-roboto)']">
            {/* Top Navbar — responsive */}
            <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-2.5 md:py-3 shrink-0 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-[var(--color-secondary)] p-1.5 md:p-2 rounded-lg text-white">
                        <Utensils size={20} />
                    </div>
                    <h1 className="text-base md:text-xl font-bold tracking-tight text-gray-900">
                        <span className="hidden sm:inline">Operations Panel</span>
                        <span className="sm:hidden">Floor</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <Link href="/admin/settings" className="p-2 text-gray-400 hover:text-gray-900 transition rounded-full hover:bg-gray-100">
                        <Settings size={18} />
                    </Link>
                    <div className="h-4 w-px bg-gray-300 hidden md:block"></div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition active:scale-95 p-2 md:px-3 md:py-1.5 rounded-lg hover:bg-red-50"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Workspace — responsive padding */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6">
                {children}
            </main>
        </div>
    )
}
