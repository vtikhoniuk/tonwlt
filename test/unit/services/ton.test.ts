import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidAddress, formatAddress } from '../../../src/services/ton';
import { TEST_ADDRESS, INVALID_ADDRESS } from '../../helpers/mocks';

// Only test pure functions that don't require network/crypto mocking
describe('isValidAddress', () => {
  it('returns true for a valid TON address', () => {
    expect(isValidAddress(TEST_ADDRESS)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidAddress('')).toBe(false);
  });

  it('returns false for random garbage', () => {
    expect(isValidAddress(INVALID_ADDRESS)).toBe(false);
  });

  it('returns false for a partial address', () => {
    expect(isValidAddress('0QB')).toBe(false);
  });
});

describe('formatAddress', () => {
  it('formats a valid address to testOnly non-bounceable form', () => {
    const result = formatAddress(TEST_ADDRESS);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    // Should start with 0Q (testnet non-bounceable)
    expect(result.startsWith('0Q')).toBe(true);
  });

  it('returns raw input when parsing fails', () => {
    expect(formatAddress(INVALID_ADDRESS)).toBe(INVALID_ADDRESS);
  });
});

describe('importWallet', () => {
  it('throws for invalid mnemonic', async () => {
    const { importWallet } = await import('../../../src/services/ton');
    const badMnemonic = Array(24).fill('invalid');
    await expect(importWallet(badMnemonic)).rejects.toThrow('Invalid mnemonic phrase');
  }, 15000);
});
