# @borutowaileys/library

A powerful, full-featured Node.js library for interacting with WhatsApp Web. Built as an enhanced fork of [Baileys](https://github.com/adiwajshing/Baileys), **@borutowaileys/library** supports both QR-code and pairing-code authentication, complete end-to-end encryption, and every message type WhatsApp Web offers (text, images, videos, documents, audio, stickers, reactions, locations, contacts, live location, statuses, and more). Designed for headless environments (e.g., Termux, Docker), multi-device setups, and production-grade bots, it stays in sync with the official WhatsApp Web protocol (currently v2.3534.4 as of May 2025). 

---

## Table of Contents

1. [Repository & Links](#repository--links)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Quick Start](#quick-start)  
5. [Authentication](#authentication)  
   - [QR-Code Pairing](#qr-code-pairing)  
   - [Pairing Code (Headless)](#pairing-code-headless)  
6. [Core Concepts](#core-concepts)  
7. [Supported Message Types](#supported-message-types)  
8. [Group & Metadata Management](#group--metadata-management)  
9. [Event-Driven API](#event-driven-api)  
10. [Media Upload & Download](#media-upload--download)  
11. [Rate Limiting & Reconnect](#rate-limiting--reconnect)  
12. [Configuration & Options](#configuration--options)  
13. [Examples](#examples)  
    - [Simple Echo Bot](#simple-echo-bot)  
    - [Send an Image with Caption](#send-an-image-with-caption)  
    - [Rotate Group Subject](#rotate-group-subject)  
    - [Webhook Bridge](#webhook-bridge)  
14. [Contributing](#contributing)  
15. [Acknowledgments](#acknowledgments)  
16. [License](#license)  

---

## Repository & Links

- **GitHub Repository:**  
  https://github.com/gyovannyvpn123/borutowaileys-library.git  
- **npm Package:**  
  https://www.npmjs.com/package/@borutowaileys/library  
- **Documentation & Issues:**  
  Visit the GitHub repo above to open issues, read source code, or view additional examples.

---

## Features

- **Latest WhatsApp Protocol (v2.3534.4, May 2025)**  
  Always up-to-date with official WhatsApp Web changes (auto-detects new protocol on startup).   
- **Multi-Device Support**  
  Fully supports multi-device sessions (each device can send/receive simultaneously, history sync included).  
- **Dual Authentication Modes**  
  - **QR-Code Pairing** (visual): scan with WhatsApp → Settings → Linked Devices → Link a Device.  
  - **Pairing Code** (headless/CLI): receive a pairing code in console, enter it manually in WhatsApp to link without a QR.  
- **Complete End-to-End Encryption**  
  Real Signal Protocol key exchange, double ratchet, media encryption/decryption.  
- **All Message Types Supported**  
  - **Text**: plain, extended, emojis, markdown-style formatting  
  - **Images**: JPEG/PNG with optional captions  
  - **Videos**: MP4 with captions  
  - **Audio**: MP3/OPUS (with support for PTT “voice note”)  
  - **Documents**: PDFs, DOCX, XLSX, ZIP, etc. (custom mimetype/fileName)  
  - **Stickers**: static & animated WebP, author/pack metadata  
  - **Reactions**: emoji replies to any existing message  
  - **Location**: static location and live-location tracking  
  - **Contact Cards**: vCard sharing  
  - **Status (Stories)**: upload and fetch status updates (images and videos)  
  - **Buttons & Templates**: interactive buttons, list messages, catalog templates  
  - **Ephemeral Messages**: 24-hour disappearing messages  
- **Group & Broadcast Management**  
  - Create/delete groups, add/remove/promote/demote participants  
  - Change subject, description, settings (e.g., “only admins can post”)  
  - Invite-link generation & revocation  
  - Fetch group metadata: participants, settings, admin list  
  - Broadcast lists: send to multiple contacts without group creation  
- **Presence & Typing Indicators**  
  Send/receive “typing…”, “recording…”, “paused” events; read receipts and delivery acknowledgments.  
- **In-Memory TTL Cache**  
  Cache contacts, chats, and group metadata with automatic expiration; optional disk persistence slot.  
- **Event-Driven Architecture**  
  Subscribe to a rich set of events:  
  - `messages.upsert` (new/incoming messages)  
  - `groups.update` (metadata changes)  
  - `group-participants.update` (joins, leaves, promotions)  
  - `contacts.update` (profile/name changes)  
  - `presence.update` (typing, recording)  
  - `call` (incoming voice/video calls)  
  - `connection.update` (connection status)  
- **Media Upload & Download Pipeline**  
  Automatic chunking, encryption, and HTTPS upload/decrypt; supports Buffer, Stream, and URL.  
- **Rate Limiting & Retries**  
  Built-in throttler to prevent spam blocks; automatic reconnect and sync on network drops.  
- **Webhook Integration**  
  Forward any event (messages, group events, presence) to external HTTP endpoints via simple hook.  
- **Custom Logging**  
  Integrates with [Pino](https://github.com/pinojs/pino) or any other compatible logger.  
- **CommonJS & ESM Support**  
  Works with `require()` (Node.js v18+) and `import` (Node.js v20+).  
- **Optimized for Headless Environments**  
  Perfect for Termux, Docker containers, Linux/VPS, and CI/CD pipelines.  
- **CLI & Scripting Friendly**  
  Build interactive menus (e.g., [inquirer](https://www.npmjs.com/package/inquirer)), handle long-running loops, queue messages from files.  
- **Flexible Media Filters & Manipulations**  
  - Compress, resize, and watermark images/videos  
  - Convert audio to OPUS for PTT  
  - Generate QR codes and sticker conversions  

---

## Installation

```bash
# Install from npm
npm install @borutowaileys/library

> Note: Current stable version is 6.12.37 (Published three days ago). Ensure you pin your package.json accordingly.



# Or clone directly from GitHub for the latest/experimental features
git clone https://github.com/gyovannyvpn123/borutowaileys-library.git
cd borutowaileys-library
npm install


---

Quick Start

1. Import & Initialize

// CommonJS
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@borutowaileys/library');
const Pino = require('pino');


2. Load or Create Auth State

async function createSocket() {
  // Creates ./auth_info/creds.json and ./auth_info/session-* files
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,      // Set false if using pairing code
    connectTimeoutMs: 60000,
    logger: Pino({ level: 'silent' }),
  });
  sock.ev.on('creds.update', saveCreds);
  return sock;
}


3. Handle Connection Updates

(async () => {
  const sock = await createSocket();
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('🔑 Pairing QR/code received. Scan or enter manually in WhatsApp.');
    }
    if (connection === 'open') {
      console.log('✅ Connected to WhatsApp Web!');
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Network or server issue. Reconnecting...');
        createSocket().catch(console.error);
      } else {
        console.error('🚪 Logged out. Delete ./auth_info and restart.');
        process.exit(0);
      }
    }
  });
})();


4. Listen & Respond to Messages

sock.ev.on('messages.upsert', async (upsert) => {
  const msg = upsert.messages[0];
  if (!msg.message || msg.key.fromMe) return; // ignore our own outgoing messages

  const jid = msg.key.remoteJid;
  const text = msg.message.conversation 
               ?? msg.message.extendedTextMessage?.text 
               ?? null;
  if (!text) return;

  console.log(`📩 Message from ${jid}: ${text}`);
  // Echo back
  await sock.sendMessage(jid, { text: `🔄 You said: ${text}` });
});




---

Authentication

QR-Code Pairing

By default, setting printQRInTerminal: true prints a QR code in your console. Scan it with WhatsApp → Settings → Linked Devices → Link a Device → Scan QR. Session credentials are saved under ./auth_info.

const sock = makeWASocket({ 
  auth: state, 
  printQRInTerminal: true,
  connectTimeoutMs: 60000,
  logger: Pino({ level: 'silent' })
});

Pairing Code (Headless)

For Termux, Docker, or any environment without a TTY for QR codes, set printQRInTerminal: false. The library emits a 10-character pairing code via connection.update. Enter that code in WhatsApp’s “Linked Devices” → “Link a Device” → “Enter Code Manually”. Once completed, creds.update triggers saveCreds() to persist the session.

sock.ev.on('connection.update', async (update) => {
  if (update.qr && !update.connection) {
    console.log(`🔑 Pairing code: ${update.qr}`);
    console.log('Enter this code in Linked Devices on WhatsApp.');
  }
  if (update.connection === 'open') {
    console.log('✅ Pairing complete!');
  }
});


---

Core Concepts

useMultiFileAuthState(folderPath)

Manages auth credentials in multiple files (creds.json, session-*).

Returns { state, saveCreds }.

Always call saveCreds() inside sock.ev.on('creds.update') to persist.


makeWASocket(options)
Factory function that returns a connected sock object.
Key options:

auth: state from useMultiFileAuthState

printQRInTerminal: boolean (QR code vs pairing code)

connectTimeoutMs: connection timeout in milliseconds

logger: Pino logger or any compatible logger

version: override WhatsApp protocol version (default auto)

browser: override browser description (e.g., { name: 'Firefox', version: '87.0' })

messageThrottle: milliseconds between consecutive sends

syncFullHistory: boolean (syncs entire chat history on reconnect)

mediaUploadTimeoutMs: timeout per media chunk

mediaChunkSize: chunk size (bytes) for large media

store: optional custom in-memory/persisted store instance


Events (sock.ev.on)

messages.upsert: triggered on new incoming messages

groups.update: group metadata changes (title, desc, size)

group-participants.update: members added/removed/promoted/demoted

contacts.update: contact info changes (name, profile pic)

presence.update: typing/recording/presence changes

connection.update: connection state changes (connecting, open, close)

creds.update: new auth credentials—call saveCreds() here

call: incoming voice/video call events

contacts.upsert: new contacts added to phone




---

Supported Message Types

Type	Usage Example	Description

Text	await sock.sendMessage(jid, { text: 'Hello World!' });	Plain or extended text (supports emojis, markdown).
Extended Text	await sock.sendMessage(jid, { extendedText: { text: 'Hello @user', contextInfo: { mentionedJid: ['user@s.whatsapp.net'] } }});	Mentions, quoted replies, rich formatting.
Image	await sock.sendMessage(jid, { image: fs.readFileSync('./pic.jpg'), caption: 'Check this out!' });	JPEG/PNG images; auto-compress if large.
Video	await sock.sendMessage(jid, { video: fs.readFileSync('./video.mp4'), caption: 'Watch this!' });	MP4 videos with captions; auto-compress for optimal size.
Audio	await sock.sendMessage(jid, { audio: fs.readFileSync('./audio.mp3'), ptt: true });	MP3/OPUS audio; set ptt: true to send as voice note (PTT).
Document	await sock.sendMessage(jid, { document: fs.readFileSync('./file.pdf'), mimetype: 'application/pdf', fileName: 'report.pdf' });	Any file type (PDF, DOCX, XLSX, ZIP, etc.).
Sticker	await sock.sendMessage(jid, { sticker: fs.readFileSync('./sticker.webp'), packname: 'MyPack', author: 'Me' });	Static or animated WebP stickers (supports metadata).
Reaction	await sock.sendMessage(jid, { react: { text: '❤️', key: existingMessageKey } });	React to an existing message with an emoji.
Location	await sock.sendMessage(jid, { location: { degreesLatitude: 37.7749, degreesLongitude: -122.4194, name: 'San Francisco', address: 'CA, USA' } });	Share static location.
Live Location	await sock.sendMessage(jid, { liveLocation: { degreesLatitude: 37.7749, degreesLongitude: -122.4194, url: 'https://maps.app.goo.gl/xyz' } });	Share a live location link.
Contact Card	await sock.sendMessage(jid, { contacts: [{ displayName: 'John Doe', vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD' }] });	Share vCard contact cards.
Status (Story)	await sock.sendMessage(jid, { status: { image: fs.readFileSync('./status.jpg'), caption: 'Hello everyone!' } });	Post or fetch status updates (images/videos).
Buttons & Lists	await sock.sendMessage(jid, { buttons: [{ buttonId: 'id1', buttonText: { displayText: 'Click Me' }, type: 1 }], text: 'Choose:', footer: 'Footer', headerType: 1 });	Interactive buttons (max 3) and list messages.
Template Messages	await sock.sendMessage(jid, { hydratedButtons: [{ urlButton: { displayText: 'Visit', url: 'https://example.com' } }], text: 'Template Example' });	Catalog templates, rich interactive messages with URL buttons, call buttons, quick replies, etc.
Ephemeral Messages	await sock.sendMessage(jid, { ephemeral: true });	Send disappearing (ephemeral) messages.


> Downloading Media

if (msg.message.imageMessage) {
  const buffer = await sock.downloadMediaMessage(msg, 'buffer');
  fs.writeFileSync(`./downloads/${msg.key.id}.jpg`, buffer);
}




---

Group & Metadata Management

Create a Group

const group = await sock.groupCreate('My New Group', [
  '11111@s.whatsapp.net',
  '22222@s.whatsapp.net'
]);
console.log('✅ Group created with ID:', group.gid);

Add Participants

await sock.groupAdd('12345-67890@g.us', [
  '33333@s.whatsapp.net',
  '44444@s.whatsapp.net'
]);

Remove Participants

await sock.groupRemove('12345-67890@g.us', [
  '33333@s.whatsapp.net'
]);

Promote / Demote Admin

await sock.groupMakeAdmin('12345-67890@g.us', ['55555@s.whatsapp.net']);
await sock.groupDemoteAdmin('12345-67890@g.us', ['55555@s.whatsapp.net']);

Update Group Subject / Description

await sock.groupUpdateSubject('12345-67890@g.us', 'New Subject');
await sock.groupUpdateDescription('12345-67890@g.us', 'Updated group description');

Generate & Revoke Invite Link

const res = await sock.groupInviteCode('12345-67890@g.us');
console.log('Invite Link:', `https://chat.whatsapp.com/${res.inviteCode}`);
// To revoke:
await sock.groupRevoke('12345-67890@g.us');

Fetch Group Metadata

const metadata = await sock.groupMetadata('12345-67890@g.us');
console.log('Group Subject:', metadata.subject);
console.log('Participants:', metadata.participants.map(p => p.jid));



---

Event-Driven API

// Incoming messages
sock.ev.on('messages.upsert', async (up) => {
  const msg = up.messages[0];
  if (!msg.message) return;

  // Text
  const text = msg.message.conversation
             ?? msg.message.extendedTextMessage?.text
             ?? null;
  if (text) console.log(`📩 Received text: ${text}`);

  // Reaction
  if (msg.message.reactionMessage) {
    console.log(`💬 Reaction: ${msg.message.reactionMessage.text}`);
  }

  // Image
  if (msg.message.imageMessage) {
    const imgBuffer = await sock.downloadMediaMessage(msg, 'buffer');
    fs.writeFileSync(`./images/${msg.key.id}.jpg`, imgBuffer);
  }
});

// Group participant updates
sock.ev.on('group-participants.update', (update) => {
  const { id, participants, action } = update;
  console.log(`👥 Group ${id} action: ${action}`, participants);
});

// Connection updates
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
  console.log('🔌 Connection status:', connection);
  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode;
    if (code !== DisconnectReason.loggedOut) {
      console.log('🔄 Reconnecting...');
      createSocket().catch(console.error);
    } else {
      console.error('🚪 Logged out. Exiting...');
      process.exit(0);
    }
  }
});


---

Media Upload & Download

Upload & Send Media

const pdfBuffer = fs.readFileSync('./files/report.pdf');
await sock.sendMessage('123456789@s.whatsapp.net', {
  document: pdfBuffer,
  mimetype: 'application/pdf',
  fileName: 'MonthlyReport.pdf'
});

Download Media from Incoming Message

if (msg.message.videoMessage) {
  const videoBuffer = await sock.downloadMediaMessage(msg, 'buffer');
  fs.writeFileSync(`./downloads/${msg.key.id}.mp4`, videoBuffer);
}

Stream-Based Upload

const videoStream = fs.createReadStream('./large-video.mp4');
await sock.sendMessage('123456789@s.whatsapp.net', {
  video: videoStream,
  caption: 'Watch this long video!'
});



---

Rate Limiting & Reconnect

Built-In Throttler
Automatically spaces out outgoing messages to respect WhatsApp’s anti-spam limits.

Automatic Reconnect
On non-logout disconnects, the library attempts to reconnect and re-sync state.

Manual Delays
For custom loops or spamming actions, use:

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
let running = true;
while (running) {
  await sock.sendMessage(jid, { text: 'Automated message' });
  await delay(5000); // 5-second interval
}



---

Configuration & Options

When calling makeWASocket(options), available options include:

interface WAConnectOptions {
  auth: AuthenticationState;             // from useMultiFileAuthState
  printQRInTerminal?: boolean;           // show QR code vs pairing code
  connectTimeoutMs?: number;             // default: 60_000
  logger?: Pino.Logger;                  // Pino or custom logger
  version?: [number, number, number];    // override WhatsApp Web version
  browser?: { name: string; version: string }; // override user-agent
  keepAliveIntervalMs?: number;          // default: 25_000
  messageThrottle?: number;              // custom throttle delay (ms)
  syncFullHistory?: boolean;             // sync entire chat history on reconnect
  mediaUploadTimeoutMs?: number;         // timeout per chunk upload (ms)
  mediaChunkSize?: number;               // chunk size (bytes) for large media
  store?: KeyedDBStore<any>;             // custom in-memory or persisted store
  readReceipt?: boolean;                 // send read receipts (default: true)
  reportHistoryErrors?: boolean;         // log history sync errors
  generateHighQualityLinkPreview?: boolean; // fetch rich link previews automatically
}


---

Examples

Simple Echo Bot

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@borutowaileys/library');
const Pino = require('pino');
const fs = require('fs');

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: Pino({ level: 'info' })
  });

  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'open') console.log('✅ Connected!');
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (up) => {
    const msg = up.messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation ?? msg.message.extendedTextMessage?.text;
    if (!text) return;

    console.log(`↩️ Echoing to ${from}: ${text}`);
    await sock.sendMessage(from, { text: `Echo: ${text}` });
  });
})();

Send an Image with Caption

const fs = require('fs');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@borutowaileys/library');

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.once('connection.update', ({ connection }) => {
    if (connection === 'open') {
      console.log('✅ Connected! Sending image...');
      const imgBuffer = fs.readFileSync('./cat.jpg');
      sock.sendMessage('123456789@s.whatsapp.net', {
        image: imgBuffer,
        caption: 'Cute cat photo! 🐱'
      });
    }
  });

  sock.ev.on('creds.update', saveCreds);
})();

Rotate Group Subject

const {
  makeWASocket,
  useMultiFileAuthState
} = require('@borutowaileys/library');

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open') {
      console.log('✅ Connected! Starting group name rotation...');
      const groupId = '12345-67890@g.us';
      const subjects = ['Team Alpha', 'Team Beta', 'Team Gamma'];
      let idx = 0;

      setInterval(async () => {
        try {
          await sock.groupUpdateSubject(groupId, subjects[idx]);
          console.log(`🔄 Updated group subject: ${subjects[idx]}`);
          idx = (idx + 1) % subjects.length;
        } catch (err) {
          console.error('❌ Error updating group subject:', err);
        }
      }, 10000); // every 10 seconds
    }
  });

  sock.ev.on('creds.update', saveCreds);
})();

Webhook Bridge

Forward every new message to an external HTTP endpoint:

const fetch = require('node-fetch');
const {
  makeWASocket,
  useMultiFileAuthState
} = require('@borutowaileys/library');

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });
  const WEBHOOK_URL = 'https://example.com/whatsapp-webhook';

  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'open') console.log('✅ Connected! Forwarding to webhook...');
  });

  sock.ev.on('messages.upsert', async (up) => {
    const msg = up.messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const payload = {
      id: msg.key.id,
      from: msg.key.remoteJid,
      timestamp: msg.messageTimestamp,
      type: Object.keys(msg.message)[0],
      content:
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        null
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('🔄 Webhook forwarded.');
    } catch (err) {
      console.error('❌ Webhook error:', err);
    }
  });

  sock.ev.on('creds.update', saveCreds);
})();


---

Contributing

Contributions are highly welcome! Whether it’s a bug fix, feature request, documentation improvement, or example, please follow these steps:

1. Fork the repository.


2. Clone your fork (git clone https://github.com/<your-user>/borutowaileys-library.git).


3. Create a new branch (git checkout -b feature/my-awesome-feature).


4. Implement your changes and add tests (if applicable).


5. Commit with a clear message (git commit -m "feat: add new feature").


6. Push to your fork (git push origin feature/my-awesome-feature).


7. Open a Pull Request against main describing:

What problem it solves

How to test it

Any backward-compatibility considerations




Please adhere to existing code style (ESLint + Prettier), write comprehensive commit messages, and update this README as needed.


---

Acknowledgments

sigalor/whatsapp-web-reveng
A huge thank you to the maintainers and contributors of WhatsApp Web Reverse-Engineering. Their tireless efforts provided the foundation for decrypting protocols, sessions, and media formats.

The @borutowaileys/library Team & Community
Thanks to every developer, tester, issue-reporter, and user who helped refine this library. Your suggestions, bug reports, and PRs make it better for everyone.



---

License

This project is licensed under the MIT License. See LICENSE for full details.

> Disclaimer: Use this library responsibly and in compliance with WhatsApp’s Terms of Service.





