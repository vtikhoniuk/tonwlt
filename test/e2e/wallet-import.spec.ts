import { test, expect } from '@playwright/test';

test.describe('Wallet Import Flow', () => {
  test('shows validation error for insufficient words', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Импортировать кошелёк' }).click();

    await expect(page.getByText('Импорт кошелька')).toBeVisible();

    await page.locator('textarea').fill('one two three');
    await expect(page.getByText('Слов: 3 / 24')).toBeVisible();

    await page.getByRole('button', { name: 'Импортировать' }).click();
    await expect(page.getByText(/ровно 24 слова/)).toBeVisible();
  });

  test('shows error for invalid mnemonic', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Импортировать кошелёк' }).click();

    const fakeWords = Array(24).fill('invalid').join(' ');
    await page.locator('textarea').fill(fakeWords);
    await expect(page.getByText('Слов: 24 / 24')).toBeVisible();

    // Fill password fields (required now)
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('testpass123');
    await passwordInputs.nth(1).fill('testpass123');

    await page.getByRole('button', { name: 'Импортировать' }).click();

    // Should show error (mnemonicValidate returns false)
    await expect(page.getByText(/Invalid mnemonic|Неверная мнемоническая/)).toBeVisible({ timeout: 15000 });
  });

  test('back button returns to welcome', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Импортировать кошелёк' }).click();
    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByText('TON Wallet')).toBeVisible();
  });

  test('word counter updates in real time', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Импортировать кошелёк' }).click();

    await page.locator('textarea').fill('word1 word2 word3 word4 word5');
    await expect(page.getByText('Слов: 5 / 24')).toBeVisible();

    await page.locator('textarea').fill('');
    await expect(page.getByText('Слов: 0 / 24')).toBeVisible();
  });
});
