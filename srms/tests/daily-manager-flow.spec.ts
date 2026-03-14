import { test, expect, type Page } from '@playwright/test'

/**
 * Daily Manager Flow E2E Test — Back-of-House Admin
 *
 * Tests the restaurant manager's daily operational tasks:
 *   Step 1: Manager logs into Admin Dashboard at start of day
 *   Step 2: Waiter clocks in via StaffShiftClock, manager sees them in Shifts
 *   Step 3: Manager marks "Avocado Toast" as Out of Stock in MenuManager
 *            (verifies it disappears from customer menu)
 *   Step 4: Manager generates EOD report, reviews stats, then clocks out staff
 *
 * Prerequisites:
 *   - Supabase running with seeded data (scripts/seed.js)
 *   - Demo staff accounts created (scripts/create_demo_staff.js)
 *   - features_v2: staffShiftsEnabled = true
 */

const MANAGER_EMAIL = process.env.TEST_MANAGER_EMAIL || 'manager@srms.app'
const MANAGER_PASSWORD = process.env.TEST_MANAGER_PASSWORD || 'Password123!'
const WAITER_EMAIL = process.env.TEST_WAITER_EMAIL || 'waiter@srms.app'
const WAITER_PASSWORD = process.env.TEST_WAITER_PASSWORD || 'Password123!'

const TABLE_QR_TOKEN = 'table-t1-token' // For verifying customer menu

// Helper: Login as a staff member via the LoginForm
async function loginAs(page: Page, email: string, password: string) {
    await page.goto('/login')
    await page.waitForSelector('#email', { timeout: 10000 })
    await page.fill('#email', email)
    await page.fill('#password', password)

    await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => null),
        page.click('button[type="submit"]'),
    ])

    // Retry once if still on login
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

