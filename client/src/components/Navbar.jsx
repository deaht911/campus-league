import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-[#24405f] bg-[#0B2545] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#00C16E] text-sm font-extrabold text-[#0B2545]">
            CL
          </span>
          <span className="font-display text-lg font-semibold text-white">Campus League</span>
        </Link>

        {/* Enlaces de Navegación */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/torneos" className="text-sm font-medium text-gray-300 transition hover:text-[#00C16E]">
            Torneos
          </Link>
          <Link to="/calendario" className="text-sm font-medium text-gray-300 transition hover:text-[#00C16E]">
            Calendario
          </Link>
          <Link to="/posiciones" className="text-sm font-medium text-gray-300 transition hover:text-[#00C16E]">
            Posiciones
          </Link>
        </div>

        {/* Auth Buttons / User info */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-200">
                {user?.nombre || user?.correo}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-300 transition hover:text-[#00C16E]"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/registro"
                className="rounded-lg bg-[#00C16E] px-4 py-2 text-sm font-semibold text-[#0B2545] transition hover:bg-[#34E08F]"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
