/**
 * Centralized TikiTaka API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Universal fetch wrapper with error handling and JSON normalization
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers: defaultHeaders,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Enhance error for callers
    if (!error.status) {
      error.isNetworkError = true;
    }
    throw error;
  }
}

/**
 * Check backend health & database connectivity
 */
export async function checkApiHealth() {
  const startTime = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    const latency = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        isReachable: false,
        isDbConnected: false,
        serverStatus: 'error',
        dbStatus: 'unknown',
        latency,
        error: `Server returned HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return {
      isReachable: true,
      serverStatus: data.status || 'ok',
      dbStatus: data.database?.status || 'unknown',
      isDbConnected: !!data.database?.connected,
      latency,
      details: data
    };
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    return {
      isReachable: false,
      isDbConnected: false,
      serverStatus: 'offline',
      dbStatus: 'unreachable',
      latency,
      error: error.name === 'TimeoutError' ? 'Connection timed out after 5s' : (error.message || 'Network error')
    };
  }
}

export default apiClient;
