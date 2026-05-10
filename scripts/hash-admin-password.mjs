import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const passwordArg = process.argv[2];

const readPassword = async () => {
  if (passwordArg) return passwordArg;
  const rl = createInterface({ input, output });
  try {
    return await rl.question('Admin password: ');
  } finally {
    rl.close();
  }
};

const password = await readPassword();
if (!password || password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
