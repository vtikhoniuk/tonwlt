import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Receive from '../../../src/pages/Receive';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import { createMockWallet, TEST_ADDRESS } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(WalletContext.useWallet).mockReturnValue({
    wallet: createMockWallet(),
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

describe('Receive', () => {
  it('renders heading', () => {
    renderWithRouter(<Receive />);
    expect(screen.getByText('Получить TON')).toBeInTheDocument();
  });

  it('renders QR code SVG', () => {
    renderWithRouter(<Receive />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays the address with color segments', () => {
    renderWithRouter(<Receive />);
    // The address prefix should be visible
    expect(screen.getByText(TEST_ADDRESS.slice(0, 6))).toBeInTheDocument();
    expect(screen.getByText(TEST_ADDRESS.slice(-6))).toBeInTheDocument();
  });

  it('shows testnet hint', () => {
    renderWithRouter(<Receive />);
    expect(screen.getByText(/TON testnet/)).toBeInTheDocument();
  });

  it('copies address on button click and shows confirmation', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Receive />);

    const btn = screen.getByRole('button', { name: /Копировать адрес/ });
    await user.click(btn);

    // The button text changes to "Скопировано!" after successful copy
    await waitFor(() => {
      expect(screen.getByText('Скопировано!')).toBeInTheDocument();
    });
  });

  it('shows "Скопировано!" after copy', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Receive />);

    await user.click(screen.getByRole('button', { name: /Копировать адрес/ }));
    await waitFor(() => {
      expect(screen.getByText('Скопировано!')).toBeInTheDocument();
    });
  });
});
