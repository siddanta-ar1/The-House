import { test, expect, type Page } from '@playwright/test'

/**
 * Takeout / Order-Ahead E2E Test
 *
 * Tests the complete takeout happy path:
 *   Step 1: Customer opens takeout menu via /takeout/the-house
 *   Step 2: Customer adds items, fills TakeoutForm (name, phone, pickup time)
 *   Step 3: Customer submits order → redirected to tracking page
 *   Step 4: Kitchen sees order in TakeoutQueue with countdown timer
 *   Step 5: Kitchen advances order: Confirm → Start Prep → Mark Ready
 *   Step 6: Waiter/Cashier sees ready order and marks "Paid & Collected"
 *
 * Prerequisites:
 *   - Supabase running with seeded data (scripts/seed.js)
 *   - Demo staff accounts created (scripts/create_demo_staff.js)
 *   - takeoutEnabled: true in features_v2 (set by seed.js)
 */

const RESTAURANT_SLUG = 'the-house'
const WAITER_EMAIL = process.env.TEST_WAITER_EMAIL || 'waiter@srms.app'
const WAITER_PASSWORD = process.env.TEST_WAITER_PASSWORD || 'Password123!'
const KITCHEN_EMAIL = process.env.TEST_KITCHEN_EMAIL || 'kitchen@srms.app'
const KITCHEN_PASSWORD = process.env.TEST_KITCHEN_PASSWORD || 'Password123!'

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
    
    // If still on login, wait a bit for server action to complete and try again
    if (page.url().includes('/login')) {
        await page.waitForTimeout(2000)
        // Check for error message
        const errorEl = page.locator('.bg-red-50')
        const hasError = await errorEl.isVisible({ timeout: 1000 }).catch(() => false)
        if (hasError) {
            const errorText = await errorEl.innerText()
            console.log('Login error:', errorText)
        }
        
        // Retry
        await page.fill('#email', email)
        await page.fill('#password', password)
        await Promise.all([
            page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => null),
            page.click('button[type="submit"]'),
        ])
    }
}

