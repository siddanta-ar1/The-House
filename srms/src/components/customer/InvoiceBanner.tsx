'use client'

import { FileText, Building, Shield } from 'lucide-react'

interface InvoiceBannerProps {
    invoiceNumber: string
    panNumber?: string | null
    restaurantName?: string | null
    vatRegistered?: boolean | null
}

export default function InvoiceBanner({
    invoiceNumber,
    panNumber,
    restaurantName,
    vatRegistered,
}: InvoiceBannerProps) {
    return (
        <div className="mt-6 bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2 text-gray-800">
                <FileText size={18} className="text-[var(--color-primary)]" />
                <h3 className="font-semibold">Tax Invoice</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-gray-500">Invoice #</span>
                    <p className="font-mono font-bold text-gray-900">{invoiceNumber}</p>
                </div>

                {panNumber && (
                    <div>
                        <span className="text-gray-500 flex items-center gap-1">
                            <Building size={12} />
                            PAN
                        </span>
                        <p className="font-mono font-bold text-gray-900">{panNumber}</p>
                    </div>
                )}

                {restaurantName && (
                    <div className="col-span-2">
                        <span className="text-gray-500">Issued by</span>
                        <p className="font-medium text-gray-800">{restaurantName}</p>
                    </div>
                )}
            </div>

            {vatRegistered && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 w-fit">
                    <Shield size={12} />
                    VAT Registered (13%)
                </div>
            )}

            <p className="text-xs text-gray-400 pt-1">
                This is an IRD-compliant tax invoice. Keep for your records.
            </p>
        </div>
    )
}
