/**
 * Authenticated fetch wrapper.
 * Automatically attaches the stored auth token to requests.
 */

import { getApiUrl, API_BASE_URL } from './apiConfig';

export { getApiUrl, API_BASE_URL };

const TOKEN_KEY = 'aquashield_auth_token';

function extractErrorMessage(data: any, status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return 'Backend server is waking up from sleep. Please wait 15-30 seconds and try again.';
  }
  if (status === 401) {
    return 'Session expired or invalid credentials. Please sign in again.';
  }
  if (data?.error && typeof data.error === 'string') return data.error;
  if (data?.detail && typeof data.detail === 'string') return data.detail;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const messages: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        messages.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${key}: ${val}`);
      }
    }
    if (messages.length > 0) return messages.join(' | ');
  }
  return `Request failed (${status})`;
}

export interface AuthFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
  const fullUrl = getApiUrl(url);
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const timeoutMs = options.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Convenience: GET with auth */
export async function authGet<T>(url: string, options?: AuthFetchOptions): Promise<T> {
  const res = await authFetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(data, res.status));
  }
  return res.json();
}

/** Convenience: POST with auth + JSON body */
export async function authPost<T>(url: string, body: unknown, options?: AuthFetchOptions): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await authFetch(url, {
    ...options,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data;
}

/** Convenience: PATCH with auth + JSON body */
export async function authPatch<T>(url: string, body: unknown, options?: AuthFetchOptions): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await authFetch(url, {
    ...options,
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data;
}
