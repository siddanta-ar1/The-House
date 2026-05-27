'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordAction } from './actions'
import VideoLogo from '@/components/shared/VideoLogo'
import { Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'

const initialState = { error: null as string | null, success: false }

export default function ResetPasswordPage() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [sessionReady, setSessionReady] = useState(false)
    const [sessionError, setSessionError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

    // Exchange the ?code= param for a session on mount
    useEffect(() => {
        const code = searchParams.get('code')
        if (!code) {
            setSessionError(true)
            return
        }
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
                setSessionError(true)
            } else {
                setSessionReady(true)
            }
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (state.success) {
            setTimeout(() => router.push('/login'), 2000)
        }
    }, [state.success, router])

    if (sessionError) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-50 rounded-full">
                            <AlertTriangle size={36} className="text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        This password reset link has expired or already been used. Please request a new one.
                    </p>
                    <a href="/forgot-password" className="text-sm font-medium text-gray-900 underline">
                        Request a new link
                    </a>
                </div>
            </div>
        )
    }

    if (state.success) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-50 rounded-full">
                            <CheckCircle2 size={36} className="text-green-500" />
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
                    <p className="text-sm text-gray-500">Redirecting you to login…</p>
                </div>
            </div>
        )
    }

    if (!sessionReady) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4 text-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Verifying reset link…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
            <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4">
                <div className="flex flex-col items-center mb-8">
                    <VideoLogo className="h-10 mb-4" />
                    <h1 className="text-2xl font-bold text-center text-gray-900">Set new password</h1>
                    <p className="text-sm text-gray-500 text-center mt-2">
                        Choose a strong password (at least 8 characters).
                    </p>
                </div>

                <form action={formAction} className="space-y-5">
                    {state.error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition text-sm"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" tabIndex={-1}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirm"
                                name="confirm"
                                type={showConfirm ? 'text' : 'password'}
                                required
                                minLength={8}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition text-sm"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowConfirm(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" tabIndex={-1}>
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-gray-800 disabled:opacity-50 transition shadow-md active:scale-95 text-sm"
                    >
                        {isPending ? 'Updating…' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
