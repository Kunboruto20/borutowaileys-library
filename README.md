# @borutowaileys/library

\## What's New

\- \*\*May 2025:\*\* Pairing code issues fixed with full support for the latest WhatsApp Web protocol.A sleek, high-performance library for building WhatsApp applications and bots.

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
const {
  createSocket,
  DisconnectReason,
  useAuthState
} = require('@borutowaileys/library');

(async () => {
  // Initialize authentication state
  const { state, saveCreds } = await useAuthState('auth_credentials');

  const sock = createSocket({
    auth: state,
    printQRInTerminal: true
  });

  // Connection lifecycle
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('🔌 Connected successfully');
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(() => start(), 2000);
    }
  });

  // Persist credentials
  sock.ev.on('creds.update', saveCreds);

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (msg.key.fromMe) return;
    console.log('📩 Received:', msg.message);

    // Echo reply
    await sock.sendMessage(msg.key.remoteJid, { text: `You said: ${msg.message.conversation}` });
  });
})();
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
