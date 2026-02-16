import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Settings, Save } from '@mui/icons-material';
import { api } from '../config/api';

const TEST_SCENARIOS = [
  {
    card: '4242424242424242',
    name: 'Successful Payment',
    description: 'Card will be successfully charged',
    result: 'Success',
    color: 'success',
  },
  {
    card: '4000000000000002',
    name: 'Card Declined',
    description: 'Generic card decline',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000009995',
    name: 'Insufficient Funds',
    description: 'Card has insufficient funds',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000000069',
    name: 'Expired Card',
    description: 'The card has expired',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000000127',
    name: 'Incorrect CVC',
    description: 'CVC check failed',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000000341',
    name: 'Processing Error',
    description: 'Generic processing error',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000000101',
    name: 'CVC Check Unavailable',
    description: 'CVC check unavailable',
    result: 'Success',
    color: 'warning',
  },
  {
    card: '4000000000009235',
    name: 'AVS Failed',
    description: 'Address verification failed',
    result: 'Failed',
    color: 'error',
  },
  {
    card: '4000000000006975',
    name: '3D Secure Required',
    description: 'Requires 3D Secure authentication',
    result: 'Pending',
    color: 'info',
  },
  {
    card: '4000000000000259',
    name: 'Risk Flagged',
    description: 'Transaction flagged by risk system',
    result: 'Failed',
    color: 'warning',
  },
];

export default function Simulator() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/v1/simulator/config');
      setConfig(response.data.data);
    } catch (error) {
      console.error('Error fetching config:', error);
      // Set default config on error
      setConfig({
        successRate: 0.85,
        minDelayMs: 500,
        maxDelayMs: 2000,
        failureDistribution: {
          card_declined: 0.4,
          insufficient_funds: 0.2,
          expired_card: 0.15,
          incorrect_cvc: 0.15,
          processing_error: 0.1,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveResult(null);
      await api.put('/v1/simulator/config', config);
      setSaveResult({ success: true });
    } catch (error: any) {
      setSaveResult({
        success: false,
        error: error.response?.data || { message: 'Failed to save configuration' },
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error">
          Failed to load simulator configuration. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

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
            Simulator Configuration
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Configure the payment simulator behavior and test scenarios
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      {saveResult && (
        <Alert
          severity={saveResult.success ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setSaveResult(null)}
        >
          {saveResult.success
            ? 'Configuration saved successfully'
            : saveResult.error.error || saveResult.error.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <Settings sx={{ color: '#667eea' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Behavior Settings</Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography gutterBottom>
                Success Rate: {((config.successRate || 0) * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={(config.successRate || 0) * 100}
                onChange={(_, value) =>
                  setConfig({ ...config, successRate: (value as number) / 100 })
                }
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />
              <Typography variant="caption" color="textSecondary">
                Percentage of transactions that will succeed (when using random mode)
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Delay (ms)"
                  type="number"
                  value={config.minDelayMs || 500}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      minDelayMs: parseInt(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Delay (ms)"
                  type="number"
                  value={config.maxDelayMs || 2000}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxDelayMs: parseInt(e.target.value),
                    })
                  }
                />
              </Grid>
            </Grid>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Simulated processing time for transactions
            </Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Failure Distribution
              </Typography>
              {config.failureDistribution && Object.entries(config.failureDistribution).map(([key, value]: [string, any]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:{' '}
                    {(value * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={value * 100}
                    onChange={(_, newValue) =>
                      setConfig({
                        ...config,
                        failureDistribution: {
                          ...config.failureDistribution,
                          [key]: (newValue as number) / 100,
                        },
                      })
                    }
                    min={0}
                    max={100}
                    size="small"
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Test Card Numbers
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Use these card numbers to trigger specific scenarios
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Card Number</TableCell>
                      <TableCell>Scenario</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {TEST_SCENARIOS.map((scenario) => (
                      <TableRow key={scenario.card} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {scenario.card}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{scenario.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {scenario.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={scenario.result}
                            size="small"
                            color={scenario.color as any}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
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
              Additional Information
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              The simulator provides a realistic testing environment for payment processing:
            </Typography>
            <Box component="ul" sx={{ mt: 2, '& li': { mb: 1 } }}>
              <li>
                <Typography variant="body2">
                  <strong>Deterministic Mode:</strong> Use specific test card numbers to trigger
                  exact scenarios
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Random Mode:</strong> Any other card number will use the configured
                  success rate and failure distribution
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Webhooks:</strong> All transaction events trigger webhook notifications
                  asynchronously
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Processing Delay:</strong> Simulates real-world network latency and
                  processing time
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Idempotency:</strong> Include an{' '}
                  <code>Idempotency-Key</code> header to prevent duplicate charges
                </Typography>
              </li>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
