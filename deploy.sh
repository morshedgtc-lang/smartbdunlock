export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20

cd /home/u457792910
rm -rf app 2>/dev/null
git clone https://github.com/morshedgtc-lang/smartbdunlock.git app
cd app

# Switch to MySQL provider
sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma
# Remove SQLite-specific indexes that conflict
# Update datasource URL (we'll set via .env)
cat > /home/u457792910/app/.env << 'ENVEOF'
DATABASE_URL="mysql://u457792910_u457792910_:%40Morshedsathi2026%40@localhost:3306/u457792910_smartunlock"
JWT_SECRET="aGVsbG8gdGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIFNtYXJ0QkQ="
NEXTAUTH_URL="https://smartbdunlock.com"
ENVEOF

# Install deps and build
npm install --legacy-peer-deps 2>&1 | tail -3
npx prisma generate 2>&1 | tail -3
npm run build 2>&1 | tail -5

echo "===== BUILD COMPLETE ====="
