import { Page } from '@playwright/test';

const TEST_PASSWORD = 'testpass123';

export { TEST_PASSWORD };

/**
 * Seed an encrypted wallet into localStorage and unlock it.
 */
export async function seedAndUnlockWallet(page: Page, address: string, mnemonic: string[]) {
  await page.goto('/');

  // Encrypt mnemonic in browser context using Web Crypto API
  await page.evaluate(async ({ address, mnemonic, password }) => {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(mnemonic))
    );

    function toBase64(bytes: Uint8Array) {
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }

    localStorage.setItem('ton_wallet', JSON.stringify({
      encrypted: toBase64(new Uint8Array(ciphertext)),
      salt: toBase64(salt),
      iv: toBase64(iv),
      address,
    }));
  }, { address, mnemonic, password: TEST_PASSWORD });

  await page.reload();

  // Unlock
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Разблокировать' }).click();
  await page.getByRole('button', { name: 'Получить' }).waitFor({ timeout: 15000 });
}
