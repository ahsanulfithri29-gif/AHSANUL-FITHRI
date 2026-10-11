/**
 * High-Grade AES-256-GCM Cryptographic Service
 * Powered by Web Crypto API (SubtleCrypto)
 * Provides military-grade AES-256 encryption for student answers and audit trails.
 */

import { EncryptedPacket } from '../types/exam';

const DEFAULT_EXAM_SECRET = 'MATH9-SMPN1-EXAM-LOCK-2026-KEY-SECRET-PROCTOR';

// Helper to convert ArrayBuffer to Base64
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to derive a 256-bit CryptoKey using SHA-256 from a passphrase
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawSecret = enc.encode(passphrase);
  const keyDigest = await window.crypto.subtle.digest('SHA-256', rawSecret);

  return window.crypto.subtle.importKey(
    'raw',
    keyDigest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary JavaScript payload into an AES-256-GCM packet
 */
export async function encryptAES256<T>(data: T, secret: string = DEFAULT_EXAM_SECRET): Promise<EncryptedPacket> {
  const key = await deriveKey(secret);
  const jsonStr = JSON.stringify(data);
  const enc = new TextEncoder();
  const encodedData = enc.encode(jsonStr);

  // 96-bit (12 bytes) Initialization Vector for standard AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Compute checksum before encryption for integrity verification
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .slice(0, 16)
    .join('');

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedData
  );

  return {
    version: '1.0',
    algorithm: 'AES-256-GCM',
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encryptedBuffer),
    timestamp: Date.now(),
    checksum,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted packet back to the original object
 */
export async function decryptAES256<T>(packet: EncryptedPacket, secret: string = DEFAULT_EXAM_SECRET): Promise<T> {
  const key = await deriveKey(secret);
  const ivBuffer = base64ToBuffer(packet.iv);
  const cipherBuffer = base64ToBuffer(packet.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
      tagLength: 128,
    },
    key,
    cipherBuffer
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as T;
}

/**
 * Formats a short preview of the encrypted ciphertext
 */
export function formatCipherPreview(ciphertext: string, length = 28): string {
  if (ciphertext.length <= length) return ciphertext;
  return `${ciphertext.substring(0, length / 2)}...${ciphertext.substring(ciphertext.length - length / 2)}`;
}
