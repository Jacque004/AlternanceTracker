import createTables from './migrate';

createTables()
  .then(() => {
    console.log('✅ Migration terminée avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur de migration:', error);
    process.exit(1);
  });

