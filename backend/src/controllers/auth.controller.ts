import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { UserCreate, UserPublic } from '../models/User';
import { sendErrorResponse, SafeErrorMessages, ErrorCategories } from '../utils/errorHandler';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  }
  return secret;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName }: UserCreate = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({ 
        message: 'Cet email est déjà utilisé',
        field: 'email'
      });
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const result = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, created_at',
      [email, hashedPassword, firstName, lastName]
    );

    const user = result.rows[0];

    // Générer le token JWT avec issuer et audience pour plus de sécurité
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'alternance-tracker',
        audience: 'alternance-tracker-api',
      } as jwt.SignOptions
    );

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at
    };

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: userPublic
    });
  } catch (error: any) {
    // Gestion spécifique des erreurs PostgreSQL (contrainte unique)
    if (error.code === '23505') {
      res.status(409).json({
        message: 'Cet email est déjà utilisé',
        field: 'email'
      });
      return;
    }

    // Erreur serveur générique - ne pas exposer les détails
    sendErrorResponse(
      res,
      500,
      'Erreur lors de l\'inscription. Veuillez réessayer.',
      error,
      ErrorCategories.DATABASE
    );
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Hash factice pour éviter le timing attack
    // Ce hash ne correspond à aucun mot de passe réel, mais prend le même temps à vérifier
    const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMye5m5rqjCJxKJD9dQwXjNUQhQe2XqY0Wq';

    let userHash = DUMMY_HASH;
    let user = null;

    // Trouver l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      user = result.rows[0];
      userHash = user.password;
    }

    // TOUJOURS vérifier le hash, même si l'utilisateur n'existe pas
    // Cela garantit un temps de réponse constant et empêche l'énumération de comptes
    const isValidPassword = await bcrypt.compare(password, userHash);

    // Vérifier que l'utilisateur existe ET que le mot de passe est valide
    if (!user || !isValidPassword) {
      // Même message d'erreur dans tous les cas (utilisateur inexistant ou mot de passe invalide)
      res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      return;
    }

    // Générer le token JWT avec issuer et audience pour plus de sécurité
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'alternance-tracker',
        audience: 'alternance-tracker-api',
      } as jwt.SignOptions
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error: any) {
    sendErrorResponse(
      res,
      500,
      SafeErrorMessages.INTERNAL_ERROR,
      error,
      ErrorCategories.AUTHENTICATION
    );
  }
};

