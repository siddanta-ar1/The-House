import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { UtensilsCrossed, QrCode, ChefHat, ArrowRight } from 'lucide-react'

// Role → landing page map
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export default async function Home() {
    // Check if user is already logged in — no redirect if not
    const currentUser = await getOptionalUser()

    if (currentUser) {
        // Send them to their role-appropriate dashboard
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    // Not logged in — show public landing page
    return (
        <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Hero Section */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />
                <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/icons/kkhane.png"
                            alt="KKhane"
                            width={140}
                            height={40}
                            className="h-9 w-auto object-contain brightness-0 invert"
                            priority
                        />
                    </div>
                    <Link
                        href="/admin"
                        className="px-5 py-2.5 text-sm font-semibold bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all"
                    >
                        Staff Login
                    </Link>
                </nav>

                <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-sm font-medium mb-6">
                            <ChefHat size={16} />
                            Smart Restaurant Management
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                            Your restaurant,
                            <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-300">
                                brilliantly managed.
                            </span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-gray-300 leading-relaxed max-w-xl">
                            QR-based ordering, real-time kitchen display, staff management, 
                            loyalty programs — everything your restaurant needs in one system.
                        </p>
                        <div className="mt-10 flex flex-wrap gap-4">
                            <Link
                                href="/admin"
                                className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                            >
                                Get Started <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
                    <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto">
                        Three simple steps to transform your restaurant operations
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<QrCode size={28} />}
                        title="Scan & Order"
                        description="Customers scan a QR code at their table, browse the menu, and place orders — no app download required."
                        step="01"
                    />
                    <FeatureCard
                        icon={<UtensilsCrossed size={28} />}
                        title="Kitchen Display"
                        description="Orders appear instantly on the kitchen screen with real-time status tracking and preparation timers."
                        step="02"
                    />
                    <FeatureCard
                        icon={<ChefHat size={28} />}
                        title="Manage Everything"
                        description="Menu editing, staff shifts, analytics, loyalty programs, dynamic pricing — all from one dashboard."
                        step="03"
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/icons/kkhane.png"
                            alt="KKhane"
                            width={100}
                            height={28}
                            className="h-6 w-auto object-contain brightness-0 invert opacity-50"
                        />
                        <span>Smart Restaurant Management System</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="/admin" className="hover:text-white transition">Staff Login</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description, step }: {
    icon: React.ReactNode
    title: string
    description: string
    step: string
}) {
    return (
        <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all group">
            <div className="absolute top-6 right-6 text-5xl font-black text-white/5 group-hover:text-white/10 transition">
                {step}
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-5">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </div>
    )
}
