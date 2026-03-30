const STORAGE_KEY = 'ton_wallet';
const ADDRESS_BOOK_KEY = 'ton_address_book';

export interface EncryptedWallet {
  encrypted: string;
  salt: string;
  iv: string;
  address: string;
}

export function saveEncryptedWallet(wallet: EncryptedWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function loadEncryptedWallet(): EncryptedWallet | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Detect legacy unencrypted format — treat as no wallet
    if (parsed.mnemonic && !parsed.encrypted) return null;
    if (!parsed.encrypted || !parsed.salt || !parsed.iv || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasWallet(): boolean {
  return loadEncryptedWallet() !== null;
}

export function clearWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ADDRESS_BOOK_KEY);
}

export interface AddressBookEntry {
  address: string;
  label: string;
  addedAt: number;
}

export function getAddressBook(): AddressBookEntry[] {
  const raw = localStorage.getItem(ADDRESS_BOOK_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addToAddressBook(address: string, label: string): void {
  const book = getAddressBook();
  if (book.some((e) => e.address === address)) return;
  book.push({ address, label, addedAt: Date.now() });
  localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(book));
}

export function isKnownAddress(address: string): boolean {
  return getAddressBook().some((e) => e.address === address);
}
