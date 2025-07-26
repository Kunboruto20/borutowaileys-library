const fs = require('fs');
const path = require('path');

/**
 * Script pentru aplicarea fix-urilor în biblioteca borutowaileyss din node_modules
 * Rulează: node apply-fixes.js
 */

console.log('🔧 Aplicare fix-uri pentru erorile WhatsApp...\n');

// Găsește directorul node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const libraryPath = path.join(nodeModulesPath, 'borutowaileyss');

if (!fs.existsSync(libraryPath)) {
    console.error('❌ Nu găsesc biblioteca borutowaileyss în node_modules');
    console.log('Caută manual în:', nodeModulesPath);
    process.exit(1);
}

console.log('✅ Găsit biblioteca în:', libraryPath);

// Fix 1: Modifică websocket.js pentru HTTP 405 și reconectări
const websocketPath = path.join(libraryPath, 'lib', 'Socket', 'Client', 'websocket.js');
if (fs.existsSync(websocketPath)) {
    console.log('🔄 Aplicare fix în websocket.js...');
    
    let websocketContent = fs.readFileSync(websocketPath, 'utf8');
    
    // Fix pentru header-uri HTTP 405
    const oldHeaders = `this.socket = new ws_1.default(this.url, {
      origin: Defaults_1.DEFAULT_ORIGIN,
      headers: this.config.options?.headers,
      handshakeTimeout: this.config.connectTimeoutMs,
      timeout: this.config.connectTimeoutMs,
      agent: this.config.agent,
    });`;

    const newHeaders = `// Fix pentru HTTP 405 - header-uri optimizate
    const optimizedHeaders = {
      'User-Agent': 'WhatsApp/2.2316.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...this.config.options?.headers
    };

    this.socket = new ws_1.default(this.url, {
      origin: Defaults_1.DEFAULT_ORIGIN,
      headers: optimizedHeaders,
      handshakeTimeout: this.config.connectTimeoutMs || 30000,
      timeout: this.config.connectTimeoutMs || 30000,
      agent: this.config.agent,
    });`;

    if (websocketContent.includes('User-Agent')) {
        console.log('⚠️ Fix-ul pentru header-uri pare să fie deja aplicat');
    } else {
        websocketContent = websocketContent.replace(oldHeaders, newHeaders);
    }

    // Fix pentru reconectări inteligente
    const oldReconnect = `const delay = this.reconnectDelay * Math.pow(2, this.currentReconnectAttempts - 1);`;
    const newReconnect = `// Fix pentru reconectări - exponential backoff intelligent
        const delays = [2000, 5000, 10000, 20000, 30000];
        const delay = delays[Math.min(this.currentReconnectAttempts - 1, delays.length - 1)];
        
        // Fix pentru HTTP 428/500 - emit event pentru curățare sesiune
        if ((code === 428 || code === 500) && this.config.clearAuthOnError !== false) {
          this.emit("clear_auth_required", { code, reason });
        }`;

    if (websocketContent.includes('delays = [2000, 5000')) {
        console.log('⚠️ Fix-ul pentru reconectări pare să fie deja aplicat');
    } else {
        websocketContent = websocketContent.replace(oldReconnect, newReconnect);
    }

    fs.writeFileSync(websocketPath, websocketContent);
    console.log('✅ Fix aplicat în websocket.js');
} else {
    console.log('❌ Nu găsesc websocket.js în:', websocketPath);
}

