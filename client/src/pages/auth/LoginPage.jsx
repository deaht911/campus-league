import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';

const ROLES_DEMO = [
  { icono: '🏃', label: 'Jugador / Estudiante', correo: 'jugador@uab.edu.bo' },
  { icono: '⭐', label: 'Capitán de Equipo', correo: 'capitan@uab.edu.bo' },
  { icono: '📋', label: 'Organizador Deportivo', correo: 'organizador@uab.edu.bo' },
  { icono: '🟧', label: 'Árbitro / Mesa de Control', correo: 'arbitro@uab.edu.bo' },
  { icono: '🔧', label: 'Administrador', correo: 'admin@uab.edu.bo' },
];

const DEPORTES = [
  { icono: '⚽', nombre: 'Fútbol' },
  { icono: '🏀', nombre: 'Baloncesto' },
  { icono: '🏐', nombre: 'Voleibol' },
  { icono: '🏓', nombre: 'Tenis de Mesa' },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rolSel, setRolSel] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={destino} replace />;
  }

  const elegirRol = (rol) => {
    setRolSel(rol.label);
    setCorreo(rol.correo);
    setPassword('Campus2026!');
    setError('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setEnviando(true);
    try {
      await login(correo.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0B2545] p-10 lg:flex">
        <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
            CL
          </span>
          <span className="font-display text-lg font-semibold text-white">Campus League</span>
        </Link>

        <div className="relative">
          <h1 className="font-display text-5xl font-bold leading-tight text-white">
            Bienvenido
            <br />
            de Vuelta.
          </h1>
          <p className="mt-4 max-w-sm text-lg text-gray-300">
            Accede a tu panel, gestiona tu equipo y sigue el progreso de tus torneos universitarios.
          </p>

          <ul className="mt-10 grid max-w-sm grid-cols-2 gap-x-6 gap-y-4">
            {DEPORTES.map((d) => (
              <li key={d.nombre} className="flex items-center gap-2 text-sm text-gray-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs" aria-hidden="true">
                  {d.icono}
                </span>
                {d.nombre}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-gray-400">© 2025 Campus League · Universidad</p>
      </aside>

      <main className="flex items-center justify-center bg-[#121E2D] px-6 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
              CL
            </span>
            <span className="font-display text-lg font-semibold text-white">Campus League</span>
          </Link>

          <h2 className="font-display text-3xl font-bold text-white">Iniciar Sesión</h2>
          <p className="mt-1 text-sm text-gray-400">Ingresa tus credenciales universitarias.</p>

          {import.meta.env.DEV && (
            <div className="mt-6 rounded-xl border border-[#2a3544] bg-[#0f1824] p-3">
              <p className="mb-2 text-xs font-medium text-violet-400">Demo: selecciona tu rol</p>
              <div className="space-y-1">
                {ROLES_DEMO.map((rol) => (
                  <button
                    key={rol.label}
                    type="button"
                    onClick={() => elegirRol(rol)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                      rolSel === rol.label
                        ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]/60'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span aria-hidden="true">{rol.icono}</span>
                    {rol.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
            {error && (
              <div className="alert-error" role="alert">
                {error}
              </div>
            )}
            {info && <div className="alert-ok">{info}</div>}

            <div>
              <label htmlFor="correo" className="label-dark">
                Correo universitario
              </label>
              <input
                id="correo"
                type="email"
                autoComplete="email"
                required
                className="input-dark"
                placeholder="nombre@uab.edu.bo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label-dark">
                  Contraseña
                </label>
                <Link to="/recuperar" className="mb-1.5 text-xs font-medium text-white hover:text-[#34E08F]">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-dark"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-lg border border-[#1d3a63] bg-[#0B2545] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#00C16E] hover:bg-[#0f3160] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-white hover:text-[#34E08F]">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
