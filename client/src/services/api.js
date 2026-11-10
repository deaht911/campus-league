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
