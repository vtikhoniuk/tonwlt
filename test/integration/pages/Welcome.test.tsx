import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Welcome from '../../../src/pages/Welcome';
import { renderWithRouter } from '../../helpers/render';

describe('Welcome', () => {
  it('renders heading and subtitle', () => {
    renderWithRouter(<Welcome />);
    expect(screen.getByText('TON Wallet')).toBeInTheDocument();
    expect(screen.getByText(/Self-custodial кошелёк/)).toBeInTheDocument();
  });

  it('renders both action buttons', () => {
    renderWithRouter(<Welcome />);
    expect(screen.getByRole('button', { name: /Создать кошелёк/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Импортировать кошелёк/ })).toBeInTheDocument();
  });

  it('displays TESTNET badge', () => {
    renderWithRouter(<Welcome />);
    expect(screen.getByText('TESTNET')).toBeInTheDocument();
  });
});
