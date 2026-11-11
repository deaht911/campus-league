import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const cerrar = () => setAbierto(false);

  const handleLogout = () => {
    logout();
    cerrar();
    navigate('/login');
  };

  const iniciales = user?.nombre
    ? user.nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : '';

  // Enlaces según el rol del usuario
  const enlaces = [
    { to: '/torneos', label: 'Torneos' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/posiciones', label: 'Posiciones' },
  ];
  if (user && hasRole('jugador', 'capitan', 'administrador')) enlaces.push({ to: '/mi-equipo', label: 'Mi Equipo' });
  if (user && hasRole('organizador', 'administrador')) enlaces.push({ to: '/panel/organizador', label: 'Organizador' });
  if (user && hasRole('arbitro', 'administrador')) enlaces.push({ to: '/panel/arbitro', label: 'Árbitro' });
  if (user && hasRole('administrador')) enlaces.push({ to: '/panel/admin', label: 'Administración' });

  const claseEnlace = ({ isActive }) =>
    `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors lg:px-2 ${
      isActive ? 'text-[#34E08F]' : 'text-gray-300 hover:text-white'
    }`;

  const sesion = user ? (
    <>
      <Link
        to="/perfil"
        onClick={cerrar}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-white transition hover:bg-white/10"
        title="Ver perfil"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00C16E] text-xs font-bold text-[#0B2545]">
          {iniciales}
        </span>
        <span className="max-w-[10rem] truncate lg:hidden xl:inline">{user.nombre}</span>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
      >
        Cerrar Sesión
      </button>
    </>
  ) : (
    <>
      <Link to="/login" onClick={cerrar} className="rounded-md px-3 py-2 text-sm text-gray-300 hover:text-white">
        Iniciar Sesión
      </Link>
      <Link to="/registro" onClick={cerrar} className="btn-primary px-4 py-2 text-xs">
        Registrarse
      </Link>
    </>
  );

  return (
    <header className="relative z-30 border-b border-[#24405f] bg-[#0B2545]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="Navegación principal">
        <Link to="/" onClick={cerrar} className="flex shrink-0 items-center gap-2 font-display text-lg font-bold text-white sm:text-xl">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C16E] text-xs font-black text-[#0B2545]">
            CL
          </span>
          <span className="whitespace-nowrap">Campus League</span>
        </Link>

        {/* Escritorio */}
        <div className="hidden items-center gap-3 lg:flex">
          {enlaces.map((e) => (
            <NavLink key={e.to} to={e.to} className={claseEnlace}>
              {e.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">{sesion}</div>

        {/* Botón de menú (móvil y tablet) */}
        <button
          type="button"
          className="rounded-md p-2 text-white hover:bg-white/10 lg:hidden"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          onClick={() => setAbierto((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            {abierto ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Menú desplegable (móvil y tablet) */}
      {abierto && (
        <div id="menu-movil" className="border-t border-[#24405f] bg-[#0B2545] px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col">
            {enlaces.map((e) => (
              <NavLink key={e.to} to={e.to} onClick={cerrar} className={claseEnlace}>
                {e.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#24405f] pt-3">{sesion}</div>
        </div>
      )}
    </header>
  );
}