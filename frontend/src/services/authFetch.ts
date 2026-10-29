/**
 * Authenticated fetch wrapper.
 * Automatically attaches the stored auth token to requests.
 */

const TOKEN_KEY = 'aquashield_auth_token';

function extractErrorMessage(data: any, status: number): string {
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

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

/** Convenience: GET with auth */
export async function authGet<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(data, res.status));
  }
  return res.json();
}

/** Convenience: POST with auth + JSON body */
export async function authPost<T>(url: string, body: unknown): Promise<T> {
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data;
}

/** Convenience: PATCH with auth + JSON body */
export async function authPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await authFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data;
}
