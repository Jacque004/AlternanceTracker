import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Gestion des erreurs de connexion
pool.on('error', (err) => {
  console.error('Erreur inattendue sur le client PostgreSQL:', err);
  process.exit(-1);
});

