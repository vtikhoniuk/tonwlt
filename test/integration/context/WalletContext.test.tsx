import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider, useWallet } from '../../../src/context/WalletContext';
import * as storage from '../../../src/services/storage';
import * as cryptoService from '../../../src/services/crypto';
import * as ton from '../../../src/services/ton';
import { TEST_ADDRESS, TEST_MNEMONIC } from '../../helpers/mocks';

vi.mock('../../../src/services/ton', async () => {
  const actual = await vi.importActual('../../../src/services/ton');
  return {
    ...actual,
    createWallet: vi.fn(),
    importWallet: vi.fn(),
    getBalance: vi.fn(),
    getTransactions: vi.fn(),
    sendTon: vi.fn(),
  };
});

vi.mock('../../../src/services/crypto', async () => {
  const actual = await vi.importActual('../../../src/services/crypto');
  return {
    ...actual,
    encryptMnemonic: vi.fn(),
    decryptMnemonic: vi.fn(),
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <WalletProvider>{children}</WalletProvider>
    </MemoryRouter>
  );
}

const MOCK_ENCRYPTED: storage.EncryptedWallet = {
  encrypted: 'dGVzdA==',
  salt: 'c2FsdA==',
  iv: 'aXZpdg==',
  address: TEST_ADDRESS,
};

describe('WalletContext', () => {
  beforeEach(() => {
    vi.mocked(ton.getBalance).mockResolvedValue('0');
    vi.mocked(ton.getTransactions).mockResolvedValue([]);
    vi.mocked(cryptoService.encryptMnemonic).mockResolvedValue({
      encrypted: 'dGVzdA==',
      salt: 'c2FsdA==',
      iv: 'aXZpdg==',
    });
    vi.mocked(cryptoService.decryptMnemonic).mockResolvedValue(TEST_MNEMONIC);
  });

  it('starts with loading=true then sets to false', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('detects encrypted wallet and sets locked=true', async () => {
    storage.saveEncryptedWallet(MOCK_ENCRYPTED);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.locked).toBe(true);
    });
    expect(result.current.lockedAddress).toBe(TEST_ADDRESS);
    expect(result.current.wallet).toBeNull();
  });

  it('returns null wallet and locked=false when nothing in storage', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.wallet).toBeNull();
    expect(result.current.locked).toBe(false);
  });

  it('unlock() decrypts and sets wallet', async () => {
    storage.saveEncryptedWallet(MOCK_ENCRYPTED);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.locked).toBe(true));

    await act(async () => {
      await result.current.unlock('testpassword');
    });

    await waitFor(() => {
      expect(result.current.wallet).toEqual({ mnemonic: TEST_MNEMONIC, address: TEST_ADDRESS });
      expect(result.current.locked).toBe(false);
    });
  });

  it('activateWallet() encrypts, persists, and sets wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.activateWallet(TEST_MNEMONIC, TEST_ADDRESS, 'testpass');
    });

    await waitFor(() => {
      expect(result.current.wallet).toEqual({ mnemonic: TEST_MNEMONIC, address: TEST_ADDRESS });
    });
    expect(storage.loadEncryptedWallet()).not.toBeNull();
  });

  it('lock() clears wallet from memory but keeps storage', async () => {
    storage.saveEncryptedWallet(MOCK_ENCRYPTED);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.locked).toBe(true));

    await act(async () => {
      await result.current.unlock('testpassword');
    });
    await waitFor(() => expect(result.current.wallet).not.toBeNull());

    act(() => {
      result.current.lock();
    });

    await waitFor(() => {
      expect(result.current.wallet).toBeNull();
      expect(result.current.locked).toBe(true);
    });
    expect(storage.loadEncryptedWallet()).not.toBeNull();
  });

  it('logout() clears everything', async () => {
    storage.saveEncryptedWallet(MOCK_ENCRYPTED);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.locked).toBe(true));

    act(() => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.wallet).toBeNull();
      expect(result.current.locked).toBe(false);
      expect(result.current.balance).toBe('0');
    });
    expect(storage.loadEncryptedWallet()).toBeNull();
  });

  it('refresh() fetches balance and transactions', async () => {
    storage.saveEncryptedWallet(MOCK_ENCRYPTED);
    vi.mocked(ton.getBalance).mockResolvedValue('5.5');

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => {
      expect(result.current.balance).toBe('5.5');
    });
  });

  it('useWallet outside provider throws', () => {
    // Suppress expected React error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useWallet());
    }).toThrow('useWallet must be used within WalletProvider');
    spy.mockRestore();
  });
});