// Fix 2: Modifică socket.js pentru configurare optimizată
const socketPath = path.join(libraryPath, 'lib', 'Socket', 'socket.js');
if (fs.existsSync(socketPath)) {
    console.log('🔄 Aplicare fix în socket.js...');
    
    let socketContent = fs.readFileSync(socketPath, 'utf8');
    
    // Fix pentru configurare optimizată
    const oldConfig = `const ws = new Client_1.WebSocketClient(url, config);`;
    const newConfig = `// Fix pentru HTTP 405 - configurare optimizată
  const optimizedConfig = {
    ...config,
    browser: config.browser || ['Ubuntu', 'Chrome', '20.0.04'],
    options: {
      ...config.options,
      headers: {
        'User-Agent': 'WhatsApp/2.2316.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...config.options?.headers
      }
    },
    connectTimeoutMs: config.connectTimeoutMs || 30000,
    defaultQueryTimeoutMs: config.defaultQueryTimeoutMs || 30000,
    keepAliveIntervalMs: config.keepAliveIntervalMs || 25000,
    qrTimeout: config.qrTimeout || 60000,
    clearAuthOnError: config.clearAuthOnError !== false
  };

  const ws = new Client_1.WebSocketClient(url, optimizedConfig);`;

    if (socketContent.includes('optimizedConfig')) {
        console.log('⚠️ Fix-ul pentru socket.js pare să fie deja aplicat');
    } else {
        socketContent = socketContent.replace(oldConfig, newConfig);
    }

    fs.writeFileSync(socketPath, socketContent);
    console.log('✅ Fix aplicat în socket.js');
} else {
    console.log('❌ Nu găsesc socket.js în:', socketPath);
}

// Fix 3: Creează fișierul auth-utils.js pentru HTTP 428
const authUtilsPath = path.join(libraryPath, 'lib', 'Utils', 'auth-utils.js');
const authUtilsContent = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCorruptedAuthSession = void 0;

const fs = require('fs');
const path = require('path');

/**
 * Fix pentru HTTP 428 - Curăță sesiunea de autentificare coruptă
 */
const clearCorruptedAuthSession = async (authDir) => {
    try {
        if (!fs.existsSync(authDir)) {
            return true;
        }

        const files = fs.readdirSync(authDir);
        let filesDeleted = 0;

        for (const file of files) {
            if (file.includes('creds.json') || file.includes('keys.json') || file.includes('session-')) {
                const filePath = path.join(authDir, file);
                try {
                    fs.unlinkSync(filePath);
                    filesDeleted++;
                    console.log(\`🗑️ Deleted corrupted auth file: \${file}\`);
                } catch (error) {
                    console.warn(\`⚠️ Could not delete \${file}:\`, error.message);
                }
            }
        }

        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        if (filesDeleted > 0) {
            console.log(\`✅ Cleared \${filesDeleted} corrupted auth files from \${authDir}\`);
        }

        return true;
    } catch (error) {
        console.error('❌ Error clearing auth session:', error.message);
        return false;
    }
};

exports.clearCorruptedAuthSession = clearCorruptedAuthSession;
`;

if (!fs.existsSync(authUtilsPath)) {
    fs.writeFileSync(authUtilsPath, authUtilsContent);
    console.log('✅ Creat auth-utils.js pentru fix HTTP 428');
} else {
    console.log('⚠️ auth-utils.js există deja');
}

console.log('\n🎯 Fix-urile au fost aplicate!');
console.log('📝 Acum rulează din nou aplicația ta:');
console.log('   node ree.mjs');
console.log('\n🔍 Căută în log-uri:');
console.log('   - QR code să apară');
console.log('   - Mesajele "Fix pentru HTTP..." în console');
console.log('   - Reconectări mai rare și mai inteligente');

// Bonus: Creează un script de curățare rapidă
const quickCleanPath = path.join(process.cwd(), 'clean-auth.js');
const quickCleanContent = `// Script rapid pentru curățarea sesiunii corupte
const fs = require('fs');
const path = require('path');

const authDir = './auth_info'; // Schimbă cu directorul tău

console.log('🧹 Curățare sesiune WhatsApp...');

if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    for (const file of files) {
        if (file.includes('creds.json') || file.includes('keys.json')) {
            fs.unlinkSync(path.join(authDir, file));
            console.log('🗑️ Șters:', file);
        }
    }
}

console.log('✅ Sesiune curățată! Acum rulează din nou aplicația.');
`;

if (!fs.existsSync(quickCleanPath)) {
    fs.writeFileSync(quickCleanPath, quickCleanContent);
    console.log('🎁 Bonus: Creat clean-auth.js pentru curățare rapidă');
}