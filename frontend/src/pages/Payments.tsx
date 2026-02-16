import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CreditCard, CheckCircle, Error } from '@mui/icons-material';
import { api } from '../config/api';

const TEST_CARDS = [
  { number: '4242424242424242', name: 'Success', description: 'Payment succeeds' },
  { number: '4000000000000002', name: 'Declined', description: 'Card declined' },
  { number: '4000000000009995', name: 'Insufficient Funds', description: 'Insufficient funds' },
  { number: '4000000000000069', name: 'Expired Card', description: 'Expired card' },
  { number: '4000000000000127', name: 'Invalid CVC', description: 'Incorrect CVC' },
  { number: '4000000000000341', name: 'Processing Error', description: 'Processing error' },
];

export default function Payments() {
  const [formData, setFormData] = useState({
    amount: '10.00',
    currency: 'USD',
    cardNumber: '4242424242424242',
    expMonth: '12',
    expYear: '2025',
    cvc: '123',
    cardholderName: 'Test User',
    description: 'Test payment',
    email: 'test@example.com',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestCardClick = (cardNumber: string) => {
    setFormData((prev) => ({ ...prev, cardNumber }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await api.post('/v1/payments', {
        amount: Math.round(parseFloat(formData.amount) * 100),
        currency: formData.currency.toLowerCase(),
        payment_method: {
          type: 'card',
          card: {
            number: formData.cardNumber.replace(/\s/g, ''),
            exp_month: formData.expMonth,
            exp_year: formData.expYear,
            cvc: formData.cvc,
          },
          billing_details: {
            name: formData.cardholderName,
            email: formData.email,
          },
        },
        description: formData.description,
        capture: true,
      });

      setResult({ success: true, data: response.data });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.response?.data || { message: 'Payment failed' },
      });
    } finally {
      setLoading(false);
    }
  };

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
          Create Payment
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Test payment processing with various card scenarios
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Payment Details
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    inputProps={{ step: '0.01', min: '0.50' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      name="currency"
                      value={formData.currency}
                      label="Currency"
                      onChange={handleChange}
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="GBP">GBP</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Card Information
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Card Number"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    required
                    placeholder="4242 4242 4242 4242"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Exp Month"
                    name="expMonth"
                    value={formData.expMonth}
                    onChange={handleChange}
                    required
                    placeholder="12"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Exp Year"
                    name="expYear"
                    value={formData.expYear}
                    onChange={handleChange}
                    required
                    placeholder="2025"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="CVC"
                    name="cvc"
                    value={formData.cvc}
                    onChange={handleChange}
                    required
                    placeholder="123"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cardholder Name"
                    name="cardholderName"
                    value={formData.cardholderName}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    startIcon={<CreditCard />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                      },
                      '&:disabled': {
                        background: '#ccc',
                      },
                    }}
                  >
                    {loading ? 'Processing...' : 'Create Payment'}
                  </Button>
                </Grid>
              </Grid>
            </form>

            {result && (
              <Box sx={{ mt: 3 }}>
                {result.success ? (
                  <Alert severity="success" icon={<CheckCircle />}>
                    <Typography variant="body2" fontWeight="bold">
                      Payment Successful!
                    </Typography>
                    <Typography variant="caption" component="div">
                      Transaction ID: {result.data.data.id}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Amount: ${(result.data.data.amount / 100).toFixed(2)}{' '}
                      {result.data.data.currency.toUpperCase()}
                    </Typography>
                    {result.data.data.authorization_code && (
                      <Typography variant="caption" component="div">
                        Auth Code: {result.data.data.authorization_code}
                      </Typography>
                    )}
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<Error />}>
                    <Typography variant="body2" fontWeight="bold">
                      Payment Failed
                    </Typography>
                    <Typography variant="caption" component="div">
                      {result.error.error || result.error.message}
                    </Typography>
                    {result.error.error_description && (
                      <Typography variant="caption" component="div">
                        {result.error.error_description}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid #e0e0e0',
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Test Cards
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Click to use test card numbers
              </Typography>

              {TEST_CARDS.map((card) => (
                <Box
                  key={card.number}
                  onClick={() => handleTestCardClick(card.number)}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: formData.cardNumber === card.number
                      ? '2px solid #667eea'
                      : '1px solid #e0e0e0',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    background:
                      formData.cardNumber === card.number
                        ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
                        : 'white',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                      transform: 'translateX(4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {card.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {card.number}
                  </Typography>
                  <Chip
                    label={card.description}
                    size="small"
                    sx={{ mt: 0.5 }}
                    color={card.name === 'Success' ? 'success' : 'default'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
