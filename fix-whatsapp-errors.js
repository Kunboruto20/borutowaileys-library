const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@borutowaileys/library');
const fs = require('fs');
const path = require('path');

/**
 * Fix pentru erorile WhatsApp cu BorutoWaileys/Baileys
 * Soluții pentru: HTTP 405, HTTP 428, WebSocket 1006/500, reconectări eșuate
 */

class WhatsAppErrorHandler {
    constructor(options = {}) {
        this.authDir = options.authDir || './auth_info';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
        this.currentRetries = 0;
        this.sock = null;
        this.isConnecting = false;
        this.shouldReconnect = true;
    }

    /**
     * Soluție pentru HTTP 428 - Precondition Required
     * Curăță și resetează sesiunea de autentificare
     */
    async clearAuthSession() {
        try {
            console.log('🔄 Curățare sesiune autentificare...');
            
            // Șterge fișierele de autentificare corupte
            if (fs.existsSync(this.authDir)) {
                const files = fs.readdirSync(this.authDir);
                for (const file of files) {
                    if (file.includes('creds.json') || file.includes('keys.json')) {
                        fs.unlinkSync(path.join(this.authDir, file));
                        console.log(`✅ Șters: ${file}`);
                    }
                }
            }

            // Forțează recrearea directorului de autentificare
            if (!fs.existsSync(this.authDir)) {
                fs.mkdirSync(this.authDir, { recursive: true });
            }

            console.log('✅ Sesiune curățată cu succes');
        } catch (error) {
            console.error('❌ Eroare la curățarea sesiunii:', error.message);
        }
    }

