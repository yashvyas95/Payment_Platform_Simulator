# Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Database Migration](#database-migration)
- [Monitoring](#monitoring)

## Prerequisites

- Docker and Docker Compose (for containerized deployment)
- Node.js 18+ (for non-containerized deployment)
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+

## Environment Setup

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (use your production database)
DATABASE_URL=postgresql://user:password@your-db-host:5432/payment_platform

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# RabbitMQ
RABBITMQ_URL=amqp://user:password@your-rabbitmq-host:5672

# JWT (IMPORTANT: Change these!)
JWT_SECRET=your-super-secret-production-jwt-key-at-least-32-chars
JWT_EXPIRES_IN=15m

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
API_KEY_PREFIX=sk_live_

# CORS
FRONTEND_URL=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_PRETTY=false

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f
```

### Docker Compose Production Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    environment:
      NODE_ENV: production
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Cloud Deployment

### AWS (ECS/EKS)

1. **Build and push Docker image**:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t payment-simulator .
docker tag payment-simulator:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/payment-simulator:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/payment-simulator:latest
```

2. **Deploy to ECS**: Use AWS Console or AWS CLI
3. **Configure RDS**: For PostgreSQL
4. **Configure ElastiCache**: For Redis
5. **Configure Amazon MQ**: For RabbitMQ

### Google Cloud Platform (Cloud Run)

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT-ID/payment-simulator

# Deploy
gcloud run deploy payment-simulator \
  --image gcr.io/PROJECT-ID/payment-simulator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Heroku

```bash
# Login
heroku login

# Create app
heroku create your-app-name

# Add addons
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
heroku addons:create cloudamqp:lemur

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# Run migrations
heroku run npm run prisma:migrate
```

### Railway

1. Connect GitHub repository
2. Add PostgreSQL, Redis database services
3. Set environment variables
4. Deploy automatically on push

### Render

1. Connect GitHub repository
2. Create Web Service
3. Add PostgreSQL and Redis
4. Set environment variables
5. Deploy

## Database Migration

### Run Migrations

```bash
# Production migration
DATABASE_URL=your-production-db npm run prisma:migrate deploy

# Or with Docker
docker-compose exec app npm run prisma:migrate deploy
```

### Backup Database

```bash
# PostgreSQL backup
pg_dump -h hostname -U username -d database_name > backup.sql

# Restore
psql -h hostname -U username -d database_name < backup.sql
```

## Monitoring

### Health Check Endpoints

- Health: `GET /health`
- Readiness: `GET /health/ready`
- Liveness: `GET /health/live`

### Logging

Configure structured logging with appropriate log levels:

```typescript
// Production logging configuration
{
  level: 'info',
  prettyPrint: false,
  redact: ['password', 'token', 'apiKey']
}
```

### Recommended Monitoring Tools

- **Application Monitoring**: Sentry, New Relic, DataDog
- **Infrastructure**: CloudWatch, Prometheus + Grafana
- **Logging**: ELK Stack, Loki, CloudWatch Logs
- **Uptime**: UptimeRobot, Pingdom

### Metrics to Monitor

- Request rate and latency
- Error rate
- Database connection pool
- Redis hit rate
- RabbitMQ queue length
- Memory and CPU usage

## SSL/TLS Configuration

### Using Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (ALB, NLB, Nginx)
- Stateless application design
- Shared Redis for session storage
- Database connection pooling

### Caching Strategy

- Redis for frequently accessed data
- CDN for static assets
- Database query result caching

### Database Optimization

- Proper indexing
- Connection pooling
- Read replicas for scaling reads
- Regular VACUUM and ANALYZE

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Enable database SSL connections

## Rollback Strategy

```bash
# Rollback to previous version
docker-compose down
docker-compose up -d --force-recreate

# Or with Kubernetes
kubectl rollout undo deployment/payment-simulator

# Database rollback (if needed)
npm run prisma:migrate resolve --rolled-back "migration-name"
```

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review environment variables
- Verify database connectivity
- Check service health endpoints
- Review GitHub Issues or Discussions
