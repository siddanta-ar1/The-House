'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { loginAction } from './actions'
import VideoLogo from '@/components/shared/VideoLogo'
import { Eye, EyeOff } from 'lucide-react'

const initialState = { error: null as string | null }

export function LoginForm({ redirectTo }: { redirectTo: string }) {
    const [state, formAction, isPending] = useActionState(loginAction, initialState)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl mx-4">
            <div className="flex flex-col items-center mb-8">
                <VideoLogo className="h-10 mb-4" />
                <h1 className="text-2xl font-bold text-center text-gray-900">Staff Login</h1>
                <p className="text-sm text-gray-500 text-center mt-2">
                    Sign in to access your dashboard
                </p>
            </div>

            <form action={formAction} className="space-y-6">
                <input type="hidden" name="redirect" value={redirectTo} />

                {state?.error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                        {state.error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                        placeholder="manager@restaurant.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-gray-800 disabled:opacity-50 transition shadow-md active:scale-95"
                >
                    {isPending ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-400">
                Smart Restaurant Management System
            </div>
        </div>
    )
}
