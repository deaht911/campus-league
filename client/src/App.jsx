import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

function Pendiente({ titulo }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">{titulo}</h1>
      <p className="mt-2 text-slate-400">Sección en construcción.</p>
    </div>
  );
}

function NoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-white">404</h1>
      <p className="mt-2 text-slate-300">La página que busca no existe.</p>
      <Link to="/" className="mt-4 inline-block font-medium text-[#34E08F] underline">
        Volver al inicio
      </Link>
    </div>
  );
}

const RUTAS_SIN_NAVBAR = ['/login', '/registro'];

function Layout() {
  const { pathname } = useLocation();
  const ocultarNavbar = RUTAS_SIN_NAVBAR.includes(pathname);

  return (
    <div className="min-h-screen bg-[#0B192C] text-gray-300">
      {!ocultarNavbar && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Pendiente titulo="Inicio" />} />
          <Route path="/torneos" element={<Pendiente titulo="Torneos" />} />
          <Route path="/calendario" element={<Pendiente titulo="Calendario y resultados" />} />
          <Route path="/posiciones" element={<Pendiente titulo="Tabla de posiciones" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<Pendiente titulo="Mi perfil" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['capitan', 'administrador']} />}>
            <Route path="/mi-equipo" element={<Pendiente titulo="Mi equipo" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['organizador', 'administrador']} />}>
            <Route path="/panel/organizador" element={<Pendiente titulo="Panel del organizador" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['arbitro', 'administrador']} />}>
            <Route path="/panel/arbitro" element={<Pendiente titulo="Panel del árbitro" />} />
          </Route>
          <Route element={<ProtectedRoute roles={['administrador']} />}>
            <Route path="/panel/admin" element={<Pendiente titulo="Panel de administración" />} />
          </Route>

          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