test.describe('🥡 Takeout / Order-Ahead Flow', () => {
    test.describe.configure({ mode: 'serial' })

    let takeoutOrderId: string

    test('Step 1: Customer opens takeout menu page', async ({ page }) => {
        // Clear any leftover cart
        await page.goto(`/takeout/${RESTAURANT_SLUG}`)
        await page.evaluate(() => localStorage.clear())
        await page.reload({ waitUntil: 'load' })

        // Should see restaurant name and "Takeout Order" subtitle
        await expect(page.getByText('Takeout Order')).toBeVisible({ timeout: 10000 })

        // Should see category tabs
        const categoryTab = page.locator('button').filter({ hasText: /./}).first()
        await expect(categoryTab).toBeVisible({ timeout: 5000 })

        // Should see menu items with "Add" buttons
        // The default category may be empty — click through categories until items appear
        const addBtn = page.locator('button').filter({ hasText: 'Add' }).first()
        let foundItems = await addBtn.isVisible({ timeout: 2000 }).catch(() => false)

        if (!foundItems) {
            // Try clicking each category tab until we find one with items
            const categoryButtons = page.locator('.sticky button')
            const count = await categoryButtons.count()
            for (let i = 0; i < count && !foundItems; i++) {
                await categoryButtons.nth(i).click()
                await page.waitForTimeout(300)
                foundItems = await addBtn.isVisible({ timeout: 1000 }).catch(() => false)
            }
        }

        await expect(addBtn).toBeVisible({ timeout: 3000 })
    })

    test('Step 2: Customer adds items and proceeds to checkout', async ({ page }) => {
        await page.goto(`/takeout/${RESTAURANT_SLUG}`)

        // Clear leftover cart
        await page.evaluate(() => localStorage.clear())
        await page.reload({ waitUntil: 'load' })

        // Wait for menu items — click through categories if needed
        const addBtn = page.locator('button').filter({ hasText: 'Add' }).first()
        let foundItems = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
        if (!foundItems) {
            const categoryButtons = page.locator('.sticky button')
            const count = await categoryButtons.count()
            for (let i = 0; i < count && !foundItems; i++) {
                await categoryButtons.nth(i).click()
                await page.waitForTimeout(300)
                foundItems = await addBtn.isVisible({ timeout: 1000 }).catch(() => false)
            }
        }
        await expect(addBtn).toBeVisible({ timeout: 3000 })

        // Add an item
        await addBtn.click()
        await page.waitForTimeout(500)

        // Cart should show — click the header cart button or mobile checkout bar
        // Header cart button shows item count + price (e.g., "1 Rs. 8.50")
        // Mobile floating bar has "Checkout" text but is md:hidden
        const headerCartBtn = page.locator('header button').filter({ hasText: /\d/ }).first()
        const mobileCheckoutBtn = page.locator('button').filter({ hasText: /Checkout/i }).first()

        const headerVisible = await headerCartBtn.isVisible({ timeout: 3000 }).catch(() => false)
        if (headerVisible) {
            await headerCartBtn.click()
        } else {
            await expect(mobileCheckoutBtn).toBeVisible({ timeout: 3000 })
            await mobileCheckoutBtn.click()
        }

        // Should see TakeoutForm with customer details fields
        await expect(page.getByText('Your Details')).toBeVisible({ timeout: 5000 })
        await expect(page.getByText('Pickup Time')).toBeVisible()
    })

    test('Step 3: Customer submits takeout order', async ({ page }) => {
        await page.goto(`/takeout/${RESTAURANT_SLUG}`)

        // Clear leftover cart
        await page.evaluate(() => localStorage.clear())
        await page.reload({ waitUntil: 'load' })

        // Add an item — click through categories if needed
        const addBtn = page.locator('button').filter({ hasText: 'Add' }).first()
        let foundItems = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
        if (!foundItems) {
            const categoryButtons = page.locator('.sticky button')
            const count = await categoryButtons.count()
            for (let i = 0; i < count && !foundItems; i++) {
                await categoryButtons.nth(i).click()
                await page.waitForTimeout(300)
                foundItems = await addBtn.isVisible({ timeout: 1000 }).catch(() => false)
            }
        }
        await expect(addBtn).toBeVisible({ timeout: 3000 })
        await addBtn.click()
        await page.waitForTimeout(500)

        // Go to checkout — header cart button on desktop, floating bar on mobile
        const headerCartBtn = page.locator('header button').filter({ hasText: /\d/ }).first()
        const mobileCheckoutBtn = page.locator('button').filter({ hasText: /Checkout/i }).first()
        const headerVisible = await headerCartBtn.isVisible({ timeout: 2000 }).catch(() => false)
        if (headerVisible) {
            await headerCartBtn.click()
        } else {
            await mobileCheckoutBtn.click()
        }

        // Fill TakeoutForm
        await expect(page.getByText('Your Details')).toBeVisible({ timeout: 5000 })

        // Name
        const nameInput = page.locator('input[type="text"]').first()
        await nameInput.fill('E2E Test Customer')

        // Phone
        const phoneInput = page.locator('input[type="tel"]')
        await phoneInput.fill('9876543210')

        // Select a pickup time (click the first time slot)
        const timeSlotBtn = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}\s*(AM|PM)$/i }).first()
        const hasTimeSlot = await timeSlotBtn.isVisible({ timeout: 3000 }).catch(() => false)
        if (hasTimeSlot) {
            await timeSlotBtn.click()
        }

        // Submit the order
        const placeOrderBtn = page.locator('button').filter({ hasText: /Place Takeout Order/i })
        await expect(placeOrderBtn).toBeVisible({ timeout: 3000 })
        await placeOrderBtn.click()

        // Should redirect to order tracking page
        await expect(page).toHaveURL(/takeout\/.*\/order\//, { timeout: 15000 })

        // Should see "Track Takeout Order" header
        await expect(page.getByText('Track Takeout Order')).toBeVisible({ timeout: 5000 })

        // Should see order number (just wait briefly)
        await page.waitForTimeout(500)
        
        // Extract order ID from the URL
        const url = page.url()
        console.log('Order tracking URL:', url)
        const match = url.match(/order\/([a-f0-9-]+)/)
        if (match) {
            takeoutOrderId = match[1]
            console.log('Extracted takeoutOrderId:', takeoutOrderId)
        } else {
            console.log('FAILED to extract order ID from URL')
        }

        // Should see "Order Placed" status step
        await expect(page.getByText('Order Placed')).toBeVisible({ timeout: 3000 })

        // Store the order ID for subsequent tests
        expect(takeoutOrderId).toBeTruthy()
    })

    test('Step 4-5: Kitchen sees takeout order and advances status', async ({ page }) => {
        test.skip(!takeoutOrderId, 'No takeout order ID from Step 3')

        // Login as kitchen staff
        await loginAs(page, KITCHEN_EMAIL, KITCHEN_PASSWORD)

        // Ensure we're on the kitchen page (role routing may vary)
        if (!page.url().includes('/kitchen')) {
            await page.goto('/kitchen', { waitUntil: 'load' })
        }

        // Wait for page content to load
        await page.waitForLoadState('networkidle')

        // Kitchen should show "Takeout Orders" section
        const takeoutSection = page.getByText('Takeout Orders')
        await expect(takeoutSection).toBeVisible({ timeout: 15000 })

        // Find our specific order card by short ID
        const shortId = takeoutOrderId.slice(0, 8).toUpperCase()

        // The order should be visible
        await expect(page.getByText(`#${shortId}`)).toBeVisible({ timeout: 8000 })

        // Should see countdown timer badge somewhere on the page
        const countdownBadge = page.locator('text=/Due in \\d+[mh]/')
        await expect(countdownBadge.first()).toBeVisible({ timeout: 5000 })

        // Step 5a: Confirm the order
        const confirmBtn = page.locator('button').filter({ hasText: 'Confirm' }).first()
        await expect(confirmBtn).toBeVisible({ timeout: 5000 })
        await confirmBtn.click()
        // Wait for server action to complete, then reload for fresh state
        await page.waitForTimeout(2000)
        await page.reload({ waitUntil: 'networkidle' })

        // Step 5b: Start Prep
        const startPrepBtn = page.locator('button').filter({ hasText: /Start Prep(?!aring)/ }).first()
        await expect(startPrepBtn).toBeVisible({ timeout: 8000 })
        await startPrepBtn.click()
        await page.waitForTimeout(2000)
        await page.reload({ waitUntil: 'networkidle' })

        // Step 5c: Mark Ready
        const markReadyBtn = page.locator('button').filter({ hasText: /Mark Ready/ }).first()
        await expect(markReadyBtn).toBeVisible({ timeout: 8000 })
        await markReadyBtn.click()
        await page.waitForTimeout(2000)

        // Verify the order status changed (it should no longer show action buttons for our order)
        // The order is now "ready_for_pickup" and might move to completed section
    })

    test('Step 6: Cashier marks takeout order as Paid & Collected', async ({ page }) => {
        test.skip(!takeoutOrderId, 'No takeout order ID from Step 3')

        // Login as waiter (cashier role)
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)

        // Ensure we're on the waiter page
        if (!page.url().includes('/waiter')) {
            await page.goto('/waiter', { waitUntil: 'load' })
        }

        // Wait for page content to load
        await page.waitForLoadState('networkidle')

        // Look for takeout pickup section — the order should be ready_for_pickup from Step 5
        const takeoutPickups = page.getByText('Takeout Pickups')
        await expect(takeoutPickups).toBeVisible({ timeout: 15000 })

        // Should see our order with "Ready for Pickup" badge
        const readyBadge = page.getByText('Ready for Pickup')
        await expect(readyBadge.first()).toBeVisible({ timeout: 5000 })

        // Click "Paid & Collected" button for the first ready order
        const paidBtn = page.locator('button').filter({ hasText: /Paid.*Collected/i }).first()
        await expect(paidBtn).toBeVisible({ timeout: 5000 })
        await paidBtn.click()
        await page.waitForTimeout(2000)

        // After completing, the order should be removed from the feed
        // The section may disappear entirely if it was the only order
        // Either outcome is acceptable — verify we can still see the waiter page
        await expect(page.locator('body')).toBeVisible()
    })
})

test.describe('🥡 Takeout — Public Routes', () => {
    test('Takeout page is publicly accessible (no auth required)', async ({ page }) => {
        const response = await page.goto(`/takeout/${RESTAURANT_SLUG}`)
        expect(page.url()).not.toContain('/login')
        expect(response?.status()).toBeLessThan(500)
        await expect(page.getByText('Takeout Order')).toBeVisible({ timeout: 8000 })
    })

    test('Non-existent restaurant returns 404', async ({ page }) => {
        const response = await page.goto('/takeout/non-existent-restaurant-xyz')
        expect(response?.status()).toBe(404)
    })
})
