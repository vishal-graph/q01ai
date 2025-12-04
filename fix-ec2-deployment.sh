#!/bin/bash
# Script to fix module resolution issues on EC2

set -e

echo "=== Fixing EC2 deployment ==="
cd ~/quest-characters

echo "1. Checking git status..."
git fetch
git pull
git log -1 --oneline

echo "2. Verifying source code has correct imports..."
if grep -q "core/src/index" packages/ai/src/adapters/gemini-api.ts; then
    echo "ERROR: Source code still has old imports!"
    exit 1
fi
echo "✓ Source code is correct"

echo "3. Cleaning all build artifacts..."
rm -rf packages/core/dist packages/core/tsconfig.tsbuildinfo
rm -rf packages/ai/dist packages/ai/tsconfig.tsbuildinfo
rm -rf apps/questionnaire/dist apps/questionnaire/tsconfig.tsbuildinfo

echo "4. Reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "5. Rebuilding all packages..."
npm run build --workspace=@tatvaops/core
npm run build --workspace=@tatvaops/ai
npm run build --workspace=@tatvaops/questionnaire

echo "6. Verifying compiled output..."
if grep -q "core/src/index" packages/ai/dist/adapters/gemini-api.js; then
    echo "ERROR: Compiled JS still has old imports!"
    exit 1
fi
if ! grep -q "@tatvaops/core" packages/ai/dist/adapters/gemini-api.js; then
    echo "ERROR: Compiled JS missing @tatvaops/core import!"
    exit 1
fi
echo "✓ Compiled output is correct"

echo "7. Verifying Node can resolve package..."
NODE_RESOLVE=$(node -p "require.resolve('@tatvaops/core')")
if [ -z "$NODE_RESOLVE" ]; then
    echo "ERROR: Node cannot resolve @tatvaops/core!"
    exit 1
fi
echo "✓ Node can resolve: $NODE_RESOLVE"

echo "8. Restarting PM2..."
cd apps/questionnaire
pm2 delete questionnaire || true
pm2 flush questionnaire || true
pm2 start dist/index.js --name questionnaire --update-env
pm2 save

echo "9. Waiting 3 seconds for startup..."
sleep 3

echo "10. Checking PM2 status..."
pm2 status

echo "11. Latest logs (last 20 lines)..."
pm2 logs questionnaire --lines 20 --nostream --timestamp

echo ""
echo "=== Done ==="
echo "Check logs with: pm2 logs questionnaire --lines 50 --timestamp"
echo "Test health: curl http://localhost:4000/healthz"

