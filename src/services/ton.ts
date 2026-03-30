import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { Address, Cell, toNano, fromNano, beginCell, SendMode } from '@ton/core';

const TONCENTER_TESTNET = import.meta.env.VITE_TONCENTER_URL || 'https://testnet.toncenter.com/api/v2';
const API_KEY = import.meta.env.VITE_TONCENTER_API_KEY || '';

const clientOptions: { endpoint: string; apiKey?: string } = {
  endpoint: `${TONCENTER_TESTNET}/jsonRPC`,
};
if (API_KEY) clientOptions.apiKey = API_KEY;

const client = new TonClient(clientOptions);

function apiUrl(method: string, params: Record<string, string>) {
  const allParams = { ...params };
  if (API_KEY) allParams.api_key = API_KEY;
  const query = new URLSearchParams(allParams);
  return `${TONCENTER_TESTNET}/${method}?${query}`;
}

export interface WalletKeys {
  mnemonic: string[];
  publicKey: Buffer;
  secretKey: Buffer;
}

export interface WalletInfo {
  address: string;
  mnemonic: string[];
}

export interface ParsedTransaction {
  hash: string;
  time: number;
  from: string;
  to: string;
  amount: string;
  amountNano: string;
  comment: string;
  isIncoming: boolean;
  lt: string;
}

export async function createWallet(): Promise<WalletInfo> {
  const mnemonic = await mnemonicNew(24);
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });
  return {
    address: wallet.address.toString({ testOnly: true, bounceable: false }),
    mnemonic,
  };
}

export async function importWallet(mnemonic: string[]): Promise<WalletInfo> {
  const valid = await mnemonicValidate(mnemonic);
  if (!valid) throw new Error('Invalid mnemonic phrase');

  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });
  return {
    address: wallet.address.toString({ testOnly: true, bounceable: false }),
    mnemonic,
  };
}

export async function getBalance(address: string): Promise<string> {
  const addr = Address.parse(address);
  const balance = await withRetry(() => client.getBalance(addr));
  return fromNano(balance);
}

export async function getTransactions(
  address: string,
  limit = 50
): Promise<ParsedTransaction[]> {
  const res = await fetch(
    apiUrl('getTransactions', { address, limit: String(limit) })
  );
  if (res.status === 429) return [];
  const data = await res.json();
  if (!data.ok) throw new Error('Failed to fetch transactions');

  const myAddr = Address.parse(address).toString({ testOnly: true, bounceable: false });

  return (data.result || []).map((tx: any) => {
    const inMsg = tx.in_msg;
    const outMsg = tx.out_msgs?.[0];
    const isIncoming = !!inMsg?.source && inMsg.source !== '';

    let from = '';
    let to = '';
    let amount = '0';
    let comment = '';

    if (isIncoming && inMsg) {
      from = formatAddress(inMsg.source);
      to = myAddr;
      amount = inMsg.value || '0';
      comment = inMsg.message || '';
    } else if (outMsg) {
      from = myAddr;
      to = formatAddress(outMsg.destination);
      amount = outMsg.value || '0';
      comment = outMsg.message || '';
    }

    return {
      hash: tx.transaction_id?.hash || '',
      time: tx.utime,
      from,
      to,
      amount: fromNano(amount),
      amountNano: amount,
      comment,
      isIncoming: isIncoming && !!inMsg?.source,
      lt: tx.transaction_id?.lt || '',
    };
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const is429 = e instanceof Error && e.message.includes('429');
      if (!is429 || i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error('Retry limit exceeded');
}

export function buildTransferBody(comment?: string) {
  if (!comment?.trim()) return undefined;
  return beginCell()
    .storeUint(0, 32)
    .storeStringTail(comment)
    .endCell();
}

export interface FeeEstimate {
  total: string;
}

export interface FwdPrices {
  lumpPrice: bigint;
  bitPrice: bigint;
  cellPrice: bigint;
  firstFrac: bigint;
}

let cachedFwdPrices: FwdPrices | null = null;

async function getFwdPrices(): Promise<FwdPrices> {
  if (cachedFwdPrices) return cachedFwdPrices;

  const res = await fetch(apiUrl('getConfigParam', { config_id: '25' }));
  const data = await res.json();
  if (!data.ok) throw new Error('getConfigParam failed');

  const cell = Cell.fromBoc(Buffer.from(data.result.config.bytes, 'base64'))[0];
  const slice = cell.beginParse();
  slice.loadUint(8); // tag
  const lumpPrice = slice.loadUintBig(64);
  const bitPrice = slice.loadUintBig(64);
  const cellPrice = slice.loadUintBig(64);
  slice.loadUint(32); // ihr_price_factor
  const firstFrac = BigInt(slice.loadUint(16));

  cachedFwdPrices = { lumpPrice, bitPrice, cellPrice, firstFrac };
  return cachedFwdPrices;
}

export function countCellStats(cell: Cell): { bits: number; cells: number } {
  let cells = 1;
  let bits = cell.bits.length;
  for (const ref of cell.refs) {
    const sub = countCellStats(ref);
    cells += sub.cells;
    bits += sub.bits;
  }
  return { cells, bits };
}

// Compute forwarding fee based on body cell only (bits + cells).
// TON deducts this full amount from the message value upon delivery.
export function computeBodyFwdFee(prices: FwdPrices, body?: Cell): bigint {
  let bodyBits = 0;
  let bodyCells = 0;
  if (body) {
    const stats = countCellStats(body);
    bodyBits = stats.bits;
    bodyCells = stats.cells;
  }
  return prices.lumpPrice +
    ((prices.bitPrice * BigInt(bodyBits) + prices.cellPrice * BigInt(bodyCells) + 65535n) >> 16n);
}

export async function estimateFee(
  comment?: string
): Promise<FeeEstimate> {
  try {
    const prices = await getFwdPrices();
    const body = buildTransferBody(comment);
    const fwdFee = computeBodyFwdFee(prices, body);

    const ESTIMATED_GAS_NANO = 3000000n;
    const totalNano = ESTIMATED_GAS_NANO + fwdFee;

    return { total: fromNano(totalNano) };
  } catch {
    return { total: '0.004' };
  }
}

export async function sendTon(
  mnemonic: string[],
  toAddress: string,
  amountTon: string,
  comment?: string
): Promise<void> {
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: keyPair.publicKey,
    workchain: 0,
  });

  const contract = client.open(wallet);
  const seqno = await withRetry(() => contract.getSeqno());
  const body = buildTransferBody(comment);

  await withRetry(() => contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: Address.parse(toAddress),
        value: toNano(amountTon),
        body,
        bounce: false,
      }),
    ],
  }));
}

export function isValidAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}

export function formatAddress(address: string): string {
  try {
    return Address.parse(address).toString({ testOnly: true, bounceable: false });
  } catch {
    return address;
  }
}
