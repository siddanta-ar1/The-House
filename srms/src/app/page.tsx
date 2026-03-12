import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import {
    QrCode, ChefHat, ArrowRight, Smartphone, BarChart3,
    Clock, ShieldCheck, Globe, Users, Utensils, Bell,
    CreditCard, Gift, Tag, Receipt, TrendingUp, Zap,
    CheckCircle, Star, Layers, Monitor, Timer, Package,
    ArrowUpRight, ChevronDown,
} from 'lucide-react'

// Role → landing page map
const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export default async function Home() {
    const currentUser = await getOptionalUser()

    if (currentUser) {
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
            {/* ─── Navigation ─── */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/icons/kkhane.png"
                            alt="KKhane"
                            width={120}
                            height={34}
                            className="h-8 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        <a href="#features" className="hover:text-gray-900 transition">Features</a>
                        <a href="#how-it-works" className="hover:text-gray-900 transition">How it Works</a>
                        <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
                        <a href="#faq" className="hover:text-gray-900 transition">FAQ</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
                        >
                            Staff Login
                        </Link>
                        <Link
                            href="#pricing"
                            className="px-5 py-2.5 text-sm font-semibold bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <header className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-100/40 rounded-full blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left — Copy */}
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-full text-[var(--color-primary)] text-sm font-semibold mb-6">
                                <Zap size={14} />
                                Built for Nepal&apos;s Restaurant Industry
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-[var(--color-secondary)]">
                                Run your restaurant{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-amber-500">
                                    like a pro.
                                </span>
                            </h1>
                            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                                KKhane is an all-in-one restaurant management system — QR-based ordering,
                                real-time kitchen display, staff management, loyalty programs, Nepal QR
                                payments, and powerful analytics. Everything you need, from table to kitchen.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    href="#pricing"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-[var(--color-primary)]/25 transition-all active:scale-[0.98]"
                                >
                                    Start Free Trial <ArrowRight size={18} />
                                </Link>
                                <a
                                    href="#how-it-works"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-all"
                                >
                                    See How It Works
                                </a>
                            </div>
                            {/* Trust line */}
                            <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> Free to start</span>
                                <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> No credit card</span>
                                <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-green-500" /> Setup in 5 min</span>
                            </div>
                        </div>

                        {/* Right — Hero visual */}
                        <div className="relative hidden lg:block">
                            <div className="relative">
                                {/* Main dashboard mockup */}
                                <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-200 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                        <div className="w-3 h-3 rounded-full bg-green-400" />
                                        <span className="ml-2 text-xs text-gray-400 font-mono">KKhane Dashboard</span>
                                    </div>
                                    {/* Mock KPI row */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <MockKPI label="Today&apos;s Revenue" value="रू 45,280" trend="+12%" />
                                        <MockKPI label="Orders" value="127" trend="+8%" />
                                        <MockKPI label="Active Tables" value="14/20" trend="" />
                                    </div>
                                    {/* Mock order list */}
                                    <div className="space-y-2">
                                        <MockOrder table="T-05" items="3 items" status="Preparing" color="bg-yellow-100 text-yellow-700" />
                                        <MockOrder table="T-12" items="5 items" status="Ready" color="bg-green-100 text-green-700" />
                                        <MockOrder table="T-03" items="2 items" status="Confirmed" color="bg-blue-100 text-blue-700" />
                                    </div>
                                </div>

                                {/* Floating QR card */}
                                <div className="absolute -bottom-6 -left-8 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-44">
                                    <div className="flex items-center gap-2 mb-2">
                                        <QrCode size={18} className="text-[var(--color-primary)]" />
                                        <span className="text-xs font-semibold text-gray-700">Table 5</span>
                                    </div>
                                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                        <QrCode size={48} className="text-gray-300" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center mt-2">Scan to order</p>
                                </div>

                                {/* Floating notification */}
                                <div className="absolute -top-4 -right-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 animate-pulse">
                                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle size={18} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800">New Order!</p>
                                        <p className="text-[10px] text-gray-500">Table 12 • 5 items</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1 text-gray-400">
                    <span className="text-xs font-medium">Scroll to explore</span>
                    <ChevronDown size={18} className="animate-bounce" />
                </div>
            </header>

            {/* ─── Stats Bar ─── */}
            <section className="border-y border-gray-100 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <StatItem value="20+" label="Features Built-in" />
                        <StatItem value="4" label="Staff Role Types" />
                        <StatItem value="< 1s" label="Real-time Order Sync" />
                        <StatItem value="100%" label="Nepal-Ready" />
                    </div>
                </div>
            </section>

            {/* ─── Features Overview ─── */}
            <section id="features" className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">Features</span>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">
                            Everything your restaurant needs
                        </h2>
                        <p className="mt-4 text-gray-500 text-lg">
                            From customer ordering to kitchen operations, staff management to business analytics — one platform to run it all.
                        </p>
                    </div>

                    {/* Primary Features — 2x2 grid with rich cards */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <FeatureCardLarge
                            icon={<QrCode size={24} />}
                            title="QR Code Ordering"
                            description="Customers scan a QR code at their table, browse your full menu with images and modifiers, customize their order, and pay — no app download needed. Works on any smartphone."
                            highlights={['No app download', 'Modifier groups (toppings, sizes)', 'Real-time menu sync']}
                        />
                        <FeatureCardLarge
                            icon={<Monitor size={24} />}
                            title="Kitchen Display System"
                            description="Orders appear instantly on the kitchen screen the moment they&apos;re placed. Track preparation status in real-time with color-coded indicators. No more lost tickets."
                            highlights={['Instant order alerts', '5-step status tracking', 'Takeout queue support']}
                        />
                        <FeatureCardLarge
                            icon={<CreditCard size={24} />}
                            title="Nepal QR Payments"
                            description="Accept payments via eSewa, Khalti, and Fonepay QR codes. Customers upload payment screenshots, waiters verify in-app. PAN and VAT compliant with printable invoices."
                            highlights={['eSewa / Khalti / Fonepay', 'Screenshot verification flow', 'VAT & PAN compliant']}
                        />
                        <FeatureCardLarge
                            icon={<BarChart3 size={24} />}
                            title="Analytics & Reports"
                            description="Track revenue trends, order volumes, average ticket size, and table turnover. Generate end-of-day Z-reports with complete tax, tips, discounts, and COGS breakdown."
                            highlights={['7-day trend charts', 'EOD Z-reports', 'Revenue & COGS tracking']}
                        />
                    </div>

                    {/* Secondary Features — 4-column grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FeatureCardSmall icon={<Gift size={20} />} title="Loyalty Program" description="Phone-based loyalty with 4 tiers — Bronze, Silver, Gold, Platinum. Points earn/redeem with birthday bonuses." />
                        <FeatureCardSmall icon={<Tag size={20} />} title="Promo Codes" description="Create percentage-off, fixed-amount, free-item, and BOGO promos with usage limits and date ranges." />
                        <FeatureCardSmall icon={<TrendingUp size={20} />} title="Dynamic Pricing" description="Set happy hour discounts, day-of-week pricing rules, and time-based price adjustments automatically." />
                        <FeatureCardSmall icon={<Package size={20} />} title="Takeout Orders" description="Public takeout page with pickup time slots. Customers order ahead without any login required." />
                        <FeatureCardSmall icon={<Users size={20} />} title="Staff Management" description="Manage kitchen, waiter, and admin staff. Role-based access with shift clock-in/out and break tracking." />
                        <FeatureCardSmall icon={<Bell size={20} />} title="Service Requests" description="Customers can call waiter, request the bill, ask for water, or request table cleaning — all from their phone." />
                        <FeatureCardSmall icon={<Receipt size={20} />} title="Split Billing" description="Let tables split bills evenly or by seat. Each person pays their share with individual receipts." />
                        <FeatureCardSmall icon={<Layers size={20} />} title="Ingredient Tracking" description="Track inventory, link ingredients to recipes, and log stock movements — purchases, usage, and waste." />
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─── */}
            <section id="how-it-works" className="py-24 bg-[var(--color-secondary)]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">How It Works</span>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white">
                            From scan to served in minutes
                        </h2>
                        <p className="mt-4 text-gray-400 text-lg">
                            A seamless flow from the moment your customer sits down to the moment their food arrives.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StepCard
                            step="01"
                            icon={<Smartphone size={28} />}
                            title="Customer Scans QR"
                            description="Each table has a unique QR code. Customer scans it with their phone camera — the menu loads instantly, no app needed."
                        />
                        <StepCard
                            step="02"
                            icon={<Utensils size={28} />}
                            title="Browse & Order"
                            description="Full menu with categories, images, modifiers (sizes, toppings). Add to cart, apply promo codes, and place the order."
                        />
                        <StepCard
                            step="03"
                            icon={<ChefHat size={28} />}
                            title="Kitchen Gets It Instantly"
                            description="The order appears on the kitchen display in real-time. Staff updates status as it progresses — Confirmed → Preparing → Ready."
                        />
                        <StepCard
                            step="04"
                            icon={<Timer size={28} />}
                            title="Served & Tracked"
                            description="Customer tracks their order live on their phone. Waiter gets notified when food is ready. Order delivered, bill split, payment verified."
                        />
                    </div>
                </div>
            </section>

            {/* ─── Role-Based Views ─── */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">Built for Every Role</span>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">
                            One system, four powerful views
                        </h2>
                        <p className="mt-4 text-gray-500 text-lg">
                            Each team member gets a dedicated interface designed for their workflow.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <RoleCard
                            icon={<Users size={24} />}
                            role="Customer"
                            color="bg-blue-50 text-blue-600 border-blue-100"
                            features={['Scan QR to order', 'Real-time order tracker', 'Request waiter / bill', 'Apply promo codes', 'Earn loyalty points']}
                        />
                        <RoleCard
                            icon={<ChefHat size={24} />}
                            role="Kitchen Staff"
                            color="bg-orange-50 text-orange-600 border-orange-100"
                            features={['Live order queue', 'Status management', 'Takeout order queue', 'Prep time tracking', 'Priority indicators']}
                        />
                        <RoleCard
                            icon={<Bell size={24} />}
                            role="Waiter"
                            color="bg-green-50 text-green-600 border-green-100"
                            features={['Table overview', 'Service request feed', 'Payment verification', 'Shift clock in/out', 'Order assignment']}
                        />
                        <RoleCard
                            icon={<BarChart3 size={24} />}
                            role="Manager / Admin"
                            color="bg-purple-50 text-purple-600 border-purple-100"
                            features={['Full dashboard & KPIs', 'Menu & staff CRUD', 'Analytics & Z-reports', 'Dynamic pricing rules', 'Theme customization']}
                        />
                    </div>
                </div>
            </section>

            {/* ─── Nepal-Specific ─── */}
            <section className="py-20 bg-gradient-to-br from-gray-50 to-orange-50/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">Localized for Nepal</span>
                            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">
                                Made for how Nepal does business
                            </h2>
                            <p className="mt-4 text-gray-600 text-lg leading-relaxed">
                                Not just a translated interface — KKhane is architected from the ground up for
                                Nepali restaurant operations, payment methods, and tax requirements.
                            </p>
                            <div className="mt-8 space-y-4">
                                <NepalFeature icon={<CreditCard size={18} />} title="eSewa, Khalti & Fonepay" description="Accept all major Nepal QR payment methods with built-in screenshot verification." />
                                <NepalFeature icon={<Receipt size={18} />} title="VAT & PAN Compliance" description="Generate tax-compliant invoices with PAN numbers, VAT calculations, and proper receipt formats." />
                                <NepalFeature icon={<Globe size={18} />} title="NPR Currency & Bikram Sambat" description="Native support for Nepali Rupee formatting and Bikram Sambat date display throughout." />
                                <NepalFeature icon={<ShieldCheck size={18} />} title="Offline-Ready PWA" description="Works as a progressive web app — install on any device, minimal bandwidth required." />
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                                        <CreditCard size={20} className="text-[var(--color-primary)]" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Payment Verification</p>
                                        <p className="text-xs text-gray-500">Waiter verifies customer QR payment</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <MockPaymentRow method="eSewa" amount="रू 1,250" status="Verified" statusColor="text-green-600 bg-green-50" />
                                    <MockPaymentRow method="Khalti" amount="रू 890" status="Pending" statusColor="text-yellow-600 bg-yellow-50" />
                                    <MockPaymentRow method="Fonepay" amount="रू 2,100" status="Verified" statusColor="text-green-600 bg-green-50" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Pricing ─── */}
            <section id="pricing" className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">Pricing</span>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">
                            Plans that grow with your restaurant
                        </h2>
                        <p className="mt-4 text-gray-500 text-lg">
                            Start free, upgrade as you grow. No hidden fees, no long-term contracts.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <PricingCard
                            tier="Free"
                            price="रू 0"
                            period="forever"
                            description="Try KKhane with basic features."
                            features={['Up to 5 menu items', '1 staff account', '3 tables', 'QR code ordering', 'Basic analytics']}
                            cta="Get Started"
                            highlighted={false}
                        />
                        <PricingCard
                            tier="Basic"
                            price="रू 1,999"
                            period="/month"
                            description="For small restaurants getting started."
                            features={['Up to 50 menu items', '5 staff accounts', '10 tables', 'Promo codes', 'Nepal QR payments', 'Email support']}
                            cta="Start Free Trial"
                            highlighted={false}
                        />
                        <PricingCard
                            tier="Pro"
                            price="रू 4,999"
                            period="/month"
                            description="Full power for growing restaurants."
                            features={['Unlimited menu items', '15 staff accounts', '30 tables', 'Loyalty program', 'Dynamic pricing', 'Takeout ordering', 'Ingredient tracking', 'Z-reports & analytics', 'Priority support']}
                            cta="Start Free Trial"
                            highlighted={true}
                        />
                        <PricingCard
                            tier="Enterprise"
                            price="Custom"
                            period=""
                            description="Multi-location chains and franchises."
                            features={['Everything in Pro', 'Unlimited staff', 'Unlimited tables', 'Multi-location support', 'SaaS admin panel', 'Custom integrations', 'Dedicated support', 'SLA guarantee']}
                            cta="Contact Sales"
                            highlighted={false}
                        />
                    </div>
                </div>
            </section>

            {/* ─── Tech Stack / Trust ─── */}
            <section className="py-16 border-y border-gray-100 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-10">
                        <h3 className="text-lg font-semibold text-gray-700">Built with Modern, Reliable Technology</h3>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm text-gray-500">
                        <TechBadge icon={<Zap size={16} />} label="Next.js 16" />
                        <TechBadge icon={<Layers size={16} />} label="Supabase (Postgres)" />
                        <TechBadge icon={<ShieldCheck size={16} />} label="Row Level Security" />
                        <TechBadge icon={<Globe size={16} />} label="PWA Enabled" />
                        <TechBadge icon={<Clock size={16} />} label="Real-time Sync" />
                        <TechBadge icon={<CreditCard size={16} />} label="Stripe Ready" />
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section id="faq" className="py-24">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-[var(--color-primary)] font-semibold text-sm tracking-wide uppercase">FAQ</span>
                        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">
                            Frequently asked questions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <FaqItem
                            question="Do my customers need to download an app?"
                            answer="No. Customers simply scan the QR code on their table using their phone camera. The menu loads in their browser instantly — no app download, no sign-up required."
                        />
                        <FaqItem
                            question="How does the QR payment verification work?"
                            answer="Customers pay via eSewa, Khalti, or Fonepay and upload a screenshot of their payment. Your waiter sees the claim in their feed and can verify or reject it with one tap. The system tracks all verifications for your records."
                        />
                        <FaqItem
                            question="Can I customize the menu and branding?"
                            answer="Yes. You can fully manage your menu items, categories, modifier groups (sizes, toppings, etc.), images, and pricing. You can also customize your brand colors, fonts, and border radius through the theme editor."
                        />
                        <FaqItem
                            question="Is it really free to start?"
                            answer="Yes. The Free plan lets you use KKhane with up to 5 menu items, 3 tables, and 1 staff account — no credit card required, no time limit. You can upgrade anytime as your restaurant grows."
                        />
                        <FaqItem
                            question="Does it work offline?"
                            answer="KKhane is a Progressive Web App (PWA) that can be installed on any device. While core features like ordering require internet, the app shell loads instantly even on slow connections."
                        />
                        <FaqItem
                            question="Can I manage multiple restaurant locations?"
                            answer="Yes. The Enterprise plan includes multi-location support with a centralized SaaS admin panel to manage all your restaurants, staff, and subscriptions from one place."
                        />
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="py-24 bg-[var(--color-secondary)]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                        Ready to modernize your restaurant?
                    </h2>
                    <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
                        Join restaurants across Nepal using KKhane to streamline operations,
                        delight customers, and grow revenue. Start free — upgrade when you&apos;re ready.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Link
                            href="#pricing"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-xl shadow-lg shadow-[var(--color-primary)]/25 transition-all text-lg active:scale-[0.98]"
                        >
                            Start Free Trial <ArrowRight size={20} />
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-lg"
                        >
                            Staff Login <ArrowUpRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="bg-[var(--color-secondary)] border-t border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
                        {/* Brand */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <Image
                                src="/icons/kkhane.png"
                                alt="KKhane"
                                width={120}
                                height={34}
                                className="h-8 w-auto object-contain brightness-0 invert opacity-80"
                            />
                            <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-xs">
                                All-in-one restaurant management system built for Nepal&apos;s food industry.
                                QR ordering, kitchen display, payments, and more.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
                                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
                            </ul>
                        </div>

                        {/* Access */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Access</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li><Link href="/login" className="hover:text-white transition">Staff Login</Link></li>
                                <li><a href="#pricing" className="hover:text-white transition">Start Free Trial</a></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                <li>hello@kkhane.com</li>
                                <li>Kathmandu, Nepal</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
                        <p>&copy; {new Date().getFullYear()} KKhane. All rights reserved.</p>
                        <p>Built with ❤️ in Nepal</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

/* ─────────────────────── Sub-components ─────────────────────── */

function MockKPI({ label, value, trend }: { label: string; value: string; trend: string }) {
    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 mb-1">{label}</p>
            <div className="flex items-end gap-1.5">
                <span className="text-sm font-bold text-gray-900">{value}</span>
                {trend && <span className="text-[10px] font-medium text-green-600">{trend}</span>}
            </div>
        </div>
    )
}

function MockOrder({ table, items, status, color }: { table: string; items: string; status: string; color: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-gray-700">{table}</span>
                <span className="text-xs text-gray-500">{items}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{status}</span>
        </div>
    )
}

function MockPaymentRow({ method, amount, status, statusColor }: { method: string; amount: string; status: string; statusColor: string }) {
    return (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div>
                <p className="text-sm font-medium text-gray-800">{method}</p>
                <p className="text-xs text-gray-500">{amount}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{status}</span>
        </div>
    )
}

function StatItem({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <p className="text-3xl md:text-4xl font-bold text-[var(--color-secondary)]">{value}</p>
            <p className="mt-1 text-sm text-gray-500">{label}</p>
        </div>
    )
}

function FeatureCardLarge({ icon, title, description, highlights }: {
    icon: React.ReactNode
    title: string
    description: string
    highlights: string[]
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg hover:border-gray-300 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-5 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-[var(--color-secondary)] mb-3">{title}</h3>
            <p className="text-gray-600 leading-relaxed mb-4">{description}</p>
            <ul className="space-y-1.5">
                {highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle size={14} className="text-[var(--color-primary)] shrink-0" />
                        {h}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function FeatureCardSmall({ icon, title, description }: {
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-3">
                {icon}
            </div>
            <h4 className="font-semibold text-gray-900 mb-1.5">{title}</h4>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
    )
}

function StepCard({ step, icon, title, description }: {
    step: string
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 text-white mb-5 border border-white/10">
                {icon}
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
                {step}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    )
}

function RoleCard({ icon, role, color, features }: {
    icon: React.ReactNode
    role: string
    color: string
    features: string[]
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${color}`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-[var(--color-secondary)] mb-3">{role}</h3>
            <ul className="space-y-2">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function NepalFeature({ icon, title, description }: {
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-gray-900">{title}</h4>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            </div>
        </div>
    )
}

function PricingCard({ tier, price, period, description, features, cta, highlighted }: {
    tier: string
    price: string
    period: string
    description: string
    features: string[]
    cta: string
    highlighted: boolean
}) {
    return (
        <div className={`relative rounded-2xl p-6 flex flex-col ${
            highlighted
                ? 'bg-[var(--color-secondary)] text-white border-2 border-[var(--color-primary)] shadow-xl scale-[1.02]'
                : 'bg-white border border-gray-200'
        }`}>
            {highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full">
                    Most Popular
                </div>
            )}
            <div className="mb-6">
                <h3 className={`text-lg font-bold ${highlighted ? 'text-white' : 'text-gray-900'}`}>{tier}</h3>
                <p className={`text-sm mt-1 ${highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
            </div>
            <div className="mb-6">
                <span className={`text-3xl font-bold ${highlighted ? 'text-white' : 'text-[var(--color-secondary)]'}`}>
                    {price}
                </span>
                {period && <span className={`text-sm ${highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{period}</span>}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
                {features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                        <CheckCircle size={14} className={`shrink-0 mt-0.5 ${highlighted ? 'text-[var(--color-primary)]' : 'text-green-500'}`} />
                        {f}
                    </li>
                ))}
            </ul>
            <a
                href={tier === 'Enterprise' ? 'mailto:hello@kkhane.com' : '/login'}
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    highlighted
                        ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
            >
                {cta}
            </a>
        </div>
    )
}

function TechBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="flex items-center gap-2 font-medium">
            {icon}
            {label}
        </span>
    )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    return (
        <details className="group bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-left font-semibold text-gray-900 hover:bg-gray-100 transition">
                {question}
                <ChevronDown size={18} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0 ml-4" />
            </summary>
            <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                {answer}
            </div>
        </details>
    )
}
