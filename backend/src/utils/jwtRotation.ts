import jwt from 'jsonwebtoken';

/**
 * Système de rotation des clés JWT
 *
 * Permet de :
 * - Supporter plusieurs clés simultanément (rotation sans interruption)
 * - Identifier quelle clé a été utilisée (kid - key ID)
 * - Révoquer des clés compromises sans invalider tous les tokens
 * - Migrer progressivement vers de nouvelles clés
 *
 * Configuration:
 * - JWT_SECRET_CURRENT : Clé active pour signer les nouveaux tokens
 * - JWT_SECRET_OLD : Clé précédente pour valider les anciens tokens
 * - JWT_SECRET_OLD_2 : Clé encore plus ancienne (optionnel)
 */

export interface JWTKey {
  kid: string; // Key ID (identifiant unique)
  key: string; // La clé secrète
  active: boolean; // Si true, utilisée pour signer les nouveaux tokens
  createdAt?: Date; // Date de création de la clé
  expiresAt?: Date; // Date d'expiration de la clé
}

/**
 * Charge les clés JWT depuis les variables d'environnement
 */
function loadJWTKeys(): JWTKey[] {
  const keys: JWTKey[] = [];

  // Clé actuelle (obligatoire)
  const currentKey = process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET;
  if (!currentKey) {
    throw new Error('JWT_SECRET_CURRENT ou JWT_SECRET est requis');
  }

  keys.push({
    kid: 'current',
    key: currentKey,
    active: true,
    createdAt: new Date(),
  });

  // Clé précédente (optionnel, pour transition)
  if (process.env.JWT_SECRET_OLD) {
    keys.push({
      kid: 'old',
      key: process.env.JWT_SECRET_OLD,
      active: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire dans 7 jours
    });
  }

  // Clé encore plus ancienne (optionnel)
  if (process.env.JWT_SECRET_OLD_2) {
    keys.push({
      kid: 'old-2',
      key: process.env.JWT_SECRET_OLD_2,
      active: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 jours
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Expire dans 1 jour
    });
  }

  return keys;
}

// Cache des clés chargées
let cachedKeys: JWTKey[] | null = null;

/**
 * Obtient toutes les clés JWT disponibles
 */
export function getJWTKeys(): JWTKey[] {
  if (!cachedKeys) {
    cachedKeys = loadJWTKeys();
  }
  return cachedKeys;
}

/**
 * Obtient la clé active pour signer les nouveaux tokens
 */
export function getActiveJWTKey(): JWTKey {
  const keys = getJWTKeys();
  const activeKey = keys.find((k) => k.active);

  if (!activeKey) {
    throw new Error('Aucune clé JWT active trouvée');
  }

  return activeKey;
}

/**
 * Obtient une clé par son kid
 */
export function getJWTKeyByKid(kid: string): JWTKey | undefined {
  const keys = getJWTKeys();
  return keys.find((k) => k.kid === kid);
}

/**
 * Signe un JWT avec la clé active et ajoute le kid
 */
export function signJWT(
  payload: Record<string, any>,
  options?: jwt.SignOptions
): string {
  const activeKey = getActiveJWTKey();

  return jwt.sign(payload, activeKey.key, {
    ...options,
    keyid: activeKey.kid, // Ajouter le kid dans le header JWT
  });
}

/**
 * Vérifie un JWT avec support multi-clés
 * Utilise le kid du header pour trouver la bonne clé
 */
export function verifyJWT(
  token: string,
  options?: jwt.VerifyOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Décoder le header pour obtenir le kid
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      return reject(new Error('Token invalide'));
    }

    const kid = decoded.header.kid as string | undefined;

    if (!kid) {
      // Ancien token sans kid, essayer avec la clé active
      const activeKey = getActiveJWTKey();
      return jwt.verify(token, activeKey.key, options, (err, payload) => {
        if (err) return reject(err);
        resolve(payload);
      });
    }

    // Trouver la clé correspondant au kid
    const key = getJWTKeyByKid(kid);

    if (!key) {
      return reject(new Error(`Clé JWT non trouvée pour kid: ${kid}`));
    }

    // Vérifier si la clé est expirée
    if (key.expiresAt && key.expiresAt < new Date()) {
      return reject(new Error(`Clé JWT expirée (kid: ${kid})`));
    }

    // Vérifier le token avec la clé appropriée
    jwt.verify(token, key.key, options, (err, payload) => {
      if (err) return reject(err);
      resolve(payload);
    });
  });
}

/**
 * Force le rechargement des clés (utile après rotation)
 */
export function reloadJWTKeys(): void {
  cachedKeys = null;
}

/**
 * Guide de rotation des clés:
 *
 * 1. Générer une nouvelle clé:
 *    node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
 *
 * 2. Définir la nouvelle clé comme JWT_SECRET_CURRENT_NEW dans .env
 *
 * 3. Déplacer les clés:
 *    JWT_SECRET_OLD_2 = JWT_SECRET_OLD
 *    JWT_SECRET_OLD = JWT_SECRET_CURRENT
 *    JWT_SECRET_CURRENT = JWT_SECRET_CURRENT_NEW
 *
 * 4. Redémarrer l'application
 *
 * 5. Attendre 7 jours (durée de vie des tokens)
 *
 * 6. Supprimer JWT_SECRET_OLD_2 de .env
 *
 * Note: Les utilisateurs n'ont rien à faire, leurs tokens restent valides
 *       pendant la période de transition.
 */
