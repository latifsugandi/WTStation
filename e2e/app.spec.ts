import { test, expect } from '@playwright/test'

test.describe('Wastation App', () => {
  test('should load application', async ({ page }) => {
    await page.goto('/')
    
    // Check if app loaded
    await expect(page.locator('text=Wastation')).toBeVisible()
  })

  test('should show sidebar', async ({ page }) => {
    await page.goto('/')
    
    // Check sidebar presence
    const sidebar = page.locator('[data-testid="sidebar"]').first()
    await expect(sidebar).toBeVisible()
  })

  test('should open command palette with Ctrl+K', async ({ page }) => {
    await page.goto('/')
    
    // Press Ctrl+K
    await page.keyboard.press('Control+K')
    
    // Check if command palette is visible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })
})
