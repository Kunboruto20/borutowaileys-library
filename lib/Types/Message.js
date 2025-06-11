"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.isBroadcastStub = exports.isCallStub = exports.isGroupStub = exports.WAMessageStatus = exports.WAMessageStubType = exports.WAProto = void 0;

const WAProto = require("../../WAProto");

exports.WAProto = WAProto.proto;
exports.WAMessageStubType = WAProto.proto.WebMessageInfo.StubType;
exports.WAMessageStatus = WAProto.proto.WebMessageInfo.Status;

/**
 * Verifică dacă un stubType este legat de acțiuni de grup
 */
exports.isGroupStub = (stubType) => {
  const groupTypes = new Set([
    exports.WAMessageStubType.GROUP_CREATE,
    exports.WAMessageStubType.GROUP_CHANGE_SUBJECT,
    exports.WAMessageStubType.GROUP_CHANGE_DESCRIPTION,
    exports.WAMessageStubType.GROUP_CHANGE_RESTRICT,
    exports.WAMessageStubType.GROUP_CHANGE_ANNOUNCE,
    exports.WAMessageStubType.GROUP_PARTICIPANT_ADD,
    exports.WAMessageStubType.GROUP_PARTICIPANT_REMOVE,
    exports.WAMessageStubType.GROUP_PARTICIPANT_LEAVE,
    exports.WAMessageStubType.GROUP_PARTICIPANT_PROMOTE,
    exports.WAMessageStubType.GROUP_PARTICIPANT_DEMOTE,
    exports.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER,
    exports.WAMessageStubType.GROUP_CHANGE_INVITE_LINK,
  ]);
  return groupTypes.has(stubType);
};

/**
 * Verifică dacă un stubType este legat de apeluri
 */
exports.isCallStub = (stubType) => {
  const callTypes = new Set([
    exports.WAMessageStubType.CALL_MISSED_VOICE,
    exports.WAMessageStubType.CALL_MISSED_VIDEO,
    exports.WAMessageStubType.CALL_MISSED_GROUP_VOICE,
    exports.WAMessageStubType.CALL_MISSED_GROUP_VIDEO
  ]);
  return callTypes.has(stubType);
};

/**
 * Verifică dacă un stubType provine din difuzări/statusuri
 */
exports.isBroadcastStub = (stubType) => {
  const broadcastTypes = new Set([
    exports.WAMessageStubType.BROADCAST_STATUS_VIEWED,
    exports.WAMessageStubType.BROADCAST_NOTIFICATION
  ]);
  return broadcastTypes.has(stubType);
};
