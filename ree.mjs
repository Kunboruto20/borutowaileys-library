import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const WhatsAppErrorHandler = require('./fix-whatsapp-errors.js');

/**
 * Script optimizat pentru conectarea la WhatsApp cu toate fix-urile implementate
 * Rezolvă erorile: HTTP 405, HTTP 428, WebSocket 1006/500
 */

async function main() {
    console.log('🚀 Pornire WhatsApp cu fix-uri pentru erori...\n');

    // Configurare optimizată pentru stabilitate maximă
    const whatsapp = new WhatsAppErrorHandler({
        authDir: './whatsapp_session',  // Director pentru sesiunea WhatsApp
        maxRetries: 8,                  // Numărul maxim de încercări (mărit pentru stabilitate)
        retryDelay: 2000               // Delay inițial între încercări
    });

    try {
        // Conectare cu toate fix-urile implementate
        console.log('📱 Conectare la WhatsApp cu fix-uri avansate...');
        await whatsapp.connectWithErrorHandling();

        // Event listener pentru mesaje primite
        if (whatsapp.sock) {
            whatsapp.sock.ev.on('messages.upsert', async (m) => {
                const message = m.messages[0];
                if (!message.key.fromMe && m.type === 'notify') {
                    const messageText = message.message?.conversation || 
                                      message.message?.extendedTextMessage?.text || 
                                      'Media/altceva';
                    
                    console.log('📨 Mesaj nou primit:', messageText);
                    console.log('👤 De la:', message.key.remoteJid);
                }
            });

            // Event listener pentru actualizări de status
            whatsapp.sock.ev.on('presence.update', (presence) => {
                console.log('👁️ Actualizare prezență:', presence);
            });
        }

        console.log('\n✅ WhatsApp conectat cu succes!');
        console.log('👂 Ascult pentru mesaje noi...');
        console.log('🔄 Apasă Ctrl+C pentru a opri aplicația.\n');

    } catch (error) {
        console.error('❌ Eroare la conectarea WhatsApp:', error.message);
        process.exit(1);
    }

    // Gestionare închidere aplicație cu Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n🔄 Închidere aplicație...');
        try {
            await whatsapp.disconnect();
            console.log('✅ Deconectat cu succes');
        } catch (error) {
            console.error('❌ Eroare la deconectare:', error.message);
        }
        process.exit(0);
    });

    // Gestionare erori neașteptate
    process.on('uncaughtException', async (error) => {
        console.error('❌ Eroare neașteptată:', error.message);
        await whatsapp.disconnect();
        process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
        console.error('❌ Promise rejection nehandled:', reason);
        await whatsapp.disconnect();
        process.exit(1);
    });
}

// Pornește aplicația
main().catch(async (error) => {
    console.error('❌ Eroare fatală:', error.message);
    process.exit(1);
});