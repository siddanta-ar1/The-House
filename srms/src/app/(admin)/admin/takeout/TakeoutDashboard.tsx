'use client'

import { useState } from 'react'
import { updateTakeoutStatusAction } from './actions'
import { Clock, Phone, User, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import type { TakeoutOrder } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
    placed: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    ready_for_pickup: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
}

const NEXT_STATUS: Record<string, string> = {
    placed: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready_for_pickup',
    ready_for_pickup: 'picked_up',
}

export default function TakeoutDashboard({ initialOrders }: {
    initialOrders: TakeoutOrder[]
    restaurantId: string
}) {
    const [orders, setOrders] = useState(initialOrders)

    async function advance(order: TakeoutOrder) {
        const next = NEXT_STATUS[order.status]
        if (!next) return
        const result = await updateTakeoutStatusAction(order.id, next)
        if (result.error) { toast.error(result.error); return }
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next as TakeoutOrder['status'] } : o)
            .filter(o => o.status !== 'picked_up'))
        toast.success(`Order → ${next.replace('_', ' ')}`)
    }

    async function cancel(order: TakeoutOrder) {
        if (!confirm('Cancel this takeout order?')) return
        const result = await updateTakeoutStatusAction(order.id, 'cancelled')
        if (result.error) { toast.error(result.error); return }
        setOrders(prev => prev.filter(o => o.id !== order.id))
        toast.success('Order cancelled')
    }

    return (
        <div className="space-y-3">
            {orders.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                    No active takeout orders.
                </div>
            )}
            {orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <User size={14} className="text-gray-400" />
                                <span className="font-semibold text-gray-900">{order.customer_name}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || ''}`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Phone size={12} />{order.customer_phone}</span>
                                <span className="flex items-center gap-1"><Clock size={12} />Pickup: {new Date(order.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                            <p className="text-xs text-gray-400">#{order.id.slice(0, 8)}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <ul className="space-y-1 text-sm text-gray-700">
                            {order.items.map((item, i) => (
                                <li key={i} className="flex justify-between">
                                    <span>{item.quantity}× {item.name}</span>
                                    <span className="text-gray-500">{formatCurrency(item.price * item.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        {order.customer_note && (
                            <p className="mt-2 text-xs text-gray-500 italic">Note: {order.customer_note}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                        {order.status !== 'cancelled' && order.status !== 'picked_up' && (
                            <button onClick={() => cancel(order)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
                                <XCircle size={14} /> Cancel
                            </button>
                        )}
                        {NEXT_STATUS[order.status] && (
                            <button onClick={() => advance(order)}
                                className="flex items-center gap-1 bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg font-medium">
                                <CheckCircle size={14} /> Mark {NEXT_STATUS[order.status].replace('_', ' ')}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
