import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const enlaceBase = 'rounded-md px-3 py-2 text-sm font-medium transition-colors';
const enlaceClase = ({ isActive }) =>
  `${enlaceBase} ${isActive ? 'bg-emerald-700 text-white' : 'text-emerald-50 hover:bg-emerald-700/60'}`;

export default function Navbar() {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();

  const cerrar = () => setAbierto(false);

  const salir = () => {
    logout();
    cerrar();
    navigate('/');
  };

  const enlaces = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/torneos', label: 'Torneos' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/posiciones', label: 'Posiciones' },
  ];
  if (hasRole('capitan', 'administrador')) enlaces.push({ to: '/mi-equipo', label: 'Mi equipo' });
  if (hasRole('organizador', 'administrador')) enlaces.push({ to: '/panel/organizador', label: 'Organizador' });
  if (hasRole('arbitro', 'administrador')) enlaces.push({ to: '/panel/arbitro', label: 'Árbitro' });
  if (hasRole('administrador')) enlaces.push({ to: '/panel/admin', label: 'Administración' });

  return (
    <header className="bg-emerald-800 shadow">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Navegación principal">
        <Link to="/" onClick={cerrar} className="text-lg font-bold text-white">
          Campus League
        </Link>

        <button
          type="button"
          className="rounded-md p-2 text-white md:hidden"
          aria-label="Abrir menú"
          aria-expanded={abierto}
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

        <div className={`${abierto ? 'flex' : 'hidden'} absolute left-0 right-0 top-14 z-20 flex-col gap-1 bg-emerald-800 px-4 pb-4 md:static md:flex md:flex-row md:items-center md:gap-2 md:bg-transparent md:p-0`}>
          {enlaces.map((e) => (
            <NavLink key={e.to} to={e.to} end={e.end} className={enlaceClase} onClick={cerrar}>
              {e.label}
            </NavLink>
          ))}

          <div className="mt-2 flex flex-col gap-2 md:ml-4 md:mt-0 md:flex-row md:items-center">
            {isAuthenticated ? (
              <>
                <NavLink to="/perfil" className={enlaceClase} onClick={cerrar}>
                  {user.nombre.split(' ')[0]}
                </NavLink>
                <button
                  type="button"
                  onClick={salir}
                  className="rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={enlaceClase} onClick={cerrar}>
                  Ingresar
                </NavLink>
                <Link
                  to="/registro"
                  onClick={cerrar}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
