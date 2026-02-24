import { pool } from './connection';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des candidatures
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        application_date DATE,
        response_date DATE,
        notes TEXT,
        location VARCHAR(255),
        salary_range VARCHAR(100),
        job_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour améliorer les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(application_date);
    `);

    await client.query('COMMIT');
    console.log('✅ Tables créées avec succès');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la création des tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Exécuter les migrations si le script est appelé directement (CommonJS)
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('✅ Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur de migration:', error);
      process.exit(1);
    });
}

export default createTables;

