export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
kill $(pgrep -f "next build") 2>/dev/null
kill $(pgrep -f "npm run build") 2>/dev/null
sleep 2
cd /home/u457792910/app
NODE_OPTIONS="--max-old-space-size=2048" npx next build --webpack 2>&1 | tail -30
echo "=== BUILD_EXIT: $? ==="
