import { NextFunction, Request, Response } from 'express';

import { AuthContext, verifyTokenOrApiKey } from '../services/auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthContext;
  }
}

/**
 * Authentication middleware that verifies:
 * 1. Bearer JWT tokens via Ed25519 JWKS against ms-auth (Perfil 1)
 * 2. M2M API Keys (msa_live_...) via RFC 7662 introspection against ms-auth (Perfil 2)
 * 3. Legacy DATIER_API_KEY for backward compatibility during transition
 *
 * Populates req.user with { userId, tenantId, isApiKey, permissions }.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token: string | null = null;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      token = match[1].trim();
    }
  }

  // 2. X-API-KEY: <token>
  if (!token && typeof req.headers['x-api-key'] === 'string') {
    token = req.headers['x-api-key'].trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Missing Authorization Bearer token or X-API-KEY',
    });
  }

  try {
    const authContext = await verifyTokenOrApiKey(token);
    req.user = authContext;
    return next();
  } catch (error: any) {
    return res.status(401).json({
      error: `Unauthorized: ${error.message || 'Invalid credentials'}`,
    });
  }
};
