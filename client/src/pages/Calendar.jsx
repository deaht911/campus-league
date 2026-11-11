import { useEffect, useMemo, useState } from 'react';
import { getErrorMessage, getMatches, getTournaments } from '../services/api';

const ESTADOS = {
  programado: { texto: 'Programado', clase: 'bg-blue-500/20 text-blue-300' },
  en_juego: { texto: 'En juego', clase: 'bg-amber-500/20 text-amber-300' },
  pendiente_confirmacion: { texto: 'Por confirmar', clase: 'bg-amber-500/20 text-amber-300' },
  finalizado: { texto: 'Finalizado', clase: 'bg-slate-500/20 text-slate-300' },
  reprogramado: { texto: 'Reprogramado', clase: 'bg-violet-500/20 text-violet-300' },
  cancelado: { texto: 'Cancelado', clase: 'bg-red-500/20 text-red-300' },
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const claveDia = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatoDia = (fecha) =>
  new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });

const formatoHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });

function MiniCalendario({ mes, onMes, diasConPartido, seleccionado, hoy, onSelect }) {
  const anio = mes.getFullYear();
  const numMes = mes.getMonth();
  const primerDia = new Date(anio, numMes, 1).getDay();
  const totalDias = new Date(anio, numMes + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= totalDias; d++) celdas.push(d);

  const titulo = mes.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          className="rounded-md px-2 py-1 text-gray-400 hover:bg-white/5 hover:text-white"
          onClick={() => onMes(new Date(anio, numMes - 1, 1))}
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize text-white">{titulo}</span>
        <button
          type="button"
          aria-label="Mes siguiente"
          className="rounded-md px-2 py-1 text-gray-400 hover:bg-white/5 hover:text-white"
          onClick={() => onMes(new Date(anio, numMes + 1, 1))}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
        {celdas.map((d, i) => {
          if (d === null) return <span key={`v${i}`} />;
          const clave = `${anio}-${String(numMes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const conPartido = diasConPartido.has(clave);
          const esHoy = clave === hoy;
          const activo = clave === seleccionado;
          return (
            <button
              key={clave}
              type="button"
              onClick={() => onSelect(activo ? '' : clave)}
              aria-pressed={activo}
              className={`relative aspect-square rounded-md transition ${
                activo
                  ? 'bg-[#00C16E] font-bold text-[#0B2545]'
                  : conPartido
                    ? 'bg-[#00C16E]/15 font-semibold text-[#34E08F] hover:bg-[#00C16E]/25'
                    : 'text-gray-400 hover:bg-white/5'
              } ${esHoy && !activo ? 'ring-1 ring-[#00C16E]' : ''}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#00C16E]" /> Con partidos
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full ring-1 ring-[#00C16E]" /> Hoy
        </span>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [hoy] = useState(() => claveDia(new Date()));
  const [torneos, setTorneos] = useState([]);
  const [torneo, setTorneo] = useState('');
  const [estado, setEstado] = useState('');
  const [jornada, setJornada] = useState('');
  const [dia, setDia] = useState('');
  const [mesElegido, setMesElegido] = useState(null);
  const [resultado, setResultado] = useState({ clave: null, matches: [], error: '' });

  useEffect(() => {
    let activo = true;
    getTournaments()
      .then((d) => activo && setTorneos(d.tournaments))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const clave = `${torneo}|${estado}`;
  useEffect(() => {
    let activo = true;
    const params = { limit: 300 };
    if (torneo) params.torneo = torneo;
    if (estado) params.estado = estado;
    getMatches(params)
      .then((d) => activo && setResultado({ clave, matches: d.matches, error: '' }))
      .catch((err) => activo && setResultado({ clave, matches: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [torneo, estado, clave]);

  const cargando = resultado.clave !== clave;
  const partidos = resultado.matches;

  const jornadas = useMemo(
    () => [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b),
    [partidos]
  );
  const diasConPartido = useMemo(() => new Set(partidos.map((p) => claveDia(p.fecha))), [partidos]);

  const mes = useMemo(() => {
    if (mesElegido) return mesElegido;
    // Abre en el mes del próximo partido (o del último, si todos ya se jugaron)
    const inicioHoy = new Date(hoy + 'T00:00:00').getTime();
    const proximo = partidos.find((p) => new Date(p.fecha).getTime() >= inicioHoy);
    const base = partidos.length ? new Date((proximo || partidos[partidos.length - 1]).fecha) : new Date(hoy + 'T00:00:00');
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [mesElegido, partidos, hoy]);

  const visibles = useMemo(
    () =>
      partidos.filter(
        (p) => (!jornada || String(p.jornada) === jornada) && (!dia || claveDia(p.fecha) === dia)
      ),
    [partidos, jornada, dia]
  );

  const cambiarTorneo = (valor) => {
    setTorneo(valor);
    setJornada('');
    setDia('');
    setMesElegido(null);
  };

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Calendario</h1>
          <p className="mt-2 text-gray-300">Consulta fechas y horarios de todos los partidos.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#24405f] bg-[#0f1824] p-4 sm:flex-row sm:items-center">
          <label htmlFor="f-torneo" className="text-sm text-gray-300">
            Filtrar por torneo:
          </label>
          <select
            id="f-torneo"
            className="input-dark sm:w-64"
            value={torneo}
            onChange={(e) => cambiarTorneo(e.target.value)}
          >
            <option value="">Todos los torneos</option>
            {torneos.map((t) => (
              <option key={t._id} value={t._id}>
                {t.nombre}
              </option>
            ))}
          </select>

          <select
            className="input-dark sm:w-48"
            aria-label="Filtrar por estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.texto}
              </option>
            ))}
          </select>

          <select
            className="input-dark sm:w-40"
            aria-label="Filtrar por jornada"
            value={jornada}
            onChange={(e) => setJornada(e.target.value)}
          >
            <option value="">Todas las jornadas</option>
            {jornadas.map((j) => (
              <option key={j} value={String(j)}>
                Jornada {j}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <MiniCalendario
            mes={mes}
            onMes={setMesElegido}
            diasConPartido={diasConPartido}
            seleccionado={dia}
            hoy={hoy}
            onSelect={setDia}
          />

          <section className="rounded-2xl border border-[#24405f] bg-[#0f1824]">
            <div className="flex items-center justify-between border-b border-[#24405f] px-5 py-3">
              <h2 className="font-display text-sm font-semibold text-white">
                {dia ? `Partidos del ${formatoDia(dia + 'T00:00:00')}` : 'Todos los Partidos'}
              </h2>
              {dia && (
                <button type="button" className="text-xs text-[#34E08F] hover:underline" onClick={() => setDia('')}>
                  Quitar día
                </button>
              )}
            </div>

            {resultado.error && (
              <div className="alert-error m-4" role="alert">
                {resultado.error}
              </div>
            )}

            {cargando ? (
              <p className="p-6 text-sm text-gray-400" role="status">
                Cargando partidos...
              </p>
            ) : visibles.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No hay partidos para los filtros elegidos.</p>
            ) : (
              <ul className="divide-y divide-[#24405f]">
                {visibles.map((p) => {
                  const est = ESTADOS[p.estado] || ESTADOS.programado;
                  const conMarcador = p.estado === 'finalizado' || p.estado === 'pendiente_confirmacion';
                  return (
                    <li key={p._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <div className="w-20 shrink-0 text-center">
                        <p className="text-sm font-bold text-white">{formatoDia(p.fecha)}</p>
                        <p className="text-xs text-gray-400">{formatoHora(p.fecha)}</p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {p.local?.nombre}{' '}
                          {conMarcador ? (
                            <span className="mx-1 text-[#34E08F]">
                              {p.marcador.local} - {p.marcador.visitante}
                            </span>
                          ) : (
                            <span className="mx-1 text-xs font-normal text-gray-500">vs</span>
                          )}{' '}
                          {p.visitante?.nombre}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {p.torneo?.nombre} · {p.fase === 'liga' ? `Jornada ${p.jornada}` : p.fase}
                        </p>
                        <p className="text-xs text-gray-500">📍 {p.escenario}</p>
                      </div>

                      <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-center ${est.clase}`}>
                        {est.texto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
