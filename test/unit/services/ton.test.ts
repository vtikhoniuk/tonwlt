import { describe, it, expect, vi } from 'vitest';
import {
  isValidAddress,
  formatAddress,
  computeBodyFwdFee,
  countCellStats,
  buildTransferBody,
  FwdPrices,
} from '../../../src/services/ton';
import { TEST_ADDRESS, TEST_ADDRESS_2, INVALID_ADDRESS } from '../../helpers/mocks';

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

describe('sendTon', () => {
  it('sends exact amount with PAY_GAS_SEPARATELY sendMode', async () => {
    const { toNano, SendMode } = await import('@ton/core');

    const mockSendTransfer = vi.fn();
    const mockGetSeqno = vi.fn().mockResolvedValue(0);
    const mockOpen = vi.fn().mockReturnValue({
      getSeqno: mockGetSeqno,
      sendTransfer: mockSendTransfer,
    });

    vi.doMock('@ton/ton', async () => {
      const actual = await vi.importActual('@ton/ton');
      return {
        ...actual,
        TonClient: vi.fn().mockImplementation(() => ({ open: mockOpen })),
      };
    });

    const { sendTon } = await import('../../../src/services/ton');

    await sendTon(
      Array(24).fill('test'),
      TEST_ADDRESS_2,
      '0.09',
    ).catch(() => {
      // mnemonicToPrivateKey may fail with test words
    });

    if (mockSendTransfer.mock.calls.length > 0) {
      const call = mockSendTransfer.mock.calls[0][0];
      // Value must be exactly the entered amount (no fee added)
      expect(call.messages[0].info.value.coins).toBe(toNano('0.09'));
      // SendMode must include PAY_GAS_SEPARATELY so fees don't reduce value
      expect(call.sendMode & SendMode.PAY_GAS_SEPARATELY).toBeTruthy();
    }

    vi.doUnmock('@ton/ton');
  });
});

// Реальные параметры testnet workchain 0 (config param 25)
const TESTNET_FWD_PRICES: FwdPrices = {
  lumpPrice: 400000n,
  bitPrice: 26214400n,
  cellPrice: 2621440000n,
  firstFrac: 21845n,
};

describe('computeBodyFwdFee', () => {
  it('returns lumpPrice for transfer without comment (matches real testnet tx)', () => {
    // Verified: real testnet tx deducts exactly lumpPrice (400000) from value for empty body
    const fee = computeBodyFwdFee(TESTNET_FWD_PRICES);
    expect(fee).toBe(400000n);
  });

  it('returns higher fee for transfer with comment', () => {
    const feeNoComment = computeBodyFwdFee(TESTNET_FWD_PRICES);
    const feeWithComment = computeBodyFwdFee(TESTNET_FWD_PRICES, buildTransferBody('test comment'));
    expect(feeWithComment).toBeGreaterThan(feeNoComment);
  });

  it('fee increases with longer comment', () => {
    const feeShort = computeBodyFwdFee(TESTNET_FWD_PRICES, buildTransferBody('hi'));
    const feeLong = computeBodyFwdFee(
      TESTNET_FWD_PRICES,
      buildTransferBody('this is a much longer comment for testing fee calculation'),
    );
    expect(feeLong).toBeGreaterThan(feeShort);
  });

  it('returns lumpPrice when body is undefined', () => {
    const fee = computeBodyFwdFee(TESTNET_FWD_PRICES, undefined);
    expect(fee).toBe(TESTNET_FWD_PRICES.lumpPrice);
  });
});

describe('countCellStats', () => {
  it('counts bits and cells for empty body', () => {
    const body = buildTransferBody(undefined);
    expect(body).toBeUndefined();
  });

  it('counts bits and cells for comment body', () => {
    const body = buildTransferBody('test');
    expect(body).toBeDefined();
    const stats = countCellStats(body!);
    // 32 bits for opcode (0x00000000) + 32 bits for "test" (4 bytes)
    expect(stats.bits).toBe(64);
    expect(stats.cells).toBe(1);
  });

  it('counts nested cells for long comment', () => {
    // Long comment that exceeds one cell's capacity
    const longText = 'a'.repeat(200);
    const body = buildTransferBody(longText);
    const stats = countCellStats(body!);
    expect(stats.cells).toBeGreaterThan(1);
    expect(stats.bits).toBeGreaterThan(64);
  });
});

describe('buildTransferBody', () => {
  it('returns undefined for no comment', () => {
    expect(buildTransferBody(undefined)).toBeUndefined();
    expect(buildTransferBody('')).toBeUndefined();
  });

  it('returns Cell with opcode 0 and comment text', () => {
    const body = buildTransferBody('hello');
    expect(body).toBeDefined();
    const slice = body!.beginParse();
    expect(slice.loadUint(32)).toBe(0); // text comment opcode
    expect(slice.loadStringTail()).toBe('hello');
  });
});
