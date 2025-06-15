"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });

// Import module-avansate
const RateLimiter = require("./Utils/rate-limiter");
const EnhancedCache = require("./Utils/enhanced-cache");
const WebhookSender = require("./Utils/webhook-sender");
const ImageProcessor = require("./Utils/image-processor");
const GroupManager = require("./Utils/group-manager");

// Exportă funcția principală de creare a socket-ului
const Socket_1 = __importDefault(require("./Socket"));
exports.makeWASocket = Socket_1.default;

// Exportă alte utilitare
exports.RateLimiter = RateLimiter;
exports.EnhancedCache = EnhancedCache;
exports.WebhookSender = WebhookSender;
exports.ImageProcessor = ImageProcessor;
exports.GroupManager = GroupManager;

// Importă și exportă funcția fetchLatestWhatsappVersion din fișierul de versiune
const fetchVersionModule = require("./version/fetchLatestWhatsappVersion");
exports.fetchLatestWhatsappVersion = fetchVersionModule.fetchLatestWhatsappVersion;
exports.fetchLatestBaileysVersion = fetchVersionModule.fetchLatestWhatsappVersion;

// Re-exportă module suplimentare dacă este cazul
__exportStar(require("../WAProto"), exports);
__exportStar(require("./Utils"), exports);
__exportStar(require("./Types"), exports);
__exportStar(require("./Store"), exports);
__exportStar(require("./Defaults"), exports);
__exportStar(require("./WABinary"), exports);
__exportStar(require("./WAM"), exports);
__exportStar(require("./WAUSync"), exports);

exports.default = Socket_1.default;
