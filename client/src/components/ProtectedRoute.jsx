import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }) {
  const { user, isAuthenticated, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
