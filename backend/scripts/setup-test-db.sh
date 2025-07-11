#!/bin/bash

# Setup Test Database Script
# This script sets up the dedicated test database schema

set -e

echo "🔧 Setting up test database schema..."

# Set test database URL
export DATABASE_URL="prisma+postgres://localhost:51216/?api_key=eyJuYW1lIjoidGVzdCIsImRhdGFiYXNlVXJsIjoicG9zdGdyZXM6Ly9wb3N0Z3Jlczpwb3N0Z3Jlc0Bsb2NhbGhvc3Q6NTEyMTcvdGVtcGxhdGUxP3NzbW9kZT1kaXNhYmxlJmNvbm5lY3Rpb25fbGltaXQ9MSZjb25uZWN0X3RpbWVvdXQ9MCZtYXhfaWRsZV9jb25uZWN0aW9uX2xpZmV0aW1lPTAmcG9vbF90aW1lb3V0PTAmc2luZ2xlX3VzZV9jb25uZWN0aW9ucz10cnVlJnNvY2tldF90aW1lb3V0PTAiLCJzaGFkb3dEYXRhYmFzZVVybCI6InBvc3RncmVzOi8vcG9zdGdyZXM6cG9zdGdyZXNAbG9jYWxob3N0OjUxMjE4L3RlbXBsYXRlMT9zc2xtb2RlPWRpc2FibGUmY29ubmVjdGlvbl9saW1pdD0xJmNvbm5lY3RfdGltZW91dD0wJm1heF9pZGxlX2Nvbm5lY3Rpb25fbGlmZXRpbWU9MCZwb29sX3RpbWVvdXQ9MCZzaW5nbGVfdXNlX2Nvbm5lY3Rpb25zPXRydWUmc29ja2V0X3RpbWVvdXQ9MCJ9"

# Push schema to test database
npx prisma db push --force-reset

echo "✅ Test database schema setup complete!"
echo "🔗 Test database running on port 51216"
echo "🔗 Development database remains protected on port 51213"