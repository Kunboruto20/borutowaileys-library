"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGroupMetadata = exports.makeGroupsSocket = void 0;
const WAProto_1 = require("../../WAProto");
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const chats_1 = require("./chats");

// Using a cache for group metadata (TTL: 5 minutes)
const GROUP_METADATA_TTL = 5 * 60 * 1000;
const groupMetadataCache = new Map();

const makeGroupsSocket = (config) => {
    const sock = (0, chats_1.makeChatsSocket)(config);
    const { authState, ev, query, upsertMessage } = sock;

    // Generic function for group queries
    const groupQuery = async (jid, type, content) => {
        return query({
            tag: 'iq',
            attrs: {
                type,
                xmlns: 'w:g2',
                to: jid,
            },
            content
        });
    };

    // Optimized with caching: check if metadata is available before requesting
    const groupMetadata = async (jid, forceRefresh = false) => {
        if (!forceRefresh && groupMetadataCache.has(jid)) {
            const { metadata, timestamp } = groupMetadataCache.get(jid);
            if (Date.now() - timestamp < GROUP_METADATA_TTL) {
                return metadata;
            }
        }
        const result = await groupQuery(jid, 'get', [{ tag: 'query', attrs: { request: 'interactive' } }]);
        const metadata = extractGroupMetadata(result);
        groupMetadataCache.set(jid, { metadata, timestamp: Date.now() });
        return metadata;
    };

    // Efficient group synchronization using caching
    const groupFetchAllParticipating = async () => {
        const result = await query({
            tag: 'iq',
            attrs: {
                to: '@g.us',
                xmlns: 'w:g2',
                type: 'get',
            },
            content: [
                {
                    tag: 'participating',
                    attrs: {},
                    content: [
                        { tag: 'participants', attrs: {} },
                        { tag: 'description', attrs: {} }
                    ]
                }
            ]
        });
        const data = {};
        const groupsChild = (0, WABinary_1.getBinaryNodeChild)(result, 'groups');
        if (groupsChild) {
            const groups = (0, WABinary_1.getBinaryNodeChildren)(groupsChild, 'group');
            for (const groupNode of groups) {
                const meta = extractGroupMetadata({
                    tag: 'result',
                    attrs: {},
                    content: [groupNode]
                });
                data[meta.id] = meta;
                // Update cache with new metadata
                groupMetadataCache.set(meta.id, { metadata: meta, timestamp: Date.now() });
            }
        }
        sock.ev.emit('groups.update', Object.values(data));
        return data;
    };

    // Group update event
    sock.ws.on('CB:ib,,dirty', async (node) => {
        const { attrs } = (0, WABinary_1.getBinaryNodeChild)(node, 'dirty');
        if (attrs.type !== 'groups') {
            return;
        }
        await groupFetchAllParticipating();
        await sock.cleanDirtyBits('groups');
    });

    return {
        ...sock,
        groupMetadata,
        groupCreate: async (subject, participants) => {
            const key = (0, Utils_1.generateMessageID)();
            const result = await groupQuery('@g.us', 'set', [
                {
                    tag: 'create',
                    attrs: {
                        subject,
                        key
                    },
                    content: participants.map(jid => ({
                        tag: 'participant',
                        attrs: { jid }
                    }))
                }
            ]);
            const meta = extractGroupMetadata(result);
            // Update cache with new group metadata
            groupMetadataCache.set(meta.id, { metadata: meta, timestamp: Date.now() });
            return meta;
        },
        groupLeave: async (id) => {
            await groupQuery('@g.us', 'set', [
                {
                    tag: 'leave',
                    attrs: {},
                    content: [
                        { tag: 'group', attrs: { id } }
                    ]
                }
            ]);
            groupMetadataCache.delete(id); // Remove from cache
        },
        groupUpdateSubject: async (jid, subject) => {
            await groupQuery(jid, 'set', [
                {
                    tag: 'subject',
                    attrs: {},
                    content: Buffer.from(subject, 'utf-8')
                }
            ]);
            await groupMetadata(jid, true); // Refresh cache
        },
        groupParticipantsUpdate: async (jid, participants, action) => {
            const batchSize = 20;
            let allAffected = [];
            for (let i = 0; i < participants.length; i += batchSize) {
                const batch = participants.slice(i, i + batchSize);
                const result = await groupQuery(jid, 'set', [
                    {
                        tag: action,
                        attrs: {},
                        content: batch.map(jid => ({
                            tag: 'participant',
                            attrs: { jid }
                        }))
                    }
                ]);
                const node = (0, WABinary_1.getBinaryNodeChild)(result, action);
                const participantsAffected = (0, WABinary_1.getBinaryNodeChildren)(node, 'participant');
                allAffected.push(...participantsAffected.map(p => ({
                    status: p.attrs.error || '200',
                    jid: p.attrs.jid,
                    content: p
                })));
            }
            return allAffected;
        },
        groupUpdateDescription: async (jid, description) => {
            var _a;
            const metadata = await groupMetadata(jid);
            const prev = (_a = metadata.descId) !== null && _a !== void 0 ? _a : null;
            await groupQuery(jid, 'set', [
                {
                    tag: 'description',
                    attrs: {
                        ...(description ? { id: (0, Utils_1.generateMessageID)() } : { delete: 'true' }),
                        ...(prev ? { prev } : {})
                    },
                    content: description ? [
                        { tag: 'body', attrs: {}, content: Buffer.from(description, 'utf-8') }
                    ] : undefined
                }
            ]);
            await groupMetadata(jid, true); // Refresh cache
        }
    };
};

