import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from WABA_ENCRYPTION_KEY or JWT_SECRET.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.WABA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-key-at-least-32-chars-long-!!!';
  return crypto.pbkdf2Sync(secret, 'waba-salt', 100000, 32, 'sha256');
}

/**
 * Encrypts plain text using AES-256-GCM.
 * Output format: iv_hex:ciphertext_hex:tag_hex
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 * Gracefully returns plain text if it does not match the encrypted format or fails decryption.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText; // Backward compatibility for existing plain text fields
  }
  
  const ivHex = parts[0];
  const encryptedHex = parts[1];
  const tagHex = parts[2];
  
  if (ivHex === undefined || encryptedHex === undefined || tagHex === undefined) {
    return encryptedText;
  }
  
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted: string = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, treat it as plain text to prevent breaking existing data
    return encryptedText;
  }
}
