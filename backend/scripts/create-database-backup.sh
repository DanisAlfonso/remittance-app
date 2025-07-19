#!/bin/bash

# 🛡️ AUTOMATED DATABASE BACKUP SCRIPT
# 🚨 FINTECH SAFETY: Critical for disaster recovery

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="remittance_app"

echo "💾 Starting automated database backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

# Create compressed backup with schema and data
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "🔒 Creating compressed backup: $BACKUP_FILE"

# Use pg_dump for complete backup (adapt based on your database URL format)
# This is a template - adjust connection parameters based on your setup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

echo "✅ Backup created successfully!"
echo "📁 Backup location: $BACKUP_FILE"
echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Verify backup integrity
echo "🔍 Verifying backup integrity..."
if gunzip -t "$BACKUP_FILE"; then
    echo "✅ Backup integrity verified"
else
    echo "❌ Backup integrity check failed!"
    exit 1
fi

# Cleanup old backups (keep last 30 days)
echo "🧹 Cleaning up old backups (keeping last 30 days)..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +30 -delete

echo "🎉 Database backup completed successfully!"
echo "⏰ Next backup should be scheduled within 24 hours"

# TODO: Add cloud storage upload for offsite backup
# TODO: Add backup encryption for sensitive financial data
# TODO: Add automated restore testing