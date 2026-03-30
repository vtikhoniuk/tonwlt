import { describe, it, expect } from 'vitest';
import { encryptMnemonic, decryptMnemonic, EncryptedData } from '../../../src/services/crypto';

const TEST_MNEMONIC = ['abandon', 'ability', 'able', 'about', 'above', 'absent'];
const PASSWORD = 'mySecretPassword123';

describe('encryptMnemonic', () => {
  it('returns { encrypted, salt, iv } as base64 strings', async () => {
    const result = await encryptMnemonic(TEST_MNEMONIC, PASSWORD);

    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('salt');
    expect(result).toHaveProperty('iv');

    // All values should be non-empty base64 strings
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

describe('decryptMnemonic', () => {
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

describe('encrypt / decrypt roundtrip', () => {
  it('preserves mnemonic through encrypt-decrypt cycle', async () => {
    const mnemonic = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent',
      'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
      'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
      'across', 'act', 'action', 'actor', 'actress', 'actual',
    ];
    const password = 'strong-passphrase-2024!';

    const encrypted = await encryptMnemonic(mnemonic, password);
    const decrypted = await decryptMnemonic(encrypted, password);

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
