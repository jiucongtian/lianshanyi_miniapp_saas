/**
 * Create the first super-admin user
 * Usage: npm run admin:create
 * Or:    ADMIN_PHONE=... ADMIN_PASSWORD=... ADMIN_USERNAME=... npm run admin:create
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';
import { User } from '../src/models/user.model';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const phone = process.env.ADMIN_PHONE || (await prompt('Admin phone (optional): '));
  const username = process.env.ADMIN_USERNAME || (await prompt('Admin username: '));
  const password = process.env.ADMIN_PASSWORD || (await prompt('Admin password: '));

  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  // Check existing
  const existingAdmin = await User.findOne({ isAdmin: true });
  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.username ?? existingAdmin.phone}`);
    const confirm = await prompt('Create another admin? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      await mongoose.disconnect();
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({
    username: username || undefined,
    phone: phone || undefined,
    passwordHash,
    userType: 'premium',
    isAdmin: true,
    isGuest: false,
  });

  console.log(`✓ Admin created: ${admin.username ?? admin.phone} (id: ${admin._id})`);
  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
