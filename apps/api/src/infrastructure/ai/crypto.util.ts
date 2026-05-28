import crypto from 'crypto';

// The CRYPTO_SECRET should be a 32-byte hex string or base64.
// For local development fallback, we use a consistent dummy 32-byte string.
const SECRET_KEY = process.env.CRYPTO_SECRET || '12345678901234567890123456789012';
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(text: string): string {
  if (!SECRET_KEY) throw new Error('CRYPTO_SECRET is required');
  const iv = crypto.randomBytes(12); // Standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const p0 = parts[0] as string;
  const p1 = parts[1] as string;
  const p2 = parts[2] as string;

  const iv = Buffer.from(p0, 'hex');
  const authTag = Buffer.from(p1, 'hex');
  const encryptedText = Buffer.from(p2, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText).toString('utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
