const { Client } = require('ssh2');
async function tryConnect(user, pass) {
  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => { console.log(`${user}: CONNECTED`); conn.end(); resolve(true); });
    conn.on('error', (err) => { console.log(`${user}: ${err.message.split('\n')[0]}`); resolve(false); });
    conn.connect({ host: '145.79.30.123', port: 65002, username: user, password: pass, readyTimeout: 10000 });
  });
}
(async () => {
  const pw = '@Morshedsathi2026@';
  await tryConnect('u457792910', pw);
  await tryConnect('root', pw);
})();
