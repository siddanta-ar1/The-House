'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Smartphone, ImageIcon, Loader2, DoorClosed } from 'lucide-react'
import { verifyPayment, verifyPaymentAndCloseTable } from './payment-verification-actions'
import { timeAgo } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface PaymentClaim {
    id: string
    order_id: string | null
    restaurant_id: string
    claimed_amount: number
    customer_phone: string
    provider: string
    screenshot_url: string | null
    status: 'pending' | 'verified' | 'rejected'
    verified_by: string | null
    created_at: string
}

export default function PaymentVerificationFeed({
    initialClaims,
    restaurantId,
    userId,
}: {
    initialClaims: PaymentClaim[]
    restaurantId: string
    userId: string
}) {
    const [claims, setClaims] = useState<PaymentClaim[]>(initialClaims)
    const [loading, setLoading] = useState<string | null>(null)
    const [expandedImage, setExpandedImage] = useState<string | null>(null)
    const supabase = createClient()

    // Realtime subscription for new payment claims
    useEffect(() => {
        const channel = supabase
            .channel('payment-verifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'payment_verifications',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                (payload) => {
                    setClaims((prev) => [payload.new as PaymentClaim, ...prev])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payment_verifications',
                    filter: `restaurant_id=eq.${restaurantId}`,
                },
                (payload) => {
                    setClaims((prev) =>
                        prev.map((c) => (c.id === (payload.new as PaymentClaim).id ? (payload.new as PaymentClaim) : c))
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [restaurantId, supabase])

    const handleVerify = async (claimId: string, action: 'verified' | 'rejected') => {
        setLoading(claimId)
        const res = await verifyPayment(claimId, action, userId)
        if (!res.error) {
            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId ? { ...c, status: action, verified_by: userId } : c
                )
            )
        }
        setLoading(null)
    }

    const handleVerifyAndClose = async (claimId: string) => {
        setLoading(claimId)
        const res = await verifyPaymentAndCloseTable(claimId, userId)
        if (res.error) {
            toast.error(res.error)
        } else {
            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId ? { ...c, status: 'verified' as const, verified_by: userId } : c
                )
            )
            if (res.tableClosed) {
                toast.success('Payment verified & table closed! \u2705')
            } else {
                toast.success('Payment verified. Other orders still unpaid.')
            }
        }
        setLoading(null)
    }

    const pendingClaims = claims.filter((c) => c.status === 'pending')
    const resolvedClaims = claims.filter((c) => c.status !== 'pending')

    if (claims.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                <Smartphone size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">No payment claims yet</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Smartphone size={20} className="text-green-600" />
                Payment Verifications
                {pendingClaims.length > 0 && (
                    <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        {pendingClaims.length} pending
                    </span>
                )}
            </h2>

            {/* Pending Claims */}
            {pendingClaims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-xl shadow-sm border-2 border-amber-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            <span className="text-sm font-semibold text-amber-700">Pending Verification</span>
                        </div>
                        <span className="text-xs text-gray-400">{timeAgo(claim.created_at)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">Amount:</span>
                            <span className="ml-1 font-bold text-gray-900">Rs. {claim.claimed_amount.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Phone:</span>
                            <span className="ml-1 font-medium text-gray-800">{claim.customer_phone}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Via:</span>
                            <span className="ml-1 font-medium text-gray-800 capitalize">{claim.provider}</span>
                        </div>
                    </div>

                    {/* Screenshot */}
                    {claim.screenshot_url && (
                        <button
                            onClick={() => setExpandedImage(expandedImage === claim.id ? null : claim.id)}
                            className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:underline"
                        >
                            <ImageIcon size={14} />
                            {expandedImage === claim.id ? 'Hide screenshot' : 'View screenshot'}
                        </button>
                    )}
                    {expandedImage === claim.id && claim.screenshot_url && (
                        <img
                            src={claim.screenshot_url}
                            alt="Payment screenshot"
                            className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
                        />
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                        {/* Primary action: Verify & Close Table (Step 9 of Golden Path) */}
                        {claim.order_id && (
                            <button
                                onClick={() => handleVerifyAndClose(claim.id)}
                                disabled={loading === claim.id}
                                className="w-full bg-blue-600 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm active:scale-95 disabled:opacity-50"
                            >
                                {loading === claim.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <DoorClosed size={16} />
                                )}
                                Verify Payment & Close Table
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleVerify(claim.id, 'verified')}
                                disabled={loading === claim.id}
                                className="flex-1 bg-green-600 text-white font-medium rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm active:scale-95 disabled:opacity-50"
                            >
                                {loading === claim.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <CheckCircle size={16} />
                                )}
                                Approve
                            </button>
                            <button
                                onClick={() => handleVerify(claim.id, 'rejected')}
                                disabled={loading === claim.id}
                                className="flex-1 bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm active:scale-95 disabled:opacity-50"
                            >
                                <XCircle size={16} />
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Resolved Claims */}
            {resolvedClaims.length > 0 && (
                <details className="group">
                    <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                        {resolvedClaims.length} resolved claim{resolvedClaims.length > 1 ? 's' : ''}
                    </summary>
                    <div className="mt-2 space-y-2">
                        {resolvedClaims.map((claim) => (
                            <div
                                key={claim.id}
                                className={`rounded-lg border p-3 text-sm flex items-center justify-between ${
                                    claim.status === 'verified'
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                }`}
                            >
                                <div>
                                    <span className="font-medium">Rs. {claim.claimed_amount.toFixed(2)}</span>
                                    <span className="text-gray-500 ml-2">• {claim.customer_phone}</span>
                                </div>
                                <span className={`font-semibold text-xs uppercase ${
                                    claim.status === 'verified' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                    {claim.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Full-screen image overlay */}
            {expandedImage && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setExpandedImage(null)}
                />
            )}
        </div>
    )
}
