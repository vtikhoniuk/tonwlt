import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { Address, toNano, fromNano, beginCell } from '@ton/core';

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

function buildTransferBody(comment?: string) {
  if (!comment) return undefined;
  return beginCell()
    .storeUint(0, 32)
    .storeStringTail(comment)
    .endCell();
}

export interface FeeEstimate {
  total: string;
}

export async function estimateFee(
  mnemonic: string[],
  toAddress: string,
  amountTon: string,
  comment?: string
): Promise<FeeEstimate> {
  try {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
    });

    const contract = client.open(wallet);
    const seqno = await withRetry(() => contract.getSeqno());

    const body = buildTransferBody(comment);

    const transfer = wallet.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: Address.parse(toAddress),
          value: toNano(amountTon),
          body,
          bounce: false,
        }),
      ],
    });

    const boc = transfer.toBoc().toString('base64');
    const senderAddress = wallet.address.toString({ testOnly: true, bounceable: false });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;

    const res = await fetch(`${TONCENTER_TESTNET}/estimateFee`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        address: senderAddress,
        body: boc,
        ignore_chksig: true,
      }),
    });

    if (!res.ok) throw new Error('estimateFee failed');
    const data = await res.json();
    if (!data.ok) throw new Error('estimateFee failed');

    const fees = data.result.source_fees;
    const totalNano =
      Number(fees.in_fwd_fee) +
      Number(fees.storage_fee) +
      Number(fees.gas_fee) +
      Number(fees.fwd_fee);

    return { total: fromNano(totalNano) };
  } catch {
    return { total: '0.01' };
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
