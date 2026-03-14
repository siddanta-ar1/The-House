'use client'

import { useState } from 'react'
import { approveShiftAction, forceClockOutAction } from './actions'
import { Clock, CheckCircle, LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShiftRow {
    id: string
    user_id: string
    clock_in: string
    clock_out: string | null
    hours_worked: number | null
    break_minutes: number
    notes: string | null
    is_approved: boolean
    users?: { full_name: string | null; role_id: number; roles: { name: string } | null } | null
}

function getStaffName(shift: ShiftRow) {
    return shift.users?.full_name || '—'
}

function getStaffRole(shift: ShiftRow) {
    return shift.users?.roles?.name || '—'
}

function duration(clockIn: string, clockOut?: string | null) {
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date()
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
}

export default function ShiftsManager({ activeShifts, recentShifts }: {
    activeShifts: ShiftRow[]
    recentShifts: ShiftRow[]
}) {
    const [active, setActive] = useState(activeShifts)
    const [recent, setRecent] = useState(recentShifts)

    async function handleForceClockOut(shift: ShiftRow) {
        if (!confirm(`Force clock-out ${getStaffName(shift)}?`)) return
        const result = await forceClockOutAction(shift.id)
        if (result.error) { toast.error(result.error); return }
        setActive(prev => prev.filter(s => s.id !== shift.id))
        toast.success('Clocked out')
    }

    async function handleApprove(shift: ShiftRow) {
        const result = await approveShiftAction(shift.id, shift.user_id)
        if (result.error) { toast.error(result.error); return }
        setRecent(prev => prev.map(s => s.id === shift.id ? { ...s, is_approved: true } : s))
        toast.success('Shift approved')
    }

    return (
        <div className="space-y-6">
            {/* Active Shifts */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock size={18} className="text-green-600" />
                    <h2 className="font-semibold text-gray-900">Currently Clocked In ({active.length})</h2>
                </div>
                {active.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400">No staff currently clocked in.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Staff</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
                                <th className="text-left px-4 py-3 font-medium">Clocked In</th>
                                <th className="text-right px-4 py-3 font-medium">Duration</th>
                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {active.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 flex items-center gap-2">
                                        <User size={14} className="text-gray-400" />
                                        <span className="font-medium text-gray-900">{getStaffName(s)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{getStaffRole(s)}</td>
                                    <td className="px-4 py-3 text-gray-600">{new Date(s.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{duration(s.clock_in)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleForceClockOut(s)}
                                            className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1 ml-auto">
                                            <LogOut size={14} /> Force Out
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recent Shifts */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Shifts</h2>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Staff</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                            <th className="text-left px-4 py-3 font-medium">In/Out</th>
                            <th className="text-right px-4 py-3 font-medium">Hours</th>
                            <th className="text-center px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recent.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{getStaffName(s)}</td>
                                <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{getStaffRole(s)}</td>
                                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{new Date(s.clock_in).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    {new Date(s.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {' → '}
                                    {s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-gray-700">
                                    {s.hours_worked != null ? `${s.hours_worked.toFixed(1)}h` : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {s.is_approved ? (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Approved</span>
                                    ) : (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Pending</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {!s.is_approved && (
                                        <button onClick={() => handleApprove(s)}
                                            className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 ml-auto">
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {recent.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No completed shifts yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
