import { test, expect, type Page } from '@playwright/test'

/**
 * Split Bill & Loyalty Flow E2E Test — Advanced Customer
 *
 * Tests the complete split bill and loyalty flow:
 *   Step 1: Waiter opens session for table T3
 *   Step 2: Customer adds 3 items (Ribeye $28 + Salmon $24 + Calamari $10 = $62)
 *   Step 3: Customer signs up for Loyalty on checkout, places order
 *   Step 4: On order tracking page, customer taps "Split the Bill" → Split Evenly by 3
 *   Step 5: Customer A pays their split share via QR ("I Have Paid")
 *   Step 6: Waiter verifies the payment claim
 *
 * Prerequisites:
 *   - Supabase running with seeded data (scripts/seed.js)
 *   - Demo staff accounts created (scripts/create_demo_staff.js)
 *   - Loyalty config seeded (scripts/seed_loyalty_config.js)
 *   - features_v2: loyaltyEnabled, splitBillingEnabled, nepalPayEnabled all true
 */

const WAITER_EMAIL = process.env.TEST_WAITER_EMAIL || 'waiter@srms.app'
const WAITER_PASSWORD = process.env.TEST_WAITER_PASSWORD || 'Password123!'

// Use table T3 to avoid conflicts with other test suites
const TABLE_QR_TOKEN = 'table-t3-token'
const TABLE_LABEL = 'T3'

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

