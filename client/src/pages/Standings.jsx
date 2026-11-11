import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { descargarReporte, getErrorMessage, getMatches, getScorers, getStandings, getTournaments } from '../services/api';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const INTERVALO_MS = 30000;

const LEYENDA = {
  PJ: 'Partidos jugados',
  PG: 'Partidos ganados',
  PE: 'Partidos empatados',
  PP: 'Partidos perdidos',
  GF: 'Goles a favor',
  GC: 'Goles en contra',
  DG: 'Diferencia de goles',
  PF: 'Puntos a favor',
  PC: 'Puntos en contra',
  DP: 'Diferencia de puntos',
  SG: 'Sets a favor',
  SC: 'Sets en contra',
  DS: 'Diferencia de sets',
  PTS: 'Puntos en la tabla',
};

const DISCIPLINAS = { futsal: 'Futsal', futbol: 'Fútbol', basquetbol: 'Baloncesto', voleibol: 'Voleibol', otra: 'Otra' };

const FASES = [
  ['octavos', 'Octavos de final'],
  ['cuartos', 'Cuartos de final'],
  ['semifinal', 'Semifinales'],
  ['tercer_puesto', 'Tercer puesto'],
  ['final', 'Final'],
];

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });

const formatoFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

const Th = ({ sigla }) => (
  <th className="text-center">
    <abbr title={LEYENDA[sigla] || sigla} className="no-underline">
      {sigla}
    </abbr>
  </th>
);

