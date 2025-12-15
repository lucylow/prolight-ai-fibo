#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Deploying ProLight AI Lovable edge functions..."

if ! command -v lovable >/dev/null 2>&1; then
  echo "❌ 'lovable' CLI not found. Please install it from the Lovable dashboard."
  exit 1
fi

export PROLIGHT_ENV=${PROLIGHT_ENV:-"PRODUCTION"}

echo "Using PROLIGHT_ENV=$PROLIGHT_ENV"

lovable deploy
lovable analytics enable || true

echo "✅ Deployment triggered. Tail logs with:"
echo "   lovable logs --follow"


