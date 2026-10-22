import { initDb, db } from './db.js';
import { hashPassword } from './security.js';

export async function seedUsers() {
  await initDb();

  const usersToSeed = [
    { email: 'recruiter@demo.com', role: 'recruiter' },
    { email: 'interviewer@demo.com', role: 'interviewer' },
    { email: 'admin@demo.com', role: 'admin' }
  ];

  for (const u of usersToSeed) {
    const existing = db.get('SELECT id FROM users WHERE email = ?', [u.email]);
    if (!existing) {
      db.run(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [u.email, hashPassword('ChangeMe123!'), u.role]
      );
      console.log(`[Seed] Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`[Seed] User already exists: ${u.email}`);
    }
  }

  console.log('[Seed] Database initialization and seeding completed successfully!');
}

// Allow direct execution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedUsers().catch(console.error);
}
