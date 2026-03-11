'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import { LockKeyhole } from 'lucide-react'

// Define the initial state matching the action signature
const initialState = { error: null as string | null }

export function LoginForm({ redirectTo }: { redirectTo: string }) {
    // useActionState matches React 19's Server Action pattern
    const [state, formAction, isPending] = useActionState(loginAction, initialState)

    return (
        <div className="w-full max-w-md bg-white rounded-[var(--border-radius)] p-8 shadow-2xl mx-4">
            <div className="flex flex-col items-center mb-8">
                <div className="h-16 w-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-4">
                    <LockKeyhole className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-center">Staff Login</h1>
                <p className="text-sm text-gray-500 text-center mt-2">
                    Enter your credentials to access the SRMS dashboard
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
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                        placeholder="manager@restaurant.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--color-primary)] text-white rounded-lg py-3 font-medium hover:bg-opacity-90 disabled:opacity-50 transition shadow-md active:transform active:scale-95"
                >
                    {isPending ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-400">
                Smart Restaurant Management System v1.0
            </div>
        </div>
    )
}
