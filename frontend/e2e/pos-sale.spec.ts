import { test, expect } from '@playwright/test';

test.describe('POS Sale Process', () => {
  test('completes sale, deducts inventory, and displays large total', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5174/login');
    await page.fill('input[name="username"]', 'joesky');
    await page.fill('input[name="password"]', 'Tavor@!07');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*pos/);

    // Wait for page load
    await page.waitForSelector('input[placeholder*="Scan barcode"]');

    // Get initial stock of first product
    const firstProduct = page.locator('.grid.grid-cols-2.md\\:grid-cols-3 button').first();
    const initialStockText = await firstProduct.locator('p').filter({ hasText: /Stock:/ }).textContent();
    const initialStock = parseInt(initialStockText?.replace('Stock: ', '') || '0');

    // Add first product to cart
    await firstProduct.click();

    // Verify cart has item
    await expect(page.locator('span').filter({ hasText: 'Cart (1)' })).toBeVisible();

    // Check total is displayed large and blue
    const totalDiv = page.locator('div').filter({ hasText: 'Total:' }).locator('..');
    await expect(totalDiv).toHaveClass(/text-3xl/);
    await expect(totalDiv).toHaveClass(/bg-blue-500/);
    await expect(totalDiv).toHaveClass(/text-white/);

    // Add cash payment equal to total
    const totalText = await totalDiv.locator('span').nth(1).textContent();
    const totalAmount = parseFloat(totalText?.replace('KES ', '').replace(/,/g, '') || '0');
    await page.fill('input#cashAmount', totalAmount.toString());
    await page.click('button:has-text("Add Cash")');

    // Complete sale
    await page.click('button:has-text("Complete Sale")');

    // Verify sale completed (receipt shown or success message)
    await expect(page.locator('h3').filter({ hasText: 'Receipt' })).toBeVisible();

    // Refresh page or check inventory updated
    await page.reload();
    await page.waitForSelector('input[placeholder*="Scan barcode"]');

    // Check stock decreased
    const updatedStockText = await firstProduct.locator('p').filter({ hasText: /Stock:/ }).textContent();
    const updatedStock = parseInt(updatedStockText?.replace('Stock: ', '') || '0');
    expect(updatedStock).toBe(initialStock - 1);
  });
});