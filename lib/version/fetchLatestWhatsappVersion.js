"use strict";
const axios = require("axios");

/**
 * Fetches the latest WhatsApp Web version.
 * Redenumit din fetchLatestBaileysVersion pentru branding personalizat (Boruto-style).
 * @returns {Promise<{ version: number[], isLatest: boolean, error?: Error }>}
 */
async function fetchLatestWhatsappVersion() {
  try {
    const res = await axios.get("https://web.whatsapp.com/check-update?version=1&platform=web");
    if (!res.data || !res.data.currentVersion) {
      throw new Error("Nu s-a putut obține versiunea");
    }
    // Ex: "2.3000.1023223821" -> [2, 3000, 1023223821]
    const version = res.data.currentVersion.split(".").map(Number);
    return { version, isLatest: true };
  } catch (error) {
    console.error("Eroare la fetchLatestWhatsappVersion:", error.message);
    return { version: [2, 2200, 0], isLatest: false, error };
  }
}

module.exports = { fetchLatestWhatsappVersion };
