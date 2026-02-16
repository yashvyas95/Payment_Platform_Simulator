import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import Dashboard from '../pages/Dashboard';

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

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    // Never resolve so it stays in loading state
    mockGet.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders stat cards after data loads', async () => {
    const mockTransactions = [
      { id: '1', status: 'captured', amount: 5000, currency: 'usd' },
      { id: '2', status: 'captured', amount: 3000, currency: 'usd' },
      { id: '3', status: 'failed', amount: 1000, currency: 'usd' },
    ];

    mockGet.mockResolvedValue({
      data: { data: { data: mockTransactions } },
    });

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Stat cards should show computed values
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('renders with empty transaction data', async () => {
    mockGet.mockResolvedValue({
      data: { data: { data: [] } },
    });

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
  });

  it('calls the transactions API on mount', async () => {
    mockGet.mockResolvedValue({
      data: { data: { data: [] } },
    });

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/v1/transactions?limit=100');
    });
  });

  it('handles API errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should still render without crashing
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
  });
});
