import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import transactionReducer from '../store/slices/transactionSlice';
import paymentReducer from '../store/slices/paymentSlice';

const theme = createTheme();

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      transactions: transactionReducer,
      payments: paymentReducer,
    },
  });
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
  const store = createTestStore();
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store, queryClient };
}
