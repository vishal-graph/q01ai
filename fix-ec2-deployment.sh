#!/bin/bash
# Script to fix module resolution issues on EC2

set -e

echo "=== Fixing EC2 deployment ==="
cd ~/quest-characters

echo "1. Syncing repository with origin/main..."
git fetch origin
git reset --hard origin/main
git log -1 --oneline

echo "2. Cleaning all build artifacts..."
rm -rf packages/core/dist packages/core/tsconfig.tsbuildinfo
rm -rf packages/ai/dist packages/ai/tsconfig.tsbuildinfo
rm -rf apps/questionnaire/dist apps/questionnaire/tsconfig.tsbuildinfo

echo "3. Reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "4. Rebuilding all packages..."
npm run build --workspace=@tatvaops/core
npm run build --workspace=@tatvaops/ai
npm run build --workspace=@tatvaops/questionnaire

echo "5. Verifying Node can resolve @tatvaops/core..."
NODE_RESOLVE=$(node -p "require.resolve('@tatvaops/core')")
if [ -z "$NODE_RESOLVE" ]; then
    echo "ERROR: Node cannot resolve @tatvaops/core!"
    exit 1
fi
echo "✓ Node can resolve: $NODE_RESOLVE"

echo "6. Restarting PM2 questionnaire service..."
cd apps/questionnaire
pm2 delete questionnaire || true
pm2 flush questionnaire || true
pm2 start dist/index.js --name questionnaire --update-env
pm2 save

echo "7. Waiting 3 seconds for startup..."
sleep 3

echo "8. Checking PM2 status..."
pm2 status

echo ""
echo "=== Done ==="
echo "Check logs with: pm2 logs questionnaire --lines 50 --timestamp"
echo "Test health: curl http://localhost:4000/healthz"

