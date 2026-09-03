import { expect, test } from '@playwright/test';

test('anonymous visit to dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test('anonymous visit to predict redirects to login', async ({ page }) => {
  await page.goto('/predict', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?next=%2Fpredict/);
});

test('anonymous visit to crop-advisor redirects to login', async ({ page }) => {
  await page.goto('/crop-advisor', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?next=%2Fcrop-advisor/);
});
