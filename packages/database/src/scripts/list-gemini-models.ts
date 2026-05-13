import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnv });

const GEMINI_API_KEY = process.env['GEMINI_API_KEY']?.split(',')[0];

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json() as any;
  console.log(JSON.stringify(data, null, 2));
}

main();
