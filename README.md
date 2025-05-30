# @borutowaileys/library

\## What's New

\- \*\*May 2025:\*\* Pairing code issues fixed with full support for the latest WhatsApp Web protocol. UPDATED The last protocol used by whatsapp to ensure the best compatibility Have Fun

**GitHub Repository:** [https://github.com/gyovannyvpn123/borutowaileys-library.git](https://github.com/gyovannyvpn123/borutowaileys-library.git)

---

## 🚀 Features

* **Multi-Device Support**: Connect across multiple sessions seamlessly.
* **Robust Messaging**: Send and receive text, stickers, and rich media.
* **Group Management**: Create, schedule actions, and manage permissions.
* **Advanced Media Handling**: Compress, resize, watermark, and OCR.
* **Code-Free Authentication**: QR-less pairing for headless environments.
* **Event-Driven Architecture**: React to incoming messages, connection updates, and more.
* **State Synchronization**: Keep message history in sync across devices.
* **Webhook Integrations**: Push events to external services.
* **Built-In Rate Limiter**: Stay within WhatsApp’s limits to avoid blocks.
* **Cache with TTL**: In-memory storage with persistence and automatic expiration.

---

## 📦 Installation

```bash
npm install @borutowaileys/library
```

---

## 🏁 Quick Start

```javascript
// index.cjs
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  delay
} = require('@borutowaileys/library');
const readline = require('readline');

// Funcție pentru a afișa pairing code
const waitForPairing = (sock) => {
  sock.ev.on('connection.update', async ({ connection, qr, pairingCode, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.error('⚠️ Deconectat! Reautentificare necesară.');
        process.exit();
      } else {
        console.log('🔁 Reconectare...');
        startBot(); // Recursiv
      }
    }

    if (pairingCode) {
      console.log('\n🔗 Pairing Code:\n');
      console.log('\x1b[31m%s\x1b[0m', pairingCode); // Roșu
      console.log('\n📲 Introdu codul în WhatsApp: Setări > Dispozitive > Conectează');
    }

    if (connection === 'open') {
      console.log('\n✅ Conectat cu succes!');
      await delay(2000);

      // Trimite mesaj de test (schimbă ID-ul cu al tău)
      const jid = '123456789@s.whatsapp.net'; // înlocuiește cu număr real
      await sock.sendMessage(jid, { text: '👋 Salut, sunt online!' });
      console.log('📨 Mesaj de test trimis.');
    }
  });
};

// Funcție principală
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // pairing code, nu QR
    browser: ['Boruto', 'Termux', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);
  waitForPairing(sock);
}

startBot();

    
     
  

```

---

## 🌟 Advanced Capabilities

### Rate Limiting

Keep your bot safe from blocks by capping request rates.

```javascript
const { createEnhancedSocket } = require('@borutowaileys/library');

const sock = createEnhancedSocket({
  rateLimiter: { maxRequests: 15, timeWindow: 60000 }
});

try {
  await sock.sendWithRateLimit(jid, { text: 'This message respects rate limits' });
} catch (err) {
  console.error(err.message);
}
```

### Image Processing & OCR

Extract text and manipulate media in one place.

```javascript
// Text extraction
const text = await sock.extractTextFromImage(imageBuffer);
console.log('Extracted text:', text);

// Compress, resize, watermark
const compressed = await sock.compressImage(imageBuffer, 80);
const resized    = await sock.resizeImage(imageBuffer, 800, 600);
const watermarked = await sock.addWatermark(imageBuffer, watermarkBuffer, { opacity: 0.5, x: 10, y: 10 });
```

### Group Administration

Automate group creation, scheduling, and moderation.

```javascript
// Create advanced group
const group = await sock.createGroupWithOptions(
  'My Awesome Group',
  ['123456789@s.whatsapp.net'],
  { description: 'Group for enthusiasts', picture: fs.readFileSync('icon.jpg'), restrict: true }
);

// Schedule an action
await sock.scheduleGroupAction(
  group.id,
  'message',
  Date.now() + 3600000,
  { message: { text: 'Scheduled announcement' } }
);
```

### Webhook Integrations

Real-time events delivered to your services.

```javascript
sock.setupWebhook('https://example.com/webhook', ['message.received', 'message.sent']);

await sock.sendMessage(jid, { text: 'Silent message' }, { silentWebhook: true });

sock.removeWebhook('https://example.com/webhook');
```

### Built-In Caching

Fast in-memory store with TTL and persistence.

```javascript
sock.cacheSet('user:1234', userData, 3600); // 1 hour
const data = sock.cacheGet('user:1234');
sock.cacheClear();
```

---

## 📖 Documentation

Explore the full API, guides, and examples in the [docs](./docs) folder or online at [https://borutowaileys.dev/docs](https://borutowaileys.dev/docs)

---

## ⚖️ License

Released under the MIT License.
