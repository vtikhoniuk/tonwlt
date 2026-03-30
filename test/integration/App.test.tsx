import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import * as WalletContext from '../../src/context/WalletContext';
import { createMockWallet } from '../helpers/mocks';

vi.mock('../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('shows loading spinner when loading', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      wallet: null,
      balance: '0',
      transactions: [],
      loading: true,
      error: null,
      locked: false,
      lockedAddress: null,
      create: vi.fn(),
      activateWallet: vi.fn(),
      importMnemonic: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    renderApp();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('shows unlock screen when locked', () => {
    vi.mocked(WalletContext.useWallet).mockReturnValue({
      wallet: null,
      balance: '0',
      transactions: [],
      loading: false,
      error: null,
      locked: true,
      lockedAddress: 'EQTest123',
      create: vi.fn(),
      activateWallet: vi.fn(),
      importMnemonic: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    renderApp();
    expect(screen.getByText('Разблокировка')).toBeInTheDocument();
  });

  describe('without wallet', () => {
    beforeEach(() => {
      vi.mocked(WalletContext.useWallet).mockReturnValue({
        wallet: null,
        balance: '0',
        transactions: [],
        loading: false,
        error: null,
        locked: false,
        lockedAddress: null,
        create: vi.fn(),
        activateWallet: vi.fn(),
        importMnemonic: vi.fn(),
        unlock: vi.fn(),
        lock: vi.fn(),
        logout: vi.fn(),
        refresh: vi.fn(),
      });
    });

    it('renders Welcome at /', () => {
      renderApp('/');
      expect(screen.getByText('TON Wallet')).toBeInTheDocument();
    });

    it('renders CreateWallet at /create', () => {
      renderApp('/create');
      expect(screen.getByText('Создание кошелька')).toBeInTheDocument();
    });

    it('renders ImportWallet at /import', () => {
      renderApp('/import');
      expect(screen.getByText('Импорт кошелька')).toBeInTheDocument();
    });

    it('redirects unknown routes to /', () => {
      renderApp('/send');
      expect(screen.getByText('TON Wallet')).toBeInTheDocument();
    });
  });

  describe('with wallet', () => {
    beforeEach(() => {
      vi.mocked(WalletContext.useWallet).mockReturnValue({
        wallet: createMockWallet(),
        balance: '5.0',
        transactions: [],
        loading: false,
        error: null,
        locked: false,
        lockedAddress: null,
        create: vi.fn(),
        activateWallet: vi.fn(),
        importMnemonic: vi.fn(),
        unlock: vi.fn(),
        lock: vi.fn(),
        logout: vi.fn(),
        refresh: vi.fn(),
      });
    });

    it('renders Dashboard at /', () => {
      renderApp('/');
      expect(screen.getByText(/5\.00 TON/)).toBeInTheDocument();
    });

    it('renders Send at /send', () => {
      renderApp('/send');
      expect(screen.getByText('Отправить TON')).toBeInTheDocument();
    });

    it('renders Receive at /receive', () => {
      renderApp('/receive');
      expect(screen.getByText('Получить TON')).toBeInTheDocument();
    });

    it('redirects unknown routes to / (Dashboard)', () => {
      renderApp('/create');
      expect(screen.getByText(/5\.00 TON/)).toBeInTheDocument();
    });
  });
});
