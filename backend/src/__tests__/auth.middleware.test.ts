import { Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

// Mock de jsonwebtoken
jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

const JWT_VERIFY_OPTIONS = {
  issuer: 'alternance-tracker',
  audience: 'alternance-tracker-api',
};

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authenticateToken - Token valide', () => {
    it('devrait appeler next() si le token est valide', () => {
      const mockToken = 'valid-token';
      const mockDecoded = { userId: 1, email: 'test@example.com' };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockJwt.verify = jest.fn((
        _token: string,
        _secret: string,
        _options: jwt.VerifyOptions,
        callback: (err: any, decoded: any) => void
      ) => {
        callback(null, mockDecoded);
      }) as any;

      authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        'test-secret',
        JWT_VERIFY_OPTIONS,
        expect.any(Function)
      );
      expect(mockRequest.userId).toBe(1);
      expect(mockRequest.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Token manquant', () => {
    it('devrait retourner 401 si le token est manquant', () => {
      mockRequest.headers = {};

      authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token d\'authentification manquant',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('devrait retourner 401 si le header Authorization est manquant', () => {
      mockRequest.headers = {
        authorization: undefined,
      };

      authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Token invalide ou expiré', () => {
    it('devrait retourner 403 si le token est invalide', () => {
      const mockToken = 'invalid-token';

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockJwt.verify = jest.fn((
        _token: string,
        _secret: string,
        _options: jwt.VerifyOptions,
        callback: (err: any, decoded: any) => void
      ) => {
        callback(new Error('Invalid token'), null);
      }) as any;

      authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token invalide ou expiré',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('devrait retourner 403 si le token est expiré', () => {
      const mockToken = 'expired-token';

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';

      mockJwt.verify = jest.fn((
        _token: string,
        _secret: string,
        _options: jwt.VerifyOptions,
        callback: (err: any, decoded: any) => void
      ) => {
        callback(expiredError, null);
      }) as any;

      authenticateToken(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token invalide ou expiré',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

