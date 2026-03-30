import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnlockWallet from '../../../src/pages/UnlockWallet';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import { TEST_ADDRESS } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

const mockUnlock = vi.fn();
const mockLogout = vi.fn();

function setupMock(overrides: Record<string, any> = {}) {
  vi.mocked(WalletContext.useWallet).mockReturnValue({
    wallet: null,
    balance: '0',
    transactions: [],
    loading: false,
    error: null,
    locked: true,
    lockedAddress: TEST_ADDRESS,
    create: vi.fn(),
    activateWallet: vi.fn(),
    importMnemonic: vi.fn(),
    unlock: mockUnlock,
    lock: vi.fn(),
    logout: mockLogout,
    refresh: vi.fn(),
    ...overrides,
  });
}

describe('UnlockWallet', () => {
  beforeEach(() => {
    mockUnlock.mockReset();
    mockLogout.mockReset();
    setupMock();
  });

  it('renders heading "Разблокировка" and shortened address', () => {
    renderWithRouter(<UnlockWallet />);

    expect(screen.getByText('Разблокировка')).toBeInTheDocument();
    // Address should be shortened (first 8 + ... + last 8)
    expect(screen.getByText(/0QBcAtw-/)).toBeInTheDocument();
  });

  it('shows error when submitting empty password', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UnlockWallet />);

    await user.click(screen.getByRole('button', { name: /Разблокировать/ }));

    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
    expect(mockUnlock).not.toHaveBeenCalled();
  });

  it('calls unlock() with entered password', async () => {
    mockUnlock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<UnlockWallet />);

    await user.type(screen.getByPlaceholderText('Введите пароль'), 'myPassword123');
    await user.click(screen.getByRole('button', { name: /Разблокировать/ }));

    expect(mockUnlock).toHaveBeenCalledWith('myPassword123');
  });

  it('shows error message when unlock() rejects', async () => {
    mockUnlock.mockRejectedValue(new Error('Неверный пароль'));
    const user = userEvent.setup();
    renderWithRouter(<UnlockWallet />);

    await user.type(screen.getByPlaceholderText('Введите пароль'), 'wrongPassword');
    await user.click(screen.getByRole('button', { name: /Разблокировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Неверный пароль')).toBeInTheDocument();
    });
  });

  it('shows loading state while unlocking', async () => {
    // unlock never resolves — stays in loading state
    mockUnlock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderWithRouter(<UnlockWallet />);

    await user.type(screen.getByPlaceholderText('Введите пароль'), 'myPassword');
    await user.click(screen.getByRole('button', { name: /Разблокировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Разблокировка...')).toBeInTheDocument();
    });
    // Button and input should be disabled during loading
    expect(screen.getByRole('button', { name: /Разблокировка\.\.\./ })).toBeDisabled();
    expect(screen.getByPlaceholderText('Введите пароль')).toBeDisabled();
  });

  it('"Забыл пароль" button calls logout()', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UnlockWallet />);

    await user.click(screen.getByRole('button', { name: /Забыл пароль/ }));

    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
