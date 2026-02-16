import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Refresh, Undo } from '@mui/icons-material';
import { api } from '../config/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
  });
  const [refundDialog, setRefundDialog] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/v1/transactions?limit=50');
      setTransactions(response.data.data.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundClick = (transaction: any) => {
    setRefundDialog(transaction);
    setRefundAmount((transaction.amount / 100).toString());
    setRefundResult(null);
  };

  const handleRefund = async () => {
    if (!refundDialog) return;

    try {
      setRefundLoading(true);
      const response = await api.post(`/v1/payments/${refundDialog.id}/refund`, {
        amount: Math.round(parseFloat(refundAmount) * 100),
        reason: 'requested_by_customer',
      });

      setRefundResult({ success: true, data: response.data });
      fetchTransactions();
    } catch (error: any) {
      setRefundResult({
        success: false,
        error: error.response?.data || { message: 'Refund failed' },
      });
    } finally {
      setRefundLoading(false);
    }
  };

  // Auto-close dialog after successful refund
  useEffect(() => {
    if (refundResult?.success) {
      const timer = setTimeout(() => {
        setRefundDialog(null);
        setRefundResult(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [refundResult]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳';
      case 'refund':
        return '↩️';
      case 'void':
        return '❌';
      default:
        return '📄';
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filters.status !== 'all' && tx.status !== filters.status) return false;
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return tx.id.toLowerCase().includes(search) || tx.description?.toLowerCase().includes(search);
    }
    return true;
  });

  return (
    <Box>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 0.5 }}>
            Transactions
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            View and manage all payment transactions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchTransactions}
          disabled={loading}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid #e0e0e0',
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Transaction ID or description"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="captured">Captured</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="refunded">Refunded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="payment">Payment</MenuItem>
                <MenuItem value="refund">Refund</MenuItem>
                <MenuItem value="void">Void</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: '1px solid #e0e0e0',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary" py={3}>
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{getTypeIcon(tx.type)}</span>
                        <Typography variant="body2">{tx.type}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {tx.id.substring(0, 16)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tx.description || 'No description'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ${(tx.amount / 100).toFixed(2)} {tx.currency.toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.status}
                        size="small"
                        color={getStatusColor(tx.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(tx.created * 1000).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {tx.type === 'payment' && tx.status === 'captured' && (
                        <Button
                          size="small"
                          startIcon={<Undo />}
                          onClick={() => handleRefundClick(tx)}
                        >
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!refundDialog} onClose={() => setRefundDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Refund Transaction</DialogTitle>
        <DialogContent>
          {refundDialog && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Transaction ID: {refundDialog.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Original Amount: ${(refundDialog.amount / 100).toFixed(2)}{' '}
                {refundDialog.currency.toUpperCase()}
              </Typography>

              <TextField
                fullWidth
                label="Refund Amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                sx={{ mt: 2 }}
                inputProps={{
                  step: '0.01',
                  min: '0.01',
                  max: (refundDialog.amount / 100).toString(),
                }}
              />

              {refundResult && (
                <Box sx={{ mt: 2 }}>
                  {refundResult.success ? (
                    <Alert severity="success">
                      Refund successful! Transaction ID: {refundResult.data.data.id}
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      {refundResult.error.error || refundResult.error.message}
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog(null)}>Cancel</Button>
          <Button
            onClick={handleRefund}
            variant="contained"
            disabled={refundLoading || !refundAmount}
          >
            {refundLoading ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
