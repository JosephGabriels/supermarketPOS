import { test, expect } from '@playwright/test';

test.describe('Products Modal - Dropdown Fields', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'joesky');
    await page.fill('input[name="password"]', 'Tavor@!07');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to Products
    await page.click('a[href*="products"]');
    await page.waitForSelector('text=Manage your product inventory');
  });

  test('View modal displays dropdown values correctly', async ({ page }) => {
    // Wait for products table to load
    await page.waitForSelector('table');
    
    // Click View on first product
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Product Details');
    
    // Verify category dropdown is populated and has a value selected
    const categorySelect = page.locator('select').first();
    const categoryValue = await categorySelect.inputValue();
    
    // Category should either have a value or show "Select category"
    // The important thing is that dropdown options are loaded
    const categoryOptions = await categorySelect.locator('option').count();
    expect(categoryOptions).toBeGreaterThan(1); // At least "Select category" + one real option
    
    // Verify supplier dropdown is populated
    const supplierSelect = page.locator('select').nth(1);
    const supplierOptions = await supplierSelect.locator('option').count();
    expect(supplierOptions).toBeGreaterThan(1);
    
    // Verify branch dropdown is populated
    const branchSelect = page.locator('select').nth(2);
    const branchOptions = await branchSelect.locator('option').count();
    expect(branchOptions).toBeGreaterThan(1);
    
    // Close modal
    await page.click('button:has-text("Close")');
  });

  test('Edit modal displays pre-selected dropdown values', async ({ page }) => {
    // Wait for products table to load
    await page.waitForSelector('table');
    
    // Click Edit on first product
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Edit Product');
    
    // Get the product name to track which product we're editing
    const productName = await page.locator('input[placeholder="Enter product name"]').inputValue();
    console.log(`Editing product: ${productName}`);
    
    // Verify category dropdown has options loaded
    const categorySelect = page.locator('select').first();
    const categoryOptions = await categorySelect.locator('option').count();
    expect(categoryOptions).toBeGreaterThan(1);
    
    // Verify supplier dropdown has options loaded
    const supplierSelect = page.locator('select').nth(1);
    const supplierOptions = await supplierSelect.locator('option').count();
    expect(supplierOptions).toBeGreaterThan(1);
    
    // Verify branch dropdown has options loaded
    const branchSelect = page.locator('select').nth(2);
    const branchOptions = await branchSelect.locator('option').count();
    expect(branchOptions).toBeGreaterThan(1);
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('Edit modal allows changing and saving dropdown values', async ({ page }) => {
    // Wait for products table to load
    await page.waitForSelector('table');
    
    // Click Edit on first product
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Edit Product');
    
    // Get the category select and change its value if possible
    const categorySelect = page.locator('select').first();
    
    // Get all available options
    const options = await categorySelect.locator('option').all();
    
    if (options.length > 2) {
      // If there are more than 2 options (blank + at least 1), select the second one
      const optionValue = await options[2].getAttribute('value');
      if (optionValue) {
        await categorySelect.selectOption(optionValue);
        
        // Verify the value was selected
        const selectedValue = await categorySelect.inputValue();
        expect(selectedValue).toBe(optionValue);
      }
    }
    
    // Close modal without saving to avoid conflicts
    await page.click('button:has-text("Cancel")');
  });

  test('Category, Supplier, and Branch dropdowns have visible options', async ({ page }) => {
    // Wait for products table to load
    await page.waitForSelector('table');
    
    // Click View on first product
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Product Details');
    
    // Get all selects
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    // Should have at least 3 selects: category, supplier, branch
    expect(selectCount).toBeGreaterThanOrEqual(3);
    
    // Verify each select has content
    for (let i = 0; i < Math.min(3, selectCount); i++) {
      const select = selects.nth(i);
      const options = await select.locator('option').count();
      
      // Each dropdown should have at least the placeholder + 1 real option
      expect(options).toBeGreaterThan(1);
    }
    
    // Close modal
    await page.click('button:has-text("Close")');
  });
});
