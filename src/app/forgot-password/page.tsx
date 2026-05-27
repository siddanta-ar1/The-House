'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from './actions'
import VideoLogo from '@/components/shared/VideoLogo'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

const initialState = { error: null as string | null, success: false }

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

    if (state.success) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-50 rounded-full">
                            <CheckCircle2 size={36} className="text-green-500" />
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        If an account exists for that email, we sent a password reset link. It expires in 1 hour.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                    >
                        <ArrowLeft size={15} /> Back to login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
            <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4">
                <div className="flex flex-col items-center mb-8">
                    <VideoLogo className="h-10 mb-4" />
                    <h1 className="text-2xl font-bold text-center text-gray-900">Reset Password</h1>
                    <p className="text-sm text-gray-500 text-center mt-2">
                        Enter your email and we&apos;ll send a reset link.
                    </p>
                </div>

                <form action={formAction} className="space-y-5">
                    {state.error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoFocus
                                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition text-sm"
                                placeholder="you@restaurant.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-gray-800 disabled:opacity-50 transition shadow-md active:scale-95 text-sm"
                    >
                        {isPending ? 'Sending…' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                    >
                        <ArrowLeft size={14} /> Back to login
                    </Link>
                </div>
            </div>
        </div>
    )
}
