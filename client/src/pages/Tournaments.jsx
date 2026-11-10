import { useEffect, useMemo, useState } from 'react';
import { getErrorMessage, getTournament, getTournaments } from '../services/api';

const DEPORTES = {
  futbol: { icono: '⚽', nombre: 'Fútbol' },
  futsal: { icono: '🥅', nombre: 'Futsal' },
  basquetbol: { icono: '🏀', nombre: 'Baloncesto' },
  voleibol: { icono: '🏐', nombre: 'Voleibol' },
  otra: { icono: '🏅', nombre: 'Otra' },
};

const ESTADOS = {
  borrador: { texto: 'Borrador', clase: 'bg-slate-500/20 text-slate-300' },
  inscripcion: { texto: 'Inscripción Abierta', clase: 'bg-[#00C16E]/20 text-[#34E08F]' },
  inscripcion_cerrada: { texto: 'Inscripción Cerrada', clase: 'bg-red-500/20 text-red-300' },
  en_curso: { texto: 'En Curso', clase: 'bg-blue-500/20 text-blue-300' },
  finalizado: { texto: 'Finalizado', clase: 'bg-slate-500/20 text-slate-300' },
  cancelado: { texto: 'Cancelado', clase: 'bg-red-500/20 text-red-300' },
};

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });

function TarjetaTorneo({ torneo }) {
  const deporte = DEPORTES[torneo.disciplina] || DEPORTES.otra;
  const estado = ESTADOS[torneo.estado] || ESTADOS.borrador;
  const inscritos = torneo.equiposAprobados;
  const lleno = inscritos !== null && inscritos >= torneo.maxEquipos;
  const porcentaje = inscritos === null ? 0 : Math.min(100, Math.round((inscritos / torneo.maxEquipos) * 100));

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824] transition hover:border-[#00C16E]/60">
      <div className="relative h-28 bg-gradient-to-br from-[#0B2545] to-[#12233d]">
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
          {estado.texto}
        </span>
        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-sm text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10" aria-hidden="true">
            {deporte.icono}
          </span>
          {deporte.nombre}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold text-white">{torneo.nombre}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{torneo.reglamento}</p>

        <dl className="mt-4 space-y-1 text-xs text-gray-300">
          <div className="flex gap-2">
            <dt aria-hidden="true">📅</dt>
            <dd>Inicio: {formatoFecha(torneo.fechaInicio)}</dd>
          </div>
          <div className="flex gap-2">
            <dt aria-hidden="true">👥</dt>
            <dd>
              {inscritos === null ? '–' : inscritos}/{torneo.maxEquipos} equipos
            </dd>
          </div>
          {torneo.estado === 'inscripcion' && (
            <div className="flex gap-2 text-amber-400">
              <dt aria-hidden="true">⏳</dt>
              <dd>Cierra: {formatoFecha(torneo.inscripcionFin)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto pt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>Cupos</span>
            <span>
              {inscritos === null ? '–' : inscritos}/{torneo.maxEquipos}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${lleno ? 'bg-amber-500' : 'bg-[#00C16E]'}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Tournaments() {
  const [torneos, setTorneos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [disciplina, setDisciplina] = useState('todas');
  const [estado, setEstado] = useState('todos');

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const { tournaments } = await getTournaments();
        // El listado no trae equipos inscritos: se piden al detalle de cada torneo
        const detalles = await Promise.allSettled(tournaments.map((t) => getTournament(t._id)));
        if (!activo) return;
        setTorneos(
          tournaments.map((t, i) => ({
            ...t,
            equiposAprobados: detalles[i].status === 'fulfilled' ? detalles[i].value.equiposAprobados : null,
          }))
        );
      } catch (err) {
        if (activo) setError(getErrorMessage(err));
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return torneos.filter(
      (t) =>
        (disciplina === 'todas' || t.disciplina === disciplina) &&
        (estado === 'todos' || t.estado === estado) &&
        (!q || t.nombre.toLowerCase().includes(q))
    );
  }, [torneos, busqueda, disciplina, estado]);

  const chips = [['todas', 'Todos'], ...Object.entries(DEPORTES).map(([k, v]) => [k, v.nombre])];

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold text-white">Torneos</h1>
          <p className="mt-2 text-gray-300">Encuentra el torneo que se adapta a tu deporte.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              className="input-dark flex-1"
              placeholder="Buscar torneo..."
              aria-label="Buscar torneo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="input-dark sm:w-56"
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(ESTADOS)
                .filter(([k]) => k !== 'borrador')
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.texto}
                  </option>
                ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setDisciplina(valor)}
                aria-pressed={disciplina === valor}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  disciplina === valor
                    ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert-error mt-6" role="alert">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="mt-8 text-gray-400" role="status">
            Cargando torneos...
          </p>
        ) : (
          !error && (
            <>
              <p className="mt-6 text-sm text-gray-400">
                {filtrados.length} {filtrados.length === 1 ? 'torneo encontrado' : 'torneos encontrados'}
              </p>
              {filtrados.length === 0 ? (
                <div className="card mt-4 text-center text-gray-400">No hay torneos que coincidan con la búsqueda.</div>
              ) : (
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtrados.map((t) => (
                    <TarjetaTorneo key={t._id} torneo={t} />
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
