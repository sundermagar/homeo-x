import { seedAiOperations } from './src/seeds/ai-ops.js';
import fs from 'fs';
import path from 'path';

// Manual .env loader
const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

seedAiOperations().catch(err => {
  console.error(err);
  process.exit(1);
});
