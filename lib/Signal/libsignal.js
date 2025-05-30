"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
        for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLibSignalRepository = void 0;
const libsignal = __importStar(require("libsignal"));
const WASignalGroup_1 = require("../../WASignalGroup");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
// Am actualizat calea importului pentru generics.js:
const generics_1 = require("../../generics");

/**
 * Creează un repository pentru gestionarea sesiunilor și a criptării/decriptării mesajelor
 * folosind libsignal. Acest repository include metode pentru:
 *  - criptarea/decriptarea mesajelor clasice și de grup,
 *  - procesarea mesajelor de distribuție a cheii de grup,
 *  - injectarea sesiunilor E2E, și
 *  - conversia JID-urilor în adrese libsignal.
 */
function makeLibSignalRepository(auth) {
    const storage = signalStorage(auth);
    return {
        decryptGroupMessage({ group, authorJid, msg }) {
            const senderName = jidToSignalSenderKeyName(group, authorJid);
            const cipher = new WASignalGroup_1.GroupCipher(storage, senderName);
            return cipher.decrypt(msg);
        },
        async processSenderKeyDistributionMessage({ item, authorJid }) {
            const builder = new WASignalGroup_1.GroupSessionBuilder(storage);
            const senderName = jidToSignalSenderKeyName(item.groupId, authorJid);
            const senderMsg = new WASignalGroup_1.SenderKeyDistributionMessage(null, null, null, null, item.axolotlSenderKeyDistributionMessage);
            const { [senderName]: senderKey } = await auth.keys.get('sender-key', [senderName]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new WASignalGroup_1.SenderKeyRecord());
            }
            await builder.process(senderName, senderMsg);
        },
        async decryptMessage({ jid, type, ciphertext }) {
            const addr = jidToSignalProtocolAddress(jid);
            const session = new libsignal.SessionCipher(storage, addr);
            let result;
            switch (type) {
                case 'pkmsg':
                    result = await session.decryptPreKeyWhisperMessage(ciphertext);
                    break;
                case 'msg':
                    result = await session.decryptWhisperMessage(ciphertext);
                    break;
            }
            return result;
        },
        async encryptMessage({ jid, data }) {
            const addr = jidToSignalProtocolAddress(jid);
            const cipher = new libsignal.SessionCipher(storage, addr);
            const { type: sigType, body } = await cipher.encrypt(data);
            const type = sigType === 3 ? 'pkmsg' : 'msg';
            return { type, ciphertext: Buffer.from(body, 'binary') };
        },
        async encryptGroupMessage({ group, meId, data }) {
            const senderName = jidToSignalSenderKeyName(group, meId);
            const builder = new WASignalGroup_1.GroupSessionBuilder(storage);
            const { [senderName]: senderKey } = await auth.keys.get('sender-key', [senderName]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new WASignalGroup_1.SenderKeyRecord());
            }
            const senderKeyDistributionMessage = await builder.create(senderName);
            const session = new WASignalGroup_1.GroupCipher(storage, senderName);
            const ciphertext = await session.encrypt(data);
            return {
                ciphertext,
                senderKeyDistributionMessage: senderKeyDistributionMessage.serialize(),
            };
        },
        async injectE2ESession({ jid, session }) {
            const cipher = new libsignal.SessionBuilder(storage, jidToSignalProtocolAddress(jid));
            await cipher.initOutgoing(session);
        },
        jidToSignalProtocolAddress(jid) {
            return jidToSignalProtocolAddress(jid).toString();
        },
    };
}
exports.makeLibSignalRepository = makeLibSignalRepository;

const jidToSignalProtocolAddress = (jid) => {
    const { user, device } = (0, WABinary_1.jidDecode)(jid);
    return new libsignal.ProtocolAddress(user, device || 0);
};

const jidToSignalSenderKeyName = (group, user) => {
    return new WASignalGroup_1.SenderKeyName(group, jidToSignalProtocolAddress(user)).toString();
};

function signalStorage({ creds, keys }) {
    // Folosim caching inteligent pentru sesiunile încărcate
    const sessionCache = new Map();
    return {
        loadSession: async (id) => {
            if (sessionCache.has(id)) {
                return sessionCache.get(id);
            }
            // Retry adaptiv: încercăm de 3 ori cu delay crescător
            let retries = 3;
            let delayMs = 100;
            let sess;
            while (retries > 0) {
                const result = await keys.get('session', [id]);
                sess = result && result[id];
                if (sess) break;
                await generics_1.delay(delayMs);
                delayMs *= 2;
                retries--;
            }
            if (sess) {
                const sessionRecord = libsignal.SessionRecord.deserialize(sess);
                sessionCache.set(id, sessionRecord);
                return sessionRecord;
            }
            return undefined;
        },
        storeSession: async (id, session) => {
            sessionCache.set(id, session);
            await keys.set({ 'session': { [id]: session.serialize() } });
        },
        isTrustedIdentity: () => {
            return true;
        },
        loadPreKey: async (id) => {
            const keyId = id.toString();
            const { [keyId]: key } = await keys.get('pre-key', [keyId]);
            if (key) {
                return {
                    privKey: Buffer.from(key.private),
                    pubKey: Buffer.from(key.public)
                };
            }
            return undefined;
        },
        removePreKey: (id) => keys.set({ 'pre-key': { [id]: null } }),
        loadSignedPreKey: () => {
            const key = creds.signedPreKey;
            return {
                privKey: Buffer.from(key.keyPair.private),
                pubKey: Buffer.from(key.keyPair.public)
            };
        },
        loadSenderKey: async (keyId) => {
            const { [keyId]: key } = await keys.get('sender-key', [keyId]);
            if (key) {
                return new WASignalGroup_1.SenderKeyRecord(key);
            }
            return undefined;
        },
        storeSenderKey: async (keyId, key) => {
            await keys.set({ 'sender-key': { [keyId]: key.serialize() } });
        },
        getOurRegistrationId: () => (creds.registrationId),
        getOurIdentity: () => {
            const { signedIdentityKey } = creds;
            return {
                privKey: Buffer.from(signedIdentityKey.private),
                pubKey: (0, Utils_1.generateSignalPubKey)(signedIdentityKey.public),
            };
        }
    };
}
