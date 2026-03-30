import { ParsedTransaction } from '../services/ton';

export interface SpoofingWarning {
  type: 'similar_address' | 'clipboard_mismatch';
  message: string;
  details: string;
  similarTo?: string;
}

/**
 * Check if two addresses are "similar" — same first N and last M chars but different overall.
 * This is the main vector for address poisoning attacks.
 */
export function addressesAreSimilar(a: string, b: string): boolean {
  if (a === b) return false;
  if (a.length < 10 || b.length < 10) return false;

  const prefixLen = 6;
  const suffixLen = 6;

  const samePrefix = a.slice(0, prefixLen) === b.slice(0, prefixLen);
  const sameSuffix = a.slice(-suffixLen) === b.slice(-suffixLen);

  return samePrefix && sameSuffix;
}

/**
 * Check entered address against transaction history for potential spoofing.
 * Attacker sends dust from a similar-looking address, hoping user copies it.
 */
export function checkAddressSpoofing(
  targetAddress: string,
  transactions: ParsedTransaction[],
  myAddress: string
): SpoofingWarning[] {
  const warnings: SpoofingWarning[] = [];

  const uniqueAddresses = new Set<string>();
  for (const tx of transactions) {
    if (tx.from && tx.from !== myAddress) uniqueAddresses.add(tx.from);
    if (tx.to && tx.to !== myAddress) uniqueAddresses.add(tx.to);
  }

  for (const knownAddr of uniqueAddresses) {
    if (addressesAreSimilar(targetAddress, knownAddr)) {
      warnings.push({
        type: 'similar_address',
        message: 'Адрес похож на один из адресов в вашей истории!',
        details: `Введённый адрес визуально похож на ${shortenAddress(knownAddr)}, но отличается. Это может быть попыткой подмены адреса (address poisoning). Внимательно проверьте адрес получателя.`,
        similarTo: knownAddr,
      });
    }
  }

  return warnings;
}

/**
 * Detect dust transactions (potential address poisoning preparation).
 * Attacker sends micro-amounts to pollute transaction history.
 */
export function isDustTransaction(tx: ParsedTransaction): boolean {
  if (!tx.isIncoming) return false;
  const amount = parseFloat(tx.amount);
  return amount > 0 && amount < 0.001;
}

export function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export function splitAddressForDisplay(address: string): [string, string, string] {
  if (address.length <= 16) return [address, '', ''];
  return [address.slice(0, 6), address.slice(6, -6), address.slice(-6)];
}

export function findAddressDifferences(a: string, b: string): number[] {
  const diffs: number[] = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs;
}
