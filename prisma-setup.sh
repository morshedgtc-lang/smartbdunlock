export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
cd /home/u457792910/app
npx prisma generate 2>&1 | tail -3
echo "=== GEN DONE ==="
npx prisma db push 2>&1 | tail -5
echo "=== PUSH DONE ==="
