import type { StoredWallet } from '../../src/services/storage';
import type { ParsedTransaction } from '../../src/services/ton';

export const TEST_MNEMONIC = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent',
  'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
  'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
  'across', 'act', 'action', 'actor', 'actress', 'actual',
];

export const TEST_ADDRESS = '0QBcAtw-l1EMIfK-ZocywIp1bM0T2qhBDuso3eJTkcCbjy3Z';
export const TEST_ADDRESS_2 = '0QABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBASus';
export const SIMILAR_ADDRESS = '0QBcAtw-XXXXXXXXXXXXXXXXXXXX0T2qhBDuso3eJTkcCbjy3Z';
export const INVALID_ADDRESS = 'not-a-valid-address';

export function createMockWallet(overrides?: Partial<StoredWallet>): StoredWallet {
  return {
    mnemonic: TEST_MNEMONIC,
    address: TEST_ADDRESS,
    ...overrides,
  };
}

export function createMockTransaction(overrides?: Partial<ParsedTransaction>): ParsedTransaction {
  return {
    hash: 'abc123def456',
    time: Math.floor(Date.now() / 1000) - 300,
    from: TEST_ADDRESS_2,
    to: TEST_ADDRESS,
    amount: '1.5',
    amountNano: '1500000000',
    comment: '',
    isIncoming: true,
    lt: '12345',
    ...overrides,
  };
}
