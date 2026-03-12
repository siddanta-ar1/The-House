import { type Page, expect } from '@playwright/test'

/**
 * Page-Object helpers for the Admin dashboard, menu, reports, and shifts pages.
 * Encapsulates selectors so tests stay declarative and resilient to UI changes.
 */

// ─────────────────────────────────────────────
// Admin Dashboard
// ─────────────────────────────────────────────
export class AdminDashboardPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/admin/dashboard')
    }

    async expectLoaded() {
        await expect(
            this.page.getByText("Today's Overview")
        ).toBeVisible({ timeout: 10_000 })
    }

    async expectKPICards() {
        await expect(this.page.getByText('Revenue Today')).toBeVisible({ timeout: 5_000 })
        await expect(this.page.getByText('Orders Today')).toBeVisible()
        await expect(this.page.getByText('Active Tables')).toBeVisible()
        await expect(this.page.getByText('Avg Prep Time')).toBeVisible()
    }

    async expectRecentOrdersSection() {
        await expect(
            this.page.getByRole('heading', { name: 'Recent Orders' })
        ).toBeVisible({ timeout: 5_000 })
    }

    async expectRoleBadge(roleName: string) {
        await expect(
            this.page.getByText(roleName).first()
        ).toBeVisible({ timeout: 3_000 })
    }
}

// ─────────────────────────────────────────────
// Menu Manager
// ─────────────────────────────────────────────
export class MenuManagerPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/admin/menu')
    }

    async expectLoaded() {
        await expect(
            this.page.getByText('Menu Management')
        ).toBeVisible({ timeout: 10_000 })
        await expect(
            this.page.getByText('Menu Items').first()
        ).toBeVisible({ timeout: 5_000 })
    }

    /**
     * Finds a menu item card by name. Returns null if it doesn't exist.
     */
    private itemCard(name: string) {
        return this.page
            .locator(`h5:has-text("${name}")`)
            .first()
            .locator('xpath=ancestor::div[contains(@class,"group")]')
            .first()
    }

    async findAvailableItemName(): Promise<string> {
        // Look for first "Available" badge and trace back to the item name
        const firstAvailBadge = this.page.locator('span:has-text("Available")').first()
        await expect(firstAvailBadge).toBeVisible({ timeout: 5_000 })
        const card = firstAvailBadge
            .locator('xpath=ancestor::div[contains(@class,"group")]')
            .first()
        const name = await card.locator('h5').first().textContent()
        return name || 'Bruschetta'
    }

    async markItemSoldOut(itemName: string) {
        const card = this.itemCard(itemName)
        const editBtn = card.locator('button').filter({ has: this.page.locator('svg') }).first()
        await editBtn.click()

        // Wait for modal
        await expect(this.page.getByText('Edit Item')).toBeVisible({ timeout: 5_000 })

        // Find availability toggle
        const toggle = this.page
            .locator('.sr-only.peer')
            .first()

        const isChecked = await toggle.isChecked()
        if (isChecked) {
            await toggle.uncheck({ force: true })
        }

        // Save
        await this.page.locator('button').filter({ hasText: 'Save Item' }).click()
        await expect(this.page.getByText('Edit Item')).not.toBeVisible({ timeout: 5_000 })

        // Wait for UI update and verify "Sold Out" badge
        await this.page.waitForTimeout(1_000)
        const soldOutBadge = this.itemCard(itemName).getByText('Sold Out')
        await expect(soldOutBadge).toBeVisible({ timeout: 5_000 })
    }

    async restoreItemAvailability(itemName: string) {
        await this.goto()
        await this.expectLoaded()

        const card = this.itemCard(itemName)
        const editBtn = card.locator('button').filter({ has: this.page.locator('svg') }).first()
        await editBtn.click()

        await expect(this.page.getByText('Edit Item')).toBeVisible({ timeout: 5_000 })

        const toggle = this.page
            .locator('.sr-only.peer')
            .first()

        const isChecked = await toggle.isChecked()
        if (!isChecked) {
            await toggle.check({ force: true })
        }

        await this.page.locator('button').filter({ hasText: 'Save Item' }).click()
        await expect(this.page.getByText('Edit Item')).not.toBeVisible({ timeout: 5_000 })
    }

    async verifyItemHiddenFromCustomerMenu(itemName: string, qrToken: string) {
        await this.page.goto(`/t/${qrToken}`)
        await this.page.waitForTimeout(3_000)

        const customerItem = this.page.locator(`h3:has-text("${itemName}")`).first()
        const isVisible = await customerItem.isVisible({ timeout: 3_000 }).catch(() => false)
        expect(isVisible).toBeFalsy()
    }
}

