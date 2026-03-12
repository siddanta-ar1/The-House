'use client'

import { useState } from 'react'
import { Building2, Users, ShoppingBag, Crown, Ban, CheckCircle, Loader2, ChevronDown } from 'lucide-react'
import { suspendRestaurant, updateSubscriptionTier } from './actions'
import { toast } from 'react-hot-toast'

interface Restaurant {
    id: string
    name: string
    slug: string
    is_active: boolean
    is_suspended: boolean
    subscription_tier: string
    max_staff: number
    max_menu_items: number
    created_at: string
    users?: { email: string } | null
}

interface SaasMetrics {
    totalRestaurants: number
    activeRestaurants: number
    totalOrders: number
    tierBreakdown: Record<string, number>
}

const TIER_COLORS: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
}

export default function SuperAdminDashboard({
    restaurants,
    metrics,
}: {
    restaurants: Restaurant[]
    metrics: SaasMetrics
}) {
    const [items, setItems] = useState(restaurants)
    const [loading, setLoading] = useState<string | null>(null)

    const handleSuspend = async (id: string, suspend: boolean) => {
        setLoading(id)
        const res = await suspendRestaurant(id, suspend)
        if (res.success) {
            setItems(prev => prev.map(r => r.id === id ? { ...r, is_suspended: suspend } : r))
            toast.success(suspend ? 'Restaurant suspended' : 'Restaurant reactivated')
        } else {
            toast.error(res.error || 'Failed')
        }
        setLoading(null)
    }

    const handleTierChange = async (id: string, tier: 'free' | 'basic' | 'pro' | 'enterprise') => {
        setLoading(id)
        const res = await updateSubscriptionTier(id, tier)
        if (res.success) {
            const limitsMap: Record<string, { max_staff: number; max_menu_items: number }> = {
                free: { max_staff: 3, max_menu_items: 20 },
                basic: { max_staff: 10, max_menu_items: 100 },
                pro: { max_staff: 50, max_menu_items: 500 },
                enterprise: { max_staff: 999, max_menu_items: 9999 },
            }
            setItems(prev =>
                prev.map(r =>
                    r.id === id
                        ? { ...r, subscription_tier: tier, ...limitsMap[tier] }
                        : r
                )
            )
            toast.success(`Tier changed to ${tier}`)
        } else {
            toast.error(res.error || 'Failed')
        }
        setLoading(null)
    }

    return (
        <div className="space-y-8">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    icon={Building2}
                    label="Total Restaurants"
                    value={metrics.totalRestaurants}
                    color="bg-blue-500"
                />
                <MetricCard
                    icon={CheckCircle}
                    label="Active"
                    value={metrics.activeRestaurants}
                    color="bg-green-500"
                />
                <MetricCard
                    icon={ShoppingBag}
                    label="Total Orders"
                    value={metrics.totalOrders}
                    color="bg-purple-500"
                />
                <MetricCard
                    icon={Crown}
                    label="Pro+ Accounts"
                    value={(metrics.tierBreakdown.pro || 0) + (metrics.tierBreakdown.enterprise || 0)}
                    color="bg-amber-500"
                />
            </div>

            {/* Tier Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Subscription Distribution</h3>
                <div className="flex gap-4 flex-wrap">
                    {Object.entries(metrics.tierBreakdown).map(([tier, count]) => (
                        <div key={tier} className={`px-4 py-2 rounded-full text-sm font-semibold ${TIER_COLORS[tier] || 'bg-gray-100 text-gray-700'}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
                        </div>
                    ))}
                </div>
            </div>

            {/* Restaurant List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-800">All Restaurants</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage tenants, tiers, and suspension</p>
                </div>

                <div className="divide-y divide-gray-100">
                    {items.map((restaurant) => (
                        <div
                            key={restaurant.id}
                            className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 ${
                                restaurant.is_suspended ? 'bg-red-50/50' : ''
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-gray-900 truncate">{restaurant.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[restaurant.subscription_tier] || TIER_COLORS.free}`}>
                                        {(restaurant.subscription_tier || 'free').toUpperCase()}
                                    </span>
                                    {restaurant.is_suspended && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                            SUSPENDED
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(restaurant.users as any)?.email || 'No owner'} • 
                                    Staff: {restaurant.max_staff} • 
                                    Items: {restaurant.max_menu_items}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Tier Selector */}
                                <div className="relative">
                                    <select
                                        value={restaurant.subscription_tier || 'free'}
                                        onChange={(e) => handleTierChange(restaurant.id, e.target.value as any)}
                                        disabled={loading === restaurant.id}
                                        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium disabled:opacity-50"
                                    >
                                        <option value="free">Free</option>
                                        <option value="basic">Basic</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Suspend/Reactivate */}
                                <button
                                    onClick={() => handleSuspend(restaurant.id, !restaurant.is_suspended)}
                                    disabled={loading === restaurant.id}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 ${
                                        restaurant.is_suspended
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                    }`}
                                >
                                    {loading === restaurant.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : restaurant.is_suspended ? (
                                        <><CheckCircle size={14} /> Reactivate</>
                                    ) : (
                                        <><Ban size={14} /> Suspend</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {items.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        <Building2 size={40} className="mx-auto mb-3" />
                        <p>No restaurants registered yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function MetricCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType
    label: string
    value: number
    color: string
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg text-white ${color} mb-3`}>
                <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        </div>
    )
}
