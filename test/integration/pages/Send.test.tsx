import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Send from '../../../src/pages/Send';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import * as tonService from '../../../src/services/ton';
import { createMockWallet, createMockTransaction, TEST_ADDRESS, TEST_ADDRESS_2 } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

vi.mock('../../../src/services/ton', async () => {
  const actual = await vi.importActual('../../../src/services/ton');
  return {
    ...actual,
    sendTon: vi.fn(),
    estimateFee: vi.fn().mockResolvedValue({ total: '0.005', fwdFee: '0.002' }),
  };
});

const mockRefresh = vi.fn();

function setupMock(overrides: Record<string, any> = {}) {
  vi.mocked(WalletContext.useWallet).mockReturnValue({
    wallet: createMockWallet(),
    balance: '10.0',
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
    refresh: mockRefresh,
    ...overrides,
  });
}

describe('Send - Form step', () => {
  beforeEach(() => setupMock());

  it('renders form fields and button', () => {
    renderWithRouter(<Send />);
    expect(screen.getByText('Отправить TON')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/UQ\.\.\./)).toBeInTheDocument();
    expect(screen.getByText(/Баланс:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Далее/ })).toBeInTheDocument();
  });

  it('shows error when address is empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Введите адрес получателя')).toBeInTheDocument();
  });

  it('shows error for invalid address', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), 'invalid-addr');
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Некорректный адрес TON')).toBeInTheDocument();
  });

  it('shows error when amount exceeds balance', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS_2);
    await user.type(screen.getByRole('spinbutton'), '999');
    await user.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText(/Недостаточно средств/)).toBeInTheDocument();
  });

  it('shows error when sending to self', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS);
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Нельзя отправить самому себе')).toBeInTheDocument();
  });

  it('"Макс" button sets amount to balance minus fee reserve', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.click(screen.getByRole('button', { name: /Макс/ }));
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(parseFloat(input.value)).toBeCloseTo(9.99, 2);
  });

  it('fee info block appears when amount is entered', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);

    // Fee info should not be shown before entering amount
    expect(screen.queryByText(/Комиссия сети/)).not.toBeInTheDocument();

    await user.type(screen.getByRole('spinbutton'), '1');

    expect(screen.getByText(/Комиссия сети/)).toBeInTheDocument();
  });

  it('fee info shows estimated fee and total', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);

    await user.type(screen.getByRole('spinbutton'), '2');

    // Default fee is ESTIMATED_FEE = 0.01
    expect(screen.getByText(/Комиссия сети/)).toBeInTheDocument();
    expect(screen.getByText(/Итого с баланса/)).toBeInTheDocument();
  });

  it('"Макс" button accounts for fee reserve (ESTIMATED_FEE)', async () => {
    setupMock({ balance: '5.0' });
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.click(screen.getByRole('button', { name: /Макс/ }));
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    // 5.0 - 0.01 (ESTIMATED_FEE) = 4.99
    expect(parseFloat(input.value)).toBeCloseTo(4.99, 2);
  });
});

describe('Send - Confirm step', () => {
  beforeEach(() => setupMock());

  it('shows confirm page with address and amount', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS_2);
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));

    await waitFor(() => {
      expect(screen.getByText('Подтверждение')).toBeInTheDocument();
    });
    expect(screen.getByText(/1\.00 TON/)).toBeInTheDocument();
  });

  it('confirm step shows fee row', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Send />);
    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS_2);
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));

    await waitFor(() => {
      expect(screen.getByText('Подтверждение')).toBeInTheDocument();
    });

    // Confirm step should show commission and total rows
    expect(screen.getByText(/Комиссия \(прим\.\)/)).toBeInTheDocument();
    expect(screen.getByText(/Итого с баланса/)).toBeInTheDocument();
  });
});

describe('Send - Success/Error', () => {
  beforeEach(() => setupMock());

  it('shows success after sending', async () => {
    vi.mocked(tonService.sendTon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<Send />);

    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS_2);
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));

    await waitFor(() => screen.getByText('Подтверждение'));

    // If there are warnings with checkbox, check it
    const checkbox = screen.queryByRole('checkbox');
    if (checkbox) await user.click(checkbox);

    await user.click(screen.getByRole('button', { name: /Подтвердить отправку|Отправить несмотря/ }));

    await waitFor(() => {
      expect(screen.getByText('Отправлено!')).toBeInTheDocument();
    });
  });

  it('shows error state on send failure', async () => {
    vi.mocked(tonService.sendTon).mockRejectedValue(new Error('Send failed'));
    const user = userEvent.setup();
    renderWithRouter(<Send />);

    await user.type(screen.getByPlaceholderText(/UQ\.\.\./), TEST_ADDRESS_2);
    await user.type(screen.getByRole('spinbutton'), '1');
    await user.click(screen.getByRole('button', { name: /Далее/ }));

    await waitFor(() => screen.getByText('Подтверждение'));
    const checkbox = screen.queryByRole('checkbox');
    if (checkbox) await user.click(checkbox);
    await user.click(screen.getByRole('button', { name: /Подтвердить отправку|Отправить несмотря/ }));

    await waitFor(() => {
      expect(screen.getByText('Ошибка')).toBeInTheDocument();
      expect(screen.getByText('Send failed')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Попробовать снова/ })).toBeInTheDocument();
  });
});
