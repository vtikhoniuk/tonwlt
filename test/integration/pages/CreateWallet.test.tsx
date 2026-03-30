import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateWallet from '../../../src/pages/CreateWallet';
import { renderWithRouter } from '../../helpers/render';
import * as WalletContext from '../../../src/context/WalletContext';
import { TEST_MNEMONIC, TEST_ADDRESS } from '../../helpers/mocks';

vi.mock('../../../src/context/WalletContext', async () => {
  const actual = await vi.importActual('../../../src/context/WalletContext');
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

const mockCreate = vi.fn();
const mockActivateWallet = vi.fn();

beforeEach(() => {
  vi.mocked(WalletContext.useWallet).mockReturnValue({
    wallet: null,
    balance: '0',
    transactions: [],
    loading: false,
    error: null,
    locked: false,
    lockedAddress: null,
    create: mockCreate,
    activateWallet: mockActivateWallet,
    importMnemonic: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  });
});

describe('CreateWallet', () => {
  it('renders generating step initially', () => {
    renderWithRouter(<CreateWallet />);
    expect(screen.getByText(/мнемоническая фраза из 24 слов/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сгенерировать/ })).toBeInTheDocument();
  });

  it('shows mnemonic after clicking generate', async () => {
    mockCreate.mockResolvedValue({ mnemonic: TEST_MNEMONIC, address: TEST_ADDRESS });
    const user = userEvent.setup();

    renderWithRouter(<CreateWallet />);
    await user.click(screen.getByRole('button', { name: /Сгенерировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Сохраните фразу')).toBeInTheDocument();
    });

    // All 24 words should be visible
    for (const word of TEST_MNEMONIC) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }
  });

  it('shows error when create() fails', async () => {
    mockCreate.mockRejectedValue(new Error('Generation failed'));
    const user = userEvent.setup();

    renderWithRouter(<CreateWallet />);
    await user.click(screen.getByRole('button', { name: /Сгенерировать/ }));

    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });
  });

  it('proceeds to confirm step and validates words', async () => {
    mockCreate.mockResolvedValue({ mnemonic: TEST_MNEMONIC, address: TEST_ADDRESS });
    const user = userEvent.setup();

    // Mock Math.random to get deterministic indices [0, 1, 2]
    let callCount = 0;
    const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
      const values = [0.01, 0.05, 0.09]; // will give indices 0, 1, 2
      return values[callCount++ % values.length];
    });

    renderWithRouter(<CreateWallet />);
    mockRandom.mockRestore();

    await user.click(screen.getByRole('button', { name: /Сгенерировать/ }));
    await waitFor(() => screen.getByText('Сохраните фразу'));

    await user.click(screen.getByRole('button', { name: /Я сохранил фразу/ }));
    expect(screen.getByText('Проверка')).toBeInTheDocument();
  });

  it('shows done step and calls activateWallet on confirm', async () => {
    mockCreate.mockResolvedValue({ mnemonic: TEST_MNEMONIC, address: TEST_ADDRESS });
    mockActivateWallet.mockResolvedValue(undefined);
    const user = userEvent.setup();

    // Mock random to produce indices 0, 1, 2
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const values = [0.01, 0.05, 0.09];
      return values[callCount++ % values.length];
    });

    renderWithRouter(<CreateWallet />);

    await user.click(screen.getByRole('button', { name: /Сгенерировать/ }));
    await waitFor(() => screen.getByText('Сохраните фразу'));
    await user.click(screen.getByRole('button', { name: /Я сохранил фразу/ }));

    // Fill in the 3 confirm words (indices 0, 1, 2)
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], TEST_MNEMONIC[0]);
    await user.type(inputs[1], TEST_MNEMONIC[1]);
    await user.type(inputs[2], TEST_MNEMONIC[2]);

    await user.click(screen.getByRole('button', { name: /Подтвердить/ }));

    // After confirming words, the set_password step appears
    await waitFor(() => {
      expect(screen.getByText('Установите пароль')).toBeInTheDocument();
    });

    // Fill in password fields
    const passwordInputs = screen.getAllByPlaceholderText(/символов|пароль/i);
    await user.type(passwordInputs[0], 'testpass123');
    await user.type(passwordInputs[1], 'testpass123');

    await user.click(screen.getByRole('button', { name: /Зашифровать и сохранить/ }));

    await waitFor(() => {
      expect(screen.getByText('Кошелёк создан!')).toBeInTheDocument();
    });

    expect(mockActivateWallet).toHaveBeenCalledWith(TEST_MNEMONIC, TEST_ADDRESS, 'testpass123');
  });
});
