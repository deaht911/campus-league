import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder temporal: cada commit siguiente lo reemplaza por la página real
function Pendiente({ titulo }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-2 text-slate-600">Sección en construcción.</p>
    </div>
  );
}

function NoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-600">La página que busca no existe.</p>
      <Link to="/" className="mt-4 inline-block font-medium text-emerald-700 underline">
        Volver al inicio
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 text-slate-800">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Pendiente titulo="Inicio" />} />
              <Route path="/torneos" element={<Pendiente titulo="Torneos" />} />
              <Route path="/calendario" element={<Pendiente titulo="Calendario y resultados" />} />
              <Route path="/posiciones" element={<Pendiente titulo="Tabla de posiciones" />} />
              <Route path="/login" element={<Pendiente titulo="Iniciar sesión" />} />
              <Route path="/registro" element={<Pendiente titulo="Registro" />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}
