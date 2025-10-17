/**
 * API utility functions for dynamic URL handling
 */

/**
 * Get the API base URL based on the current domain
 * - If current domain is localhost, use http://localhost:8000
 * - Otherwise, use the current domain and scheme with port 8000
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'http://localhost:8000';
  }

  const { protocol, hostname } = window.location;
  
  // Check if we're on localhost (development)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // For production, use current domain and scheme
  return `${protocol}//${hostname}`;
}

/**
 * Get the full API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}
