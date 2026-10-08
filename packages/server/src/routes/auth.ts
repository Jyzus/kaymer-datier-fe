import express from 'express';

import { authService, verifyTokenOrApiKey } from '../services/auth.js';

export const authRouter = express.Router();

// Helper to extract bearer token
function getBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// POST /api/auth/register - Register new user via ms-auth
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.register({
      email,
      password,
      first_name: first_name || '',
      last_name: last_name || '',
    });
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Registration proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// POST /api/auth/login - Login via ms-auth
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, tenant_slug } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await authService.login({
      email,
      password,
      tenant_slug: tenant_slug || 'default',
    });
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Login proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// POST /api/auth/refresh - Refresh access token via ms-auth
authRouter.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    const result = await authService.refresh(refresh_token);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Refresh proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// POST /api/auth/logout - Logout via ms-auth
authRouter.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    const result = await authService.logout(refresh_token);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Logout proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// GET /api/auth/me - Return verified claims of current user
authRouter.get('/me', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const context = await verifyTokenOrApiKey(token);
    return res.json(context);
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
});

// GET /api/auth/api-keys - List API keys of authenticated user
authRouter.get('/api-keys', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const result = await authService.listApiKeys(token);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('List api-keys proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// POST /api/auth/api-keys - Create API key for authenticated user
authRouter.post('/api-keys', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const { name, scope_type, tenant_id } = req.body;
    const result = await authService.createApiKey(token, {
      name: name || 'API Key',
      scope_type: scope_type || 'account',
      tenant_id,
    });
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Create api-key proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// POST /api/auth/api-keys/:id/revoke - Revoke API key
authRouter.post('/api-keys/:id/revoke', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  try {
    const result = await authService.revokeApiKey(token, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('Revoke api-key proxy error:', error);
    return res
      .status(500)
      .json({ error: 'Failed to communicate with auth service' });
  }
});

// GET /api/auth/oauth/google - Initiate Google OAuth
authRouter.get('/oauth/google', async (req, res) => {
  try {
    const googleAuthUrl = await authService.getGoogleOAuthUrl();
    return res.redirect(302, googleAuthUrl);
  } catch (error: any) {
    console.error('Google OAuth initiate error:', error);
    const frontendUrl =
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      'https://app.datier.pro';
    return res.redirect(
      302,
      `${frontendUrl}/login?error=${encodeURIComponent(
        error.message || 'Error al iniciar sesión con Google'
      )}`
    );
  }
});

// GET /api/auth/oauth/google/callback - Handle Google OAuth callback from Google
authRouter.get('/oauth/google/callback', async (req, res) => {
  const frontendUrl =
    process.env.APP_URL || process.env.FRONTEND_URL || 'https://app.datier.pro';
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const msg =
        (error_description as string) ||
        (error as string) ||
        'Acceso con Google cancelado';
      return res.redirect(
        302,
        `${frontendUrl}/login?error=${encodeURIComponent(msg)}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        302,
        `${frontendUrl}/login?error=${encodeURIComponent(
          'Parámetros de OAuth incompletos'
        )}`
      );
    }

    const result = await authService.handleGoogleOAuthCallback(
      code as string,
      state as string
    );

    if (!result.ok || !result.body?.access_token) {
      const msg =
        result.body?.message ||
        result.body?.error ||
        'Error al verificar autenticación con Google';
      return res.redirect(
        302,
        `${frontendUrl}/login?error=${encodeURIComponent(msg)}`
      );
    }

    const { access_token, refresh_token } = result.body;
    const redirectUrl = new URL(`${frontendUrl}/login`);
    redirectUrl.searchParams.set('token', access_token);
    if (refresh_token) {
      redirectUrl.searchParams.set('refresh', refresh_token);
    }

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(
      302,
      `${frontendUrl}/login?error=${encodeURIComponent(
        'Error interno procesando Google OAuth'
      )}`
    );
  }
});
