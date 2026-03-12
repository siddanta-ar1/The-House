// lib/stores/useHydratedStore.ts
// Prevents React hydration mismatch with Zustand persist middleware.
// On SSR the store returns the initial (empty) state.
// On the client, the persisted state is loaded only after mount.

import { useSyncExternalStore } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'

// No-op subscribe — hydration state never changes after initial render
const emptySubscribe = () => () => {}

/**
 * A wrapper around a Zustand `persist` store that avoids hydration mismatches
 * by returning the *initial* (server-safe) state until the component has mounted
 * on the client. After mount, it returns the rehydrated state from localStorage.
 *
 * Usage:
 *   const items = useHydratedStore(useCartStore, (s) => s.items)
 */
export function useHydratedStore<S, T>(
    store: UseBoundStore<StoreApi<S>>,
    selector: (state: S) => T
): T {
    // Get the current value (may come from localStorage on the client)
    const storeValue = store(selector)

    // useSyncExternalStore returns true on client, false on server — no setState needed
    const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

    // During SSR and first client render, use the selector against the store's
    // *initial* state (before rehydration). Zustand v5's persist middleware
    // exposes getInitialState() on the store.
    const initialValue = (store as unknown as { getInitialState: () => S }).getInitialState
        ? selector((store as unknown as { getInitialState: () => S }).getInitialState())
        : storeValue

    return hydrated ? storeValue : initialValue
}
