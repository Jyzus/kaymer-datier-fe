export interface Project {
  id: string;
  tenantId?: string;
  userId?: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Schema {
  id: string;
  projectId: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scope_type: string;
  tenant_id?: string;
  created_at: string;
  last_used_at?: string;
}

const getApiBase = () => {
  // If we are running in production (served by the backend), we use relative /api
  // In development, we use local port 3000
  if (import.meta.env.MODE === 'production') {
    return '/api';
  }
  return 'http://localhost:3000/api';
};

const API_BASE = getApiBase();

// Storage keys
const ACCESS_TOKEN_KEY = 'datier_access_token';
const REFRESH_TOKEN_KEY = 'datier_refresh_token';
const USER_KEY = 'datier_user';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(data: {
  access_token: string;
  refresh_token?: string;
  user?: User;
}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const data = await res.json();
      if (data.access_token) {
        setAuth({
          access_token: data.access_token,
          refresh_token: data.refresh_token || rt,
          user: data.user,
        });
        return data.access_token;
      }
      return null;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isAuthRoute =
    path.startsWith('/auth/login') || path.startsWith('/auth/register');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized by attempting a token refresh
  if (response.status === 401 && !isAuthRoute) {
    const newToken = await doRefreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = { error: errText };
    }
    throw new Error(
      parsedErr.error ||
        parsedErr.message ||
        `HTTP error! status: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  login: async (email: string, password: string, tenant_slug?: string) => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenant_slug }),
    });
    setAuth({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      user: res.user,
    });
    return res;
  },

  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    return request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  logout: async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: rt }),
        });
      } catch {
        // ignore error on logout
      }
    }
    clearAuth();
    window.location.href = '/login';
  },

  getMe: () => request<{ userId: string; tenantId: string }>('/auth/me'),

  // API Keys
  getApiKeys: () => request<{ keys: ApiKeyItem[] }>('/auth/api-keys'),

  createApiKey: (
    name: string,
    scope_type: string = 'subscription',
    tenant_id?: string
  ) =>
    request<{
      id: string;
      name: string;
      api_key: string;
      key_prefix: string;
      scope_type: string;
    }>('/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, scope_type, tenant_id }),
    }),

  revokeApiKey: (keyId: string) =>
    request<{ success: boolean }>(`/auth/api-keys/${keyId}/revoke`, {
      method: 'POST',
    }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),

  createProject: (name: string, description?: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  updateProject: (id: string, name?: string, description?: string) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    }),

  deleteProject: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Schemas
  getSchemas: (projectId: string) =>
    request<Omit<Schema, 'value'>[]>(`/projects/${projectId}/schemas`),

  createSchema: (projectId: string, name: string) =>
    request<Schema>(`/projects/${projectId}/schemas`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getSchema: (id: string) => request<Schema>(`/schemas/${id}`),

  updateSchema: (id: string, payload: { name?: string; value?: string }) =>
    request<{ success: boolean }>(`/schemas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSchema: (id: string) =>
    request<{ success: boolean }>(`/schemas/${id}`, {
      method: 'DELETE',
    }),

  // AI Chat
  sendChat: (messages: ChatMessage[], ddlContext?: string, schemaId?: string) =>
    request<{ reply: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, ddlContext, schemaId }),
    }),

  getChatHistory: (schemaId: string, limit: number, offset: number) =>
    request<ChatMessage[]>(
      `/schemas/${schemaId}/chat?limit=${limit}&offset=${offset}`
    ),

  clearChatHistory: (schemaId: string) =>
    request<{ success: boolean }>(`/schemas/${schemaId}/chat`, {
      method: 'DELETE',
    }),
};
