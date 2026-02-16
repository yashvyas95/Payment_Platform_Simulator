import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import Payments from '../pages/Payments';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../config/api', () => {
  const client = { get: mockGet, post: mockPost, interceptors: { response: { use: vi.fn() } } };
  return {
    api: client,
    apiClient: client,
    API_BASE_URL: 'http://localhost:3000',
    API_KEY: 'test-key',
  };
});

describe('Payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the payment form with required fields', () => {
    renderWithProviders(<Payments />, { route: '/payments' });

    expect(screen.getByRole('heading', { name: /create payment/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
  });

  it('renders test card presets', () => {
    renderWithProviders(<Payments />, { route: '/payments' });

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.getByText('Insufficient Funds')).toBeInTheDocument();
    expect(screen.getByText('Expired Card')).toBeInTheDocument();
    expect(screen.getByText('Invalid CVC')).toBeInTheDocument();
    expect(screen.getByText('Processing Error')).toBeInTheDocument();
  });

  it('populates card number when clicking a test card', () => {
    renderWithProviders(<Payments />, { route: '/payments' });

    const declinedCard = screen.getByText('Declined');
    fireEvent.click(declinedCard);

    const cardInput = screen.getByLabelText(/card number/i) as HTMLInputElement;
    expect(cardInput.value).toBe('4000000000000002');
  });

  it('shows submit button', () => {
    renderWithProviders(<Payments />, { route: '/payments' });

    const submitButton = screen.getByRole('button', { name: /create payment/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('displays success result after successful payment', async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 'pay_123', status: 'captured', amount: 1000, currency: 'usd' } },
    });

    renderWithProviders(<Payments />, { route: '/payments' });

    const submitButton = screen.getByRole('button', { name: /create payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/payments',
        expect.objectContaining({
          amount: 1000,
          currency: 'usd',
          capture: true,
        })
      );
    });
  });

  it('displays error result after failed payment', async () => {
    mockPost.mockRejectedValue({
      response: { data: { message: 'Card declined' } },
    });

    renderWithProviders(<Payments />, { route: '/payments' });

    const submitButton = screen.getByRole('button', { name: /create payment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/card declined|failed/i)).toBeInTheDocument();
    });
  });

  it('has default form values pre-filled', () => {
    renderWithProviders(<Payments />, { route: '/payments' });

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe('10.00');

    const cardInput = screen.getByLabelText(/card number/i) as HTMLInputElement;
    expect(cardInput.value).toBe('4242424242424242');
  });
});
