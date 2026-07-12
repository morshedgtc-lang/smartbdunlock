export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd /home/u457792910/app
echo "=== Starting server (will kill after 5s) ==="
node server.js &
PID=$!
sleep 5
kill $PID 2>/dev/null
echo "=== SERVER_TEST_DONE ==="