exports.makeGroupsSocket = makeGroupsSocket;

const extractGroupMetadata = (result) => {
    var _a, _b;
    const group = (0, WABinary_1.getBinaryNodeChild)(result, 'group');
    const descChild = (0, WABinary_1.getBinaryNodeChild)(group, 'description');
    let desc;
    let descId;
    if (descChild) {
        desc = (0, WABinary_1.getBinaryNodeChildString)(descChild, 'body');
        descId = descChild.attrs.id;
    }
    const groupId = group.attrs.id.includes('@') ? group.attrs.id : (0, WABinary_1.jidEncode)(group.attrs.id, 'g.us');
    const eph = (_a = (0, WABinary_1.getBinaryNodeChild)(group, 'ephemeral')) === null || _a === void 0 ? void 0 : _a.attrs.expiration;
    const memberAddMode = (0, WABinary_1.getBinaryNodeChildString)(group, 'member_add_mode') === 'all_member_add';
    const metadata = {
        id: groupId,
        subject: group.attrs.subject,
        subjectOwner: group.attrs.s_o,
        subjectTime: +group.attrs.s_t,
        size: (0, WABinary_1.getBinaryNodeChildren)(group, 'participant').length,
        creation: +group.attrs.creation,
        owner: group.attrs.creator ? (0, WABinary_1.jidNormalizedUser)(group.attrs.creator) : undefined,
        desc,
        descId,
        linkedParent: ((_b = (0, WABinary_1.getBinaryNodeChild)(group, 'linked_parent')) === null || _b === void 0 ? void 0 : _b.attrs.jid) || undefined,
        restrict: !!(0, WABinary_1.getBinaryNodeChild)(group, 'locked'),
        announce: !!(0, WABinary_1.getBinaryNodeChild)(group, 'announcement'),
        isCommunity: !!(0, WABinary_1.getBinaryNodeChild)(group, 'parent'),
        isCommunityAnnounce: !!(0, WABinary_1.getBinaryNodeChild)(group, 'default_sub_group'),
        joinApprovalMode: !!(0, WABinary_1.getBinaryNodeChild)(group, 'membership_approval_mode'),
        memberAddMode,
        participants: (0, WABinary_1.getBinaryNodeChildren)(group, 'participant').map(({ attrs }) => ({
            id: attrs.jid,
            admin: (attrs.type || null),
        })),
        ephemeralDuration: eph ? +eph : undefined
    };
    return metadata;
};
exports.extractGroupMetadata = extractGroupMetadata;
