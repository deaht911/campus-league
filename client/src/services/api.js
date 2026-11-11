import axios from 'axios';

export const TOKEN_KEY = 'campus_league_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Adjunta el JWT en cada petición: Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró o es inválido, limpia la sesión y avisa a la app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const esAuth = url.startsWith('/auth/login') || url.startsWith('/auth/verify-otp');
    if (error.response?.status === 401 && !esAuth && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// Devuelve un mensaje legible a partir de un error de axios
export const getErrorMessage = (error) => {
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verifique su conexión.';
  }
  const data = error.response.data || {};
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.mensaje).join('. ');
  }
  return data.message || 'Ocurrió un error inesperado';
};

export default api;

// Torneos públicos (no requieren sesión)
export const getTournaments = (params = {}) =>
  api.get('/tournaments', { params }).then((res) => res.data);

export const getTournament = (id) =>
  api.get(`/tournaments/${id}`).then((res) => res.data);

// Partidos públicos (solo torneos con calendario publicado)
export const getMatches = (params = {}) =>
  api.get('/matches', { params }).then((res) => res.data);

// Tabla de posiciones y goleadores de un torneo (públicos)
export const getStandings = (torneoId) =>
  api.get(`/matches/standings/${torneoId}`).then((res) => res.data);

export const getScorers = (torneoId, params = {}) =>
  api.get(`/matches/scorers/${torneoId}`, { params }).then((res) => res.data);

// Equipos y plantilla (requieren sesión)
export const getMyTeams = () =>
  api.get('/teams/mine').then((res) => res.data);

export const createTeam = (datos) =>
  api.post('/teams', datos).then((res) => res.data);

export const deleteTeam = (id) =>
  api.delete(`/teams/${id}`).then((res) => res.data);

export const addPlayer = (teamId, datos) =>
  api.post(`/teams/${teamId}/players`, datos).then((res) => res.data);

export const updatePlayer = (teamId, userId, datos) =>
  api.put(`/teams/${teamId}/players/${userId}`, datos).then((res) => res.data);

export const removePlayer = (teamId, userId) =>
  api.delete(`/teams/${teamId}/players/${userId}`).then((res) => res.data);

// Inscripción de un equipo en un torneo
export const registerTeam = (torneoId, datos) =>
  api.post(`/tournaments/${torneoId}/registrations`, datos).then((res) => res.data);

// Perfil propio (requiere sesión)
export const updateProfile = (datos) =>
  api.put('/users/me', datos).then((res) => res.data);

// Estadísticas individuales de un jugador (públicas)
export const getPlayerStats = (userId, params = {}) =>
  api.get(`/matches/players/${userId}/stats`, { params }).then((res) => res.data);

// Gestión de torneos (organizador / administrador)
export const createTournament = (datos) =>
  api.post('/tournaments', datos).then((res) => res.data);

export const updateTournamentStatus = (id, estado) =>
  api.patch(`/tournaments/${id}/status`, { estado }).then((res) => res.data);

export const getRegistrations = (torneoId, params = {}) =>
  api.get(`/tournaments/${torneoId}/registrations`, { params }).then((res) => res.data);

export const reviewRegistration = (torneoId, regId, datos) =>
  api.patch(`/tournaments/${torneoId}/registrations/${regId}`, datos).then((res) => res.data);

export const generateFixture = (torneoId, datos = {}) =>
  api.post(`/tournaments/${torneoId}/fixture`, datos).then((res) => res.data);

export const publishFixture = (torneoId) =>
  api.post(`/tournaments/${torneoId}/fixture/publish`).then((res) => res.data);

export const discardFixture = (torneoId) =>
  api.delete(`/tournaments/${torneoId}/fixture`).then((res) => res.data);

// Partidos
export const rescheduleMatch = (matchId, datos) =>
  api.patch(`/matches/${matchId}/reschedule`, datos).then((res) => res.data);

export const assignReferee = (matchId, arbitro) =>
  api.patch(`/matches/${matchId}/referee`, { arbitro }).then((res) => res.data);

// Usuarios (solo administrador)
export const getUsers = (params = {}) =>
  api.get('/users', { params }).then((res) => res.data);

// Árbitros activos (organizador / administrador)
export const getReferees = () =>
  api.get('/users/referees').then((res) => res.data);
