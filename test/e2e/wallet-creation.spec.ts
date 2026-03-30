import { test, expect } from '@playwright/test';

test.describe('Wallet Creation Flow', () => {
  test('full creation flow: generate -> show mnemonic -> confirm -> dashboard', async ({ page }) => {
    await page.goto('/');

    // Welcome page
    await expect(page.getByText('TON Wallet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать кошелёк' })).toBeVisible();

    // Navigate to create
    await page.getByRole('button', { name: 'Создать кошелёк' }).click();
    await expect(page.getByText('Создание кошелька')).toBeVisible();

    // Generate
    await page.getByRole('button', { name: 'Сгенерировать' }).click();

    // Wait for mnemonic to appear
    await expect(page.getByText('Сохраните фразу')).toBeVisible({ timeout: 30000 });

    // Read all 24 words
    const words: string[] = [];
    for (let i = 1; i <= 24; i++) {
      const wordEl = page.locator(`.mnemonic-word:nth-child(${i})`);
      const text = await wordEl.textContent();
      // Text format: "1. word" — extract just the word
      const word = text?.replace(/^\d+\.\s*/, '').trim() || '';
      words.push(word);
    }
    expect(words).toHaveLength(24);
    expect(words.every(w => w.length > 0)).toBe(true);

    // Proceed to confirm
    await page.getByRole('button', { name: 'Я сохранил фразу' }).click();
    await expect(page.getByText('Проверка')).toBeVisible();

    // Fill in the requested words
    const inputs = page.locator('.confirm-input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const label = await inputs.nth(i).locator('label').textContent();
      // Label format: "Слово #N"
      const match = label?.match(/#(\d+)/);
      if (match) {
        const wordIndex = parseInt(match[1]) - 1;
        await inputs.nth(i).locator('input').fill(words[wordIndex]);
      }
    }

    // Confirm
    await page.getByRole('button', { name: 'Подтвердить' }).click();

    // Set password step
    await expect(page.getByText('Установите пароль')).toBeVisible();
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('testpass123');
    await passwordInputs.nth(1).fill('testpass123');
    await page.getByRole('button', { name: 'Зашифровать и сохранить' }).click();

    // Should land on Dashboard (activateWallet sets wallet which redirects)
    await expect(page.getByRole('button', { name: 'Получить' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible();
  });

  test('back button from create returns to welcome', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Создать кошелёк' }).click();
    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByText('TON Wallet')).toBeVisible();
  });

  test('wrong confirm words show error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Создать кошелёк' }).click();
    await page.getByRole('button', { name: 'Сгенерировать' }).click();
    await expect(page.getByText('Сохраните фразу')).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: 'Я сохранил фразу' }).click();

    // Fill with wrong words
    const inputs = page.locator('.confirm-input input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('wrongword');
    }

    await page.getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByText(/неверное/)).toBeVisible();
  });
});
