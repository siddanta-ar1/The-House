/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test'

// ─── Credentials ───
export const CREDENTIALS = {
    superAdmin: {
        email: process.env.TEST_SUPER_ADMIN_EMAIL || 'demo@srms.app',
        password: process.env.TEST_SUPER_ADMIN_PASSWORD || 'Password123!',
    },
    manager: {
        email: process.env.TEST_MANAGER_EMAIL || 'manager@srms.app',
        password: process.env.TEST_MANAGER_PASSWORD || 'Password123!',
    },
    waiter: {
        email: process.env.TEST_WAITER_EMAIL || 'waiter@srms.app',
        password: process.env.TEST_WAITER_PASSWORD || 'Password123!',
    },
    kitchen: {
        email: process.env.TEST_KITCHEN_EMAIL || 'kitchen@srms.app',
        password: process.env.TEST_KITCHEN_PASSWORD || 'Password123!',
    },
} as const

export const TABLE_QR_TOKEN = 'table-t1-token'

// ─── Reliable Login Helper ───
export async function loginAs(
    page: Page,
    email: string,
    password: string,
    options?: { expectedRoute?: RegExp; maxRetries?: number }
) {
    const { expectedRoute = /.*/, maxRetries = 3 } = options || {}

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await page.goto('/login')

        // If already logged in, the login page redirects away automatically.
        // Wait briefly to see if we land on login or get redirected.
        await page.waitForTimeout(2_000)

        // If we're no longer on /login, we're already authenticated
        if (!page.url().includes('/login')) {
            // Check if we landed on the expected route
            if (expectedRoute.test(page.url())) {
                return
            }
            // Authenticated but on wrong route — navigate directly
            return
        }

        // We are on /login — fill the form
        const emailField = page.locator('#email')
        const hasEmailField = await emailField.isVisible({ timeout: 10_000 }).catch(() => false)
        if (!hasEmailField) {
            // May have redirected mid-wait
            if (!page.url().includes('/login')) return
            if (attempt < maxRetries) {
                await page.waitForTimeout(2_000)
                continue
            }
            throw new Error(`Login form not found after ${maxRetries} attempts`)
        }

        // Clear fields before filling (handles stale state)
        await emailField.clear()
        await page.locator('#password').clear()
        await page.fill('#email', email)
        await page.fill('#password', password)

        await Promise.all([
            page.waitForURL(
                (url) => !url.pathname.includes('/login'),
                { timeout: 30_000 }
            ).catch(() => null),
            page.click('button[type="submit"]'),
        ])

        // Check for error message
        const errorEl = page.locator('.bg-red-50, [role="alert"]')
        const hasError = await errorEl.isVisible({ timeout: 1_500 }).catch(() => false)
        if (hasError) {
            const errorText = await errorEl.innerText().catch(() => 'Unknown error')
            console.warn(`[loginAs] Attempt ${attempt}: Login error — ${errorText}`)
            if (attempt < maxRetries) {
                await page.waitForTimeout(2_000)
                continue
            }
            throw new Error(`Login failed after ${maxRetries} attempts: ${errorText}`)
        }

        // Verify we left the login page
        if (!page.url().includes('/login')) {
            await expect(page).toHaveURL(expectedRoute, { timeout: 15_000 })
            return
        }

        // Still on login — retry
        if (attempt < maxRetries) {
            await page.waitForTimeout(2_000)
        }
    }

    throw new Error(`Login failed: still on /login after ${maxRetries} attempts`)
}

// ─── Authenticated Page Fixtures ───
type AuthFixtures = {
    superAdminPage: Page
    superAdminContext: BrowserContext
    managerPage: Page
    waiterPage: Page
    waiterContext: BrowserContext
    kitchenPage: Page
}

export const test = base.extend<AuthFixtures>({
    superAdminContext: async ({ browser }, use) => {
        const context = await browser.newContext()
        await use(context)
        await context.close()
    },

    superAdminPage: async ({ superAdminContext }, use) => {
        const page = await superAdminContext.newPage()
        await loginAs(page, CREDENTIALS.superAdmin.email, CREDENTIALS.superAdmin.password, {
            expectedRoute: /admin/,
        })
        await use(page)
    },

    managerPage: async ({ page }, use) => {
        await loginAs(page, CREDENTIALS.manager.email, CREDENTIALS.manager.password, {
            expectedRoute: /admin/,
        })
        await use(page)
    },

    waiterContext: async ({ browser }, use) => {
        const context = await browser.newContext()
        await use(context)
        await context.close()
    },

    waiterPage: async ({ waiterContext }, use) => {
        const page = await waiterContext.newPage()
        await loginAs(page, CREDENTIALS.waiter.email, CREDENTIALS.waiter.password, {
            expectedRoute: /waiter/,
        })
        await use(page)
    },

    kitchenPage: async ({ browser }, use) => {
        const context = await browser.newContext()
        const page = await context.newPage()
        await loginAs(page, CREDENTIALS.kitchen.email, CREDENTIALS.kitchen.password, {
            expectedRoute: /kitchen/,
        })
        await use(page)
        await context.close()
    },
})

export { expect }
