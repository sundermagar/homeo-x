// @ts-ignore
import { mlTrainingLogger } from '../../../apps/api/src/domains/consultation/services/ml-training-logger.service.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnv });

async function main() {
  console.log('Manually triggering embedding refresh for visit 56...');
  try {
    await mlTrainingLogger.refreshEmbedding('default', '56');
    console.log('✅ Done. Check verify-pgvector.ts output now.');
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  }
}

main();
