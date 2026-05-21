'use client'

import { useState } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ensureNepaliLanguage } from '@/app/(admin)/admin/menu/translation-actions'
import { useRouter } from 'next/navigation'

export default function EnableNepaliButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleEnable = async () => {
        setLoading(true)
        const res = await ensureNepaliLanguage()
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Nepali language enabled! Globe icons now appear on each item.')
            router.refresh()
        }
    }

    return (
        <button
            onClick={handleEnable}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            Enable Nepali (नेपाली)
        </button>
    )
}
