import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadEncryptedWallet, saveEncryptedWallet, clearWallet } from '../services/storage';
import { encryptMnemonic, decryptMnemonic } from '../services/crypto';
import {
  getBalance,
  getTransactions,
  ParsedTransaction,
  createWallet as createTonWallet,
  importWallet as importTonWallet,
} from '../services/ton';

export interface Wallet {
  mnemonic: string[];
  address: string;
}

interface WalletContextType {
  wallet: Wallet | null;
  locked: boolean;
  lockedAddress: string | null;
  balance: string;
  transactions: ParsedTransaction[];
  loading: boolean;
  error: string | null;
  create: () => Promise<{ mnemonic: string[]; address: string }>;
  activateWallet: (mnemonic: string[], address: string, password: string) => Promise<void>;
  importMnemonic: (mnemonic: string[], password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedAddress, setLockedAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadEncryptedWallet();
    if (stored) {
      setLocked(true);
      setLockedAddress(stored.address);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const addr = wallet?.address || lockedAddress;
    if (!addr) return;
    try {
      const [bal, txs] = await Promise.allSettled([
        getBalance(addr),
        getTransactions(addr),
      ]);
      if (bal.status === 'fulfilled') {
        setBalance(prev => prev === bal.value ? prev : bal.value);
      }
      if (txs.status === 'fulfilled') {
        setTransactions(prev => {
          if (prev.length !== txs.value.length) return txs.value;
          if (prev.length > 0 && prev[0].lt === txs.value[0]?.lt) return prev;
          return txs.value;
        });
      }
      if (bal.status === 'rejected' && txs.status === 'rejected') {
        setError('Ошибка загрузки данных');
      } else {
        setError(null);
      }
    } catch {
      // Silently ignore — next poll will retry
    }
  }, [wallet, lockedAddress]);

  useEffect(() => {
    const addr = wallet?.address || lockedAddress;
    if (addr) {
      refresh();
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }
  }, [wallet, lockedAddress, refresh]);

  const create = createTonWallet;

  const activateWallet = async (mnemonic: string[], address: string, password: string) => {
    const encrypted = await encryptMnemonic(mnemonic, password);
    saveEncryptedWallet({ ...encrypted, address });
    setWallet({ mnemonic, address });
    setLocked(false);
    setLockedAddress(null);
  };

  const importMnemonic = async (mnemonic: string[], password: string) => {
    const info = await importTonWallet(mnemonic);
    await activateWallet(info.mnemonic, info.address, password);
  };

  const unlock = async (password: string) => {
    const stored = loadEncryptedWallet();
    if (!stored) throw new Error('Кошелёк не найден');
    const mnemonic = await decryptMnemonic(stored, password);
    setWallet({ mnemonic, address: stored.address });
    setLocked(false);
    setLockedAddress(null);
  };

  const lock = () => {
    setWallet(null);
    setLocked(true);
    setLockedAddress(wallet?.address || lockedAddress);
  };

  const logout = () => {
    clearWallet();
    setWallet(null);
    setLocked(false);
    setLockedAddress(null);
    setBalance('0');
    setTransactions([]);
  };

  return (
    <WalletContext.Provider
      value={{
        wallet, locked, lockedAddress, balance, transactions, loading, error,
        create, activateWallet, importMnemonic, unlock, lock, logout, refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
