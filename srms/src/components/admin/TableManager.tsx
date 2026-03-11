'use client'

import { useState } from 'react'
import { QrCode, Plus, Edit2, Trash2, Check, X, Loader2, Download, Smartphone } from 'lucide-react'
import type { Table } from '@/types/database'
import { QRCodeSVG } from 'qrcode.react'
import { addTableAction, updateTableAction, deleteTableAction } from '@/app/(admin)/admin/tables/actions'
import { toast } from 'react-hot-toast'
import { useConfirmStore } from '@/lib/stores/confirm'

export default function TableManager({
    initialTables,
    restaurantId,
    appUrl
}: {
    initialTables: Table[]
    restaurantId: string
    appUrl: string
}) {
    const [tables, setTables] = useState<Table[]>(initialTables)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTable, setEditingTable] = useState<Table | null>(null)
    const [formData, setFormData] = useState({ label: '', capacity: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)

    // QR Preview State
    const [previewTable, setPreviewTable] = useState<Table | null>(null)
    const { confirm } = useConfirmStore()

    const openModal = (table?: Table) => {
        if (table) {
            setEditingTable(table)
            setFormData({ label: table.label, capacity: table.capacity?.toString() || '' })
        } else {
            setEditingTable(null)
            // Auto-suggest next table number
            const nextNum = tables.length > 0
                ? Math.max(...tables.map(t => parseInt(t.label.replace(/\D/g, '') || '0'))) + 1
                : 1
            setFormData({ label: `Table ${nextNum}`, capacity: '4' })
        }
        setIsModalOpen(true)
    }

    const saveTable = async () => {
        if (!formData.label) return
        setIsSubmitting(true)

        const capacityNum = formData.capacity ? parseInt(formData.capacity) : undefined

        if (editingTable) {
            const res = await updateTableAction(editingTable.id, {
                label: formData.label,
                capacity: capacityNum
            })
            if (res.success) {
                setTables(tables.map(t => t.id === editingTable.id ? { ...t, label: formData.label, capacity: capacityNum || null } : t))
            } else {
                toast.error(res.error || 'Failed to update table')
            }
        } else {
            const res = await addTableAction(restaurantId, formData.label, capacityNum)
            if (res.data) {
                setTables([...tables, res.data])
            } else {
                toast.error(res.error || 'Failed to add table')
            }
        }

        setIsModalOpen(false)
        setIsSubmitting(false)
    }

    const deleteTable = async (id: string, label: string) => {
        const isOk = await confirm({
            title: `Delete ${label}?`,
            message: 'Are you sure you want to delete this table? The QR code will no longer work.',
            confirmText: 'Delete',
            isDestructive: true
        })
        if (!isOk) return

        const res = await deleteTableAction(id)
        if (res.success) {
            setTables(tables.filter(t => t.id !== id))
            toast.success('Table deleted')
        } else {
            toast.error(res.error || 'Failed to delete table')
        }
    }

    const downloadQR = (table: Table) => {
        const svg = document.getElementById(`qr-${table.id}`)
        if (!svg) return
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()
        img.onload = () => {
            canvas.width = img.width + 40
            canvas.height = img.height + 80
            if (ctx) {
                ctx.fillStyle = "white"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 20, 20)
                ctx.font = "bold 20px sans-serif"
                ctx.fillStyle = "black"
                ctx.textAlign = "center"
                ctx.fillText(table.label, canvas.width / 2, canvas.height - 20)
            }
            const pngFile = canvas.toDataURL("image/png")
            const downloadLink = document.createElement("a")
            downloadLink.download = `${table.label.replace(/\s+/g, '_')}_QR.png`
            downloadLink.href = `${pngFile}`
            downloadLink.click()
        }
        img.src = "data:image/svg+xml;base64," + btoa(svgData)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-800">Restaurant Layout ({tables.length})</h3>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add Table
                </button>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map(table => {
                        const menuUrl = `${appUrl}/t/${table.qr_token}`

                        return (
                            <div key={table.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col bg-white">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{table.label}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">Seats: {table.capacity || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(table)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => deleteTable(table.id, table.label)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col items-center justify-center flex-1">
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-4">
                                        <QRCodeSVG
                                            id={`qr-${table.id}`}
                                            value={menuUrl}
                                            size={120}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => setPreviewTable(table)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <Smartphone size={14} /> Preview
                                        </button>
                                        <button
                                            onClick={() => downloadQR(table)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {tables.length === 0 && (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                            <QrCode size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No tables yet</h3>
                        <p className="text-gray-500 mb-6">Add tables to generate QR codes for ordering.</p>
                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus size={18} /> Create First Table
                        </button>
                    </div>
                )}
            </div>

            {/* Table Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">{editingTable ? 'Edit Table' : 'Add Table'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Table Label / Number *</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    placeholder="e.g. Table 1, Patio A"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seat Capacity (Optional)</label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    placeholder="4"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button disabled={!formData.label || isSubmitting} onClick={saveTable} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* URL/Phone Preview Modal */}
            {previewTable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setPreviewTable(null)}>
                    <div className="bg-white rounded-[2.5rem] p-4 shadow-2xl relative border-8 border-gray-900 w-[320px] h-[640px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-20"></div>

                        <div className="flex-1 bg-gray-100 rounded-[1.5rem] overflow-hidden flex flex-col relative pt-8">
                            {/* Browser Header Fake */}
                            <div className="bg-gray-100 px-4 pb-2 pt-2 border-b border-gray-200 shrink-0 flex items-center gap-2">
                                <div className="w-4 h-4 rounded text-gray-400"><Smartphone size={16} /></div>
                                <div className="flex-1 bg-gray-200/80 rounded-lg text-[10px] text-center text-gray-500 py-1.5 px-2 truncate">
                                    localhost:3000/t/{previewTable.qr_token.substring(0, 8)}...
                                </div>
                            </div>

                            {/* Iframe Loading the public menu page */}
                            <iframe
                                src={`/t/${previewTable.qr_token}`}
                                className="w-full h-full border-none bg-white pointer-events-auto"
                                title={`Simulated view for ${previewTable.label}`}
                            />
                        </div>

                        <button
                            onClick={() => setPreviewTable(null)}
                            className="absolute -right-12 -top-12 w-24 h-24 bg-white/10 hover:bg-white/20 rounded-full flex items-end justify-start p-4 text-white transition-colors"
                        >
                            <X size={24} className="-ml-1 -mb-1" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
