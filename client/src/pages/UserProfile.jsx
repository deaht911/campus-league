import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TOKEN_KEY, getErrorMessage, getMyTeams, getPlayerStats, updateProfile } from '../services/api';

const FACULTADES = [
  'Ingeniería',
  'Ciencias de la Salud',
  'Ciencias Empresariales',
  'Teología',
  'Ciencias Jurídicas',
  'Humanidades',
];

const ROLES = {
  jugador: 'Jugador / Estudiante',
  capitan: 'Capitán de Equipo',
  organizador: 'Organizador Deportivo',
  arbitro: 'Árbitro / Mesa de Control',
  administrador: 'Administrador',
};

const CODIGO_REGEX = /^[A-Za-z0-9-]{4,20}$/;

// Lee la expiración (exp) del JWT guardado, solo informativo
const expiracionSesion = () => {
  try {
    const payload = JSON.parse(
      atob(localStorage.getItem(TOKEN_KEY).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
};

const formatoHora = (fecha) =>
  fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-white">{valor || '—'}</dd>
    </div>
  );
}

export default function UserProfile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState(() => ({
    nombre: user.nombre || '',
    facultad: user.facultad || '',
    codigoEstudiantil: user.codigoEstudiantil || '',
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [extra, setExtra] = useState({ cargado: false, stats: null, teams: [] });
  const [expira] = useState(() => expiracionSesion());

  useEffect(() => {
    let activo = true;
    Promise.allSettled([getPlayerStats(user._id), getMyTeams()]).then(([s, t]) => {
      if (!activo) return;
      setExtra({
        cargado: true,
        stats: s.status === 'fulfilled' ? s.value.stats : null,
        teams: t.status === 'fulfilled' ? t.value.teams : [],
      });
    });
    return () => {
      activo = false;
    };
  }, [user._id]);

  const cambiar = (e) => {
    setOk('');
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');

    const nombre = form.nombre.trim();
    const codigo = form.codigoEstudiantil.trim();
    if (nombre.length < 3) return setError('El nombre debe tener al menos 3 caracteres');
    if (codigo && !CODIGO_REGEX.test(codigo)) {
      return setError('Código estudiantil no válido (4 a 20 letras, números o guiones)');
    }

    const datos = { nombre };
    if (form.facultad) datos.facultad = form.facultad;
    if (codigo) datos.codigoEstudiantil = codigo;

    setGuardando(true);
    try {
      await updateProfile(datos);
      await refreshUser();
      setOk('Perfil actualizado correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const iniciales = user.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const stats = extra.stats;

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-10">
          <span className="font-display flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00C16E] text-2xl font-bold text-[#0B2545]">
            {iniciales}
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">{user.nombre}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-300">
              {user.correo}
              <span className="badge">{ROLES[user.rol] || user.rol}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
          <h2 className="font-display text-lg font-semibold text-white">Datos personales</h2>
          <p className="mt-1 text-sm text-gray-400">El correo y el rol los gestiona el administrador.</p>

          <form onSubmit={guardar} className="mt-6 space-y-4" noValidate>
            {error && (
              <div className="alert-error" role="alert">
                {error}
              </div>
            )}
            {ok && (
              <div className="alert-ok" role="status">
                {ok}
              </div>
            )}

            <div>
              <label htmlFor="nombre" className="label-dark">
                Nombre completo
              </label>
              <input id="nombre" name="nombre" className="input-dark" value={form.nombre} onChange={cambiar} />
            </div>

            <div>
              <label htmlFor="correo" className="label-dark">
                Correo institucional
              </label>
              <input
                id="correo"
                className="input-dark cursor-not-allowed opacity-60"
                value={user.correo}
                disabled
                readOnly
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="facultad" className="label-dark">
                  Facultad
                </label>
                <select id="facultad" name="facultad" className="input-dark" value={form.facultad} onChange={cambiar}>
                  <option value="">Seleccionar facultad...</option>
                  {FACULTADES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  {form.facultad && !FACULTADES.includes(form.facultad) && (
                    <option value={form.facultad}>{form.facultad}</option>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="codigoEstudiantil" className="label-dark">
                  Código estudiantil
                </label>
                <input
                  id="codigoEstudiantil"
                  name="codigoEstudiantil"
                  className="input-dark"
                  placeholder="U20231234"
                  value={form.codigoEstudiantil}
                  onChange={cambiar}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary px-6 py-2.5" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
            <h2 className="font-display text-lg font-semibold text-white">Sesión activa</h2>
            <dl className="mt-4 space-y-3">
              <Dato etiqueta="Rol" valor={ROLES[user.rol] || user.rol} />
              <Dato etiqueta="Cuenta verificada" valor={user.verificado ? 'Sí' : 'No'} />
              <Dato etiqueta="Estudiante activo" valor={user.estudianteActivo ? 'Sí' : 'No'} />
              <Dato etiqueta="La sesión expira a las" valor={expira ? formatoHora(expira) : null} />
            </dl>
          </section>

          <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
            <h2 className="font-display text-lg font-semibold text-white">Mis equipos</h2>
            {!extra.cargado ? (
              <p className="mt-3 text-sm text-gray-400" role="status">
                Cargando...
              </p>
            ) : extra.teams.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">Todavía no perteneces a ningún equipo.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {extra.teams.map((t) => (
                  <li key={t._id} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-sm font-semibold text-white">{t.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {t.disciplina} · {t.facultad}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
            <h2 className="font-display text-lg font-semibold text-white">Mis estadísticas</h2>
            {!extra.cargado ? (
              <p className="mt-3 text-sm text-gray-400" role="status">
                Cargando...
              </p>
            ) : !stats ? (
              <p className="mt-3 text-sm text-gray-400">No se pudieron cargar las estadísticas.</p>
            ) : (
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Partidos', stats.partidos],
                  ['Goles', stats.goles],
                  ['Faltas', stats.faltas],
                  ['Amarillas', stats.amarillas],
                  ['Rojas', stats.rojas],
                  ['Destacado', stats.destacados],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="rounded-lg bg-[#0B2545] px-2 py-3">
                    <dd className="font-display text-xl font-bold text-[#00C16E]">{valor}</dd>
                    <dt className="mt-0.5 text-[11px] text-gray-400">{etiqueta}</dt>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
