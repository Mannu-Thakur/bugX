const localtunnel = require('./frontend/node_modules/localtunnel');
const https = require('https');

const SUBDOMAIN = process.env.SUBDOMAIN || 'bugx-mannu-iiit';
const PORT = parseInt(process.env.PORT || '5174', 10);

function getTunnelPassword() {
  return new Promise((resolve) => {
    https.get('https://loca.lt/mytunnelpassword', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data.trim()));
    }).on('error', () => resolve('Unknown'));
  });
}

let activeTunnel = null;
let isConnecting = false;

async function createTunnel() {
  if (isConnecting) return;
  isConnecting = true;

  if (activeTunnel) {
    try {
      activeTunnel.close();
    } catch (_) {}
    activeTunnel = null;
  }

  const password = await getTunnelPassword();
  console.log('==================================================');
  console.log('🚀 bugX College Live Tunnel Manager (Persistent)');
  console.log('==================================================');
  console.log(`📌 Fixed Subdomain     : ${SUBDOMAIN}`);
  console.log(`🌐 Local Target Port    : ${PORT}`);
  console.log(`🔑 Tunnel Password (IP) : ${password}`);
  console.log('==================================================\n');

  try {
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
    activeTunnel = tunnel;
    isConnecting = false;
    console.log(`✅ Live URL: ${tunnel.url}`);
    console.log(`📢 Share this exact URL across your college network!\n`);

    tunnel.on('close', () => {
      console.log('⚠️ Tunnel connection closed. Auto-reconnecting in 3s...');
      setTimeout(createTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('❌ Tunnel error:', err ? err.message : err);
      setTimeout(createTunnel, 3000);
    });
  } catch (err) {
    isConnecting = false;
    console.error('❌ Connection failed:', err ? err.message : err);
    setTimeout(createTunnel, 5000);
  }
}

// Keep Node process event loop alive indefinitely
setInterval(() => {
  if (!activeTunnel || activeTunnel.closed) {
    createTunnel();
  }
}, 30000);

createTunnel();
