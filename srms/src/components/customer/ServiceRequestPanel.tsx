'use client'

import { useState } from 'react'
import { Bell, Droplets, Receipt, Sparkles, X, Loader2, Check } from 'lucide-react'
import { createServiceRequest } from '@/app/api/service-requests/actions'
import type { ServiceRequestType } from '@/types/database'

const REQUEST_OPTIONS: {
    type: ServiceRequestType
    label: string
    icon: typeof Bell
    color: string
}[] = [
        { type: 'call_waiter', label: 'Call Waiter', icon: Bell, color: 'bg-blue-500' },
        { type: 'request_bill', label: 'Request Bill', icon: Receipt, color: 'bg-green-500' },
        { type: 'need_water', label: 'Need Water', icon: Droplets, color: 'bg-cyan-500' },
        { type: 'clean_table', label: 'Clean Table', icon: Sparkles, color: 'bg-amber-500' },
    ]

export default function ServiceRequestPanel({
    sessionId,
    restaurantId,
}: {
    sessionId: string
    restaurantId: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState<ServiceRequestType | null>(null)
    const [success, setSuccess] = useState<ServiceRequestType | null>(null)
    const [error, setError] = useState('')
    const [customMessage, setCustomMessage] = useState('')

    const handleRequest = async (type: ServiceRequestType) => {
        setLoading(type)
        setError('')

        const res = await createServiceRequest(
            sessionId,
            restaurantId,
            type,
            type === 'other' ? customMessage : undefined
        )

        setLoading(null)

        if (res.error) {
            setError(res.error)
        } else {
            setSuccess(type)
            setTimeout(() => setSuccess(null), 3000)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-40 bg-white shadow-xl border border-gray-200 rounded-full p-3.5 active:scale-95 transition-transform"
                aria-label="Service requests"
            >
                <Bell size={22} className="text-gray-700" />
            </button>
        )
    }

    return (
        <div className="fixed bottom-24 right-4 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">Need Help?</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                </button>
            </div>

            {/* Options */}
            <div className="p-3 grid grid-cols-2 gap-2">
                {REQUEST_OPTIONS.map(({ type, label, icon: Icon, color }) => (
                    <button
                        key={type}
                        onClick={() => handleRequest(type)}
                        disabled={loading !== null}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <div className={`${color} text-white p-2 rounded-lg`}>
                            {loading === type ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : success === type ? (
                                <Check size={18} />
                            ) : (
                                <Icon size={18} />
                            )}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{label}</span>
                    </button>
                ))}
            </div>

            {/* Custom message for "other" */}
            <div className="px-3 pb-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Other request..."
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onClick={() => handleRequest('other')}
                        disabled={!customMessage.trim() || loading !== null}
                        className="bg-gray-800 text-white text-sm px-3 rounded-lg disabled:opacity-40"
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="px-3 pb-3">
                    <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>
                </div>
            )}
        </div>
    )
}
