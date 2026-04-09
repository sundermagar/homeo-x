import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/api/src/shared/config -> apps/api -> repo root
const apiDir = path.resolve(__dirname, '../../../..');
const repoRoot = path.resolve(apiDir, '..');

// Priority: API-local env, then repo root env.
dotenv.config({ path: path.join(apiDir, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env') });

