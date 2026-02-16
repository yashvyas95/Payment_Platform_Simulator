import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../config/api';

interface PaymentMethod {
  card: {
    number: string;
    cvv: string;
    exp_month: string;
    exp_year: string;
    name: string;
  };
}

interface CreatePaymentData {
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  description?: string;
  gateway?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  next_action?: {
    type: string;
    challenge_url: string;
    challenge_id: string;
  };
}

interface PaymentState {
  currentPayment: Payment | null;
  processing: boolean;
  error: string | null;
  requires3DS: boolean;
  challengeUrl?: string;
  challengeId?: string;
}

const initialState: PaymentState = {
  currentPayment: null,
  processing: false,
  error: null,
  requires3DS: false,
};

// Async thunks
export const createPayment = createAsyncThunk(
  'payments/create',
  async (data: CreatePaymentData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/payments', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Payment failed');
    }
  }
);

export const complete3DSAuth = createAsyncThunk(
  'payments/complete3DS',
  async (
    { paymentId, challengeId, paRes }: { paymentId: string; challengeId: string; paRes: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/3ds/complete`, {
        challengeId,
        paRes,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '3DS authentication failed');
    }
  }
);

export const capturePayment = createAsyncThunk(
  'payments/capture',
  async ({ paymentId, amount }: { paymentId: string; amount?: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/capture`, { amount });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Payment capture failed');
    }
  }
);

export const refundPayment = createAsyncThunk(
  'payments/refund',
  async (
    { paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, { amount, reason });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Refund failed');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    resetPaymentState: (state) => {
      state.currentPayment = null;
      state.processing = false;
      state.error = null;
      state.requires3DS = false;
      state.challengeUrl = undefined;
      state.challengeId = undefined;
    },
    updatePaymentStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      if (state.currentPayment?.id === action.payload.id) {
        state.currentPayment.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    // Create payment
    builder.addCase(createPayment.pending, (state) => {
      state.processing = true;
      state.error = null;
      state.requires3DS = false;
    });
    builder.addCase(createPayment.fulfilled, (state, action) => {
      state.processing = false;
      state.currentPayment = action.payload;

      if (action.payload.next_action?.type === '3ds_authentication') {
        state.requires3DS = true;
        state.challengeUrl = action.payload.next_action.challenge_url;
        state.challengeId = action.payload.next_action.challenge_id;
      }
    });
    builder.addCase(createPayment.rejected, (state, action) => {
      state.processing = false;
      state.error = action.payload as string;
    });

    // Complete 3DS
    builder.addCase(complete3DSAuth.pending, (state) => {
      state.processing = true;
      state.error = null;
    });
    builder.addCase(complete3DSAuth.fulfilled, (state, action) => {
      state.processing = false;
      state.currentPayment = action.payload;
      state.requires3DS = false;
      state.challengeUrl = undefined;
      state.challengeId = undefined;
    });
    builder.addCase(complete3DSAuth.rejected, (state, action) => {
      state.processing = false;
      state.error = action.payload as string;
    });

    // Capture payment
    builder.addCase(capturePayment.pending, (state) => {
      state.processing = true;
      state.error = null;
    });
    builder.addCase(capturePayment.fulfilled, (state, action) => {
      state.processing = false;
      state.currentPayment = action.payload;
    });
    builder.addCase(capturePayment.rejected, (state, action) => {
      state.processing = false;
      state.error = action.payload as string;
    });

    // Refund payment
    builder.addCase(refundPayment.pending, (state) => {
      state.processing = true;
      state.error = null;
    });
    builder.addCase(refundPayment.fulfilled, (state, action) => {
      state.processing = false;
    });
    builder.addCase(refundPayment.rejected, (state, action) => {
      state.processing = false;
      state.error = action.payload as string;
    });
  },
});

export const { resetPaymentState, updatePaymentStatus } = paymentSlice.actions;
export default paymentSlice.reducer;
