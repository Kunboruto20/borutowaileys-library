const WhatsAppErrorHandler = require('./fix-whatsapp-errors');

/**
 * Exemplu simplu de utilizare a fix-urilor pentru WhatsApp
 * Acest script demonstrează cum să folosești clasa WhatsAppErrorHandler
 */

async function exempluComplet() {
    console.log('🚀 Pornire exemplu WhatsApp cu fix-uri pentru erori...\n');

    // Creează instanța cu configurări personalizate
    const whatsapp = new WhatsAppErrorHandler({
        authDir: './exemplu_auth',     // Director pentru sesiunea WhatsApp
        maxRetries: 7,                 // Numărul maxim de încercări de reconectare
        retryDelay: 2000              // Delay-ul inițial între încercări (ms)
    });

    try {
        // Conectare cu toate fix-urile implementate
        console.log('📱 Conectare la WhatsApp...');
        await whatsapp.connectWithErrorHandling();

        // Așteaptă un pic pentru stabilizarea conexiunii
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Exemplu de trimitere mesaj (doar dacă socket-ul este conectat)
        if (whatsapp.sock && whatsapp.sock.user) {
            console.log('\n📨 Încercare trimitere mesaj de test...');
            
            // Înlocuiește cu un număr real pentru test
            const numarTest = '1234567890@s.whatsapp.net'; // Format: număr@s.whatsapp.net
            
            try {
                await whatsapp.sendMessage(numarTest, {
                    text: '🤖 Salut! Acesta este un mesaj de test cu fix-urile implementate pentru erorile WhatsApp.'
                });
                console.log('✅ Mesaj trimis cu succes!');
            } catch (error) {
                console.log('⚠️ Nu s-a putut trimite mesajul (probabil numărul nu există):', error.message);
            }
        }

        // Demonstrează gestionarea evenimentelor
        console.log('\n👂 Ascult pentru mesaje noi...');
        console.log('💡 Trimite un mesaj pe WhatsApp pentru a testa recepția.');
        console.log('🔄 Scriptul va rula 60 de secunde apoi se va închide automat.\n');

        // Rulează pentru 60 de secunde apoi se închide
        setTimeout(async () => {
            console.log('\n⏰ Timpul de test s-a încheiat.');
            await whatsapp.disconnect();
            process.exit(0);
        }, 60000);

    } catch (error) {
        console.error('❌ Eroare în exemplul principal:', error.message);
        await whatsapp.disconnect();
        process.exit(1);
    }
}

/**
 * Exemplu simplu pentru doar conectare și recepție mesaje
 */
async function exempluSimplu() {
    console.log('🔧 Exemplu simplu - doar conectare și recepție...\n');

    const whatsapp = new WhatsAppErrorHandler();

    // Conectare
    await whatsapp.connectWithErrorHandling();

    // Gestionare închidere cu Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n🔴 Închidere aplicație...');
        await whatsapp.disconnect();
        process.exit(0);
    });
}

/**
 * Exemplu pentru testarea fix-urilor specifice
 */
async function testeazaFixuri() {
    console.log('🔍 Test fix-uri specifice pentru erori...\n');

    const whatsapp = new WhatsAppErrorHandler({
        authDir: './test_auth',
        maxRetries: 3,
        retryDelay: 1000
    });

    // Simulează curățarea sesiunii (fix pentru HTTP 428)
    console.log('🧹 Test curățare sesiune autentificare...');
    await whatsapp.clearAuthSession();

    // Test configurare optimizată (fix pentru HTTP 405)
    console.log('⚙️ Test configurare optimizată socket...');
    const config = whatsapp.getOptimizedSocketConfig();
    console.log('✅ Configurare generată:', {
        browser: config.browser,
        timeout: config.connectTimeoutMs,
        headers: Object.keys(config.options.headers)
    });

    // Test conectare
    console.log('🔌 Test conectare cu fix-urile implementate...');
    await whatsapp.connectWithErrorHandling();

    setTimeout(async () => {
        await whatsapp.disconnect();
        process.exit(0);
    }, 30000);
}

// Alege ce exemplu să rulezi
const args = process.argv.slice(2);
const exemplu = args[0] || 'complet';

switch (exemplu) {
    case 'simplu':
        exempluSimplu().catch(console.error);
        break;
    case 'test':
        testeazaFixuri().catch(console.error);
        break;
    case 'complet':
    default:
        exempluComplet().catch(console.error);
        break;
}

// Informații de utilizare
if (exemplu === 'help' || exemplu === '--help') {
    console.log(`
📚 Cum să folosești exemplele:

node exemplu-utilizare.js              # Exemplu complet
node exemplu-utilizare.js simplu       # Doar conectare și recepție
node exemplu-utilizare.js test         # Testează fix-urile specifice

🔧 Fix-uri implementate:
- HTTP 405 (Method Not Allowed)
- HTTP 428 (Precondition Required) 
- WebSocket 1006/500 (Internal Server Error)
- Reconectări repetitive eșuate

📱 Pentru primul rulare, va fi afișat un cod QR pentru autentificare.
    `);
    process.exit(0);
}