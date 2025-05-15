/* eslint-disable no-case-declarations */
const boom = require('@hapi/boom')
const axios = require('axios')
const { v4: uuidv4, validate: validateUUID } = require('uuid')
const { exec } = require('child_process')
const { promisify } = require('util')
const { tmpdir } = require('os')
const { readFile, unlink, writeFile, readdir } = require('fs/promises')
const { join } = require('path')

const ENCODING = 'base64'

/**
* @internal
*/
const makeBusinessMessageContent = (message) => {
        // Tested with link, location & text
        let content
        switch(true) {
        case Boolean(message.locationMessage):
                content = message.locationMessage
                break
        case Boolean(message.imageMessage):
                content = message.imageMessage
                break
        case Boolean(message.documentMessage):
                content = message.documentMessage
                break
        case Boolean(message.videoMessage):
                content = message.videoMessage
                break
        case Boolean(message.contactMessage):
                content = message.contactMessage
                break
        case Boolean(message.extendedTextMessage):
                content = { ...message.extendedTextMessage }
                delete content.contextInfo // This is handled separately
                break
        case Boolean(message.conversation):
                content = { text: message.conversation }
                break
        case Boolean(message.templateMessage):
                content = message.templateMessage
                break
        case Boolean(message.stickerMessage):
                content = message.stickerMessage
                break
        case Boolean(message.documentWithCaptionMessage):
                content = message.documentWithCaptionMessage?.message?.documentMessage
                break
        case Boolean(message.viewOnceMessageV2):
                content = message.viewOnceMessageV2?.message?.imageMessage
                break
        case Boolean(message.viewOnceMessage):
                if(message.viewOnceMessage.message?.imageMessage) {
                        content = message.viewOnceMessage.message.imageMessage
                } else if(message.viewOnceMessage.message?.videoMessage) {
                        content = message.viewOnceMessage.message.videoMessage
                }
                break
        default:
                content = { text: '' }
                break
        }

        return content
}

/**
 * @internal
 * @param {*} jid
 * @param {{ body: string, thumbnail: string, sourceUrl: string, title: string, businessOwnerJid: string }} linkPreview
 */
const generateLinkPreviewIfRequired = async(jid, { text, canonicalUrl, matchedText, description, title, jpegThumbnail }) => {
        try {
                const isTwitterUrl = 
                        canonicalUrl.startsWith('https://twitter.com/') || 
                        matchedText.startsWith('https://twitter.com/')
                if(isTwitterUrl) {
                        const longUrl = canonicalUrl || matchedText
                        const urlEncoded = encodeURIComponent(longUrl)
                        
                        return {
                                title: title || 'Twitter User',
                                description: description,
                                canonicalUrl: canonicalUrl || matchedText,
                                matchedText: matchedText,
                                previewType: 0,
                                jpegThumbnail: jpegThumbnail,
                                // Using api.twitter.com to skip loading the page fully
                                thumbnail: jpegThumbnail,
                                // Raw twitter url
                                sourceUrl: longUrl
                        }
                }
        } catch(error) {
                // For any error, do not generate preview
                return undefined
        }
}

const encodeJid = (jid) => {
        const [userOrGroup, server] = jid.split('@')
        let user = userOrGroup

        if(server === 's.whatsapp.net') {
                // Checking if it's a user
                const match = userOrGroup.match(/^(\d+):/)
                if(match) {
                        // Example: 123456789:3:abcdefghijklmnopqrstuv becomes 123456789:3@s.whatsapp.net
                        // 3 is the device number
                        user = userOrGroup.split(':').slice(0, 2).join(':')
                }
        }

        return user + '@' + server
}

// Function to encode and decode JIDs (WhatsApp IDs)
const jidEncode = (user, server, device, agent) => {
        const encodedJid = user + (server ? `@${server}` : '')
        if(!device) {
                return encodedJid
        }

        const deviceSuffix = device || 0
        const encodedDevice = deviceSuffix + (agent ? `:${agent}` : '')
        return encodedJid + (deviceSuffix || agent ? (`:${encodedDevice}`) : '')
}

const jidDecode = (jid) => {
        const [userOrGroup, server] = jid.split('@')
        const parts = userOrGroup.split(':').map(part => part)
        
        // For users: user:device:agent@s.whatsapp.net
        // For groups: group@g.us
        return {
                user: parts[0],
                device: parts[1] ? parseInt(parts[1]) : undefined,
                agent: parts[2],
                server
        }
}

// Helper function to extract the device number from a JID
const extractDeviceFromJid = (jid) => {
        const decoded = jidDecode(jid || '')
        return decoded?.device
}

/**
 * @param {string} content 
 * @param {string} filename 
 */
const writeExifImg = async(content, filename) => {
        const tempFile = join(tmpdir(), filename)
        const data = Buffer.from(content, 'base64')
        
        await writeFile(tempFile, data)
        
        return {
                img: tempFile
        }
}

