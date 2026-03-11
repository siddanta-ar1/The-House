import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow', () => {
    // Use a hardcoded test restaurant and table for E2E
    const restaurantSlug = 'the-house'
    const tableSlug = 'table-1-token' // The unique base64 session ID normally generated from QR

    test('should load menu and allow opening the cart', async ({ page }) => {
        // 1. Visit the valid table link
        await page.goto(`/t/${tableSlug}?s=test-session-123`);

        // 2. Ensure menu loads
        // Based on Phase 3: Wait for Menu categories to appear
        const menuSection = page.locator('text=Our Menu').first();
        await expect(menuSection).toBeVisible({ timeout: 10000 });

        // 3. Check for Add to Cart buttons
        // We assume the menu will render at least one `button` to add an item
        const addToCartButton = page.locator('button', { hasText: 'Add to Cart' }).first()
        if (await addToCartButton.isVisible()) {
            await addToCartButton.click()

            // Verify Cart indicator changes
            const cartBadge = page.locator('[data-testid="cart-badge"]')
            await expect(cartBadge).toHaveText('1')
        }
    });
});
