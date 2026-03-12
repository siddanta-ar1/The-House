'use client'

import { ReactNode } from 'react'
import { Utensils, LogOut, Settings, Bell } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
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
                    <Image
                        src="/icons/kkhane.png"
                        alt="KKhane"
                        width={100}
                        height={28}
                        className="h-7 w-auto object-contain"
                        priority
                    />
                    <span className="text-xs text-gray-500 font-medium">Operations</span>
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
