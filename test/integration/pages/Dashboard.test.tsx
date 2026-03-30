import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../../src/pages/Dashboard';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import { createMockWallet, createMockTransaction, TEST_ADDRESS, TEST_ADDRESS_2 } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

const mockRefresh = vi.fn();
const mockLogout = vi.fn();

function setupMock(overrides: Record<string, any> = {}) {
  vi.mocked(WalletContext.useWallet).mockReturnValue({
    wallet: createMockWallet(),
    balance: '10.5',
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
    logout: mockLogout,
    refresh: mockRefresh,
    ...overrides,
  });
}

describe('Dashboard', () => {
  beforeEach(() => setupMock());

  it('displays formatted balance', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText(/10\.50 TON/)).toBeInTheDocument();
  });

  it('displays shortened wallet address', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText(/0QBcAtw-/)).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByRole('button', { name: /Получить/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Отправить/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Обновить/ })).toBeInTheDocument();
  });

  it('calls refresh when clicking Обновить', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);
    await user.click(screen.getByRole('button', { name: /Обновить/ }));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows TESTNET badge', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('TESTNET')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('Транзакций пока нет')).toBeInTheDocument();
  });

  it('renders transactions', () => {
    setupMock({
      transactions: [
        createMockTransaction({ amount: '2.5', isIncoming: true, from: TEST_ADDRESS_2 }),
        createMockTransaction({ amount: '1.0', isIncoming: false, to: TEST_ADDRESS_2, hash: 'xyz', lt: '99' }),
      ],
    });
    renderWithRouter(<Dashboard />);
    expect(screen.getByText(/← Входящая/)).toBeInTheDocument();
    expect(screen.getByText(/→ Исходящая/)).toBeInTheDocument();
  });

  it('shows dust warning for micro-transactions', () => {
    setupMock({
      transactions: [
        createMockTransaction({ amount: '0.0001', isIncoming: true, amountNano: '100000' }),
      ],
    });
    renderWithRouter(<Dashboard />);
    expect(screen.getByText(/Микротранзакция/)).toBeInTheDocument();
  });

  it('filters transactions by search', async () => {
    const user = userEvent.setup();
    setupMock({
      transactions: [
        createMockTransaction({ comment: 'test payment', hash: 'a1', lt: '1' }),
        createMockTransaction({ comment: 'other', hash: 'a2', lt: '2' }),
      ],
    });
    renderWithRouter(<Dashboard />);

    await user.type(screen.getByPlaceholderText(/Поиск/), 'test payment');
    expect(screen.getByText('test payment')).toBeInTheDocument();
    expect(screen.queryByText('other')).not.toBeInTheDocument();
  });

  it('shows "Ничего не найдено" when search has no results', async () => {
    const user = userEvent.setup();
    setupMock({
      transactions: [createMockTransaction({ comment: 'hello' })],
    });
    renderWithRouter(<Dashboard />);
    await user.type(screen.getByPlaceholderText(/Поиск/), 'nonexistent');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('displays error message', () => {
    setupMock({ error: 'Ошибка сети' });
    renderWithRouter(<Dashboard />);
    expect(screen.getByText('Ошибка сети')).toBeInTheDocument();
  });

  it('logout flow works', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /⚙/ }));
    await user.click(screen.getByRole('button', { name: /Выйти из кошелька/ }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
