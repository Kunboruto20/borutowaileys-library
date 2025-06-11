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
    // Parametri pentru reconectare automată
    this.autoReconnect = true;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 secundă de delay inițial
    this.currentReconnectAttempts = 0;
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
    // Creăm conexiunea socket
    this.socket = new ws_1.default(this.url, {
      origin: Defaults_1.DEFAULT_ORIGIN,
      headers: this.config.options?.headers,
      handshakeTimeout: this.config.connectTimeoutMs,
      timeout: this.config.connectTimeoutMs,
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
      if (this.autoReconnect && this.currentReconnectAttempts < this.maxReconnectAttempts) {
        this.currentReconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.currentReconnectAttempts - 1);
        this.emit("reconnect_attempt", this.currentReconnectAttempts, delay);
        setTimeout(() => {
          this.connect().catch((err) => {
            this.emit("error", err);
          });
        }, delay);
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
}

exports.WebSocketClient = WebSocketClient;
