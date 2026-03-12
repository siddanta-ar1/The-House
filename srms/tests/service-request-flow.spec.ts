import { test, expect, type Page } from '@playwright/test'

/**
 * Service Request Flow E2E Test — Frictionless FOH
 *
 * Tests the complete service request flow:
 *   Step 1: Waiter opens a session for a table (ensures active session)
 *   Step 2: Customer taps "Need Silverware" in ServiceRequestPanel
 *   Step 3: Waiter sees the request flash in ServiceRequestFeed
 *   Step 4: Waiter resolves the request (On it → Done)
 *
 * Prerequisites:
 *   - Supabase running with seeded data (scripts/seed.js)
 *   - Demo staff accounts created (scripts/create_demo_staff.js)
 *   - serviceRequestsEnabled: true in features_v2 (default)
 */

const WAITER_EMAIL = process.env.TEST_WAITER_EMAIL || 'waiter@srms.app'
const WAITER_PASSWORD = process.env.TEST_WAITER_PASSWORD || 'Password123!'

// Use table T1 — qr_token = 'table-t1-token' from seed.js
const TABLE_QR_TOKEN = 'table-t1-token'
const TABLE_LABEL = 'T1'

// Helper: Login as a staff member via the LoginForm
async function loginAs(page: Page, email: string, password: string) {
    await page.goto('/login')
    await page.waitForSelector('#email', { timeout: 10000 })
    await page.fill('#email', email)
    await page.fill('#password', password)

    // Click submit and wait for navigation away from login page
    await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => null),
        page.click('button[type="submit"]'),
    ])

    // If still on login, wait for server action and retry
    if (page.url().includes('/login')) {
        await page.waitForTimeout(2000)
        await page.fill('#email', email)
        await page.fill('#password', password)
        await Promise.all([
            page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => null),
            page.click('button[type="submit"]'),
        ])
    }
}

