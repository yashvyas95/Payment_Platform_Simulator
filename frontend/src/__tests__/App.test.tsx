import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import Layout from '../components/Layout/Layout';

// Mock the api module used by pages
vi.mock('../config/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { data: [] } } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: { data: [] } } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
  API_BASE_URL: 'http://localhost:3000',
  API_KEY: 'test-key',
}));

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

describe('App Layout', () => {
  it('renders navigation sidebar with all menu items', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>,
      { route: '/dashboard' }
    );

    // Layout renders both mobile and desktop drawers, so items appear twice
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Payments').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transactions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Simulator').length).toBeGreaterThanOrEqual(1);
  });

  it('renders children content inside layout', () => {
    renderWithProviders(
      <Layout>
        <div>My Page Content</div>
      </Layout>,
      { route: '/dashboard' }
    );

    expect(screen.getByText('My Page Content')).toBeInTheDocument();
  });

  it('shows the app title in the toolbar', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>,
      { route: '/dashboard' }
    );

    // The Layout has a title/brand in the AppBar
    const appBar = screen.getByRole('banner');
    expect(appBar).toBeInTheDocument();
  });
});
