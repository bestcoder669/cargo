#!/bin/bash

set -e

# Configuration
BACKUP_DIR="./backups"
DB_NAME="cargoexpress"
DB_USER="cargoexpress"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "📦 Starting database backup..."

# Perform backup
docker exec cargoexpress-db pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE
BACKUP_FILE="$BACKUP_FILE.gz"

echo "✅ Backup created: $BACKUP_FILE"

# Upload to S3 (optional)
if [ ! -z "$S3_BUCKET" ]; then
    echo "☁️ Uploading to S3..."
    aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/backups/
    echo "✅ Backup uploaded to S3"
fi

# Clean old backups
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "🎉 Backup completed successfully!"