// ─────────────────────────────────────────────
// Staff Shifts Manager
// ─────────────────────────────────────────────
export class ShiftsManagerPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/admin/shifts')
    }

    async expectLoaded() {
        await expect(
            this.page.getByRole('heading', { name: 'Staff Shifts' })
        ).toBeVisible({ timeout: 10_000 })
    }

    async getClockedInCount(): Promise<number> {
        const header = this.page.getByText(/Currently Clocked In \(\d+\)/)
        const isVisible = await header.isVisible({ timeout: 5_000 }).catch(() => false)
        if (!isVisible) return 0

        const text = await header.textContent()
        const match = text?.match(/\((\d+)\)/)
        return match ? Number(match[1]) : 0
    }

    async expectStaffClockedIn(minCount = 1) {
        const count = await this.getClockedInCount()
        expect(count).toBeGreaterThanOrEqual(minCount)
    }

    async forceClockOutFirst() {
        // Accept the confirm dialog
        this.page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        const forceOutBtn = this.page
            .locator('button')
            .filter({ hasText: 'Force Out' })
            .first()
        const isVisible = await forceOutBtn.isVisible({ timeout: 3_000 }).catch(() => false)
        if (isVisible) {
            await forceOutBtn.click()
            await this.page.waitForTimeout(2_000)
        }
    }

    async forceClockOutAll() {
        this.page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        let keepGoing = true
        while (keepGoing) {
            const forceOutBtn = this.page
                .locator('button')
                .filter({ hasText: 'Force Out' })
                .first()
            const isVisible = await forceOutBtn.isVisible({ timeout: 2_000 }).catch(() => false)
            if (isVisible) {
                await forceOutBtn.click()
                await this.page.waitForTimeout(1_500)
            } else {
                keepGoing = false
            }
        }
    }

    async approveFirstPendingShift() {
        const pendingBadge = this.page.getByText('Pending').first()
        const hasPending = await pendingBadge.isVisible({ timeout: 5_000 }).catch(() => false)
        if (!hasPending) return false

        const approveBtn = this.page
            .locator('button')
            .filter({ hasText: 'Approve' })
            .first()
        const hasApprove = await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)
        if (!hasApprove) return false

        await approveBtn.click()
        await this.page.waitForTimeout(1_000)
        await expect(this.page.getByText('Approved').first()).toBeVisible({ timeout: 5_000 })
        return true
    }
}

// ─────────────────────────────────────────────
// EOD Reports Viewer
// ─────────────────────────────────────────────
export class ReportsViewerPage {
    constructor(private page: Page) {}

    async goto() {
        await this.page.goto('/admin/reports')
    }

    async expectLoaded() {
        await expect(
            this.page.getByText('End-of-Day Reports')
        ).toBeVisible({ timeout: 10_000 })
    }

    async expectControls() {
        await expect(this.page.locator('input[type="date"]')).toBeVisible({ timeout: 5_000 })
        await expect(
            this.page.locator('button').filter({ hasText: 'Generate Report' })
        ).toBeVisible({ timeout: 3_000 })
    }

    async generateReportForToday() {
        const today = new Date().toISOString().slice(0, 10)

        // Set the date
        const dateInput = this.page.locator('input[type="date"]')
        await dateInput.fill(today)

        // Click generate
        const genBtn = this.page.locator('button').filter({ hasText: 'Generate Report' })
        await genBtn.click()

        // Wait for generation
        await expect(
            this.page.locator('button').filter({ hasText: 'Generating...' })
        ).toBeVisible({ timeout: 3_000 }).catch(() => {})

        // Wait for completion
        await this.page.waitForTimeout(3_000)

        return today
    }

    async expandReportByDate(date: string) {
        const reportRow = this.page.locator('button').filter({ hasText: date }).first()
        const hasReport = await reportRow.isVisible({ timeout: 5_000 }).catch(() => false)
        if (!hasReport) return false

        await reportRow.click()
        return true
    }

    async expectReportDetails() {
        await expect(this.page.getByText('Gross Revenue')).toBeVisible({ timeout: 5_000 })
        await expect(this.page.getByText('Net Revenue')).toBeVisible()
        await expect(this.page.getByText('Tax Collected')).toBeVisible()
        await expect(this.page.getByText('Cash Total')).toBeVisible()
        await expect(this.page.getByText('Card Total')).toBeVisible()
        await expect(this.page.getByText('Avg Order')).toBeVisible()
    }
}

// ─────────────────────────────────────────────
// Waiter Shift Clock (staff page)
// ─────────────────────────────────────────────
export class StaffShiftClockWidget {
    constructor(private page: Page) {}

    async expectVisible() {
        const section = this.page
            .getByText('Currently Clocked In')
            .or(this.page.getByText('Not Clocked In'))
        await expect(section.first()).toBeVisible({ timeout: 10_000 })
    }

    async isClockedIn(): Promise<boolean> {
        return this.page
            .getByText('Currently Clocked In')
            .isVisible({ timeout: 2_000 })
            .catch(() => false)
    }

    async clockIn() {
        // If already clocked in, clock out first to reset
        if (await this.isClockedIn()) {
            await this.clockOut()
            await this.page.waitForTimeout(3_000)
            // Reload to get fresh state after clock-out
            await this.page.reload({ waitUntil: 'load' })
            await this.expectVisible()
        }

        const clockInBtn = this.page.locator('button').filter({ hasText: 'Clock In' })
        await expect(clockInBtn).toBeVisible({ timeout: 5_000 })
        await clockInBtn.click()

        // Wait for server action to complete
        await this.page.waitForTimeout(3_000)

        // Check for error messages
        const errorMsg = this.page.locator('.text-red-600, .bg-red-50').first()
        const hasError = await errorMsg.isVisible({ timeout: 1_000 }).catch(() => false)
        if (hasError) {
            const errorText = await errorMsg.textContent().catch(() => '')
            console.warn(`[StaffShiftClock] Clock-in error: ${errorText}`)
            // Reload and try again
            await this.page.reload({ waitUntil: 'load' })
            await this.expectVisible()
            const retryBtn = this.page.locator('button').filter({ hasText: 'Clock In' })
            const canRetry = await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)
            if (canRetry) {
                await retryBtn.click()
                await this.page.waitForTimeout(3_000)
            }
        }

        await expect(
            this.page.getByText('Currently Clocked In')
        ).toBeVisible({ timeout: 10_000 })
    }

    async clockOut() {
        const clockOutBtn = this.page.locator('button').filter({ hasText: 'Clock Out' })
        await expect(clockOutBtn).toBeVisible({ timeout: 5_000 })
        await clockOutBtn.click()
        await this.page.waitForTimeout(2_000)
    }
}
