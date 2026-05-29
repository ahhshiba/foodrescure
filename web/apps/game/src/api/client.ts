import type { LoginRequest, RegisterRequest, TokenResponse } from '@glitch/contracts';

const API = '/api/v1';

interface ReqOpts {
  token?: string | null;
  method?: string;
  body?: unknown;
}

export async function api<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { token, method = 'GET', body } = opts;
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function login(body: LoginRequest): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/login', { method: 'POST', body });
}

export function register(body: RegisterRequest): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/register', { method: 'POST', body });
}