    /**
     * Soluție pentru HTTP 405 - Method Not Allowed
     * Configurare corectă a header-elor și user-agent
     */
    getOptimizedSocketConfig() {
        return {
            // Fix pentru HTTP 405 - header-uri corecte
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            
            // Configurare WebSocket optimizată
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 25000,
            
            // Fix pentru reconectări
            autoReconnect: true,
            maxReconnectAttempts: 3,
            
            // Configurare pentru evitarea erorilor de metodă
            options: {
                headers: {
                    'User-Agent': 'WhatsApp/2.2316.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            },

            // Configurare pentru evitarea WebSocket 1006
            printQRInTerminal: true,
            qrTimeout: 60000,
            markOnlineOnConnect: false,
            
            // Configurare avansată pentru stabilitate
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
            
            // Logger optimizat
            logger: {
                level: 'silent' // Reduce spam-ul de log-uri
            }
        };
    }

    /**
     * Soluție pentru WebSocket Error 1006/500
     * Gestionare avansată a erorilor WebSocket
     */
    handleWebSocketError(error, lastDisconnect) {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        
        console.log(`🔍 Cod eroare WebSocket: ${statusCode}`);
        
        switch (statusCode) {
            case 428: // Precondition Required
                console.log('🔧 Fix HTTP 428: Resetare sesiune autentificare');
                return 'clear_auth';
                
            case 405: // Method Not Allowed  
                console.log('🔧 Fix HTTP 405: Reconfigurare header-uri');
                return 'reconfigure';
                
            case 500: // Internal Server Error / Bad Session
                console.log('🔧 Fix WebSocket 500: Sesiune invalidă');
                return 'clear_auth';
                
            case 408: // Timeout
                console.log('🔧 Fix 408: Timeout - reconectare');
                return 'reconnect';
                
            case 401: // Unauthorized
                console.log('🔧 Fix 401: Re-autentificare necesară');
                return 'clear_auth';
                
            case 503: // Service Unavailable
                console.log('🔧 Fix 503: Server indisponibil - așteptare');
                return 'wait_and_retry';
                
            default:
                console.log('🔧 Eroare necunoscută - reconectare standard');
                return 'reconnect';
        }
    }

    /**
     * Implementare delay intelligent pentru reconectări
     */
    async waitWithBackoff(attempt) {
        const delays = [2000, 5000, 10000, 20000, 30000]; // Delay-uri în ms
        const delay = delays[Math.min(attempt, delays.length - 1)];
        
        console.log(`⏳ Așteptare ${delay/1000}s înainte de reconectare (încercarea ${attempt + 1})...`);
        
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Funcție principală de conectare cu toate fix-urile implementate
     */
    async connectWithErrorHandling() {
        if (this.isConnecting) {
            console.log('⚠️ Conexiune deja în progres...');
            return;
        }

        this.isConnecting = true;

        try {
            // Încarcă starea de autentificare
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            
            // Configurare socket cu toate fix-urile
            const config = {
                ...this.getOptimizedSocketConfig(),
                auth: state
            };

            console.log('🚀 Inițializare conexiune WhatsApp...');
            this.sock = makeWASocket(config);

            // Event handler pentru actualizarea conexiunii
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('📱 Scanează codul QR pentru autentificare');
                }

                if (connection === 'close') {
                    this.isConnecting = false;
                    
                    if (!this.shouldReconnect) {
                        console.log('🔴 Conexiune închisă manual');
                        return;
                    }

                    const fixAction = this.handleWebSocketError(null, lastDisconnect);
                    
                    switch (fixAction) {
                        case 'clear_auth':
                            await this.clearAuthSession();
                            await this.waitWithBackoff(this.currentRetries);
                            this.currentRetries++;
                            if (this.currentRetries < this.maxRetries) {
                                this.connectWithErrorHandling();
                            } else {
                                console.log('❌ Numărul maxim de încercări atins');
                            }
                            break;
                            
                        case 'reconfigure':
                            await this.waitWithBackoff(this.currentRetries);
                            this.currentRetries++;
                            if (this.currentRetries < this.maxRetries) {
                                this.connectWithErrorHandling();
                            }
                            break;
                            
                        case 'wait_and_retry':
                            await this.waitWithBackoff(this.currentRetries + 2); // Delay mai mare
                            this.currentRetries++;
                            if (this.currentRetries < this.maxRetries) {
                                this.connectWithErrorHandling();
                            }
                            break;
                            
                        default:
                            await this.waitWithBackoff(this.currentRetries);
                            this.currentRetries++;
                            if (this.currentRetries < this.maxRetries) {
                                this.connectWithErrorHandling();
                            }
                    }
                } else if (connection === 'open') {
                    this.isConnecting = false;
                    this.currentRetries = 0; // Reset counter la conexiune reușită
                    console.log('✅ Conectat cu succes la WhatsApp!');
                }
            });

            // Salvare automată a credențialelor
            this.sock.ev.on('creds.update', saveCreds);

            // Gestionare mesaje primite
            this.sock.ev.on('messages.upsert', async (m) => {
                const message = m.messages[0];
                if (!message.key.fromMe && m.type === 'notify') {
                    console.log('📨 Mesaj nou primit:', message.message?.conversation || 'Media/altceva');
                }
            });

        } catch (error) {
            this.isConnecting = false;
            console.error('❌ Eroare la conectare:', error.message);
            
            if (this.currentRetries < this.maxRetries) {
                await this.waitWithBackoff(this.currentRetries);
                this.currentRetries++;
                this.connectWithErrorHandling();
            }
        }
    }

    /**
     * Oprire conexiune
     */
    async disconnect() {
        console.log('🔴 Deconectare WhatsApp...');
        this.shouldReconnect = false;
        
        if (this.sock) {
            this.sock.end();
            this.sock = null;
        }
    }

    /**
     * Trimitere mesaj cu retry logic
     */
    async sendMessage(jid, message, retries = 3) {
        if (!this.sock || !this.sock.user) {
            throw new Error('WhatsApp nu este conectat');
        }

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const result = await this.sock.sendMessage(jid, message);
                console.log('✅ Mesaj trimis cu succes');
                return result;
            } catch (error) {
                console.log(`❌ Încercarea ${attempt + 1} eșuată:`, error.message);
                
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }
    }
}

// Exemplu de utilizare
async function main() {
    const whatsapp = new WhatsAppErrorHandler({
        authDir: './whatsapp_auth',
        maxRetries: 5,
        retryDelay: 3000
    });

    // Conectare cu toate fix-urile implementate
    await whatsapp.connectWithErrorHandling();

    // Gestionare închidere aplicație
    process.on('SIGINT', async () => {
        console.log('\n🔄 Închidere aplicație...');
        await whatsapp.disconnect();
        process.exit(0);
    });
}

// Exportă clasa pentru utilizare în alte fișiere
module.exports = WhatsAppErrorHandler;

// Rulează exemplul dacă fișierul este executat direct
if (require.main === module) {
    main().catch(console.error);
}