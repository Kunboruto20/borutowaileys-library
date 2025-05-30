"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAuthCreds = exports.addTransactionCapability = exports.makeCacheableSignalKeyStore = void 0;
const NodeCache = __importDefault(require("@cacheable/node-cache"));
const crypto_1 = require("crypto");
const Defaults_1 = require("../Defaults");
const crypto_2 = require("./crypto");
const generics_1 = require("./generics");

/**
 * Adaugă capabilitate de caching unui SignalKeyStore.
 * @param store Stocul pentru care se adaugă caching-ul.
 * @param logger Logger pentru evenimente (trace).
 * @param _cache Opțional, stocul de cache ce poate fi folosit.
 */
function makeCacheableSignalKeyStore(store, logger, _cache) {
    // Inițializează cache-ul cu TTL-ul specificat și setarea de ștergere automată la expirare
    const cache = _cache || new NodeCache.default({
        stdTTL: Defaults_1.DEFAULT_CACHE_TTLS.SIGNAL_STORE,
        useClones: false,
        deleteOnExpire: true,
    });
    const getUniqueId = (type, id) => `${type}.${id}`;
    return {
        async get(type, ids) {
            const data = {};
            const idsToFetch = [];
            for (const id of ids) {
                const key = getUniqueId(type, id);
                // Verificăm dacă cheia există în cache
                const item = cache.get(key);
                if (typeof item !== 'undefined') {
                    data[id] = item;
                } else {
                    idsToFetch.push(id);
                }
            }
            if (idsToFetch.length) {
                logger.trace({ items: idsToFetch.length }, 'Cache miss; loading from store');
                const fetched = await store.get(type, idsToFetch);
                for (const id of idsToFetch) {
                    const item = fetched[id];
                    if (item) {
                        data[id] = item;
                        cache.set(getUniqueId(type, id), item);
                    }
                }
            }
            return data;
        },
        async set(data) {
            let keysCount = 0;
            for (const type in data) {
                for (const id in data[type]) {
                    cache.set(getUniqueId(type, id), data[type][id]);
                    keysCount++;
                }
            }
            logger.trace({ keys: keysCount }, 'Cache updated with new keys');
            await store.set(data);
        },
        async clear() {
            cache.flushAll();
            if (store.clear) {
                await store.clear();
            }
        }
    };
}
exports.makeCacheableSignalKeyStore = makeCacheableSignalKeyStore;

/**
 * Adaugă capabilități asemănătoare tranzacțiilor din baze de date în SignalKeyStore.
 * Acest lucru permite operații batch de citire și scriere, îmbunătățind performanța.
 * Include un mecanism de retry adaptativ (cu backoff exponențial) pentru commit, în caz de eșec.
 *
 * @param state SignalKeyStore-ul ce va fi îmbunătățit.
 * @param logger Logger pentru mesaje de trace și avertismente.
 * @param options Obiect cu proprietățile: maxCommitRetries și delayBetweenTriesMs.
 * @returns SignalKeyStore cu capabilități de tranzacționare.
 */
const addTransactionCapability = (state, logger, { maxCommitRetries, delayBetweenTriesMs }) => {
    let dbQueriesInTransaction = 0; // folosit doar pentru logging
    let transactionCache = {};
    let mutations = {};
    let transactionsInProgress = 0;

    const isInTransaction = () => transactionsInProgress > 0;

    return {
        async get(type, ids) {
            if (isInTransaction()) {
                const dict = transactionCache[type] || {};
                const idsToFetch = ids.filter(id => typeof dict[id] === 'undefined');
                if (idsToFetch.length) {
                    dbQueriesInTransaction++;
                    const result = await state.get(type, idsToFetch);
                    transactionCache[type] = transactionCache[type] || {};
                    Object.assign(transactionCache[type], result);
                }
                return ids.reduce((acc, id) => {
                    if (transactionCache[type] && transactionCache[type][id]) {
                        acc[id] = transactionCache[type][id];
                    }
                    return acc;
                }, {});
            } else {
                return state.get(type, ids);
            }
        },
        set(data) {
            if (isInTransaction()) {
                logger.trace({ types: Object.keys(data) }, 'Caching mutations in transaction');
                for (const key in data) {
                    transactionCache[key] = transactionCache[key] || {};
                    Object.assign(transactionCache[key], data[key]);
                    mutations[key] = mutations[key] || {};
                    Object.assign(mutations[key], data[key]);
                }
            } else {
                return state.set(data);
            }
        },
        isInTransaction,
        async transaction(work) {
            let result;
            transactionsInProgress++;
            if (transactionsInProgress === 1) {
                logger.trace('Entering transaction');
            }
            try {
                result = await work();
                // Comitează dacă este tranzacția exterioară
                if (transactionsInProgress === 1) {
                    if (Object.keys(mutations).length > 0) {
                        logger.trace('Committing transaction');
                        let triesLeft = maxCommitRetries;
                        let commitDelay = delayBetweenTriesMs;
                        while (triesLeft > 0) {
                            triesLeft--;
                            try {
                                await state.set(mutations);
                                logger.trace({ dbQueriesInTransaction }, 'Transaction committed successfully');
                                break;
                            } catch (error) {
                                logger.warn(`Failed to commit ${Object.keys(mutations).length} mutations. Tries left: ${triesLeft}`);
                                await generics_1.delay(commitDelay);
                                commitDelay *= 2; // backoff exponențial
                            }
                        }
                    } else {
                        logger.trace('No mutations to commit in transaction');
                    }
                }
            } finally {
                transactionsInProgress--;
                if (transactionsInProgress === 0) {
                    transactionCache = {};
                    mutations = {};
                    dbQueriesInTransaction = 0;
                }
            }
            return result;
        }
    };
};
exports.addTransactionCapability = addTransactionCapability;

/**
 * Inițializează credentialele pentru o sesiune WhatsApp.
 * Se generează perechi de chei necesare și se setează configurările implicite.
 *
 * @returns Un obiect cu credențialele inițiale.
 */
const initAuthCreds = () => {
    const identityKey = crypto_2.Curve.generateKeyPair();
    return {
        noiseKey: crypto_2.Curve.generateKeyPair(),
        pairingEphemeralKeyPair: crypto_2.Curve.generateKeyPair(),
        signedIdentityKey: identityKey,
        signedPreKey: crypto_2.signedKeyPair(identityKey, 1),
        registrationId: generics_1.generateRegistrationId(),
        advSecretKey: crypto_1.randomBytes(32).toString('base64'),
        processedHistoryMessages: [],
        nextPreKeyId: 1,
        firstUnuploadedPreKeyId: 1,
        accountSyncCounter: 0,
        accountSettings: {
            unarchiveChats: false,
        },
        registered: false,
        pairingCode: undefined, // va fi setat la cererea de pairing
        lastPropHash: undefined,
        routingInfo: undefined,
    };
};
exports.initAuthCreds = initAuthCreds;
