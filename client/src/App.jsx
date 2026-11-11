import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import Calendar from './pages/Calendar';
import Standings from './pages/Standings';
import MyTeam from './pages/MyTeam';
import UserProfile from './pages/UserProfile';
import OrganizerPanel from './pages/panel/OrganizerPanel';

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
          <Route path="/" element={<Home />} />
          <Route path="/torneos" element={<Tournaments />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route path="/posiciones" element={<Standings />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<UserProfile />} />
          </Route>
          <Route element={<ProtectedRoute roles={['jugador', 'capitan', 'administrador']} />}>
            <Route path="/mi-equipo" element={<MyTeam />} />
          </Route>
          <Route element={<ProtectedRoute roles={['organizador', 'administrador']} />}>
            <Route path="/panel/organizador" element={<OrganizerPanel />} />
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
