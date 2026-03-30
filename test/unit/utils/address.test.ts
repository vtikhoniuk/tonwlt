import { describe, it, expect } from 'vitest';
import {
  addressesAreSimilar,
  checkAddressSpoofing,
  isDustTransaction,
  shortenAddress,
  splitAddressForDisplay,
  findAddressDifferences,
} from '../../../src/utils/address';
import { createMockTransaction, TEST_ADDRESS, TEST_ADDRESS_2, SIMILAR_ADDRESS } from '../../helpers/mocks';

describe('addressesAreSimilar', () => {
  it('returns false when addresses are identical', () => {
    expect(addressesAreSimilar(TEST_ADDRESS, TEST_ADDRESS)).toBe(false);
  });

  it('returns false when addresses are shorter than 10 chars', () => {
    expect(addressesAreSimilar('short', 'shart')).toBe(false);
  });

  it('returns true when addresses share first 6 and last 6 chars but differ in middle', () => {
    expect(addressesAreSimilar(TEST_ADDRESS, SIMILAR_ADDRESS)).toBe(true);
  });

  it('returns false when prefix differs', () => {
    const modified = 'XXXXXX' + TEST_ADDRESS.slice(6);
    expect(addressesAreSimilar(TEST_ADDRESS, modified)).toBe(false);
  });

  it('returns false when suffix differs', () => {
    const modified = TEST_ADDRESS.slice(0, -6) + 'XXXXXX';
    expect(addressesAreSimilar(TEST_ADDRESS, modified)).toBe(false);
  });

  it('returns false for completely different addresses', () => {
    expect(addressesAreSimilar(TEST_ADDRESS, TEST_ADDRESS_2)).toBe(false);
  });
});

describe('checkAddressSpoofing', () => {
  it('returns empty array when no similar addresses in history', () => {
    const tx = createMockTransaction({ from: TEST_ADDRESS_2, to: TEST_ADDRESS });
    const result = checkAddressSpoofing('0QNewAddress_completely_different_addr', [tx], TEST_ADDRESS);
    expect(result).toEqual([]);
  });

  it('returns similar_address warning when target is similar to history address', () => {
    const tx = createMockTransaction({ from: TEST_ADDRESS_2, to: TEST_ADDRESS });
    // Create an address similar to TEST_ADDRESS_2
    const similarToAddr2 = TEST_ADDRESS_2.slice(0, 6) + 'XXXXXXXXXXXXXXXXX' + TEST_ADDRESS_2.slice(-6);
    const result = checkAddressSpoofing(similarToAddr2, [tx], TEST_ADDRESS);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('similar_address');
    expect(result[0].similarTo).toBe(TEST_ADDRESS_2);
  });

  it('ignores myAddress when scanning counterparties', () => {
    const tx = createMockTransaction({ from: TEST_ADDRESS, to: TEST_ADDRESS_2 });
    // SIMILAR_ADDRESS is similar to TEST_ADDRESS (myAddress) — should not warn
    const result = checkAddressSpoofing(SIMILAR_ADDRESS, [tx], TEST_ADDRESS);
    // Only warns if similar to counterparty (TEST_ADDRESS_2), not to myAddress
    const hasWarningAboutSelf = result.some(w => w.similarTo === TEST_ADDRESS);
    expect(hasWarningAboutSelf).toBe(false);
  });
});

describe('isDustTransaction', () => {
  it('returns true for incoming tx with very small amount', () => {
    const tx = createMockTransaction({ isIncoming: true, amount: '0.0001' });
    expect(isDustTransaction(tx)).toBe(true);
  });

  it('returns false for outgoing tx regardless of amount', () => {
    const tx = createMockTransaction({ isIncoming: false, amount: '0.0001' });
    expect(isDustTransaction(tx)).toBe(false);
  });

  it('returns false for incoming tx with normal amount', () => {
    const tx = createMockTransaction({ isIncoming: true, amount: '1.5' });
    expect(isDustTransaction(tx)).toBe(false);
  });

  it('returns false for incoming tx with zero amount', () => {
    const tx = createMockTransaction({ isIncoming: true, amount: '0' });
    expect(isDustTransaction(tx)).toBe(false);
  });

  it('returns false for amount exactly at threshold', () => {
    const tx = createMockTransaction({ isIncoming: true, amount: '0.001' });
    expect(isDustTransaction(tx)).toBe(false);
  });
});

describe('shortenAddress', () => {
  it('shortens long addresses to first8...last8', () => {
    expect(shortenAddress(TEST_ADDRESS)).toBe(
      `${TEST_ADDRESS.slice(0, 8)}...${TEST_ADDRESS.slice(-8)}`
    );
  });

  it('returns full address when 16 chars or fewer', () => {
    expect(shortenAddress('short_address')).toBe('short_address');
  });
});

describe('splitAddressForDisplay', () => {
  it('splits into [first6, middle, last6] for long addresses', () => {
    const [prefix, middle, suffix] = splitAddressForDisplay(TEST_ADDRESS);
    expect(prefix).toBe(TEST_ADDRESS.slice(0, 6));
    expect(suffix).toBe(TEST_ADDRESS.slice(-6));
    expect(middle).toBe(TEST_ADDRESS.slice(6, -6));
    expect(prefix + middle + suffix).toBe(TEST_ADDRESS);
  });

  it('returns [full, empty, empty] for short addresses', () => {
    expect(splitAddressForDisplay('short')).toEqual(['short', '', '']);
  });
});

describe('findAddressDifferences', () => {
  it('returns indices where characters differ', () => {
    const diffs = findAddressDifferences('abcdef', 'abXdYf');
    expect(diffs).toEqual([2, 4]);
  });

  it('returns empty array for identical strings', () => {
    expect(findAddressDifferences('same', 'same')).toEqual([]);
  });

  it('handles strings of different lengths', () => {
    const diffs = findAddressDifferences('abc', 'abcde');
    expect(diffs).toEqual([3, 4]);
  });
});
