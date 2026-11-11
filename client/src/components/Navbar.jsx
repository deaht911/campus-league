import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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

  return (
    <nav className="border-b border-[#24405f] bg-[#0B2545]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C16E] text-xs font-black text-[#0B2545]">
            CL
          </span>
          Campus League
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link to="/torneos" className="whitespace-nowrap hover:text-white">Torneos</Link>
          <Link to="/calendario" className="whitespace-nowrap hover:text-white">Calendario</Link>
          <Link to="/posiciones" className="whitespace-nowrap hover:text-white">Posiciones</Link>
          {user && hasRole('jugador', 'capitan', 'administrador') && (
            <Link to="/mi-equipo" className="whitespace-nowrap hover:text-white">
              Mi Equipo
            </Link>
          )}
          {user && hasRole('organizador', 'administrador') && (
            <Link to="/panel/organizador" className="whitespace-nowrap hover:text-white">
              Organizador
            </Link>
          )}
          {user && hasRole('arbitro', 'administrador') && (
            <Link to="/panel/arbitro" className="whitespace-nowrap hover:text-white">
              Árbitro
            </Link>
          )}
          {user && hasRole('administrador') && (
            <Link to="/panel/admin" className="whitespace-nowrap hover:text-white">
              Administración
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/perfil"
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-white transition hover:bg-white/10"
                title="Ver Perfil"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00C16E] text-xs font-bold text-[#0B2545]">
                  {iniciales}
                </span>
                <span>{user.nombre}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-300 hover:text-white">
                Iniciar Sesión
              </Link>
              <Link to="/registro" className="btn-primary px-4 py-1.5 text-xs">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
