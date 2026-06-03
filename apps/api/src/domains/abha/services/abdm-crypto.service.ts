import * as crypto from 'crypto';

/**
 * Service for encrypting and decrypting ABDM health payloads.
 * Based on ABDM Health Information Provider (HIP) specification.
 * Uses ECDH on Curve25519 with AES-256-GCM.
 */
export class AbdmCryptoService {
  private static readonly CURVE = 'curve25519';
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_LENGTH = 32;

  /**
   * Generates a new ECDH key pair for the HIP.
   */
  public generateKeyPair() {
    const ecdh = crypto.createECDH(AbdmCryptoService.CURVE);
    ecdh.generateKeys();
    return {
      privateKey: ecdh.getPrivateKey('base64'),
      publicKey: ecdh.getPublicKey('base64'),
    };
  }

  /**
   * Derives a shared key using HKDF based on ABDM specification.
   */
  private deriveKey(sharedSecret: Buffer, salt: Buffer, info: string): Buffer {
    // ABDM specification uses HKDF-SHA256
    return Buffer.from(crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from(info), 32));
  }

  /**
   * Encrypts the FHIR payload using the receiver's public key (HIU/ABDM Gateway).
   *
   * @param plainText The FHIR JSON string
   * @param senderPrivateKey The HIP's private key (base64)
   * @param receiverPublicKey The receiver's public key (base64)
   * @param nonce The transaction ID or random string used as salt
   */
  public encrypt(
    plainText: string,
    senderPrivateKey: string,
    receiverPublicKey: string,
    nonce: string
  ) {
    const senderEcdh = crypto.createECDH(AbdmCryptoService.CURVE);
    senderEcdh.setPrivateKey(Buffer.from(senderPrivateKey, 'base64'));

    const receiverKeyBuffer = Buffer.from(receiverPublicKey, 'base64');
    
    // Generate shared secret
    const sharedSecret = senderEcdh.computeSecret(receiverKeyBuffer);

    // Generate random salt (32 bytes)
    const salt = crypto.randomBytes(AbdmCryptoService.SALT_LENGTH);

    // Derive AES key
    const aesKey = this.deriveKey(sharedSecret, salt, nonce);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Encrypt
    const cipher = crypto.createCipheriv(AbdmCryptoService.ALGORITHM, aesKey, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      encryptedData: encrypted,
      keyToShare: senderEcdh.getPublicKey('base64'),
      nonce: salt.toString('base64'), // ABDM usually requires the salt passed separately
      iv: iv.toString('base64'),
      authTag,
    };
  }

  /**
   * Decrypts the FHIR payload received from an external hospital (HIP) 
   * or the ABDM Gateway.
   * 
   * @param encryptedData The encrypted payload (base64)
   * @param receiverPrivateKey Our HIU private key (base64)
   * @param senderPublicKey The HIP's public key (base64)
   * @param nonce The salt used during encryption (base64)
   * @param iv The initialization vector (base64)
   * @param authTag The authentication tag (base64)
   */
  public decrypt(
    encryptedData: string,
    receiverPrivateKey: string,
    senderPublicKey: string,
    nonce: string,
    iv: string,
    authTag: string
  ): string {
    const receiverEcdh = crypto.createECDH(AbdmCryptoService.CURVE);
    receiverEcdh.setPrivateKey(Buffer.from(receiverPrivateKey, 'base64'));

    const senderKeyBuffer = Buffer.from(senderPublicKey, 'base64');
    
    // Generate shared secret
    const sharedSecret = receiverEcdh.computeSecret(senderKeyBuffer);

    // Derive AES key
    const aesKey = this.deriveKey(sharedSecret, Buffer.from(nonce, 'base64'), nonce);

    // Decrypt
    const decipher = crypto.createDecipheriv(
      AbdmCryptoService.ALGORITHM, 
      aesKey, 
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
