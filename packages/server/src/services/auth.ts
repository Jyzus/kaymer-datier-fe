import dotenv from 'dotenv';
import * as jose from 'jose';

dotenv.config();

export const DEFAULT_TENANT_ID =
  process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const MS_AUTH_URL = process.env.MS_AUTH_URL || 'http://ms-auth:8085';
const AUTH_JWKS_URL =
  process.env.AUTH_JWKS_URL || `${MS_AUTH_URL}/.well-known/jwks.json`;
const AUTH_INTROSPECT_URL =
  process.env.AUTH_INTROSPECT_URL || `${MS_AUTH_URL}/v1/auth/introspect`;

let jwksRemote: any = null;
function getJWKS() {
  if (!jwksRemote) {
    jwksRemote = jose.createRemoteJWKSet(new URL(AUTH_JWKS_URL));
  }
  return jwksRemote;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  isApiKey?: boolean;
  permissions?: string[];
}

// In-memory cache for API key introspection results (60 seconds TTL)
interface CachedApiKey {
  result: AuthContext;
  expiresAt: number;
}
const apiKeyCache = new Map<string, CachedApiKey>();

export async function verifyTokenOrApiKey(
  rawToken: string
): Promise<AuthContext> {
  const token = rawToken.trim();

  // 1. Legacy static DATIER_API_KEY support for backward compatibility (e.g. Planifier initial setup)
  if (process.env.DATIER_API_KEY && token === process.env.DATIER_API_KEY) {
    return {
      userId: 'system',
      tenantId: DEFAULT_TENANT_ID,
      isApiKey: true,
      permissions: ['*'],
    };
  }

  // 2. M2M API Key (Perfil 2): starts with msa_live_
  if (token.startsWith('msa_live_')) {
    const cached = apiKeyCache.get(token);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.result;
    }

    const response = await fetch(AUTH_INTROSPECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(
        `ms-auth introspect failed with status ${response.status}`
      );
    }

    const data = (await response.json()) as {
      active: boolean;
      user_id?: string;
      tenant_id?: string;
      permissions?: string[];
    };

    if (!data.active) {
      throw new Error('API Key is invalid, inactive, or revoked');
    }

    const tenantId =
      data.tenant_id === 'default' || !data.tenant_id
        ? DEFAULT_TENANT_ID
        : data.tenant_id;

    const result: AuthContext = {
      userId: data.user_id || 'system',
      tenantId,
      isApiKey: true,
      permissions: data.permissions || [],
    };

    // Cache for 60 seconds
    apiKeyCache.set(token, { result, expiresAt: now + 60 * 1000 });
    return result;
  }

  // 3. User JWT Token (Perfil 1): Ed25519 signature verified via JWKS
  try {
    const JWKS = getJWKS();
    const { payload } = await jose.jwtVerify(token, JWKS, {
      algorithms: ['EdDSA'],
    });

    const rawTenantId = payload.tenant_id as string | undefined;
    const tenantId =
      rawTenantId === 'default' || !rawTenantId
        ? DEFAULT_TENANT_ID
        : rawTenantId;

    return {
      userId: payload.sub as string,
      tenantId,
      isApiKey: false,
    };
  } catch (error: any) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

// Proxied authentication operations to ms-auth
export const authService = {
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) {
    const res = await fetch(`${MS_AUTH_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async login(data: { email: string; password: string; tenant_slug?: string }) {
    const res = await fetch(`${MS_AUTH_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        tenant_slug: data.tenant_slug || 'default',
      }),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async refresh(refreshToken: string) {
    const res = await fetch(`${MS_AUTH_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async logout(refreshToken: string) {
    const res = await fetch(`${MS_AUTH_URL}/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async listApiKeys(bearerToken: string) {
    const res = await fetch(`${MS_AUTH_URL}/v1/api-keys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async createApiKey(
    bearerToken: string,
    data: { name: string; scope_type: string; tenant_id?: string }
  ) {
    const res = await fetch(`${MS_AUTH_URL}/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async revokeApiKey(bearerToken: string, keyId: string) {
    const res = await fetch(`${MS_AUTH_URL}/v1/api-keys/${keyId}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },

  async getGoogleOAuthUrl(): Promise<string> {
    const res = await fetch(`${MS_AUTH_URL}/v1/auth/oauth/google`, {
      method: 'GET',
      redirect: 'manual',
    });
    const location = res.headers.get('location');
    if (!location) {
      throw new Error(
        'ms-auth did not return redirect Location for Google OAuth'
      );
    }
    return location;
  },

  async handleGoogleOAuthCallback(code: string, state: string) {
    const res = await fetch(
      `${MS_AUTH_URL}/v1/auth/oauth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        method: 'GET',
      }
    );
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  },
};
