import { NextFunction, Request, Response } from 'express';

/**
 * Authentication middleware that validates Bearer token against DATIER_API_KEY.
 * - When DATIER_API_KEY is configured in environment, requests must provide:
 *   - 'Authorization: Bearer <DATIER_API_KEY>' or
 *   - 'X-API-KEY: <DATIER_API_KEY>'
 * - Same-origin requests from the browser web frontend are permitted so the visual UI is preserved.
 * - When DATIER_API_KEY is not configured, API operates in development/open mode.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const configuredApiKey = process.env.DATIER_API_KEY;

  if (!configuredApiKey) {
    return next();
  }

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim() === configuredApiKey) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid Bearer token' });
  }

  // 2. Check X-API-KEY: <token>
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim() === configuredApiKey) {
    return next();
  }

  // 3. Allow same-origin browser requests (frontend UI)
  const secFetchSite = req.headers['sec-fetch-site'];
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (secFetchSite === 'same-origin') {
    return next();
  }

  if (origin && host && origin.includes(host)) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Missing or invalid Bearer token / API key',
  });
};