test.describe('💳 Split Bill & Loyalty Flow — Advanced Customer', () => {
    test.describe.configure({ mode: 'serial' })

    let orderId: string

    // ─── Step 1: Waiter opens session for table T3 ───
    test('Step 1: Waiter opens session for table T3', async ({ page }) => {
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(page).toHaveURL(/waiter/, { timeout: 10000 })

        await expect(
            page.getByText('Active Floor Plan')
        ).toBeVisible({ timeout: 10000 })

        // Click on table T3
        const tableButton = page
            .locator('button')
            .filter({ hasText: TABLE_LABEL })
            .first()
        await expect(tableButton).toBeVisible({ timeout: 5000 })
        await tableButton.click()

        // Wait for action panel
        await expect(
            page.getByRole('heading', { name: `Table ${TABLE_LABEL}` })
        ).toBeVisible({ timeout: 5000 })

        // Close existing session if present
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

    // ─── Step 2: Customer adds items, signs up for loyalty, and places order ───
    test('Step 2: Customer adds items, signs up for loyalty, and places order', async ({
        page,
    }) => {
        await page.goto(`/t/${TABLE_QR_TOKEN}`)

        // Wait for menu to load
        const header = page.locator('header h1')
        await expect(header).toBeVisible({ timeout: 10000 })

        // Should NOT be in view-only mode
        const viewOnly = page.getByText('(View Only)')
        await expect(viewOnly).not.toBeVisible({ timeout: 3000 })

        // Helper to add a specific menu item by name
        async function addItemByName(name: string) {
            // Find the heading with the item name, then find the Add button in the same card
            const heading = page.locator(`h3:has-text("${name}")`).first()
            await expect(heading).toBeVisible({ timeout: 5000 })
            await heading.scrollIntoViewIfNeeded()
            await page.waitForTimeout(300)
            
            // The Add button is in the same parent card as the heading
            // Go up to the card container and find the Add button within it
            const card = heading.locator('xpath=ancestor::*[contains(@class,"rounded") or contains(@class,"card")]').first()
            const addBtn = card.locator('button:has-text("Add")').first()
            
            // If the card locator doesn't work, try a simpler approach
            if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await addBtn.click()
            } else {
                // Fallback: the heading and button are siblings within the same flex container
                // Look for the button near the heading by DOM traversal
                const parentDiv = heading.locator('xpath=ancestor::div[position()<=3]').last()
                const fallbackBtn = parentDiv.locator('button:has-text("Add")').first()
                await fallbackBtn.click()
            }

            // Handle modifier modal if it appears
            const modModal = page.getByText('Customize your order')
            if (await modModal.isVisible({ timeout: 2000 }).catch(() => false)) {
                await page.locator('button').filter({ hasText: /Add to Cart/i }).click()
            }

            await page.waitForTimeout(500)
        }

        // Add Ribeye ($28), Salmon ($24), Calamari ($10) = $62 total
        await addItemByName('Ribeye')
        await addItemByName('Salmon')
        await addItemByName('Calamari')

        // Cart should show "View Cart" with items
        const cartLink = page.getByText('View Cart')
        await expect(cartLink).toBeVisible({ timeout: 5000 })

        // Navigate to checkout
        await cartLink.click()

        // Should be on checkout page
        await expect(page.getByText('Checkout')).toBeVisible({ timeout: 5000 })
        await expect(page.getByText('Order Summary')).toBeVisible()

        // --- Loyalty Panel ---
        const loyaltySection = page.getByText('Loyalty')
        const hasLoyalty = await loyaltySection.first().isVisible({ timeout: 5000 }).catch(() => false)

        if (hasLoyalty) {
            // Enter phone number for loyalty lookup
            const phoneInput = page.locator('input[placeholder*="Phone"], input[type="tel"]').first()
            const hasPhone = await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)

            if (hasPhone) {
                await phoneInput.fill('9841234567')

                // Check current mode: "Look Up" button = lookup mode, 
                // "Already a member?" toggle = already in signup mode
                const lookupBtn = page.locator('button').filter({ hasText: 'Look Up' }).first()
                const isLookupMode = await lookupBtn.isVisible({ timeout: 2000 }).catch(() => false)

                if (isLookupMode) {
                    // In lookup mode — try to find existing member first
                    await lookupBtn.click()
                    await page.waitForTimeout(3000)

                    // Check if member was found (panel shows tier badge)
                    const memberLinked = page.getByText(/bronze|silver|gold|platinum/i)
                    const isMember = await memberLinked.first().isVisible({ timeout: 3000 }).catch(() => false)

                    if (isMember) {
                        // Member already exists from a previous run — great, proceed
                        console.log('✅ Existing loyalty member found')
                    } else {
                        // Member not found — switch to signup mode and sign up
                        const signUpToggle = page.getByText('New member? Sign up')
                        if (await signUpToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
                            await signUpToggle.click()
                            await page.waitForTimeout(500)
                        }
                        // Now click "Join Rewards Program" (or it may already be "Signing up...")
                        const joinBtn = page.locator('button').filter({ hasText: /Join Rewards Program/i })
                        if (await joinBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                            await joinBtn.click()
                        }
                        // Wait for signup to complete — member panel should appear with tier info
                        const signedUp = page.getByText(/bronze|silver|gold|platinum/i)
                        await expect(signedUp.first()).toBeVisible({ timeout: 10000 })
                        console.log('✅ New loyalty member signed up')
                    }
                } else {
                    // Already in signup mode — just sign up directly
                    const joinBtn = page.locator('button').filter({ hasText: /Join Rewards Program/i })
                    if (await joinBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await joinBtn.click()
                    }
                    const signedUp = page.getByText(/bronze|silver|gold|platinum/i)
                    await expect(signedUp.first()).toBeVisible({ timeout: 10000 })
                    console.log('✅ Loyalty member signed up (was already in signup mode)')
                }
            }
        }

        // --- Place Order ---
        const placeOrderBtn = page.locator('button').filter({ hasText: 'Place Order' })
        await expect(placeOrderBtn).toBeEnabled({ timeout: 3000 })
        await placeOrderBtn.click()

        // Should redirect to order tracking page
        await page.waitForURL(/\/order\//, { timeout: 30000 })

        await expect(
            page.getByText('Track Order')
        ).toBeVisible({ timeout: 5000 })

        // Extract order ID from URL
        const url = page.url()
        const match = url.match(/\/order\/([^/?]+)/)
        if (match) {
            orderId = match[1]
        }
        expect(orderId).toBeTruthy()
    })

    // ─── Step 3: Customer splits the bill on order page ───
    test('Step 3: Customer opens Split Bill modal and splits evenly by 3', async ({
        page,
    }) => {
        test.skip(!orderId, 'No order ID from previous step')

        // Navigate to order tracking page
        await page.goto(`/t/${TABLE_QR_TOKEN}/order/${orderId}`)
        await expect(page.getByText('Track Order')).toBeVisible({ timeout: 5000 })

        // Click "Split the Bill" button
        const splitBtn = page.locator('button').filter({ hasText: /Split.*Bill/i }).first()
        await expect(splitBtn).toBeVisible({ timeout: 5000 })
        await splitBtn.click()

        // Split Bill modal should appear — check the heading inside the modal
        await expect(page.getByRole('heading', { name: 'Split the Bill' })).toBeVisible({ timeout: 3000 })
        await expect(page.getByText('Total Bill')).toBeVisible()

        // Click "Split Evenly"
        const splitEvenlyBtn = page.locator('button').filter({ hasText: 'Split Evenly' })
        await expect(splitEvenlyBtn).toBeVisible({ timeout: 3000 })
        await splitEvenlyBtn.click()

        // Should see the count stepper — "How many people?"
        await expect(page.getByText('How many people?')).toBeVisible({ timeout: 3000 })

        // Default is 2 — increment to 3
        const incrementBtn = page.locator('button').filter({ hasText: '+' }).first()
        await expect(incrementBtn).toBeVisible({ timeout: 2000 })
        await incrementBtn.click()

        // Should show "3" in the stepper
        await expect(page.locator('.text-4xl:has-text("3")').first()).toBeVisible({ timeout: 2000 })

        // Should show per-person amount
        const perPersonText = page.getByText(/per person/i)
        await expect(perPersonText).toBeVisible({ timeout: 2000 })

        // Click the "Split Bill" action button (the one inside the 'count' step, not the header)
        const executeSplitBtn = page.locator('button').filter({ hasText: 'Split Bill' }).last()
        await expect(executeSplitBtn).toBeVisible({ timeout: 2000 })
        await executeSplitBtn.click()

        // Should show results with Guest 1, Guest 2, Guest 3
        await expect(page.getByText('Guest 1')).toBeVisible({ timeout: 5000 })
        await expect(page.getByText('Guest 2')).toBeVisible()
        await expect(page.getByText('Guest 3')).toBeVisible()

        // Click "Done" to close the modal
        const doneBtn = page.locator('button').filter({ hasText: 'Done' })
        await expect(doneBtn).toBeVisible({ timeout: 2000 })
        await doneBtn.click()

        // Modal should be closed
        await expect(page.getByText('Total Bill')).not.toBeVisible({ timeout: 3000 })
    })

    // ─── Step 4: Customer A pays via QR ───
    test('Step 4: Customer A submits payment claim via QR', async ({
        page,
    }) => {
        test.skip(!orderId, 'No order ID from previous step')

        await page.goto(`/t/${TABLE_QR_TOKEN}/order/${orderId}`)
        await expect(page.getByText('Track Order')).toBeVisible({ timeout: 5000 })

        // Wait for the "Pay Now" button to appear
        const payNowBtn = page.locator('button').filter({ hasText: 'Pay Now' })
        await expect(payNowBtn).toBeVisible({ timeout: 5000 })

        // Check if the payment panel (phone input) is already visible
        const phoneInput = page.locator('input[type="tel"]').first()
        const panelAlreadyOpen = await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)

        if (!panelAlreadyOpen) {
            // Accordion is collapsed — click to expand
            await payNowBtn.click()
            await page.waitForTimeout(500)
        }

        // Now the phone input should be visible
        await expect(phoneInput).toBeVisible({ timeout: 5000 })
        await phoneInput.fill('9841111111')

        // Click "I Have Paid" button
        const paidBtn = page.locator('button').filter({ hasText: /I Have Paid/i })
        await expect(paidBtn).toBeEnabled({ timeout: 3000 })
        await paidBtn.click()

        // Should show success state — "Payment Claimed!"
        await expect(
            page.getByText('Payment Claimed!')
        ).toBeVisible({ timeout: 10000 })
    })

    // ─── Step 5: Waiter verifies the payment claim ───
    test('Step 5: Waiter verifies the payment claim', async ({
        page,
    }) => {
        await loginAs(page, WAITER_EMAIL, WAITER_PASSWORD)
        await expect(page).toHaveURL(/waiter/, { timeout: 10000 })

        // Reload to pick up payment verification claims
        await page.reload({ waitUntil: 'load' })

        // Look for Payment Verifications section
        const paymentSection = page.getByText('Payment Verifications')
        const hasPayments = await paymentSection.isVisible({ timeout: 10000 }).catch(() => false)

        if (hasPayments) {
            // Should see pending payment claim with amount
            const pendingText = page.getByText(/pending/i).first()
            await expect(pendingText).toBeVisible({ timeout: 5000 })

            // Click "Approve" to verify the payment
            const approveBtn = page.locator('button').filter({ hasText: 'Approve' }).first()
            const hasApprove = await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)

            if (hasApprove) {
                await approveBtn.click()
                await page.waitForTimeout(2000)

                // After approval, the claim should move to resolved
                // Reload to verify
                await page.reload({ waitUntil: 'load' })
            } else {
                // Try "Verify Payment & Close Table" button
                const verifyCloseBtn = page.locator('button').filter({ hasText: /Verify.*Close/i }).first()
                if (await verifyCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await verifyCloseBtn.click()
                    await page.waitForTimeout(2000)
                }
            }
        }

        // Cleanup: close the table session
        await page.reload({ waitUntil: 'load' })
        const tableButton = page
            .locator('button')
            .filter({ hasText: TABLE_LABEL })
            .first()
        
        if (await tableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tableButton.click()
            
            const closeBtn = page.getByText('Close Session & Checkout')
            const isActive = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)
            
            if (isActive) {
                await closeBtn.click()
                await page.waitForTimeout(500)
                const confirmBtn = page.locator('[class*="bg-red-600"]').filter({ hasText: 'Close Session' })
                if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await confirmBtn.click()
                    await page.waitForTimeout(2000)
                }
            }
        }
    })
})
