import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../config/api';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description?: string;
  created: number;
  updated: number;
}

interface TransactionState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: TransactionState = {
  transactions: [],
  currentTransaction: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/transactions?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchTransactionById = createAsyncThunk(
  'transactions/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/transactions/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction');
    }
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    updateTransactionStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const transaction = state.transactions.find((t) => t.id === action.payload.id);
      if (transaction) {
        transaction.status = action.payload.status;
      }
      if (state.currentTransaction?.id === action.payload.id) {
        state.currentTransaction.status = action.payload.status;
      }
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
      state.pagination.total += 1;
    },
    clearTransactions: (state) => {
      state.transactions = [];
      state.currentTransaction = null;
      state.pagination = { page: 1, limit: 20, total: 0 };
    },
  },
  extraReducers: (builder) => {
    // Fetch all transactions
    builder.addCase(fetchTransactions.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTransactions.fulfilled, (state, action) => {
      state.loading = false;
      state.transactions = action.payload.transactions;
      state.pagination = {
        page: action.payload.page,
        limit: action.payload.limit,
        total: action.payload.total,
      };
    });
    builder.addCase(fetchTransactions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch single transaction
    builder.addCase(fetchTransactionById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTransactionById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentTransaction = action.payload;
    });
    builder.addCase(fetchTransactionById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { updateTransactionStatus, addTransaction, clearTransactions } =
  transactionSlice.actions;
export default transactionSlice.reducer;
