# 🚀 Quick Start Guide

## Prerequisites Installation

### 1. Install Node.js
- Download and install Node.js 20.x from https://nodejs.org/
- Verify installation:
```powershell
node --version
npm --version
```

### 2. Install Docker Desktop (for Windows)
- Download from https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Verify installation:
```powershell
docker --version
docker-compose --version
```

## Project Setup

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Start Docker Services
This will start PostgreSQL, Redis, and RabbitMQ
```powershell
npm run docker:up
```

Wait for services to be healthy (about 30 seconds)

### Step 3: Setup Database
```powershell
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed test data
npm run prisma:seed
```

### Step 4: Start Development Server
```powershell
npm run dev
```

The server will start at: http://localhost:3000

## 🎯 Testing the API

### View API Documentation
Open your browser: http://localhost:3000/docs

### Test with API Key
After seeding, you'll get a test API key. Use it like this:

```powershell
# Replace YOUR_API_KEY with the actual key from seed output
$API_KEY = "sk_test_xxxxxxxxxx"

# Test health endpoint
curl http://localhost:3000/health

# Create a payment
$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    amount = 1000
    currency = "USD"
    payment_method = @{
        type = "card"
        card = @{
            number = "4242424242424242"
            exp_month = 12
            exp_year = 2027
            cvc = "123"
        }
    }
    description = "Test payment"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/v1/payments" -Method Post -Headers $headers -Body $body
```

## 🧪 Test Cards

| Card Number         | Result              |
|---------------------|---------------------|
| 4242424242424242    | ✅ Success          |
| 4000000000000002    | ❌ Declined         |
| 4000000000009995    | ❌ Insufficient     |
| 4000000000000069    | ❌ Expired          |

## 📊 View Data

### Prisma Studio (Database GUI)
```powershell
npm run prisma:studio
```
Opens at: http://localhost:5555

### RabbitMQ Management
Open browser: http://localhost:15672
- Username: admin
- Password: admin

## 🛑 Stop Services

```powershell
# Stop development server: Ctrl+C

# Stop Docker services
npm run docker:down
```

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is busy, change it in `.env`:
```
PORT=3001
```

### Database Connection Failed
1. Check Docker services are running:
```powershell
docker ps
```

2. Restart services:
```powershell
npm run docker:down
npm run docker:up
```

### Reset Database
```powershell
npm run docker:down
npm run docker:up
npm run prisma:migrate
npm run prisma:seed
```

## 📚 Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation
2. Explore the API at http://localhost:3000/docs
3. Check test scenarios in the simulator
4. Set up webhooks for event notifications

## 🎉 You're Ready!

Your Payment Platform Simulator is now running and ready for testing.