test.describe('🛎️ Service Request Flow — Frictionless FOH', () => {
    test.describe.configure({ mode: 'serial' })

    // ─── Step 1: Waiter ensures a session is open for table T1 ───
    test('Step 1: Waiter opens session for the table', async ({ page }) => {
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(page).toHaveURL(/waiter/, { timeout: 10000 })

        // Find the floor plan
        await expect(
            page.getByText('Active Floor Plan')
        ).toBeVisible({ timeout: 10000 })

        // Click on table T1
        const tableButton = page
            .locator('button')
            .filter({ hasText: TABLE_LABEL })
            .first()
        await expect(tableButton).toBeVisible({ timeout: 5000 })
        await tableButton.click()

        // Wait for the action panel to show table details
        await expect(
            page.getByRole('heading', { name: `Table ${TABLE_LABEL}` })
        ).toBeVisible({ timeout: 5000 })

        // Check if there's already an active session — if so, close it first
        const closeBtn = page.getByText('Close Session & Checkout')
        const hasActiveSession = await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasActiveSession) {
            await closeBtn.click()
            await page.waitForTimeout(500)
            const confirmBtn = page.locator('[class*="bg-red-600"]').filter({ hasText: 'Close Session' })
            await expect(confirmBtn).toBeVisible({ timeout: 3000 })
            await confirmBtn.click()
            await page.waitForTimeout(2000)
            await page.reload({ waitUntil: 'load' })
            await page.locator('button').filter({ hasText: TABLE_LABEL }).first().click()
            await expect(page.getByText('Available')).toBeVisible({ timeout: 5000 })
        }

        // Open new session
        const openBtn = page.getByText('Open New Session')
        await expect(openBtn).toBeVisible({ timeout: 5000 })
        await openBtn.click()

        // Wait for server action + reload to see updated state
        await page.waitForTimeout(2000)
        await page.reload({ waitUntil: 'load' })

        // Verify session is active
        const reloadedTableBtn = page
            .locator('button')
            .filter({ hasText: TABLE_LABEL })
            .first()
        await reloadedTableBtn.click()
        await expect(
            page.getByText('Session Active')
        ).toBeVisible({ timeout: 10000 })
    })

    // ─── Step 2: Customer taps "Need Silverware" in ServiceRequestPanel ───
    test('Step 2: Customer sends "Need Silverware" request', async ({
        page,
    }) => {
        // Navigate to the customer table page via QR token
        await page.goto(`/t/${TABLE_QR_TOKEN}`)

        // Should see the restaurant header (session is active from Step 1)
        const header = page.locator('header h1')
        await expect(header).toBeVisible({ timeout: 10000 })

        // Should NOT be in "View Only" mode
        const viewOnly = page.getByText('(View Only)')
        await expect(viewOnly).not.toBeVisible({ timeout: 3000 })

        // Open the service request panel — click the floating bell button
        const bellButton = page.locator('button[aria-label="Service requests"]')
        await expect(bellButton).toBeVisible({ timeout: 5000 })
        await bellButton.click()

        // The panel should appear with "Need Help?" header
        await expect(page.getByText('Need Help?')).toBeVisible({ timeout: 3000 })

        // Click "Need Silverware" button
        const silverwareBtn = page.getByText('Need Silverware')
        await expect(silverwareBtn).toBeVisible({ timeout: 3000 })
        await silverwareBtn.click()

        // Should show success checkmark (✓ icon appears on the button)
        // The success state shows a Check icon for 3 seconds
        await page.waitForTimeout(1000)

        // Verify no error message appeared
        const errorMsg = page.locator('.text-red-500')
        await expect(errorMsg).not.toBeVisible({ timeout: 2000 })
    })

    // ─── Step 3: Waiter sees the request in ServiceRequestFeed ───
    test('Step 3: Waiter sees "Need Silverware" in feed', async ({
        page,
    }) => {
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(page).toHaveURL(/waiter/, { timeout: 10000 })

        // Reload to pick up the new service request (in case realtime hasn't fired)
        await page.reload({ waitUntil: 'load' })

        // The ServiceRequestFeed should show a pending request
        // It shows "Table {label}" and the request type/message
        // "Need Silverware" was sent as type='other' with message='Need Silverware'
        // The feed shows: "Other — Need Silverware"
        const tableLabel = page.getByText(`Table ${TABLE_LABEL}`)
        await expect(tableLabel.first()).toBeVisible({ timeout: 10000 })

        // Should see "Need Silverware" in the message
        const silverwareText = page.getByText('Need Silverware')
        await expect(silverwareText.first()).toBeVisible({ timeout: 5000 })

        // Should see the "On it" button for pending requests
        const onItButton = page.getByText('On it')
        await expect(onItButton.first()).toBeVisible({ timeout: 5000 })
    })

    // ─── Step 4: Waiter resolves the request (On it → Done) ───
    test('Step 4: Waiter acknowledges and completes the request', async ({
        page,
    }) => {
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(page).toHaveURL(/waiter/, { timeout: 10000 })
        await page.reload({ waitUntil: 'load' })

        // Find the pending request with "Need Silverware"
        const silverwareText = page.getByText('Need Silverware')
        await expect(silverwareText.first()).toBeVisible({ timeout: 10000 })

        // Click "On it" to acknowledge the request
        const onItButton = page.getByText('On it')
        await expect(onItButton.first()).toBeVisible({ timeout: 5000 })
        await onItButton.first().click()

        // After acknowledging, the request moves to "In Progress" section
        // and the "On it" button becomes "Done"
        await page.waitForTimeout(1000)

        const doneButton = page.getByText('Done')
        // The "Done" button should appear (either via optimistic update or reload)
        const hasDone = await doneButton.first().isVisible({ timeout: 3000 }).catch(() => false)

        if (!hasDone) {
            // Reload if optimistic update didn't reflect
            await page.reload({ waitUntil: 'load' })
            await expect(doneButton.first()).toBeVisible({ timeout: 5000 })
        }

        // Click "Done" to complete the request
        await doneButton.first().click()

        // Wait for the request to be removed from the feed
        await page.waitForTimeout(1500)

        // Reload to verify the request is gone
        await page.reload({ waitUntil: 'load' })

        // The "Need Silverware" text should no longer be visible in the feed
        // (it might still show if there are other requests, so we check the specific request is gone)
        await page.waitForTimeout(1000)

        // Verify by checking that there are no pending requests with "Need Silverware"
        // The feed should show "No service requests" if all are completed
        const noRequests = page.getByText('No service requests')
        const stillHasSilverware = await page.getByText('Need Silverware').isVisible({ timeout: 2000 }).catch(() => false)

        // Either the "Need Silverware" request is gone, or "No service requests" shows
        expect(stillHasSilverware || await noRequests.isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy
        // Stronger assertion: the silverware request specifically should be resolved
        expect(stillHasSilverware).toBe(false)
    })
})
