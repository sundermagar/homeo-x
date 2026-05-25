import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('r2-storage');

const isR2Enabled = !!(
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_ENDPOINT &&
  process.env.CLOUDFLARE_R2_BUCKET_NAME
);

const s3Client = isR2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/**
 * Uploads a local temporary file to Cloudflare R2 bucket.
 * Automatically deletes the local file from disk after successful upload.
 * If credentials are not set, it falls back to returning the local relative path.
 */
export async function uploadFileToR2(localFilePath: string, originalFileName: string, mimeType: string): Promise<string> {
  const fileNameOnly = localFilePath.split(/[\\/]/).pop() || `${Date.now()}-${originalFileName}`;

  if (!isR2Enabled || !s3Client) {
    logger.info(`R2 credentials not detected. Storing locally as /uploads/${fileNameOnly}`);
    return `/uploads/${fileNameOnly}`;
  }

  try {
    const fileStream = fs.createReadStream(localFilePath);
    const uniqueKey = `${Date.now()}-${originalFileName.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    logger.info(`Uploading ${originalFileName} (as ${uniqueKey}) to Cloudflare R2...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: uniqueKey,
        Body: fileStream,
        ContentType: mimeType,
      })
    );

    // Delete local temporary file since it's uploaded to R2
    fs.promises.unlink(localFilePath).catch(err => {
      logger.warn(`Could not delete local temp file ${localFilePath}: ${err.message}`);
    });

    const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
    const cleanPublicUrl = publicBaseUrl.replace(/\/$/, '');
    return `${cleanPublicUrl}/${uniqueKey}`;
  } catch (err: any) {
    logger.error(`Cloudflare R2 upload failed: ${err.message}. Falling back to local disk path.`);
    return `/uploads/${fileNameOnly}`;
  }
}
