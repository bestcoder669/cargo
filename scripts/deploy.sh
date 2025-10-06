#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Load environment variables
source .env.production

# Build images
echo "📦 Building Docker images..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run migrations
echo "🗃️ Running database migrations..."
docker-compose run --rm api pnpm prisma:migrate:deploy

# Start services
echo "🔄 Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health checks
echo "🏥 Running health checks..."
sleep 10

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
if [ $API_HEALTH -eq 200 ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    exit 1
fi

# Check bot status
BOT_STATUS=$(docker-compose logs bot | tail -n 20 | grep -c "Bot started successfully" || true)
if [ $BOT_STATUS -gt 0 ]; then
    echo "✅ Bot is running"
else
    echo "❌ Bot startup failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
