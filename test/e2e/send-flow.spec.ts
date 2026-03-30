import { test, expect } from '@playwright/test';
import { seedAndUnlockWallet } from './helpers';

const TEST_ADDRESS = '0QBcAtw-l1EMIfK-ZocywIp1bM0T2qhBDuso3eJTkcCbjy3Z';
const TEST_ADDRESS_2 = '0QABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBASus';
const TEST_MNEMONIC = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
  'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
  'across', 'act', 'action', 'actor', 'actress', 'actual',
];

test.describe('Send Flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndUnlockWallet(page, TEST_ADDRESS, TEST_MNEMONIC);
  });

  test('validation: empty form', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page.getByText('Отправить TON')).toBeVisible();

    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByText('Введите адрес получателя')).toBeVisible();
  });

  test('validation: invalid address', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await page.locator('input[placeholder*="UQ"]').fill('not-a-valid-address');
    await page.locator('input[type="number"]').fill('1');
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByText('Некорректный адрес TON')).toBeVisible();
  });

  test('validation: insufficient funds', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await page.locator('input[placeholder*="UQ"]').fill(TEST_ADDRESS_2);
    await page.locator('input[type="number"]').fill('99999');
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByText(/Недостаточно средств/)).toBeVisible();
  });

  test('validation: send to self', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await page.locator('input[placeholder*="UQ"]').fill(TEST_ADDRESS);
    await page.locator('input[type="number"]').fill('1');
    await page.getByRole('button', { name: 'Далее' }).click();
    await expect(page.getByText('Нельзя отправить самому себе')).toBeVisible();
  });

  test('back button from send form returns to dashboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Получить' })).toBeVisible();
  });
});
