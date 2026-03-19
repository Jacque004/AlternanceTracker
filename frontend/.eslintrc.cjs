module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  rules: {
    // On vérifie surtout que les hooks sont utilisés correctement.
    'react-hooks/rules-of-hooks': 'error',
    // Pour éviter de bloquer sur des règles parfois trop strictes au démarrage.
    'react-hooks/exhaustive-deps': 'off',
    // Pas de règle stricte React Refresh pour ce projet.
    'react-refresh/only-export-components': 'off',
    // On laisse TypeScript gérer l'essentiel des contrôles; on évite les faux positifs ESLint.
    '@typescript-eslint/no-unused-vars': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/'],
};

