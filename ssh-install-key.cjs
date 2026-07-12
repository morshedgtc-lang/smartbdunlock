const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAXsdKR/reLO+xnaRmqk+/5dQ6VpHhLOsod1sD4I2q8O morshedgtc@gmail.com" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys';
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err.message); process.exit(1); }
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('Exit code:', code, out);
      conn.end();
      process.exit(code || 0);
    }).on('data', (d) => { out += d.toString(); process.stdout.write(d); })
      .stderr.on('data', (d) => process.stderr.write(d));
  });
}).on('error', (err) => { console.error(err.message); process.exit(1); })
.connect({ host: '145.79.30.123', port: 65002, username: 'u457792910', password: '@Morshedsathi2026@', readyTimeout: 20000 });
