import fs from 'fs';
import path from 'path';

const files = [
  'packages/database/src/schema/app-schema.ts',
  'packages/database/src/schema/appointments.ts',
  'packages/database/src/schema/audit.ts',
  'packages/database/src/schema/billing.ts',
  'packages/database/src/schema/consultation.ts',
  'packages/database/src/schema/index.ts',
  'packages/database/src/schema/medical-cases.ts',
  'packages/database/src/schema/patients.ts',
  'packages/database/src/schema/users.ts'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // We want to keep everything between <<<<<<< Updated upstream and =======
  // And remove everything from ======= to >>>>>>> Stashed changes
  
  const regex = /<<<<<<< Updated upstream[\s\S]*?=======\n([\s\S]*?)>>>>>>> Stashed changes\n?/g;
  
  // Actually, we want to KEEP what's before =======, so we just replace the whole block with the upstream part
  const replaced = content.replace(/<<<<<<< Updated upstream\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> Stashed changes\n?/g, '$1');
  
  fs.writeFileSync(file, replaced);
  console.log('Resolved', file);
}