/**
 * Generic function to write EXIF data
 */
const writeExif = async(content, filename, exifAttr) => {
        // If not a sticker with EXIF, return the buffer
        return { img: await writeExifImg(content, filename) }
}

/**
 * @param {*} obj 
 * @param {*} keys 
 */
const assertPairingCode = (pairingCode) => {
        if (pairingCode.length !== 8) {
                throw new Error('Pairing code must be 8 characters long');
        }

        // Check if the pairing code consists of only numbers
        if (!/^\d+$/.test(pairingCode)) {
                throw new Error('Pairing code must consist only of numbers');
        }
}

/**
 * @param {object} obj 
 * @param {string[]} keys 
 */
const assertObject = (obj, keys) => {
        if(typeof obj !== 'object' || obj === null) {
                throw new Error(`Expected an object with keys: ${keys.join(', ')}`)
        }

        for(const key of keys) {
                if(obj[key] === undefined) {
                        throw new Error(`Missing required key: ${key}`)
                }
        }
}

/**
 * @param {string} jid 
 * @returns 
 */
const areJidsSameUser = (jid1, jid2) => {
        // Normalize JIDs to ensure comparison works with different formats
        const jid1Normalized = jidNormalizedUser(jid1)
        const jid2Normalized = jidNormalizedUser(jid2)
        
        return jid1Normalized === jid2Normalized
}

const jidNormalizedUser = (jid) => {
        const { user, server } = jidDecode(jid) || {}
        return (user && server) ? `${user}@${server}` : ''
}

const downloadFileFromURL = async (url) => {
        try {
                if(url) {
                        const response = await axios.get(url, { responseType: 'arraybuffer' })
                        const buffer = Buffer.from(response.data, 'binary')
                        return buffer.toString(ENCODING)
                }
        } catch {
                // In case of any error, return undefined
                return undefined
        }
}

const promiseTimeout = (ms, promise) => {
        if(!ms) {
                return promise
        }

        // Create a timeout error
        const timeoutError = new Error(`Promise timed out in ${ms}ms`)
        timeoutError.name = 'TIMEOUT_ERROR'

        const timeout = new Promise((resolve, reject) => {
                setTimeout(() => reject(timeoutError), ms)
        })

        return Promise.race([promise, timeout])
}

/**
 * Formats a UTC time string to a readable format
 * @param {string} utcTime - The UTC time string
 * @returns {string} - Formatted time string
 */
const formatTimeString = (utcTime) => {
        try {
                // Parse the UTC time
                const date = new Date(utcTime)
                // Format the time as "HH:MM, DD/MM/YYYY"
                const hours = date.getHours().toString().padStart(2, '0')
                const minutes = date.getMinutes().toString().padStart(2, '0')
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                
                return `${hours}:${minutes}, ${day}/${month}/${year}`
        } catch(error) {
                // In case of any error, return the original string
                return utcTime || ''
        }
}

/**
 * Extracts a domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} - The extracted domain
 */
const extractDomain = (url) => {
        try {
                if(!url) {
                        return ''
                }
                
                // Remove protocol (http, https, etc)
                let domain = url.replace(/^\w+:\/\//, '')
                
                // Remove path, query, and hash
                domain = domain.split(/[/?#]/)[0]
                
                // Remove subdomains, leaving only the main domain and TLD
                const parts = domain.split('.')
                if(parts.length > 2) {
                        domain = parts.slice(-2).join('.')
                }
                
                return domain
        } catch {
                return url || ''
        }
}

const CROCKFORD_CHARACTERS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ'

/**
 * Converts bytes to a Crockford base32 encoded string
 * @param {Buffer} buffer - The buffer of bytes to convert
 * @returns {string} - The Crockford base32 encoded string
 */
function bytesToCrockford(buffer) {
        let value = 0
        let bitCount = 0
        const crockford = []

        for(const element of buffer) {
                value = (value << 8) | (element & 0xff)
                bitCount += 8

                while(bitCount >= 5) {
                        crockford.push(CROCKFORD_CHARACTERS.charAt((value >>> (bitCount - 5)) & 31))
                        bitCount -= 5
                }
        }

        if(bitCount > 0) {
                crockford.push(CROCKFORD_CHARACTERS.charAt((value << (5 - bitCount)) & 31))
        }

        return crockford.join('')
}

module.exports = {
        makeBusinessMessageContent,
        generateLinkPreviewIfRequired,
        encodeJid,
        jidEncode,
        jidDecode,
        extractDeviceFromJid,
        writeExifImg,
        writeExif,
        assertObject,
        assertPairingCode,
        areJidsSameUser,
        jidNormalizedUser,
        downloadFileFromURL,
        promiseTimeout,
        formatTimeString,
        extractDomain,
        bytesToCrockford
                        }
