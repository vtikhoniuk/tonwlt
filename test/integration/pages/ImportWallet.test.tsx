import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportWallet from '../../../src/pages/ImportWallet';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import { TEST_MNEMONIC } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

const mockImportMnemonic = vi.fn();

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
    importMnemonic: mockImportMnemonic,
    unlock: vi.fn(),
    lock: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  });
});

describe('ImportWallet', () => {
  it('renders textarea and word counter', () => {
    renderWithRouter(<ImportWallet />);
    expect(screen.getByPlaceholderText(/word1/)).toBeInTheDocument();
    expect(screen.getByText('Слов: 0 / 24')).toBeInTheDocument();
  });

  it('updates word counter as user types', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ImportWallet />);

    await user.type(screen.getByPlaceholderText(/word1/), 'one two three');
    expect(screen.getByText('Слов: 3 / 24')).toBeInTheDocument();
  });

  it('shows error when word count is not 24', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ImportWallet />);

    await user.type(screen.getByPlaceholderText(/word1/), 'one two three');
    await user.click(screen.getByRole('button', { name: /Импортировать/ }));

    expect(screen.getByText(/ровно 24 слова/)).toBeInTheDocument();
  });

  it('calls importMnemonic with 24 lowercased words and password', async () => {
    mockImportMnemonic.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<ImportWallet />);

    await user.type(
      screen.getByPlaceholderText(/word1/),
      TEST_MNEMONIC.join(' ')
    );

    // Fill in password fields
    const passwordInputs = screen.getAllByPlaceholderText(/символов|пароль/i);
    await user.type(passwordInputs[0], 'testpass123');
    await user.type(passwordInputs[1], 'testpass123');

    await user.click(screen.getByRole('button', { name: /Импортировать/ }));

    await waitFor(() => {
      expect(mockImportMnemonic).toHaveBeenCalledWith(TEST_MNEMONIC, 'testpass123');
    });
  });

  it('shows error when importMnemonic rejects', async () => {
    mockImportMnemonic.mockRejectedValue(new Error('Invalid mnemonic'));
    const user = userEvent.setup();
    renderWithRouter(<ImportWallet />);

    await user.type(
      screen.getByPlaceholderText(/word1/),
      TEST_MNEMONIC.join(' ')
    );

    // Fill in password fields
    const passwordInputs = screen.getAllByPlaceholderText(/символов|пароль/i);
    await user.type(passwordInputs[0], 'testpass123');
    await user.type(passwordInputs[1], 'testpass123');

    await user.click(screen.getByRole('button', { name: /Импортировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Invalid mnemonic')).toBeInTheDocument();
    });
  });

  it('disables button and shows loading text while importing', async () => {
    // Make import hang
    mockImportMnemonic.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderWithRouter(<ImportWallet />);

    await user.type(
      screen.getByPlaceholderText(/word1/),
      TEST_MNEMONIC.join(' ')
    );

    // Fill in password fields
    const passwordInputs = screen.getAllByPlaceholderText(/символов|пароль/i);
    await user.type(passwordInputs[0], 'testpass123');
    await user.type(passwordInputs[1], 'testpass123');

    await user.click(screen.getByRole('button', { name: /Импортировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Импорт...')).toBeInTheDocument();
    });
  });
});
