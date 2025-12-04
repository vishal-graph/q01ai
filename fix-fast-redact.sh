#!/bin/bash
# Fix fast-redact dependency issue

set -e

echo "=== Fixing fast-redact dependency ==="
cd ~/quest-characters

echo "1. Checking if fast-redact is in package.json..."
if ! grep -q "fast-redact" packages/core/package.json; then
    echo "ERROR: fast-redact not in package.json!"
    exit 1
fi
echo "✓ fast-redact is in package.json"

echo "2. Checking if fast-redact is installed..."
if [ ! -d "packages/core/node_modules/fast-redact" ]; then
    echo "fast-redact not found in packages/core/node_modules, installing..."
    cd packages/core
    npm install
    cd ../..
else
    echo "✓ fast-redact is installed"
fi

echo "3. Verifying fast-redact location..."
ls -la packages/core/node_modules/fast-redact/package.json 2>/dev/null || echo "WARNING: fast-redact still not found"

echo "4. Installing all dependencies from root..."
npm install

echo "5. Checking if fast-redact exists in root node_modules..."
if [ -d "node_modules/fast-redact" ]; then
    echo "✓ fast-redact found in root node_modules"
    # Create symlink if needed
    if [ ! -d "packages/core/node_modules/fast-redact" ]; then
        echo "Creating symlink..."
        mkdir -p packages/core/node_modules
        ln -s ../../../node_modules/fast-redact packages/core/node_modules/fast-redact
    fi
fi

echo "6. Flushing PM2 logs..."
pm2 flush questionnaire || true

echo "7. Restarting PM2..."
cd apps/questionnaire
pm2 delete questionnaire || true
pm2 start dist/index.js --name questionnaire --update-env
pm2 save

echo "8. Waiting 3 seconds..."
sleep 3

echo "9. Checking latest logs..."
pm2 logs questionnaire --lines 20 --nostream --timestamp

echo ""
echo "=== Done ==="

