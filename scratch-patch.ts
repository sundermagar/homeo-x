import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'packages/database/src/migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/CREATE TABLE \"/g, 'CREATE TABLE IF NOT EXISTS "');
  fs.writeFileSync(filePath, content);
  console.log('Patched ' + file);
}
