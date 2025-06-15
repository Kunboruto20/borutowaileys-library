// lib/version/fetchLatestWhatsAppVersion.js
import axios from 'axios';

/**
 * Caută ultima versiune WA Web suportată.
 * @returns {Promise<{ version: number[], isLatest: boolean, error?: Error }>}
 */
export async function fetchLatestWhatsAppVersion() {
  try {
    // Exemplu: folosim API-ul de update - ajustează URL-ul după nevoie
    const res = await axios.get('https://web.whatsapp.com/check-update?version=1&platform=web');
    if (res.status !== 200 || !res.data || !res.data.currentVersion) {
      throw new Error('Nu s-a putut obține versiunea');
    }

    const version = res.data.currentVersion.split('.').map(Number);
    return { version, isLatest: true };
  } catch (error) {
    console.error('Eroare la fetchLatestWhatsAppVersion:', error.message);
    return { version: [2, 2200, 0], isLatest: false, error };
  }
}
