'use client'

import { useState } from 'react'
import { QrCode, Upload, CheckCircle, Loader2, Smartphone } from 'lucide-react'
import { submitPaymentClaim } from '@/app/(public)/t/[tableSlug]/checkout/nepal-payment-actions'
import Image from 'next/image'

interface NepalPaymentPanelProps {
    restaurantId: string
    totalAmount: number
    qrUrl?: string | null
    provider?: string | null
}

export default function NepalPaymentPanel({
    restaurantId,
    totalAmount,
    qrUrl,
    provider,
}: NepalPaymentPanelProps) {
    const [phone, setPhone] = useState('')
    const [screenshot, setScreenshot] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setScreenshot(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async () => {
        if (!phone || phone.length < 10) {
            setError('Please enter a valid phone number')
            return
        }

        setIsSubmitting(true)
        setError('')

        const formData = new FormData()
        formData.append('restaurantId', restaurantId)
        formData.append('amount', totalAmount.toString())
        formData.append('phone', phone)
        formData.append('provider', provider || 'esewa')
        if (screenshot) {
            formData.append('screenshot', screenshot)
        }

        const res = await submitPaymentClaim(formData)

        if (res.error) {
            setError(res.error)
        } else {
            setSubmitted(true)
        }
        setIsSubmitting(false)
    }

    if (submitted) {
        return (
            <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">Payment Claimed!</h3>
                <p className="text-gray-500 text-sm mt-2">
                    Your payment is being verified by the staff.<br />
                    You&apos;ll receive confirmation shortly.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Smartphone size={18} className="text-green-600" />
                <h3 className="font-semibold text-gray-800">Pay via {provider || 'eSewa / Khalti'}</h3>
            </div>

            {/* QR Code Display */}
            {qrUrl ? (
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                        Scan to pay <span className="text-[var(--color-primary)] font-bold">Rs. {totalAmount.toFixed(2)}</span>
                    </p>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <Image
                            src={qrUrl}
                            alt="Payment QR Code"
                            width={200}
                            height={200}
                            className="w-48 h-48 object-contain"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Open {provider || 'eSewa/Khalti/Fonepay'} and scan this code
                    </p>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center text-center">
                    <QrCode size={48} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                        QR code not configured. Please ask the restaurant for payment details.
                    </p>
                </div>
            )}

            {/* After scanning, customer confirms payment */}
            <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-gray-700">
                    After paying, confirm below:
                </p>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">Your phone number</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">
                        Payment screenshot <span className="text-gray-400">(optional)</span>
                    </label>
                    <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition">
                        <Upload size={18} className="text-gray-400" />
                        <span className="text-sm text-gray-500">
                            {screenshot ? screenshot.name : 'Tap to upload screenshot'}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                    {previewUrl && (
                        <img src={previewUrl} alt="Screenshot preview" className="mt-2 h-24 rounded-lg object-cover border border-gray-200" />
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !phone}
                    className="w-full bg-green-600 text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <><Loader2 className="animate-spin" size={18} /> Submitting...</>
                    ) : (
                        <><CheckCircle size={18} /> I Have Paid</>
                    )}
                </button>
            </div>
        </div>
    )
}
