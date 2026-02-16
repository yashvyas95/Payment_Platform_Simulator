import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';

// Query keys
export const queryKeys = {
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transaction', id] as const,
  analytics: ['analytics'] as const,
  customers: ['customers'] as const,
};

// Transactions
export const useTransactions = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: [...queryKeys.transactions, { page, limit }],
    queryFn: async () => {
      const response = await apiClient.get(`/transactions?page=${page}&limit=${limit}`);
      return response.data;
    },
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => {
      const response = await apiClient.get(`/transactions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Payment mutations
export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      currency: string;
      payment_method: any;
      description?: string;
      gateway?: string;
    }) => {
      const response = await apiClient.post('/payments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
};

export const useCapturePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, amount }: { paymentId: string; amount?: number }) => {
      const response = await apiClient.post(`/payments/${paymentId}/capture`, { amount });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(variables.paymentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
};

export const useRefundPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
    }: {
      paymentId: string;
      amount?: number;
      reason?: string;
    }) => {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, { amount, reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(variables.paymentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
};

// Analytics
export const useAnalytics = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: [...queryKeys.analytics, { startDate, endDate }],
    queryFn: async () => {
      const response = await apiClient.get(
        `/analytics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      return response.data;
    },
  });
};

// Customers
export const useCustomers = () => {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => {
      const response = await apiClient.get('/customers');
      return response.data;
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; name: string; metadata?: any }) => {
      const response = await apiClient.post('/customers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
};
