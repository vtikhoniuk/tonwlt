import { describe, it, expect } from 'vitest';
import { encryptMnemonic, decryptMnemonic } from '../../../src/services/crypto';

const TEST_MNEMONIC = ['abandon', 'ability', 'able', 'about', 'above', 'absent'];
const PASSWORD = 'mySecretPassword123';

// PBKDF2 with 600K iterations is slow
describe('encryptMnemonic', { timeout: 30000 }, () => {
  it('returns { encrypted, salt, iv } as base64 strings', async () => {
    const result = await encryptMnemonic(TEST_MNEMONIC, PASSWORD);

    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('salt');
    expect(result).toHaveProperty('iv');

    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    expect(result.encrypted).toMatch(base64Regex);
    expect(result.salt).toMatch(base64Regex);
    expect(result.iv).toMatch(base64Regex);
  });

  it('different passwords produce different ciphertext', async () => {
    const result1 = await encryptMnemonic(TEST_MNEMONIC, 'password1');
    const result2 = await encryptMnemonic(TEST_MNEMONIC, 'password2');

    expect(result1.encrypted).not.toBe(result2.encrypted);
  });
});

describe('decryptMnemonic', { timeout: 30000 }, () => {
  it('with correct password returns original mnemonic', async () => {
    const encrypted = await encryptMnemonic(TEST_MNEMONIC, PASSWORD);
    const decrypted = await decryptMnemonic(encrypted, PASSWORD);

    expect(decrypted).toEqual(TEST_MNEMONIC);
  });

  it('with wrong password throws "Неверный пароль"', async () => {
    const encrypted = await encryptMnemonic(TEST_MNEMONIC, PASSWORD);

    await expect(decryptMnemonic(encrypted, 'wrongPassword')).rejects.toThrow('Неверный пароль');
  });
});

describe('encrypt / decrypt roundtrip', { timeout: 30000 }, () => {
  it('preserves full 24-word mnemonic', async () => {
    const mnemonic = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent',
      'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
      'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
      'across', 'act', 'action', 'actor', 'actress', 'actual',
    ];

    const encrypted = await encryptMnemonic(mnemonic, 'strong-passphrase-2024!');
    const decrypted = await decryptMnemonic(encrypted, 'strong-passphrase-2024!');

    expect(decrypted).toEqual(mnemonic);
  });

  it('works with empty password', async () => {
    const encrypted = await encryptMnemonic(TEST_MNEMONIC, '');
    const decrypted = await decryptMnemonic(encrypted, '');
    expect(decrypted).toEqual(TEST_MNEMONIC);
  });

  it('works with unicode password', async () => {
    const password = 'пароль-с-юникодом-🔑';
    const encrypted = await encryptMnemonic(TEST_MNEMONIC, password);
    const decrypted = await decryptMnemonic(encrypted, password);
    expect(decrypted).toEqual(TEST_MNEMONIC);
  });
});
