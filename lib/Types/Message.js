"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.describeStub = exports.isBroadcastStub = exports.isCallStub = exports.isGroupStub = exports.WAMessageStatus = exports.WAMessageStubType = exports.WAProto = void 0;

const WAProto = require("../../WAProto");

exports.WAProto = WAProto.proto;
exports.WAMessageStubType = WAProto.proto.WebMessageInfo.StubType;
exports.WAMessageStatus = WAProto.proto.WebMessageInfo.Status;

/**
 * Checks if a stubType is related to group actions
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
    exports.WAMessageStubType.GROUP_CHANGE_INVITE_LINK
  ]);
  return groupTypes.has(stubType);
};

/**
 * Checks if a stubType is related to missed calls
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
 * Checks if a stubType is related to broadcast/status actions
 */
exports.isBroadcastStub = (stubType) => {
  const broadcastTypes = new Set([
    exports.WAMessageStubType.BROADCAST_STATUS_VIEWED,
    exports.WAMessageStubType.BROADCAST_NOTIFICATION
  ]);
  return broadcastTypes.has(stubType);
};

/**
 * Provides a human-readable description for a given stubType
 */
exports.describeStub = (stubType) => {
  const map = {
    [exports.WAMessageStubType.GROUP_CREATE]: "Group created",
    [exports.WAMessageStubType.GROUP_CHANGE_SUBJECT]: "Group subject changed",
    [exports.WAMessageStubType.GROUP_CHANGE_DESCRIPTION]: "Group description updated",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_ADD]: "Participant added to group",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_REMOVE]: "Participant removed from group",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_LEAVE]: "Participant left the group",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_PROMOTE]: "Participant promoted to admin",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_DEMOTE]: "Admin demoted",
    [exports.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER]: "Participant changed their number",
    [exports.WAMessageStubType.GROUP_CHANGE_RESTRICT]: "Group permission settings updated",
    [exports.WAMessageStubType.GROUP_CHANGE_ANNOUNCE]: "Group announcement mode changed",
    [exports.WAMessageStubType.GROUP_CHANGE_INVITE_LINK]: "Group invite link reset",
    [exports.WAMessageStubType.CALL_MISSED_VOICE]: "Missed voice call",
    [exports.WAMessageStubType.CALL_MISSED_VIDEO]: "Missed video call",
    [exports.WAMessageStubType.CALL_MISSED_GROUP_VOICE]: "Missed group voice call",
    [exports.WAMessageStubType.CALL_MISSED_GROUP_VIDEO]: "Missed group video call",
    [exports.WAMessageStubType.BROADCAST_STATUS_VIEWED]: "Broadcast status viewed",
    [exports.WAMessageStubType.BROADCAST_NOTIFICATION]: "Broadcast notification received"
  };
  return map[stubType] || `Unknown stub type: ${stubType}`;
};
