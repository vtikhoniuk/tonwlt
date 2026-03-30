import { test, expect } from '@playwright/test';
import { seedAndUnlockWallet } from './helpers';

const TEST_ADDRESS = '0QBcAtw-l1EMIfK-ZocywIp1bM0T2qhBDuso3eJTkcCbjy3Z';
const TEST_MNEMONIC = Array(24).fill('test');

test.describe('Navigation - No wallet', () => {
  test('welcome page is shown at root', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('TON Wallet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать кошелёк' })).toBeVisible();
  });

  test('unknown routes redirect to welcome', async ({ page }) => {
    await page.goto('/#/send');
    await expect(page.getByText('TON Wallet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать кошелёк' })).toBeVisible();
  });

  test('can navigate between welcome, create, import', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Создать кошелёк' }).click();
    await expect(page.getByText('Создание кошелька')).toBeVisible();

    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByText('TON Wallet')).toBeVisible();

    await page.getByRole('button', { name: 'Импортировать кошелёк' }).click();
    await expect(page.getByText('Импорт кошелька')).toBeVisible();

    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByText('TON Wallet')).toBeVisible();
  });
});

test.describe('Navigation - With wallet', () => {
  test.beforeEach(async ({ page }) => {
    await seedAndUnlockWallet(page, TEST_ADDRESS, TEST_MNEMONIC);
  });

  test('dashboard is shown at root', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Получить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible();
  });

  test('unknown routes redirect to dashboard', async ({ page }) => {
    await page.goto('/#/create');
    await expect(page.getByRole('button', { name: 'Получить' })).toBeVisible();
  });

  test('navigate to Receive and back', async ({ page }) => {
    await page.getByRole('button', { name: 'Получить' }).click();
    await expect(page.getByText('Получить TON')).toBeVisible();

    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByRole('button', { name: 'Получить' })).toBeVisible();
  });

  test('navigate to Send and back', async ({ page }) => {
    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page.getByText('Отправить TON')).toBeVisible();

    await page.getByRole('button', { name: '← Назад' }).click();
    await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible();
  });

  test('logout returns to welcome', async ({ page }) => {
    await page.getByRole('button', { name: '⚙' }).click();
    await page.getByRole('button', { name: 'Выйти из кошелька' }).click();
    await expect(page.getByText('TON Wallet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать кошелёк' })).toBeVisible();
  });
});