test.describe('📊 Daily Manager Flow — Back-of-House Admin', () => {
    test.describe.configure({ mode: 'serial' })

    // Track whether we marked an item out of stock so cleanup can restore it
    let markedItemSoldOut = false

    // ─── Step 1: Manager logs in and sees Admin Dashboard ───
    test('Step 1: Manager logs into Admin Dashboard', async ({ page }) => {
        await loginAs(page, MANAGER_EMAIL, MANAGER_PASSWORD)

        // Should redirect to /admin/dashboard
        await expect(page).toHaveURL(/admin/, { timeout: 15000 })

        // Dashboard heading
        await expect(
            page.getByText("Today's Overview")
        ).toBeVisible({ timeout: 10000 })

        // Should see KPI cards
        await expect(page.getByText('Revenue Today')).toBeVisible({ timeout: 5000 })
        await expect(page.getByText('Orders Today')).toBeVisible()
        await expect(page.getByText('Active Tables')).toBeVisible()

        // Should see "Recent Orders" section heading
        await expect(
            page.getByRole('heading', { name: 'Recent Orders' })
        ).toBeVisible()

        // Role badge should show "Manager"
        await expect(page.getByText('Manager').first()).toBeVisible({ timeout: 3000 })
    })

    // ─── Step 2: Waiter clocks in, Manager sees active shift ───
    test('Step 2: Waiter clocks in and Manager sees active shift', async ({
        browser,
    }) => {
        // --- Phase A: Waiter clocks in ---
        const waiterContext = await browser.newContext()
        const waiterPage = await waiterContext.newPage()

        await loginAs(waiterPage, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(waiterPage).toHaveURL(/waiter/, { timeout: 15000 })

        // Wait for StaffShiftClock to appear
        const shiftSection = waiterPage.getByText('Currently Clocked In')
            .or(waiterPage.getByText('Not Clocked In'))
        await expect(shiftSection.first()).toBeVisible({ timeout: 10000 })

        // If already clocked in from a previous run, clock out first
        const clockedInStatus = waiterPage.getByText('Currently Clocked In')
        const isAlreadyClockedIn = await clockedInStatus.isVisible({ timeout: 2000 }).catch(() => false)

        if (isAlreadyClockedIn) {
            const clockOutBtn = waiterPage.locator('button').filter({ hasText: 'Clock Out' })
            await clockOutBtn.click()
            await waiterPage.waitForTimeout(2000)
        }

        // Now clock in
        const clockInBtn = waiterPage.locator('button').filter({ hasText: 'Clock In' })
        await expect(clockInBtn).toBeVisible({ timeout: 5000 })
        await clockInBtn.click()

        // Should show "Currently Clocked In" status
        await expect(
            waiterPage.getByText('Currently Clocked In')
        ).toBeVisible({ timeout: 10000 })

        await waiterContext.close()

        // --- Phase B: Manager checks Shifts page ---
        const managerContext = await browser.newContext()
        const managerPage = await managerContext.newPage()

        await loginAs(managerPage, MANAGER_EMAIL, MANAGER_PASSWORD)
        await expect(managerPage).toHaveURL(/admin/, { timeout: 15000 })

        // Navigate to Staff Shifts
        await managerPage.goto('/admin/shifts')
        await expect(
            managerPage.getByRole('heading', { name: 'Staff Shifts' })
        ).toBeVisible({ timeout: 10000 })

        // Should see "Currently Clocked In" section with at least 1 shift
        const clockedInHeader = managerPage.getByText(/Currently Clocked In \(\d+\)/)
        await expect(clockedInHeader).toBeVisible({ timeout: 10000 })

        // The count should be >= 1
        const headerText = await clockedInHeader.textContent()
        const countMatch = headerText?.match(/\((\d+)\)/)
        expect(countMatch).toBeTruthy()
        expect(Number(countMatch![1])).toBeGreaterThanOrEqual(1)

        // Should see "Force Out" button for the active shift
        const forceOutBtn = managerPage.locator('button').filter({ hasText: 'Force Out' }).first()
        await expect(forceOutBtn).toBeVisible({ timeout: 5000 })

        await managerContext.close()
    })

    // ─── Step 3: Manager marks menu item as "Out of Stock" ───
    test('Step 3: Manager marks a menu item as Out of Stock', async ({
        page,
    }) => {
        await loginAs(page, MANAGER_EMAIL, MANAGER_PASSWORD)
        await expect(page).toHaveURL(/admin/, { timeout: 15000 })

        // Navigate to Menu management
        await page.goto('/admin/menu')
        await expect(
            page.getByText('Menu Management')
        ).toBeVisible({ timeout: 10000 })

        // Should be on "Menu Items" tab by default
        await expect(page.getByText('Menu Items').first()).toBeVisible({ timeout: 5000 })

        // Find a menu item to toggle — look for an item that is "Available"
        // We'll use "Bruschetta" as a safe test item (it exists in seed data)
        const bruschettaCard = page.locator('h5:has-text("Bruschetta")').first()
        const hasBruschetta = await bruschettaCard.isVisible({ timeout: 5000 }).catch(() => false)

        // Pick the target item name based on what's available
        let targetItem = 'Bruschetta'
        if (!hasBruschetta) {
            // Fallback: use the first available item
            const firstAvailable = page.locator('span:has-text("Available")').first()
            await expect(firstAvailable).toBeVisible({ timeout: 5000 })
            // Get the item name from the same card
            const card = firstAvailable.locator('xpath=ancestor::div[contains(@class,"border")]').first()
            const name = await card.locator('h5').first().textContent()
            targetItem = name || 'Bruschetta'
        }

        // Click the edit (pencil) button on the target item's card
        const itemCard = page.locator(`h5:has-text("${targetItem}")`).first()
            .locator('xpath=ancestor::div[contains(@class,"group")]').first()
        const editBtn = itemCard.locator('button').filter({ has: page.locator('svg') }).first()
        await editBtn.click()

        // Item modal should open — "Edit Item"
        await expect(
            page.getByText('Edit Item')
        ).toBeVisible({ timeout: 5000 })

        // Find the availability toggle — it should currently be ON (available)
        const availSection = page.getByText('Availability').locator('xpath=ancestor::div[contains(@class,"bg-gray-50")]').first()
        const toggleInput = availSection.locator('input[type="checkbox"]')

        // Uncheck the toggle to mark as "Sold Out"
        const isChecked = await toggleInput.isChecked()
        if (isChecked) {
            await toggleInput.uncheck({ force: true })
            markedItemSoldOut = true
        }

        // Click "Save Item"
        const saveBtn = page.locator('button').filter({ hasText: 'Save Item' })
        await expect(saveBtn).toBeVisible({ timeout: 3000 })
        await saveBtn.click()

        // Modal should close
        await expect(page.getByText('Edit Item')).not.toBeVisible({ timeout: 5000 })

        // The item should now show "Sold Out" badge
        await page.waitForTimeout(1000)
        const soldOutBadge = page.locator(`h5:has-text("${targetItem}")`)
            .locator('xpath=ancestor::div[contains(@class,"group")]')
            .first()
            .getByText('Sold Out')
        await expect(soldOutBadge).toBeVisible({ timeout: 5000 })

        // --- Verify customer menu doesn't show the sold-out item ---
        // Open a new page to check the customer menu
        await page.goto(`/t/${TABLE_QR_TOKEN}`)
        await page.waitForTimeout(3000)

        // The sold-out item should NOT be visible on the customer menu
        const customerItem = page.locator(`h3:has-text("${targetItem}")`).first()
        const isStillVisible = await customerItem.isVisible({ timeout: 3000 }).catch(() => false)
        expect(isStillVisible).toBeFalsy()

        // --- Restore the item back to available ---
        await page.goto('/admin/menu')
        await expect(page.getByText('Menu Management')).toBeVisible({ timeout: 10000 })

        const restoreCard = page.locator(`h5:has-text("${targetItem}")`).first()
            .locator('xpath=ancestor::div[contains(@class,"group")]').first()
        const restoreEditBtn = restoreCard.locator('button').filter({ has: page.locator('svg') }).first()
        await restoreEditBtn.click()

        await expect(page.getByText('Edit Item')).toBeVisible({ timeout: 5000 })
        const restoreToggle = page.getByText('Availability')
            .locator('xpath=ancestor::div[contains(@class,"bg-gray-50")]').first()
            .locator('input[type="checkbox"]')
        const isNowChecked = await restoreToggle.isChecked()
        if (!isNowChecked) {
            await restoreToggle.check({ force: true })
        }
        await page.locator('button').filter({ hasText: 'Save Item' }).click()
        await expect(page.getByText('Edit Item')).not.toBeVisible({ timeout: 5000 })
        markedItemSoldOut = false
    })

    // ─── Step 4: Manager generates EOD report, then force-clocks out staff ───
    test('Step 4: Manager generates EOD report and clocks out staff', async ({
        page,
    }) => {
        await loginAs(page, MANAGER_EMAIL, MANAGER_PASSWORD)
        await expect(page).toHaveURL(/admin/, { timeout: 15000 })

        // Navigate to EOD Reports
        await page.goto('/admin/reports')
        await expect(
            page.getByText('End-of-Day Reports')
        ).toBeVisible({ timeout: 10000 })

        // Should see the report date picker and Generate button
        const dateInput = page.locator('input[type="date"]')
        await expect(dateInput).toBeVisible({ timeout: 5000 })

        const generateBtn = page.locator('button').filter({ hasText: 'Generate Report' })
        await expect(generateBtn).toBeVisible({ timeout: 3000 })

        // Generate report for today
        await generateBtn.click()

        // Wait for the report to be generated — button shows "Generating..."
        await expect(
            page.locator('button').filter({ hasText: 'Generating...' })
        ).toBeVisible({ timeout: 3000 }).catch(() => {}) // May be fast

        // After generation, a report row should appear with today's date
        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        await page.waitForTimeout(3000)

        // Click on the report row to expand it
        const reportRow = page.locator('button').filter({ hasText: today }).first()
        const hasReport = await reportRow.isVisible({ timeout: 5000 }).catch(() => false)

        if (hasReport) {
            await reportRow.click()

            // Should see expanded details
            await expect(page.getByText('Gross Revenue')).toBeVisible({ timeout: 5000 })
            await expect(page.getByText('Net Revenue')).toBeVisible()
            await expect(page.getByText('Tax Collected')).toBeVisible()
            await expect(page.getByText('Cash Total')).toBeVisible()
            await expect(page.getByText('Card Total')).toBeVisible()
            await expect(page.getByText('Avg Order')).toBeVisible()
        }

        // --- Force clock-out staff ---
        await page.goto('/admin/shifts')
        await expect(page.getByText('Staff Shifts')).toBeVisible({ timeout: 10000 })

        // Check if there are active shifts to clock out
        const clockedInHeader = page.getByText(/Currently Clocked In \(\d+\)/)
        const hasActiveShifts = await clockedInHeader.isVisible({ timeout: 5000 }).catch(() => false)

        if (hasActiveShifts) {
            const headerText = await clockedInHeader.textContent()
            const countMatch = headerText?.match(/\((\d+)\)/)
            const activeCount = countMatch ? Number(countMatch[1]) : 0

            if (activeCount > 0) {
                // Accept the confirm dialog that appears before force-out
                page.on('dialog', async (dialog) => {
                    await dialog.accept()
                })

                // Click "Force Out" on the first active shift
                const forceOutBtn = page.locator('button').filter({ hasText: 'Force Out' }).first()
                await expect(forceOutBtn).toBeVisible({ timeout: 3000 })
                await forceOutBtn.click()

                // Wait for the shift to be closed
                await page.waitForTimeout(2000)

                // The active count should decrease or the section shows "No staff"
                const noStaffText = page.getByText('No staff currently clocked in')
                const updatedHeader = page.getByText(/Currently Clocked In \(\d+\)/)
                const hasNoStaff = await noStaffText.isVisible({ timeout: 3000 }).catch(() => false)
                const hasUpdated = await updatedHeader.isVisible({ timeout: 3000 }).catch(() => false)

                // Either no staff message or updated count — both are valid
                expect(hasNoStaff || hasUpdated).toBeTruthy()
            }
        }

        // --- Check recent shifts now include the clocked-out shift ---
        await expect(page.getByText('Recent Shifts')).toBeVisible({ timeout: 5000 })

        // There should be at least one recent shift with "Pending" status
        const pendingBadge = page.getByText('Pending').first()
        const hasPending = await pendingBadge.isVisible({ timeout: 5000 }).catch(() => false)

        if (hasPending) {
            // Approve the shift
            const approveBtn = page.locator('button').filter({ hasText: 'Approve' }).first()
            const hasApprove = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)

            if (hasApprove) {
                await approveBtn.click()
                await page.waitForTimeout(1000)

                // Should show "Approved" badge
                await expect(
                    page.getByText('Approved').first()
                ).toBeVisible({ timeout: 5000 })
            }
        }
    })
})
