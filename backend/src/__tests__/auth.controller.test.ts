import { Request, Response } from 'express';
import { login } from '../controllers/auth.controller';
import { pool } from '../database/connection';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock des dépendances
jest.mock('../database/connection');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Controller - Login', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('POST /login - Test connexion valide', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword123',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock de la requête SQL
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [mockUser],
      });

      // Mock de bcrypt.compare
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);

      // Mock de jwt.sign
      const mockToken = 'mock-jwt-token';
      mockJwt.sign = jest.fn().mockReturnValue(mockToken);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: 1, email: 'test@example.com' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Connexion réussie',
        token: mockToken,
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      });
    });
  });

  describe('POST /login - Test email inexistant', () => {
    it('devrait retourner une erreur 401 si l\'email n\'existe pas', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Mock de la requête SQL - aucun utilisateur trouvé
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [],
      });

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['nonexistent@example.com']
      );
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email ou mot de passe incorrect',
      });
    });
  });

  describe('POST /login - Test mauvais mot de passe', () => {
    it('devrait retourner une erreur 401 si le mot de passe est incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword123',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock de la requête SQL
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [mockUser],
      });

      // Mock de bcrypt.compare - retourne false (mot de passe incorrect)
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email ou mot de passe incorrect',
      });
    });
  });

  describe('POST /login - Gestion des erreurs serveur', () => {
    it('devrait gérer les erreurs de base de données', async () => {
      // Mock console.error pour éviter le bruit dans la console de test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock d'une erreur de base de données
      mockPool.query = jest.fn().mockRejectedValue(new Error('Database connection error'));

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Erreur serveur',
        error: 'Database connection error',
      });

      // Restaurer console.error
      consoleSpy.mockRestore();
    });
  });
});

