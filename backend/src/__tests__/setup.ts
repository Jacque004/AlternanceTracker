import { pool } from '../database/connection';

// Configuration globale pour les tests
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

afterAll(async () => {
  try {
    await pool.end();
  } catch {
    // Certains tests mockent déjà le module; on ignore donc les fermetures redondantes.
  }
});

