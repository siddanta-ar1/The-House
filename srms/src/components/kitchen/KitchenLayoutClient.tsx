'use client'

import { ReactNode } from 'react'
import { ChefHat, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function KitchenLayoutClient({ children }: { children: ReactNode }) {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/admin')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-[var(--color-secondary)] text-white flex flex-col font-['var(--font-roboto)']">
            {/* Top Navbar — responsive */}
            <header className="bg-[var(--color-secondary)] brightness-90 border-b border-white/10 px-3 md:px-6 py-2.5 md:py-3 shrink-0 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-[var(--color-primary)] p-1.5 md:p-2 rounded-lg text-white">
                        <ChefHat size={20} />
                    </div>
                    <h1 className="text-base md:text-xl font-bold tracking-tight text-white">
                        <span className="hidden sm:inline">Kitchen Display System</span>
                        <span className="sm:hidden">KDS</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <Link href="/admin/settings" className="p-2 text-gray-400 hover:text-white transition rounded-full hover:bg-gray-700">
                        <Settings size={18} />
                    </Link>
                    <div className="h-4 w-px bg-gray-600 hidden md:block"></div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition active:scale-95 p-2 md:px-3 md:py-1.5 rounded-lg hover:bg-gray-700/50"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    )
}
