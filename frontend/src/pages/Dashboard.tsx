import { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../config/api';

interface Stats {
  total: number;
  successful: number;
  failed: number;
  totalAmount: number;
  successRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txResponse] = await Promise.all([
        api.get('/v1/transactions?limit=100'),
      ]);

      const txData = txResponse.data.data.data;
      setTransactions(txData);

      // Calculate stats
      const successful = txData.filter((t: any) => t.status === 'captured').length;
      const failed = txData.filter((t: any) => t.status === 'failed').length;
      const totalAmount = txData
        .filter((t: any) => t.status === 'captured')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      setStats({
        total: txData.length,
        successful,
        failed,
        totalAmount,
        successRate: txData.length > 0 ? (successful / txData.length) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const statusData = [
    { name: 'Successful', value: stats?.successful || 0 },
    { name: 'Failed', value: stats?.failed || 0 },
  ];

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        transition: 'all 0.3s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${color}30`,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Box flex={1}>
            <Typography
              color="textSecondary"
              gutterBottom
              variant="body2"
              sx={{ 
                fontWeight: 500, 
                textTransform: 'uppercase', 
                fontSize: '0.75rem',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: color,
                lineHeight: 1.2,
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              borderRadius: 3,
              p: 2,
              color: 'white',
              boxShadow: `0 4px 12px ${color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              minHeight: 56,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Overview of your payment platform performance
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box width="100%">
            <StatCard
              title="Total Transactions"
              value={stats?.total || 0}
              icon={<Receipt />}
              color="#1976d2"
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box width="100%">
            <StatCard
              title="Successful"
              value={stats?.successful || 0}
              icon={<TrendingUp />}
              color="#4caf50"
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box width="100%">
            <StatCard
              title="Failed"
              value={stats?.failed || 0}
              icon={<TrendingDown />}
              color="#f44336"
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box width="100%">
            <StatCard
              title="Total Revenue"
              value={`$${((stats?.totalAmount || 0) / 100).toFixed(2)}`}
              icon={<AttachMoney />}
              color="#ff9800"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Transaction Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Failed' ? '#f44336' : '#4caf50'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Recent Transactions
            </Typography>
            <Box sx={{ mt: 2 }}>
              {transactions.slice(0, 5).map((tx) => (
                <Box
                  key={tx.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {tx.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(tx.created * 1000).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={tx.status === 'captured' ? 'success.main' : 'error.main'}
                    >
                      ${(tx.amount / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {tx.status}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
