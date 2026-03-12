import { type Page, expect } from '@playwright/test'

/**
 * Wait for a toast notification with the given text and verify it appears.
 */
export async function expectToast(page: Page, text: string | RegExp, timeout = 5_000) {
    const toast = page.locator('[class*="toast"], [role="status"]').filter({
        hasText: typeof text === 'string' ? text : undefined,
    })
    if (typeof text !== 'string') {
        await expect(page.locator(`text=${text}`).first()).toBeVisible({ timeout })
    } else {
        await expect(toast.first()).toBeVisible({ timeout })
    }
}

/**
 * Wait for a page to stop showing loading spinners.
 */
export async function waitForPageReady(page: Page, timeout = 10_000) {
    // Wait for any loader/spinner to disappear
    const loader = page.locator('[class*="animate-spin"], [class*="loading"]')
    await loader.first().waitFor({ state: 'hidden', timeout }).catch(() => {})
    // Wait for network idle
    await page.waitForLoadState('networkidle', { timeout }).catch(() => {})
}

/**
 * Take a timestamped screenshot for CI evidence.
 */
export async function takeEvidence(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await page.screenshot({
        path: `test-results/${name}-${timestamp}.png`,
        fullPage: true,
    })
}

/**
 * Retry a flaky action with exponential backoff (useful for server-action dependent UI).
 */
export async function retryAction(
    action: () => Promise<void>,
    options?: { maxRetries?: number; delay?: number; label?: string }
) {
    const { maxRetries = 3, delay = 1_000, label = 'action' } = options || {}
    let lastError: Error | null = null

    for (let i = 1; i <= maxRetries; i++) {
        try {
            await action()
            return
        } catch (err) {
            lastError = err as Error
            console.warn(`[retryAction] ${label} attempt ${i}/${maxRetries} failed: ${lastError.message}`)
            if (i < maxRetries) {
                await new Promise((r) => setTimeout(r, delay * i))
            }
        }
    }

    throw new Error(`[retryAction] ${label} failed after ${maxRetries} attempts: ${lastError?.message}`)
}

/**
 * Assert that a page does NOT contain any error boundaries or crash screens.
 */
export async function assertNoErrors(page: Page) {
    const errorTexts = [
        'Something went wrong',
        'Application error',
        'Internal Server Error',
        'Error: ',
    ]

    for (const text of errorTexts) {
        const errorEl = page.getByText(text).first()
        const isVisible = await errorEl.isVisible({ timeout: 1_000 }).catch(() => false)
        expect(isVisible, `Unexpected error on page: "${text}"`).toBeFalsy()
    }
}

/**
 * Measure and log the time taken for a named operation (CI performance budget).
 */
export async function measureTime<T>(
    label: string,
    fn: () => Promise<T>,
    budgetMs?: number
): Promise<T> {
    const start = Date.now()
    const result = await fn()
    const elapsed = Date.now() - start

    console.log(`[perf] ${label}: ${elapsed}ms`)

    if (budgetMs && elapsed > budgetMs) {
        console.warn(`[perf] ⚠️ ${label} exceeded budget: ${elapsed}ms > ${budgetMs}ms`)
    }

    return result
}
