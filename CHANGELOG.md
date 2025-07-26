# Changelog - @borutowaileys/library

## [6.12.49] - 2024-12-19

### 🔧 Bug Fixes & Improvements

#### Fixed HTTP 405 - Method Not Allowed
- **Added optimized HTTP headers** in WebSocket client (`lib/Socket/Client/websocket.js`)
- **Updated User-Agent** to WhatsApp/2.2316.4 with proper browser identification
- **Enhanced header configuration** with Accept, Accept-Language, Accept-Encoding
- **Improved browser detection** with default ['Ubuntu', 'Chrome', '20.0.04']

#### Fixed HTTP 428 - Precondition Required  
- **Added automatic corrupted session cleanup** in WebSocket client
- **Created `clearCorruptedAuthSession` utility** in `lib/Utils/auth-utils.js`
- **Added `clear_auth_required` event** emission on session corruption
- **Enhanced auth session management** with automatic recovery

#### Fixed WebSocket Error 1006/500 - Internal Server Error
- **Improved error handling** in WebSocket close events
- **Added specific error code detection** (428, 500, 503)
- **Enhanced session validation** and automatic cleanup triggers
- **Better connection state management**

#### Fixed Reconnection Issues
- **Implemented intelligent exponential backoff** (2s, 5s, 10s, 20s, 30s)
- **Added service-specific delays** (2x delay for 503 Service Unavailable)
- **Enhanced reconnection attempt tracking** with proper limits
- **Improved connection stability** with optimized timeouts

#### Enhanced Configuration
- **Increased default timeouts**: connectTimeoutMs: 30000, qrTimeout: 60000
- **Optimized keep-alive interval**: keepAliveIntervalMs: 25000  
- **Added `clearAuthOnError` configuration** option (default: true)
- **Enhanced socket configuration** with better defaults

### 📦 New Features

#### Auth Session Management
- **New `clearCorruptedAuthSession(authDir)` function** for manual session cleanup
- **Automatic session corruption detection** and recovery
- **Enhanced multi-file auth state** handling
- **Better error recovery mechanisms**

#### Enhanced Socket Configuration
- **Optimized default configurations** for better stability
- **Improved header management** for WhatsApp compatibility
- **Enhanced browser identification** for reduced blocking
- **Better timeout and retry configurations**

### 🚀 Usage Examples

#### Basic Usage with Auto-Fix
```javascript
const { makeWASocket, useMultiFileAuthState } = require('@borutowaileys/library');

const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
const sock = makeWASocket({
    auth: state,
    // Fix-urile sunt aplicate automat!
});
```

#### Manual Session Cleanup
```javascript
const { clearCorruptedAuthSession } = require('@borutowaileys/library');

// Curăță manual sesiunea coruptă
await clearCorruptedAuthSession('./auth_info');
```

#### Enhanced Error Handling
```javascript
sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        
        // Fix-urile se aplică automat pentru:
        // - 405 (Method Not Allowed)
        // - 428 (Precondition Required) 
        // - 500 (Internal Server Error)
        // - 1006 (WebSocket Connection Error)
    }
});
```

### 🔄 Migration Guide

#### From v6.12.48 to v6.12.49
- **No breaking changes** - all fixes are backward compatible
- **Automatic error recovery** - no code changes required
- **Enhanced stability** - existing code will work better
- **Optional configuration** - new options available but not required

#### Recommended Updates
```javascript
// Opțional: configurare explicită pentru control maxim
const sock = makeWASocket({
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs: 30000,
    qrTimeout: 60000,
    clearAuthOnError: true, // Activează curățarea automată
});
```

### 🐛 Issues Fixed
- ✅ HTTP 405 - Method Not Allowed errors
- ✅ HTTP 428 - Precondition Required errors  
- ✅ WebSocket 1006/500 - Internal Server Error
- ✅ Repetitive failed reconnection attempts
- ✅ QR code not generating due to connection issues
- ✅ Session corruption causing permanent failures
- ✅ Poor reconnection strategy with fixed delays

### 📈 Performance Improvements
- **Faster connection establishment** with optimized headers
- **Better reconnection success rate** with intelligent backoff
- **Reduced server load** with proper delay strategies
- **Enhanced session management** with automatic cleanup

---

## [6.12.48] - Previous Version
- Base functionality
- Original Baileys integration
- Basic WebSocket implementation

---

**Note**: Toate fix-urile sunt implementate la nivel de bibliotecă și se aplică automat fără a necesita modificări în codul existent. Pentru control maxim, folosiți noile opțiuni de configurare disponibile.