function TablaPosiciones({ filas, reglas, estado }) {
  if (filas.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Este torneo aún no tiene equipos aprobados.</p>;
  }
  const et = reglas.etiquetas;
  return (
    <div className="table-wrap rounded-none border-0">
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Equipo</th>
            <Th sigla="PJ" />
            <Th sigla="PG" />
            {reglas.empate && <Th sigla="PE" />}
            <Th sigla="PP" />
            <Th sigla={et.gf} />
            <Th sigla={et.gc} />
            <Th sigla={et.dg} />
            <Th sigla="PTS" />
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const jugo = f.pj > 0;
            const podio = f.posicion <= 3 && jugo;
            const lider = f.posicion === 1 && jugo;
            return (
              <tr key={f.equipo._id} className={lider ? 'bg-[#00C16E]/10' : ''}>
                <td className="font-semibold text-gray-300">
                  {podio ? <span aria-label={`Puesto ${f.posicion}`}>{MEDALLAS[f.posicion - 1]}</span> : f.posicion}
                </td>
                <td>
                  <p className="font-semibold text-white">
                    {f.equipo.nombre}
                    {lider && estado === 'finalizado' && <span className="badge ml-2">Campeón</span>}
                    {lider && estado === 'en_curso' && <span className="badge ml-2">Líder</span>}
                  </p>
                  <p className="text-xs text-gray-500">{f.equipo.facultad}</p>
                </td>
                <td className="text-center">{f.pj}</td>
                <td className="text-center text-[#34E08F]">{f.pg}</td>
                {reglas.empate && <td className="text-center">{f.pe}</td>}
                <td className="text-center text-red-400">{f.pp}</td>
                <td className="text-center">{f.gf}</td>
                <td className="text-center">{f.gc}</td>
                <td className={`text-center font-medium ${f.dg > 0 ? 'text-[#34E08F]' : f.dg < 0 ? 'text-red-400' : ''}`}>
                  {f.dg > 0 ? `+${f.dg}` : f.dg}
                </td>
                <td className="text-center">
                  <span className="inline-block min-w-9 rounded-md bg-[#0B2545] px-2 py-1 font-bold text-white">{f.pts}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablaIndividual({ filas, reglas }) {
  const { titulo, campo } = reglas.individual;
  if (filas.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Aún no hay estadísticas registradas en este torneo ({titulo.toLowerCase()}).</p>;
  }
  return (
    <div className="table-wrap rounded-none border-0">
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Jugador</th>
            <th>Equipo</th>
            <Th sigla="PJ" />
            <th className="text-center">Faltas</th>
            <th className="text-center">{campo}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((s, i) => (
            <tr key={`${s.jugador?._id}-${i}`}>
              <td className="font-semibold text-gray-300">{i + 1}</td>
              <td className="font-semibold text-white">{s.jugador?.nombre}</td>
              <td>{s.equipo?.nombre}</td>
              <td className="text-center">{s.partidos}</td>
              <td className="text-center">{s.faltas}</td>
              <td className="text-center">
                <span className="inline-block min-w-9 rounded-md bg-[#0B2545] px-2 py-1 font-bold text-[#34E08F]">{s.goles}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Llaves({ partidos }) {
  const grupos = FASES.map(([clave, titulo]) => [titulo, partidos.filter((p) => p.fase === clave)]).filter(([, lista]) => lista.length > 0);
  if (grupos.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Todavía no hay llaves publicadas para este torneo.</p>;
  }
  return (
    <div className="space-y-6 p-5">
      {grupos.map(([titulo, lista]) => (
        <div key={titulo}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#34E08F]">{titulo}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {lista.map((p) => {
              const jugado = p.estado === 'finalizado' || p.estado === 'pendiente_confirmacion';
              const gana = (lado) =>
                jugado && (lado === 'local' ? p.marcador.local > p.marcador.visitante : p.marcador.visitante > p.marcador.local);
              return (
                <div key={p._id} className="rounded-xl border border-[#24405f] bg-[#0B192C] p-4">
                  {[
                    ['local', p.local],
                    ['visitante', p.visitante],
                  ].map(([lado, equipo]) => (
                    <div key={lado} className="flex items-center justify-between gap-3 py-1">
                      <span className={gana(lado) ? 'font-bold text-white' : 'text-gray-300'}>
                        {gana(lado) && <span aria-hidden="true">✔ </span>}
                        {equipo?.nombre}
                      </span>
                      <span
                        className={`min-w-8 rounded-md px-2 py-0.5 text-center text-sm font-bold ${
                          gana(lado) ? 'bg-[#00C16E]/20 text-[#34E08F]' : 'bg-white/5 text-gray-300'
                        }`}
                      >
                        {jugado ? p.marcador[lado] : '–'}
                      </span>
                    </div>
                  ))}
                  <p className="mt-2 text-xs text-gray-500">
                    {formatoFechaHora(p.fecha)} · {p.escenario}
                    {!jugado && ' · por jugarse'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Estado del torneo: no iniciado, en curso (provisional) o finalizado (definitivo)
function Resumen({ info, standings, partidos }) {
  const { torneo, progreso } = info;
  const esLiga = torneo.formato === 'liga';

  if (torneo.estado === 'cancelado') {
    return (
      <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-300" role="status">
        Este torneo fue cancelado.
      </div>
    );
  }

  if (torneo.estado === 'finalizado') {
    let campeon = '';
    if (esLiga) campeon = standings[0]?.equipo.nombre || '';
    else {
      const final = partidos.find((p) => p.fase === 'final' && p.estado === 'finalizado');
      if (final) campeon = (final.marcador.local > final.marcador.visitante ? final.local : final.visitante).nombre;
    }
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#00C16E]/40 bg-[#00C16E]/10 px-5 py-4" role="status">
        <span className="text-3xl" aria-hidden="true">
          🏆
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#34E08F]">Torneo finalizado · resultados definitivos</p>
          <p className="font-display text-xl font-bold text-white">{campeon ? `Campeón: ${campeon}` : 'Sin campeón registrado'}</p>
          <p className="text-xs text-gray-400">
            {progreso.jugados} partidos jugados · del {formatoFecha(torneo.fechaInicio)} al {formatoFecha(torneo.fechaFin)}
          </p>
        </div>
      </div>
    );
  }

  if (torneo.estado === 'en_curso') {
    const lider = esLiga && standings[0]?.pj > 0 ? standings[0] : null;
    const fase = !esLiga ? FASES.find(([clave]) => partidos.some((p) => p.fase === clave && p.estado !== 'finalizado')) : null;
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-4" role="status">
        <span className="text-3xl" aria-hidden="true">
          ⏱️
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">En curso · posiciones provisionales</p>
          <p className="text-sm text-white">
            {progreso.jugados} de {progreso.total} partidos jugados
            {lider && (
              <>
                {' · '}Va ganando <strong>{lider.equipo.nombre}</strong> con {lider.pts} pts
              </>
            )}
            {fase && (
              <>
                {' · '}Fase actual: <strong>{fase[1]}</strong>
              </>
            )}
            {progreso.jugados === 0 && ' · todavía no se juega ningún partido'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#24405f] bg-[#0f1824] px-5 py-4" role="status">
      <span className="text-3xl" aria-hidden="true">
        📅
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {torneo.estado === 'inscripcion' ? 'Inscripciones abiertas' : 'Inscripciones cerradas'} · el torneo aún no comienza
        </p>
        <p className="text-sm text-white">
          Inicio previsto: {formatoFecha(torneo.fechaInicio)}. Las posiciones se llenarán a medida que se jueguen los partidos.
        </p>
      </div>
    </div>
  );
}

export default function Standings() {
  const { hasRole } = useAuth();
  const [torneos, setTorneos] = useState([]);
  const [cargandoTorneos, setCargandoTorneos] = useState(true);
  const [errorTorneos, setErrorTorneos] = useState('');
  const [seleccion, setSeleccion] = useState('');
  const [pestana, setPestana] = useState('');
  const [tick, setTick] = useState(0);
  const [datos, setDatos] = useState({ id: null, standings: [], scorers: [], partidos: [], info: null, error: '', actualizado: null });

  // Lista de torneos (se vuelve a pedir en cada actualización)
  useEffect(() => {
    let activo = true;
    getTournaments()
      .then((d) => activo && setTorneos(d.tournaments))
      .catch((err) => activo && setErrorTorneos(getErrorMessage(err)))
      .finally(() => activo && setCargandoTorneos(false));
    return () => {
      activo = false;
    };
  }, [tick]);

  const torneoId = seleccion || (torneos.find((t) => t.estado === 'en_curso') || torneos[0])?._id || '';
  const torneoActual = torneos.find((t) => t._id === torneoId);
  const disciplina = torneoActual?.disciplina;
  const formato = torneoActual?.formato;
  const estado = torneoActual?.estado;

  // Datos del torneo elegido: tabla, estadísticas individuales (si la disciplina las tiene) y llaves
  useEffect(() => {
    if (!torneoId || !disciplina) return undefined;
    let activo = true;
    const conIndividual = ['futsal', 'futbol', 'basquetbol'].includes(disciplina);
    Promise.all([
      getStandings(torneoId),
      conIndividual ? getScorers(torneoId) : Promise.resolve({ scorers: [] }),
      formato === 'eliminacion' ? getMatches({ torneo: torneoId, limit: 100 }) : Promise.resolve({ matches: [] }),
    ])
      .then(([s, g, m]) => {
        if (!activo) return;
        setDatos({
          id: torneoId,
          standings: s.standings,
          scorers: g.scorers,
          partidos: m.matches,
          info: { torneo: s.torneo, reglas: s.reglas, progreso: s.progreso },
          error: '',
          actualizado: new Date(),
        });
      })
      .catch((err) => activo && setDatos({ id: torneoId, standings: [], scorers: [], partidos: [], info: null, error: getErrorMessage(err), actualizado: new Date() }));
    return () => {
      activo = false;
    };
  }, [torneoId, disciplina, formato, estado, tick]);

  // Actualización automática mientras el torneo está en curso
  useEffect(() => {
    if (estado !== 'en_curso') return undefined;
    const t = setInterval(() => setTick((n) => n + 1), INTERVALO_MS);
    return () => clearInterval(t);
  }, [estado]);

  const cargando = cargandoTorneos || (torneoId && datos.id !== torneoId);
  const info = datos.id === torneoId ? datos.info : null;

  // Pestañas disponibles según la disciplina y el formato
  const pestanas = [];
  if (info) {
    pestanas.push(formato === 'eliminacion' ? ['llaves', '🏆 Llaves'] : ['tabla', '🏆 Tabla de Posiciones']);
    if (info.reglas.individual.activo) pestanas.push(['individual', `⚽ ${info.reglas.individual.titulo}`]);
  }
  const activa = pestanas.some(([k]) => k === pestana) ? pestana : pestanas[0]?.[0];

  const claseTab = (esActiva) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      esActiva ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]' : 'text-gray-400 hover:text-white'
    }`;

  const titulos = {
    tabla: 'Tabla General',
    llaves: 'Llaves del torneo',
    individual: info ? `Máximos ${info.reglas.individual.titulo.toLowerCase()}` : '',
  };

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Posiciones &amp; Estadísticas</h1>
          <p className="mt-2 text-gray-300">Clasificación y estadísticas según la disciplina de cada torneo.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {errorTorneos && (
          <div className="alert-error mb-4" role="alert">
            {errorTorneos}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-[#24405f] bg-[#0f1824] p-4 sm:flex-row sm:items-center">
          <label htmlFor="s-torneo" className="text-sm text-gray-300">
            Torneo:
          </label>
          <select
            id="s-torneo"
            className="input-dark sm:w-96"
            value={torneoId}
            onChange={(e) => {
              setSeleccion(e.target.value);
              setPestana('');
            }}
            disabled={torneos.length === 0}
          >
            {torneos.length === 0 && <option value="">Sin torneos</option>}
            {torneos.map((t) => (
              <option key={t._id} value={t._id}>
                {t.nombre} · {DISCIPLINAS[t.disciplina] || t.disciplina}
                {t.estado === 'finalizado' ? ' (finalizado)' : t.estado === 'en_curso' ? ' (en curso)' : ''}
              </option>
            ))}
          </select>
          {torneoId && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {estado === 'en_curso' && datos.actualizado && (
                <span className="text-xs text-gray-500">
                  Se actualiza cada 30 s ·{' '}
                  {datos.actualizado.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              )}
              <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setTick((n) => n + 1)}>
                Actualizar
              </button>
            </div>
          )}
        </div>

        {datos.error && (
          <div className="alert-error mt-4" role="alert">
            {datos.error}
          </div>
        )}

        {info && <Resumen info={info} standings={datos.standings} partidos={datos.partidos} />}

        {pestanas.length > 1 && (
          <div className="mt-4 flex gap-2 rounded-2xl border border-[#24405f] bg-[#0f1824] p-2" role="tablist">
            {pestanas.map(([k, etiqueta]) => (
              <button key={k} type="button" role="tab" aria-selected={activa === k} className={claseTab(activa === k)} onClick={() => setPestana(k)}>
                {etiqueta}
              </button>
            ))}
          </div>
        )}

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824]">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#24405f] px-5 py-3">
            <h2 className="font-display text-sm font-semibold text-white">{titulos[activa] || 'Posiciones'}</h2>
            {torneoActual && <span className="badge">{torneoActual.nombre}</span>}
            {info && <span className="badge">{DISCIPLINAS[info.torneo.disciplina]}</span>}
            {hasRole('organizador', 'administrador') && torneoId && (
              <button
                type="button"
                className="btn-outline ml-auto px-3 py-1 text-xs"
                onClick={() => descargarReporte(torneoId, 'posiciones').catch((err) => setDatos((d) => ({ ...d, error: getErrorMessage(err) })))}
              >
                Exportar PDF
              </button>
            )}
          </div>

          {cargando ? (
            <p className="p-6 text-sm text-gray-400" role="status">
              Cargando...
            </p>
          ) : !torneoId ? (
            <p className="p-6 text-sm text-gray-400">No hay torneos disponibles todavía.</p>
          ) : !info ? null : activa === 'llaves' ? (
            <Llaves partidos={datos.partidos} />
          ) : activa === 'individual' ? (
            <TablaIndividual filas={datos.scorers} reglas={info.reglas} />
          ) : (
            <TablaPosiciones filas={datos.standings} reglas={info.reglas} estado={info.torneo.estado} />
          )}

          {info && activa === 'tabla' && !cargando && datos.standings.length > 0 && (
            <p className="border-t border-[#24405f] px-5 py-3 text-xs text-gray-500">{info.reglas.texto}</p>
          )}
        </section>
      </div>
    </div>
  );
}
