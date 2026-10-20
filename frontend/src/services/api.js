/**
 * Centralized TikiTaka API Client
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

/**
 * Universal fetch wrapper with error handling and JSON normalization
 */
export async function apiClient(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers: defaultHeaders
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
      signal: AbortSignal.timeout(5000)
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
      dbMessage: data.database?.message,
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
      error: error.name === 'TimeoutError' ? 'Connection timed out after 5s' : error.message || 'Network error'
    };
  }
}

// ==========================================
// TEAMS API METHODS
// ==========================================
export async function getTeams(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient(`/teams${queryString}`);
}

export async function getTeamById(id) {
  return apiClient(`/teams/${id}`);
}

export async function createTeam(teamData) {
  return apiClient('/teams', {
    method: 'POST',
    body: JSON.stringify(teamData)
  });
}

export async function updateTeam(id, teamData) {
  return apiClient(`/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(teamData)
  });
}

export async function deleteTeam(id) {
  return apiClient(`/teams/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// PLAYERS API METHODS
// ==========================================
export async function getPlayers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.position) query.append('position', params.position);
  if (params.foot) query.append('foot', params.foot);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient(`/players${queryString}`);
}

export async function getPlayerById(id) {
  return apiClient(`/players/${id}`);
}

export async function createPlayer(playerData) {
  return apiClient('/players', {
    method: 'POST',
    body: JSON.stringify(playerData)
  });
}

export async function updatePlayer(id, playerData) {
  return apiClient(`/players/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(playerData)
  });
}

export async function deletePlayer(id) {
  return apiClient(`/players/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// MATCHES API METHODS
// ==========================================
export async function getMatches(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.team) query.append('team', params.team);
  if (params.matchType) query.append('matchType', params.matchType);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiClient(`/matches${queryString}`);
}

export async function getMatchById(id) {
  return apiClient(`/matches/${id}`);
}

export async function createMatch(matchData) {
  return apiClient('/matches', {
    method: 'POST',
    body: JSON.stringify(matchData)
  });
}

export async function updateMatch(id, matchData) {
  return apiClient(`/matches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(matchData)
  });
}

export async function updateMatchStatus(id, status) {
  return apiClient(`/matches/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function recordGoal(id, goalData) {
  return apiClient(`/matches/${id}/goals`, {
    method: 'POST',
    body: JSON.stringify(goalData)
  });
}

export async function deleteMatch(id) {
  return apiClient(`/matches/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// DASHBOARD AGGREGATED STATS
// ==========================================
export async function getDashboardStats() {
  const [teamsRes, playersRes, scheduledMatchesRes, completedMatchesRes, recentMatchesRes] = await Promise.all([
    getTeams({ isActive: 'true' }).catch(() => ({ data: [] })),
    getPlayers({ isActive: 'true' }).catch(() => ({ data: [] })),
    getMatches({ status: 'Scheduled', limit: 1 }).catch(() => ({ total: 0 })),
    getMatches({ status: 'Completed', limit: 1 }).catch(() => ({ total: 0 })),
    getMatches({ limit: 5 }).catch(() => ({ data: [] }))
  ]);

  return {
    totalTeams: teamsRes.count ?? (Array.isArray(teamsRes.data) ? teamsRes.data.length : 0),
    totalPlayers: playersRes.count ?? (Array.isArray(playersRes.data) ? playersRes.data.length : 0),
    upcomingMatchesCount: scheduledMatchesRes.total ?? 0,
    completedMatchesCount: completedMatchesRes.total ?? 0,
    recentMatches: recentMatchesRes.data || []
  };
}

export default apiClient;
