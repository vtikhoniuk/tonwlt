import { describe, it, expect } from 'vitest';
import {
  saveEncryptedWallet,
  loadEncryptedWallet,
  hasWallet,
  clearWallet,
  getAddressBook,
  addToAddressBook,
  isKnownAddress,
  EncryptedWallet,
} from '../../../src/services/storage';
import { TEST_ADDRESS, TEST_ADDRESS_2 } from '../../helpers/mocks';

const MOCK_ENCRYPTED: EncryptedWallet = {
  encrypted: 'dGVzdA==',
  salt: 'c2FsdA==',
  iv: 'aXZpdg==',
  address: TEST_ADDRESS,
};

describe('saveEncryptedWallet / loadEncryptedWallet', () => {
  it('saves and loads an encrypted wallet', () => {
    saveEncryptedWallet(MOCK_ENCRYPTED);
    const loaded = loadEncryptedWallet();
    expect(loaded).toEqual(MOCK_ENCRYPTED);
  });

  it('returns null when nothing is stored', () => {
    expect(loadEncryptedWallet()).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    localStorage.setItem('ton_wallet', '{broken json');
    expect(loadEncryptedWallet()).toBeNull();
  });

  it('returns null for legacy unencrypted format', () => {
    localStorage.setItem('ton_wallet', JSON.stringify({
      mnemonic: ['word1', 'word2'],
      address: TEST_ADDRESS,
    }));
    expect(loadEncryptedWallet()).toBeNull();
  });
});

describe('hasWallet', () => {
  it('returns true when encrypted wallet exists', () => {
    saveEncryptedWallet(MOCK_ENCRYPTED);
    expect(hasWallet()).toBe(true);
  });

  it('returns false when nothing is stored', () => {
    expect(hasWallet()).toBe(false);
  });
});

describe('clearWallet', () => {
  it('removes wallet and address book from localStorage', () => {
    saveEncryptedWallet(MOCK_ENCRYPTED);
    addToAddressBook(TEST_ADDRESS_2, 'Test');
    clearWallet();
    expect(loadEncryptedWallet()).toBeNull();
    expect(getAddressBook()).toEqual([]);
  });
});

describe('getAddressBook / addToAddressBook', () => {
  it('returns empty array when empty', () => {
    expect(getAddressBook()).toEqual([]);
  });

  it('adds an entry with address, label, and addedAt', () => {
    addToAddressBook(TEST_ADDRESS, 'My wallet');
    const book = getAddressBook();
    expect(book).toHaveLength(1);
    expect(book[0].address).toBe(TEST_ADDRESS);
    expect(book[0].label).toBe('My wallet');
    expect(book[0].addedAt).toBeGreaterThan(0);
  });

  it('does not add duplicate addresses', () => {
    addToAddressBook(TEST_ADDRESS, 'First');
    addToAddressBook(TEST_ADDRESS, 'Second');
    expect(getAddressBook()).toHaveLength(1);
  });

  it('returns empty array for malformed JSON', () => {
    localStorage.setItem('ton_address_book', 'not-json');
    expect(getAddressBook()).toEqual([]);
  });
});

describe('isKnownAddress', () => {
  it('returns true for address in book', () => {
    addToAddressBook(TEST_ADDRESS, 'Known');
    expect(isKnownAddress(TEST_ADDRESS)).toBe(true);
  });

  it('returns false for unknown address', () => {
    expect(isKnownAddress(TEST_ADDRESS)).toBe(false);
  });
});
