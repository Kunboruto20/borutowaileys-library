import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('./lib/index.js');

/**
 * Script optimizat pentru conectarea la WhatsApp cu toate fix-urile implementate
 * Rezolvă erorile: HTTP 405, HTTP 428, WebSocket 1006/500
 */

async function main() {
    console.log('🚀 Pornire WhatsApp cu fix-uri integrate pentru erori...\n');

    try {
        // Încarcă starea de autentificare
        const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_session');

        // Configurare optimizată cu fix-urile integrate
        console.log('📱 Conectare la WhatsApp cu fix-uri automate...');
        const sock = makeWASocket({
            auth: state,
            // Fix-urile sunt aplicate automat!
            autoReconnect: true,           // Reconectare automată
            maxReconnectAttempts: 8,       // Numărul maxim de încercări
            clearAuthOnError: true,        // Curățare automată pentru HTTP 428
            printQRInTerminal: true,       // Afișează QR în terminal
            
            // Configurări suplimentare pentru stabilitate
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 25000,
            markOnlineOnConnect: false
        });

        // Salvare automată credențiale
        sock.ev.on('creds.update', saveCreds);

        // Gestionare automată a conexiunii cu fix-urile integrate
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 Scanează codul QR pentru autentificare');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('🔍 Conexiune închisă cu codul:', statusCode);
                console.log('📝 Motiv:', lastDisconnect?.error?.message);
                
                // Fix-urile se aplică automat, nu e nevoie de cod suplimentar
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('📱 Delogat din WhatsApp. Șterge directorul de sesiune și încearcă din nou.');
                }
            } else if (connection === 'open') {
                console.log('✅ Conectat cu succes la WhatsApp!');
                console.log('👂 Ascult pentru mesaje noi...');
                console.log('🔄 Apasă Ctrl+C pentru a opri aplicația.\n');
            }
        });

        // Event listener pentru mesaje primite
        sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && m.type === 'notify') {
                const messageText = message.message?.conversation || 
                                  message.message?.extendedTextMessage?.text || 
                                  'Media/altceva';
                
                console.log('📨 Mesaj nou primit:', messageText);
                console.log('👤 De la:', message.key.remoteJid);
            }
        });

        // Event listener pentru actualizări de prezență
        sock.ev.on('presence.update', (presence) => {
            console.log('👁️ Actualizare prezență:', presence);
        });

    } catch (error) {
        console.error('❌ Eroare la conectarea WhatsApp:', error.message);
        process.exit(1);
    }

    // Gestionare închidere aplicație cu Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n🔄 Închidere aplicație...');
        console.log('✅ Aplicația s-a închis cu succes');
        process.exit(0);
    });

    // Gestionare erori neașteptate
    process.on('uncaughtException', async (error) => {
        console.error('❌ Eroare neașteptată:', error.message);
        process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
        console.error('❌ Promise rejection nehandled:', reason);
        process.exit(1);
    });
}

// Pornește aplicația
main().catch(async (error) => {
    console.error('❌ Eroare fatală:', error.message);
    process.exit(1);
});