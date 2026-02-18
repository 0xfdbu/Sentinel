// ==========================================================================
// SENTINEL CRYPTO UTILITIES - AES-256-GCM Decryption
// ==========================================================================
// Production-grade cryptographic functions for Confidential HTTP
// Matches CipherTools.org AES-GCM implementation exactly
// ==========================================================================

/**
 * Decrypts AES-256-GCM encrypted data from Confidential HTTP responses
 * 
 * Format: nonce (12 bytes) || ciphertext || tag (16 bytes)
 * - Nonce/IV: 12 bytes (96 bits) - standard for GCM
 * - Tag: 16 bytes (128 bits) - authentication tag
 * - Key: 32 bytes (256 bits) - from Vault DON
 * 
 * @param ciphertextHex - Hex string of (ciphertext + tag)
 * @param nonceHex - Hex string of nonce/IV (24 hex chars = 12 bytes)
 * @param keyHex - Hex string of AES key (64 hex chars = 32 bytes)
 * @returns Decrypted plaintext string
 */
export const decryptAesGcm = (
  ciphertextHex: string,
  nonceHex: string,
  keyHex: string
): string => {
  // Validate inputs
  if (keyHex.length !== 64) {
    throw new Error(`Invalid key length: expected 64 hex chars (32 bytes), got ${keyHex.length}`);
  }
  if (nonceHex.length !== 24) {
    throw new Error(`Invalid nonce length: expected 24 hex chars (12 bytes), got ${nonceHex.length}`);
  }
  if (ciphertextHex.length < 32) {
    throw new Error(`Invalid ciphertext: too short (must include 16-byte tag)`);
  }

  // Convert hex to Uint8Array
  const key = hexToBytes(keyHex);
  const nonce = hexToBytes(nonceHex);
  const ciphertextAndTag = hexToBytes(ciphertextHex);

  // In browser/Node environment, use Web Crypto API
  // Note: In CRE TEE, this would use the enclave's crypto primitives
  return decryptAesGcmWebCrypto(key, nonce, ciphertextAndTag);
};

/**
 * Web Crypto API implementation for AES-256-GCM decryption
 * Compatible with CipherTools.org and CRE TEE output
 */
const decryptAesGcmWebCrypto = async (
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertextAndTag: Uint8Array
): Promise<string> => {
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt - ciphertextAndTag already includes the auth tag
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      tagLength: 128, // 16 bytes * 8 = 128 bits
    },
    cryptoKey,
    ciphertextAndTag
  );

  return new TextDecoder().decode(decrypted);
};

/**
 * Synchronous version for CRE runtime environment
 * Uses built-in crypto if available, otherwise throws
 */
export const decryptAesGcmSync = (
  ciphertextHex: string,
  nonceHex: string,
  keyHex: string
): string => {
  const key = hexToBytes(keyHex);
  const nonce = hexToBytes(nonceHex);
  const ciphertextAndTag = hexToBytes(ciphertextHex);

  // Try to use Node.js crypto if available (for testing)
  try {
    // Dynamic import to avoid bundling issues
    const crypto = require('crypto');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      Buffer.from(nonce)
    );
    
    // Extract ciphertext and tag (last 16 bytes)
    const tagStart = ciphertextAndTag.length - 16;
    const ciphertext = ciphertextAndTag.slice(0, tagStart);
    const tag = ciphertextAndTag.slice(tagStart);
    
    decipher.setAuthTag(Buffer.from(tag));
    
    let decrypted = decipher.update(Buffer.from(ciphertext));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (e) {
    throw new Error(`AES-GCM decryption failed: ${e}. Ensure Node.js crypto is available.`);
  }
};

/**
 * Converts hex string to Uint8Array
 * Handles both 0x-prefixed and raw hex strings
 */
export const hexToBytes = (hex: string): Uint8Array => {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${cleanHex.length}`);
  }
  
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Converts Uint8Array to hex string (no 0x prefix)
 */
export const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Extracts nonce and ciphertext+tag from encrypted response body
 * Format: nonce (12 bytes) || ciphertext || tag (16 bytes)
 */
export const extractEncryptedComponents = (
  encryptedBody: Uint8Array
): { nonce: string; ciphertext: string; tag: string; combined: string } => {
  if (encryptedBody.length < 28) { // 12 (nonce) + 16 (tag) minimum
    throw new Error(`Encrypted body too short: ${encryptedBody.length} bytes`);
  }

  const nonce = encryptedBody.slice(0, 12);
  const ciphertextAndTag = encryptedBody.slice(12);
  const tag = ciphertextAndTag.slice(-16);
  const ciphertext = ciphertextAndTag.slice(0, -16);

  return {
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    tag: bytesToHex(tag),
    combined: bytesToHex(ciphertextAndTag), // For direct decryption
  };
};

/**
 * Validates that a string is valid hex
 */
export const isValidHex = (str: string): boolean => {
  const clean = str.startsWith('0x') ? str.slice(2) : str;
  return /^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0;
};

/**
 * Generates a random AES-256 key (for testing/development)
 * In production, key comes from Vault DON via {{.san_marino_aes_gcm_encryption_key}}
 */
export const generateAesKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
};

// ==========================================================================
// CIPHER TOOLS COMPATIBILITY
// ==========================================================================

/**
 * Formats encrypted data for CipherTools.org decryption
 * Returns formatted strings ready for copy-paste to CipherTools
 */
export const formatForCipherTools = (
  encryptedBody: Uint8Array
): {
  nonceHex: string;
  ciphertextHex: string;
  instructions: string;
} => {
  const components = extractEncryptedComponents(encryptedBody);
  
  return {
    nonceHex: components.nonce,
    ciphertextHex: components.combined, // CipherTools expects ciphertext+tag combined
    instructions: `
=== CipherTools.org Decryption Instructions ===
URL: https://www.ciphertools.org/tools/aes/gcm

Operation: Decrypt + verify tag
Mode: GCM
Tag length: 128 bits
Key size: 256 bit

Nonce/IV (hex):
${components.nonce}

Ciphertext + Tag (hex):
${components.combined.substring(0, 64)}...${components.combined.slice(-32)}

Key: (from Vault DON / .env AES_KEY_ALL)
`,
  };
};
