export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd /home/u457792910/app

# Fix .env with MySQL config
cat > .env << 'ENVEOF'
DATABASE_URL="mysql://u457792910_u457792910_:%40Morshedsathi2026%40@localhost:3306/u457792910_smartunlock"
NEXTAUTH_SECRET="aGVsbG8gdGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIFNtYXJ0QkQ="
NEXTAUTH_URL="https://smartbdunlock.com"
ENVEOF

# Install PM2 globally
npm install -g pm2 2>&1 | tail -3

# Start the app with PM2
PORT=3000 pm2 start server.js --name smartbdunlock 2>&1
pm2 save 2>&1
echo "=== PM2 LIST ==="
pm2 list 2>&1

echo "=== SETUP DONE ==="
