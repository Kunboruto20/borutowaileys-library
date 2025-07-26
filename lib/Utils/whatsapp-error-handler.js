"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppErrorHandler = exports.getErrorFixAction = exports.isAuthClearingError = void 0;

const boom_1 = require("@hapi/boom");

/**
 * Verifică dacă o eroare necesită curățarea sesiunii de autentificare
 * Fix pentru HTTP 428, 405, 500
 */
const isAuthClearingError = (code, reason) => {
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
    const badSessionKeywords = [
        'bad session', 
        'session expired', 
        'invalid session', 
        'precondition required',
        'connection failure',
        'unauthorized'
    ];
    const hasBadSessionKeyword = badSessionKeywords.some(keyword => reasonStr.includes(keyword));
    
    return authClearingCodes.includes(code) || hasBadSessionKeyword;
};
exports.isAuthClearingError = isAuthClearingError;

/**
 * Determină acțiunea de fix necesară pentru o anumită eroare
 * Fix pentru toate tipurile de erori WhatsApp
 */
const getErrorFixAction = (code, reason) => {
    const reasonStr = reason?.toString().toLowerCase() || '';
    
    switch (code) {
        case 428: // Precondition Required
            return 'clear_auth';
            
        case 405: // Method Not Allowed  
            return 'reconfigure_headers';
            
        case 500: // Internal Server Error / Bad Session
            if (reasonStr.includes('bad session') || reasonStr.includes('session')) {
                return 'clear_auth';
            }
            return 'reconnect';
            
        case 408: // Timeout
            return 'reconnect_fast';
            
        case 401: // Unauthorized
        case 403: // Forbidden
            return 'clear_auth';
            
        case 503: // Service Unavailable
            return 'wait_and_retry';
            
        case 429: // Too Many Requests
            return 'rate_limit_wait';
            
        case 1006: // WebSocket abnormal closure
            if (reasonStr.includes('session') || reasonStr.includes('auth')) {
                return 'clear_auth';
            }
            return 'reconnect';
            
        default:
            if (reasonStr.includes('session') || reasonStr.includes('auth')) {
                return 'clear_auth';
            }
            return 'reconnect';
    }
};
exports.getErrorFixAction = getErrorFixAction;

/**
 * Calculează delay-ul optim pentru reconectare bazat pe tipul de eroare și numărul de încercări
 */
const calculateReconnectDelay = (code, attempt, fixAction) => {
    // Delay-uri de bază cu exponential backoff
    const baseDelays = [2000, 4000, 8000, 16000, 30000];
    let baseDelay = baseDelays[Math.min(attempt - 1, baseDelays.length - 1)];
    
    // Ajustări specifice pentru tipuri de erori și acțiuni
    switch (fixAction) {
        case 'clear_auth':
            return Math.max(baseDelay * 1.5, 3000); // Delay moderat pentru curățare sesiune
            
        case 'reconfigure_headers':
            return Math.max(baseDelay * 0.8, 2000); // Delay redus pentru reconfigurare
            
        case 'reconnect_fast':
            return Math.max(baseDelay * 0.5, 1000); // Delay mic pentru reconectare rapidă
            
        case 'wait_and_retry':
            return baseDelay * 2; // Delay dublu pentru server indisponibil
            
        case 'rate_limit_wait':
            return baseDelay * 3; // Delay triplu pentru rate limiting
            
        default: // 'reconnect'
            return baseDelay;
    }
};

/**
 * Clasa principală pentru gestionarea erorilor WhatsApp
 * Integrează toate fix-urile pentru erorile comune
 */
class WhatsAppErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.reconnectAttempts = new Map(); // Track attempts per connection
    }

    /**
     * Procesează o eroare de conexiune și returnează acțiunea recomandată
     */
    processConnectionError(error, connectionId = 'default') {
        const code = error?.output?.statusCode || error?.code || error?.status || 0;
        const reason = error?.message || error?.data?.reason || '';
        
        const fixAction = getErrorFixAction(code, reason);
        const shouldClearAuth = isAuthClearingError(code, reason);
        
        // Track reconnection attempts
        const attempts = this.reconnectAttempts.get(connectionId) || 0;
        this.reconnectAttempts.set(connectionId, attempts + 1);
        
        const delay = calculateReconnectDelay(code, attempts + 1, fixAction);
        
        this.logger?.warn({ 
            code, 
            reason, 
            fixAction, 
            shouldClearAuth, 
            attempt: attempts + 1,
            delay 
        }, 'Processing WhatsApp connection error');
        
        return {
            code,
            reason,
            fixAction,
            shouldClearAuth,
            attempt: attempts + 1,
            delay,
            connectionId
        };
    }

    /**
     * Resetează contorul de încercări pentru o conexiune
     */
    resetReconnectAttempts(connectionId = 'default') {
        this.reconnectAttempts.delete(connectionId);
        this.logger?.info({ connectionId }, 'Reset reconnection attempts counter');
    }

    /**
     * Verifică dacă s-a atins limita maximă de încercări
     */
    hasReachedMaxAttempts(connectionId = 'default', maxAttempts = 5) {
        const attempts = this.reconnectAttempts.get(connectionId) || 0;
        return attempts >= maxAttempts;
    }

    /**
     * Generează configurația optimizată pentru WebSocket
     * Fix pentru HTTP 405 și alte probleme de configurare
     */
    getOptimizedSocketConfig(baseConfig = {}) {
        return {
            ...baseConfig,
            // Fix pentru HTTP 405 - browser și header-uri optimizate
            browser: baseConfig.browser || ['Ubuntu', 'Chrome', '20.0.04'],
            options: {
                ...baseConfig.options,
                headers: {
                    'User-Agent': 'WhatsApp/2.2316.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-WebSocket-Version': '13',
                    'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
                    ...baseConfig.options?.headers
                }
            },
            // Fix pentru timeout-uri și stabilitate
            connectTimeoutMs: baseConfig.connectTimeoutMs || 30000,
            defaultQueryTimeoutMs: baseConfig.defaultQueryTimeoutMs || 30000,
            keepAliveIntervalMs: baseConfig.keepAliveIntervalMs || 25000,
            qrTimeout: baseConfig.qrTimeout || 60000,
            
            // Fix pentru reconectări automate
            autoReconnect: baseConfig.autoReconnect !== false,
            maxReconnectAttempts: baseConfig.maxReconnectAttempts || 5,
            clearAuthOnError: baseConfig.clearAuthOnError !== false,
            
            // Configurări suplimentare pentru stabilitate
            markOnlineOnConnect: false, // Evită probleme la conectare
            retryRequestDelayMs: baseConfig.retryRequestDelayMs || 250,
            maxMsgRetryCount: baseConfig.maxMsgRetryCount || 5
        };
    }
}

exports.WhatsAppErrorHandler = WhatsAppErrorHandler;