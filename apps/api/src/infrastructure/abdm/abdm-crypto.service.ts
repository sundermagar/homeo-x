/**
 * ABDM Cryptography Service
 * 
 * Implements the ABDM-mandated encryption/decryption for Health Information Exchange.
 * Uses Elliptic Curve Diffie-Hellman (ECDH) key exchange with Curve25519,
 * HKDF for key derivation, and AES-256-GCM for symmetric encryption.
 * 
 * Spec Reference: https://sandbox.abdm.gov.in/docs/data_encryption
 */

import crypto from 'crypto';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('abdm-crypto');

// ABDM uses Curve25519 for ECDH key exchange
const CURVE = 'x25519';
const AES_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

export interface AbdmKeyMaterial {
  cryptoAlg: string;           // "ECDH"
  curve: string;               // "Curve25519"
  dhPublicKey: {
    expiry: string;            // ISO timestamp
    parameters: string;        // "Curve25519/32byte random key"
    keyValue: string;          // Base64-encoded public key
  };
  nonce: string;               // Base64-encoded random nonce (32 bytes)
}

export interface AbdmKeyPair {
  publicKey: string;   // Base64
  privateKey: string;  // Base64 (hex-encoded internally)
  nonce: string;       // Base64
}

export class AbdmCryptoService {

  /**
   * Generate an ECDH key pair and a random nonce for an ABDM transaction.
   * The key pair is ephemeral — generate a new one for each data exchange.
   */
  generateKeyPair(): AbdmKeyPair {
    const keyPair = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    const nonce = crypto.randomBytes(32);

    return {
      publicKey: keyPair.publicKey.toString('base64'),
      privateKey: keyPair.privateKey.toString('base64'),
      nonce: nonce.toString('base64'),
    };
  }

  /**
   * Build the ABDM-compliant keyMaterial payload to send with API requests.
   */
  buildKeyMaterial(keyPair: AbdmKeyPair, expiryMinutes = 60): AbdmKeyMaterial {
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    return {
      cryptoAlg: 'ECDH',
      curve: 'Curve25519',
      dhPublicKey: {
        expiry,
        parameters: 'Curve25519/32byte random key',
        keyValue: keyPair.publicKey,
      },
      nonce: keyPair.nonce,
    };
  }

  /**
   * Compute a shared secret using our private key and the remote party's public key.
   * Then derive the AES key using HKDF with both nonces as salt.
   */
  deriveSharedKey(
    ourPrivateKeyBase64: string,
    remotePublicKeyBase64: string,
    ourNonceBase64: string,
    remoteNonceBase64: string,
  ): Buffer {
    // Reconstruct key objects from DER-encoded base64
    const ourPrivateKey = crypto.createPrivateKey({
      key: Buffer.from(ourPrivateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });

    const remotePublicKey = crypto.createPublicKey({
      key: Buffer.from(remotePublicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });

    // Perform ECDH to get shared secret
    const sharedSecret = crypto.diffieHellman({
      privateKey: ourPrivateKey,
      publicKey: remotePublicKey,
    });

    // Combine nonces as salt for HKDF (XOR as per ABDM spec)
    const ourNonce = Buffer.from(ourNonceBase64, 'base64');
    const remoteNonce = Buffer.from(remoteNonceBase64, 'base64');
    const salt = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      salt[i] = (ourNonce[i] || 0) ^ (remoteNonce[i] || 0);
    }

    // HKDF expand to derive AES-256 key
    const derivedKey = crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.alloc(0), 32);

    logger.debug('Derived shared AES key via ECDH + HKDF');
    return Buffer.from(derivedKey);
  }

  /**
   * Encrypt data using AES-256-GCM with a derived key.
   * Returns: { encrypted: base64, iv: base64, tag: base64 }
   */
  encrypt(data: string, derivedKey: Buffer): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(AES_ALGO, derivedKey, iv, { authTagLength: TAG_LENGTH });

    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM with a derived key.
   */
  decrypt(encryptedBase64: string, ivBase64: string, tagBase64: string, derivedKey: Buffer): string {
    const decipher = crypto.createDecipheriv(
      AES_ALGO,
      derivedKey,
      Buffer.from(ivBase64, 'base64'),
      { authTagLength: TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

    let decrypted = decipher.update(Buffer.from(encryptedBase64, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Full encrypt flow for ABDM: given raw FHIR JSON and both party's key materials,
   * derive the shared key and encrypt the data.
   */
  encryptForAbdm(
    fhirJsonString: string,
    ourKeyPair: AbdmKeyPair,
    remoteKeyMaterial: AbdmKeyMaterial,
  ): { encrypted: string; iv: string; tag: string; keyMaterial: AbdmKeyMaterial } {
    const derivedKey = this.deriveSharedKey(
      ourKeyPair.privateKey,
      remoteKeyMaterial.dhPublicKey.keyValue,
      ourKeyPair.nonce,
      remoteKeyMaterial.nonce,
    );

    const result = this.encrypt(fhirJsonString, derivedKey);
    const keyMaterial = this.buildKeyMaterial(ourKeyPair);

    logger.info('Encrypted FHIR data for ABDM transmission');
    return { ...result, keyMaterial };
  }

  /**
   * Full decrypt flow for ABDM: given encrypted data and both party's key materials,
   * derive the shared key and decrypt.
   */
  decryptFromAbdm(
    encryptedBase64: string,
    ivBase64: string,
    tagBase64: string,
    ourKeyPair: AbdmKeyPair,
    remoteKeyMaterial: AbdmKeyMaterial,
  ): string {
    const derivedKey = this.deriveSharedKey(
      ourKeyPair.privateKey,
      remoteKeyMaterial.dhPublicKey.keyValue,
      ourKeyPair.nonce,
      remoteKeyMaterial.nonce,
    );

    const decrypted = this.decrypt(encryptedBase64, ivBase64, tagBase64, derivedKey);
    logger.info('Decrypted ABDM health information successfully');
    return decrypted;
  }
}

// Singleton instance
export const abdmCrypto = new AbdmCryptoService();
