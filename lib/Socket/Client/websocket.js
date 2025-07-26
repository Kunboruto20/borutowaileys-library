"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const ws_1 = __importDefault(require("ws"));
const Defaults_1 = require("../../Defaults");
const types_1 = require("./types");

class WebSocketClient extends types_1.AbstractSocketClient {
  constructor(...args) {
    super(...args);
    this.socket = null;
    // Parametri pentru reconectare automată - fix pentru stabilitate
    this.autoReconnect = this.config.autoReconnect !== false;
    this.maxReconnectAttempts = this.config.maxReconnectAttempts || 5;
    this.reconnectDelay = 1000; // 1 secundă de delay inițial
    this.currentReconnectAttempts = 0;
    this.clearAuthOnError = this.config.clearAuthOnError !== false;
  }

  get isOpen() {
    var _a;
    return ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.OPEN;
  }

  get isClosed() {
    var _a;
    return this.socket === null || ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.CLOSED;
  }

  get isClosing() {
    var _a;
    return this.socket === null ||
      ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.CLOSING;
  }

  get isConnecting() {
    var _a;
    return ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.CONNECTING;
  }

  async connect() {
    // Dacă socket-ul există deja și este în stare de conectare sau deschis, se returnează
    if (this.socket && (this.isConnecting || this.isOpen)) {
      return;
    }

    // Resetăm numărul de reconectări când se inițiază manual o nouă conexiune
    this.currentReconnectAttempts = 0;
    // Creăm conexiunea socket cu header-uri optimizate pentru fix HTTP 405
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
    });
    this.socket.setMaxListeners(0);

    // Adăugăm handler-ele pentru evenimente, păstrând compatibilitatea
    const events = [
      "close",
      "error",
      "upgrade",
      "message",
      "open",
      "ping",
      "pong",
      "unexpected-response",
    ];
    for (const event of events) {
      this.socket.on(event, (...args) => {
        this.emit(event, ...args);
      });
    }

    // La evenimentul "close", dacă reconectarea automată este activă, se încearcă reconectarea
    this.socket.on("close", (code, reason) => {
      this.emit("close", code, reason);
      
      // Fix pentru HTTP 428, 405, 500 - gestionare inteligentă a erorilor
      const shouldClearAuth = this.shouldClearAuthForError(code, reason);
      if (shouldClearAuth && this.clearAuthOnError) {
        this.emit("clear_auth_required", { code, reason: reason?.toString() });
      }
      
      if (this.autoReconnect && this.currentReconnectAttempts < this.maxReconnectAttempts) {
        this.currentReconnectAttempts++;
        
        // Fix pentru reconectări - delay intelligent cu exponential backoff
        const delay = this.calculateReconnectDelay(code, this.currentReconnectAttempts);
        
        this.emit("reconnect_attempt", this.currentReconnectAttempts, delay);
        
        setTimeout(() => {
          this.connect().catch((err) => {
            this.emit("error", err);
          });
        }, delay);
      } else if (this.currentReconnectAttempts >= this.maxReconnectAttempts) {
        this.emit("max_reconnect_attempts_reached", { code, reason });
      }
    });
  }

  async close() {
    if (!this.socket) {
      return;
    }
    // Dezactivăm reconectarea automată atunci când închidem conexiunea manual
    this.autoReconnect = false;
    this.socket.close();
    this.socket = null;
  }

  send(str, cb) {
    this.socket?.send(str, cb);
    return Boolean(this.socket);
  }

  /**
   * Fix pentru HTTP 428, 405, 500 - determină dacă sesiunea trebuie curățată
   */
  shouldClearAuthForError(code, reason) {
    const authClearingCodes = [
      428, // Precondition Required - sesiune coruptă
      405, // Method Not Allowed - probleme de autentificare
      500, // Internal Server Error - bad session
      401, // Unauthorized - sesiune expirată
      403, // Forbidden - sesiune invalidă
      419  // Authentication Timeout - sesiune expirată
    ];
    
    // Verifică și mesajele de eroare specifice
    const reasonStr = reason?.toString().toLowerCase() || '';
    const badSessionKeywords = ['bad session', 'session expired', 'invalid session', 'precondition required'];
    const hasBadSessionKeyword = badSessionKeywords.some(keyword => reasonStr.includes(keyword));
    
    return authClearingCodes.includes(code) || hasBadSessionKeyword;
  }

  /**
   * Fix pentru reconectări - calculează delay-ul optim bazat pe tipul de eroare
   */
  calculateReconnectDelay(code, attempt) {
    // Delay-uri de bază cu exponential backoff
    const baseDelays = [2000, 4000, 8000, 16000, 30000];
    let baseDelay = baseDelays[Math.min(attempt - 1, baseDelays.length - 1)];
    
    // Ajustări specifice pentru tipuri de erori
    switch (code) {
      case 503: // Service Unavailable - server temporar indisponibil
        return baseDelay * 2; // Delay dublu pentru server overload
      
      case 429: // Too Many Requests - rate limiting
        return baseDelay * 3; // Delay triplu pentru rate limiting
      
      case 408: // Request Timeout - probleme de rețea
        return Math.max(baseDelay * 0.5, 1000); // Delay mai mic pentru timeout-uri
      
      case 428: // Precondition Required - sesiune coruptă
      case 401: // Unauthorized - sesiune expirată
      case 403: // Forbidden - sesiune invalidă
        return Math.max(baseDelay * 1.5, 3000); // Delay moderat pentru probleme de sesiune
      
      case 405: // Method Not Allowed - probleme de header-uri
        return Math.max(baseDelay * 0.8, 2000); // Delay ușor redus pentru probleme de configurare
      
      case 1006: // WebSocket abnormal closure
        return baseDelay * 1.2; // Delay ușor mărit pentru probleme de conectivitate
      
      default:
        return baseDelay;
    }
  }
}

exports.WebSocketClient = WebSocketClient;
