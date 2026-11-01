/**
 * Global API configuration.
 *
 * In production:
 * - Uses VITE_API_URL environment variable if provided.
 * - Defaults to the live Render backend URL: https://aquashield-backend-vuvb.onrender.com.
 *
 * In local development:
 * - Uses VITE_API_URL if provided, or empty string (relative URL) so Vite proxy handles it.
 */
const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://aquashield-backend-vuvb.onrender.com' : '');

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export function getApiUrl(endpoint: string): string {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

