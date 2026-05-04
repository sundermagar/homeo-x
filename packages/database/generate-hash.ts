import bcrypt from 'bcryptjs';

async function generate() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash:', hash);
}

generate().catch(console.error);
