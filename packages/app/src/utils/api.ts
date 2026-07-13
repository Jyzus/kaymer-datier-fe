export interface Project {
  id: string;
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

const getApiBase = () => {
  // If we are running in production (served by the backend), we use relative /api
  // In development, we use local port 3000
  if (import.meta.env.MODE === 'production') {
    return '/api';
  }
  return 'http://localhost:3000/api';
};

const API_BASE = getApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = { error: errText };
    }
    throw new Error(
      parsedErr.error || `HTTP error! status: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
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
