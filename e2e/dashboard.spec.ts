import { expect, test } from '@playwright/test';

test('loads dashboard and shows compute action', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('#latitude')).toBeVisible();
  await expect(page.locator('#longitude')).toBeVisible();
});

test('opens chatbot shell', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open chatbot' }).click();
  await expect(page.getByRole('button', { name: 'Close chatbot' })).toBeVisible();
});
