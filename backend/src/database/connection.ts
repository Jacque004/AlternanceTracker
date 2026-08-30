import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Gestion des erreurs de connexion (ne pas tuer le processus)
pool.on('error', (err) => {
  console.error('⚠️  Erreur PostgreSQL (connexion perdue ou non disponible):', err.message);
  // Ne pas faire process.exit() pour permettre au serveur de tourner sans BDD
});

