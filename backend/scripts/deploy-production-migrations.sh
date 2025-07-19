#!/bin/bash

# 🚨 PRODUCTION MIGRATION DEPLOYMENT SCRIPT
# 🛡️ FINTECH SAFETY: NEVER use --force-reset in production!

set -e

echo "🚨 DEPLOYING TO PRODUCTION DATABASE - FINTECH CRITICAL OPERATION"
echo "⚠️  This will apply migrations to production data"
echo "🛡️ All migrations include financial safety constraints"

# Require explicit confirmation for production
if [ "$NODE_ENV" = "production" ]; then
    echo "🔒 PRODUCTION ENVIRONMENT DETECTED"
    echo "📋 Pre-deployment checklist:"
    echo "   ✅ Backup created and verified?"
    echo "   ✅ Migrations tested on staging?"
    echo "   ✅ Rollback plan prepared?"
    echo "   ✅ Financial team notified?"
    
    read -p "🔐 Type 'DEPLOY_TO_PRODUCTION' to confirm: " confirmation
    if [ "$confirmation" != "DEPLOY_TO_PRODUCTION" ]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi
fi

# Deploy migrations (NEVER --force-reset)
echo "🔒 Deploying migrations safely..."
npx prisma migrate deploy

echo "✅ Production migrations deployed successfully!"
echo "🛡️ Financial safety constraints are now enforced"
echo "📊 Verify critical operations are working correctly"