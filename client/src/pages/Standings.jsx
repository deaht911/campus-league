import { useEffect, useState } from 'react';
import { getErrorMessage, getScorers, getStandings, getTournaments } from '../services/api';

const MEDALLAS = ['🥇', '🥈', '🥉'];

function TablaPosiciones({ filas }) {
  if (filas.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Este torneo aún no tiene equipos aprobados.</p>;
  }
  return (
    <div className="table-wrap rounded-none border-0">
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Equipo</th>
            <th className="text-center">PJ</th>
            <th className="text-center">PG</th>
            <th className="text-center">PE</th>
            <th className="text-center">PP</th>
            <th className="text-center">GF</th>
            <th className="text-center">GC</th>
            <th className="text-center">DG</th>
            <th className="text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const podio = f.posicion <= 3 && f.pj > 0;
            return (
              <tr key={f.equipo._id} className={f.posicion === 1 && f.pj > 0 ? 'bg-[#00C16E]/10' : ''}>
                <td className="font-semibold text-gray-300">
                  {podio ? <span aria-label={`Puesto ${f.posicion}`}>{MEDALLAS[f.posicion - 1]}</span> : f.posicion}
                </td>
                <td>
                  <p className="font-semibold text-white">{f.equipo.nombre}</p>
                  <p className="text-xs text-gray-500">{f.equipo.facultad}</p>
                </td>
                <td className="text-center">{f.pj}</td>
                <td className="text-center text-[#34E08F]">{f.pg}</td>
                <td className="text-center">{f.pe}</td>
                <td className="text-center text-red-400">{f.pp}</td>
                <td className="text-center">{f.gf}</td>
                <td className="text-center">{f.gc}</td>
                <td className={`text-center font-medium ${f.dg > 0 ? 'text-[#34E08F]' : f.dg < 0 ? 'text-red-400' : ''}`}>
                  {f.dg > 0 ? `+${f.dg}` : f.dg}
                </td>
                <td className="text-center">
                  <span className="inline-block min-w-9 rounded-md bg-[#0B2545] px-2 py-1 font-bold text-white">
                    {f.pts}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablaGoleadores({ filas }) {
  if (filas.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Aún no hay goles registrados en este torneo.</p>;
  }
  return (
    <div className="table-wrap rounded-none border-0">
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Jugador</th>
            <th>Equipo</th>
            <th className="text-center">PJ</th>
            <th className="text-center">Faltas</th>
            <th className="text-center">Goles</th>
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
                <span className="inline-block min-w-9 rounded-md bg-[#0B2545] px-2 py-1 font-bold text-[#34E08F]">
                  {s.goles}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Standings() {
  const [torneos, setTorneos] = useState([]);
  const [cargandoTorneos, setCargandoTorneos] = useState(true);
  const [errorTorneos, setErrorTorneos] = useState('');
  const [seleccion, setSeleccion] = useState('');
  const [pestana, setPestana] = useState('tabla');
  const [datos, setDatos] = useState({ id: null, standings: [], scorers: [], error: '' });

  useEffect(() => {
    let activo = true;
    getTournaments()
      .then((d) => activo && setTorneos(d.tournaments))
      .catch((err) => activo && setErrorTorneos(getErrorMessage(err)))
      .finally(() => activo && setCargandoTorneos(false));
    return () => {
      activo = false;
    };
  }, []);

  const torneoId = seleccion || (torneos.find((t) => t.estado === 'en_curso') || torneos[0])?._id || '';

  useEffect(() => {
    if (!torneoId) return undefined;
    let activo = true;
    Promise.all([getStandings(torneoId), getScorers(torneoId)])
      .then(([s, g]) => activo && setDatos({ id: torneoId, standings: s.standings, scorers: g.scorers, error: '' }))
      .catch((err) => activo && setDatos({ id: torneoId, standings: [], scorers: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [torneoId]);

  const cargando = cargandoTorneos || (torneoId && datos.id !== torneoId);
  const torneoActual = torneos.find((t) => t._id === torneoId);

  const claseTab = (activa) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      activa ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]' : 'text-gray-400 hover:text-white'
    }`;

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold text-white">Posiciones &amp; Estadísticas</h1>
          <p className="mt-2 text-gray-300">Clasificación y estadísticas de jugadores.</p>
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
            className="input-dark sm:w-72"
            value={torneoId}
            onChange={(e) => setSeleccion(e.target.value)}
            disabled={torneos.length === 0}
          >
            {torneos.length === 0 && <option value="">Sin torneos</option>}
            {torneos.map((t) => (
              <option key={t._id} value={t._id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl border border-[#24405f] bg-[#0f1824] p-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'tabla'}
            className={claseTab(pestana === 'tabla')}
            onClick={() => setPestana('tabla')}
          >
            🏆 Tabla de Posiciones
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'goleadores'}
            className={claseTab(pestana === 'goleadores')}
            onClick={() => setPestana('goleadores')}
          >
            ⚽ Goleadores
          </button>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824]">
          <div className="flex items-center gap-3 border-b border-[#24405f] px-5 py-3">
            <h2 className="font-display text-sm font-semibold text-white">
              {pestana === 'tabla' ? 'Tabla General' : 'Máximos goleadores'}
            </h2>
            {torneoActual && <span className="badge">{torneoActual.nombre}</span>}
          </div>

          {datos.error && (
            <div className="alert-error m-4" role="alert">
              {datos.error}
            </div>
          )}

          {cargando ? (
            <p className="p-6 text-sm text-gray-400" role="status">
              Cargando...
            </p>
          ) : !torneoId ? (
            <p className="p-6 text-sm text-gray-400">No hay torneos disponibles todavía.</p>
          ) : pestana === 'tabla' ? (
            <TablaPosiciones filas={datos.standings} />
          ) : (
            <TablaGoleadores filas={datos.scorers} />
          )}

          {pestana === 'tabla' && !cargando && datos.standings.length > 0 && (
            <p className="border-t border-[#24405f] px-5 py-3 text-xs text-gray-500">
              Victoria = 3 pts · Empate = 1 pt. Desempate: diferencia de goles y goles a favor.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
