import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, getMyMatches, getTeam, submitResult } from '../../services/api';

const ESTADOS = {
  programado: { texto: 'Programado', clase: 'bg-blue-500/20 text-blue-300' },
  reprogramado: { texto: 'Reprogramado', clase: 'bg-violet-500/20 text-violet-300' },
  en_juego: { texto: 'En juego', clase: 'bg-amber-500/20 text-amber-300' },
  pendiente_confirmacion: { texto: 'Borrador', clase: 'bg-amber-500/20 text-amber-300' },
  finalizado: { texto: 'Acta cerrada', clase: 'bg-slate-500/20 text-slate-300' },
  cancelado: { texto: 'Cancelado', clase: 'bg-red-500/20 text-red-300' },
};

const formatoFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const jugadoresActivos = (team) =>
  (team.jugadores || [])
    .filter((j) => j.activo && j.usuario)
    .map((j) => ({
      id: j.usuario._id,
      nombre: j.usuario.nombre,
      camiseta: j.numeroCamiseta,
    }));

const filaVacia = () => ({ goles: 0, faltas: 0, amarillas: 0, rojas: 0, destacado: false });

function Contador({ etiqueta, valor, onChange, max = 99 }) {
  return (
    <input
      type="number"
      min="0"
      max={max}
      aria-label={etiqueta}
      className="input-dark w-16 px-2 py-1 text-center"
      value={valor}
      onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
    />
  );
}

function TablaEquipo({ titulo, equipoId, jugadores, filas, onFila }) {
  const total = jugadores.reduce((acc, j) => acc + (filas[j.id]?.goles || 0), 0);
  return (
    <div className="overflow-hidden rounded-xl border border-[#24405f]">
      <div className="flex items-center justify-between bg-[#1a2f4f] px-4 py-2">
        <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        <span className="text-xs text-[#34E08F]">Goles individuales: {total}</span>
      </div>
      <div className="table-wrap rounded-none border-0">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Jugador</th>
              <th className="text-center">Goles</th>
              <th className="text-center">Faltas</th>
              <th className="text-center">Amarillas</th>
              <th className="text-center">Rojas</th>
              <th className="text-center">Destacado</th>
            </tr>
          </thead>
          <tbody>
            {jugadores.map((j) => {
              const f = filas[j.id] || filaVacia();
              const set = (campo, valor) => onFila(equipoId, j.id, { ...f, [campo]: valor });
              return (
                <tr key={j.id}>
                  <td className="font-semibold text-white">
                    {j.camiseta !== undefined && j.camiseta !== null && (
                      <span className="mr-2 inline-block min-w-7 rounded bg-[#0B2545] px-1.5 py-0.5 text-center text-xs">
                        {j.camiseta}
                      </span>
                    )}
                    {j.nombre}
                  </td>
                  <td className="text-center">
                    <Contador etiqueta={`Goles de ${j.nombre}`} valor={f.goles} onChange={(v) => set('goles', v)} />
                  </td>
                  <td className="text-center">
                    <Contador etiqueta={`Faltas de ${j.nombre}`} valor={f.faltas} onChange={(v) => set('faltas', v)} />
                  </td>
                  <td className="text-center">
                    <Contador etiqueta={`Amarillas de ${j.nombre}`} valor={f.amarillas} max={2} onChange={(v) => set('amarillas', v)} />
                  </td>
                  <td className="text-center">
                    <Contador etiqueta={`Rojas de ${j.nombre}`} valor={f.rojas} max={1} onChange={(v) => set('rojas', v)} />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      aria-label={`Destacado: ${j.nombre}`}
                      className="h-4 w-4 accent-[#00C16E]"
                      checked={f.destacado}
                      onChange={(e) => set('destacado', e.target.checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActaDigital({ partido, onCerrar, onEnviar }) {
  const [carga, setCarga] = useState({ listo: false, error: '', local: [], visitante: [] });
  const [marcador, setMarcador] = useState({
    local: partido.marcador?.local || 0,
    visitante: partido.marcador?.visitante || 0,
  });
  const [filas, setFilas] = useState({});
  const [walkover, setWalkover] = useState(false);
  const [ganadorWo, setGanadorWo] = useState('');
  const [motivoWo, setMotivoWo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const localId = partido.local._id;
  const visitanteId = partido.visitante._id;

  useEffect(() => {
    let activo = true;
    Promise.all([getTeam(localId), getTeam(visitanteId)])
      .then(([l, v]) => {
        if (!activo) return;
        setCarga({ listo: true, error: '', local: jugadoresActivos(l.team), visitante: jugadoresActivos(v.team) });
      })
      .catch((err) => activo && setCarga({ listo: true, error: getErrorMessage(err), local: [], visitante: [] }));
    return () => {
      activo = false;
    };
  }, [localId, visitanteId]);

  const cambiarFila = (equipoId, jugadorId, valor) =>
    setFilas((f) => ({ ...f, [`${equipoId}:${jugadorId}`]: valor }));

  const filasEquipo = (equipoId, jugadores) =>
    Object.fromEntries(jugadores.map((j) => [j.id, filas[`${equipoId}:${j.id}`] || filaVacia()]));

  const construirEstadisticas = () => {
    const out = [];
    [[localId, carga.local], [visitanteId, carga.visitante]].forEach(([equipoId, jugadores]) => {
      jugadores.forEach((j) => {
        const f = filas[`${equipoId}:${j.id}`];
        if (!f) return;
        const tarjetas = [...Array(f.amarillas).fill('amarilla'), ...Array(f.rojas).fill('roja')];
        if (f.goles || f.faltas || tarjetas.length || f.destacado) {
          out.push({ jugador: j.id, equipo: equipoId, goles: f.goles, faltas: f.faltas, tarjetas, destacado: f.destacado });
        }
      });
    });
    return out;
  };

  const sumaGoles = (equipoId, jugadores) =>
    jugadores.reduce((acc, j) => acc + (filas[`${equipoId}:${j.id}`]?.goles || 0), 0);

  const enviar = async (borrador) => {
    setError('');
    let datos;
    if (walkover) {
      if (!ganadorWo) return setError('Seleccione el equipo presente');
      if (!motivoWo.trim()) return setError('Indique el motivo del walkover');
      datos = { walkover: true, ganadorWalkover: ganadorWo, motivoWalkover: motivoWo.trim(), borrador };
    } else {
      datos = { marcador, estadisticas: construirEstadisticas(), borrador };
    }
    setEnviando(true);
    const exito = await onEnviar(partido._id, datos, borrador);
    if (!exito) setEnviando(false);
  };

  const descuadre =
    !walkover &&
    carga.listo &&
    (sumaGoles(localId, carga.local) !== marcador.local || sumaGoles(visitanteId, carga.visitante) !== marcador.visitante);

  return (
    <div className="rounded-2xl border border-[#00C16E]/40 bg-[#0f1824] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Acta digital</h2>
          <p className="text-sm text-gray-400">
            {partido.torneo?.nombre} · Jornada {partido.jornada} · {formatoFechaHora(partido.fecha)} · {partido.escenario}
          </p>
        </div>
        <button type="button" className="btn-outline px-4 py-2" onClick={onCerrar}>
          Cerrar
        </button>
      </div>

      {error && (
        <div className="alert-error mt-4" role="alert">
          {error}
        </div>
      )}

      <label className="mt-5 flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#00C16E]"
          checked={walkover}
          onChange={(e) => setWalkover(e.target.checked)}
        />
        Walkover (un equipo no se presentó)
      </label>

      {walkover ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wo-ganador" className="label-dark">
              Equipo presente (gana 3-0)
            </label>
            <select id="wo-ganador" className="input-dark" value={ganadorWo} onChange={(e) => setGanadorWo(e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value={localId}>{partido.local.nombre}</option>
              <option value={visitanteId}>{partido.visitante.nombre}</option>
            </select>
          </div>
          <div>
            <label htmlFor="wo-motivo" className="label-dark">
              Motivo
            </label>
            <input
              id="wo-motivo"
              className="input-dark"
              maxLength={300}
              value={motivoWo}
              onChange={(e) => setMotivoWo(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="mb-1 text-sm font-semibold text-white">{partido.local.nombre}</p>
              <Contador etiqueta="Marcador local" valor={marcador.local} onChange={(v) => setMarcador((m) => ({ ...m, local: v }))} />
            </div>
            <span className="mt-6 text-xl text-gray-500">-</span>
            <div className="text-center">
              <p className="mb-1 text-sm font-semibold text-white">{partido.visitante.nombre}</p>
              <Contador etiqueta="Marcador visitante" valor={marcador.visitante} onChange={(v) => setMarcador((m) => ({ ...m, visitante: v }))} />
            </div>
          </div>

          {!carga.listo ? (
            <p className="mt-4 text-sm text-gray-400" role="status">
              Cargando plantillas...
            </p>
          ) : carga.error ? (
            <div className="alert-error mt-4" role="alert">
              {carga.error}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <TablaEquipo
                titulo={`${partido.local.nombre} (local)`}
                equipoId={localId}
                jugadores={carga.local}
                filas={filasEquipo(localId, carga.local)}
                onFila={cambiarFila}
              />
              <TablaEquipo
                titulo={`${partido.visitante.nombre} (visitante)`}
                equipoId={visitanteId}
                jugadores={carga.visitante}
                filas={filasEquipo(visitanteId, carga.visitante)}
                onFila={cambiarFila}
              />
              {descuadre && (
                <p className="text-xs text-amber-400">
                  Los goles individuales no coinciden con el marcador. Corríjalos para cerrar el acta, o guárdela como borrador.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn-primary px-5 py-2.5" disabled={enviando} onClick={() => enviar(false)}>
          {enviando ? 'Guardando...' : 'Cerrar acta'}
        </button>
        <button type="button" className="btn-outline px-5 py-2.5" disabled={enviando} onClick={() => enviar(true)}>
          Guardar borrador
        </button>
      </div>
    </div>
  );
}

export default function RefereePanel() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [lista, setLista] = useState({ version: -1, matches: [], error: '' });
  const [abierto, setAbierto] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [filtro, setFiltro] = useState('pendientes');

  useEffect(() => {
    let activo = true;
    getMyMatches()
      .then((d) => activo && setLista({ version, matches: d.matches, error: '' }))
      .catch((err) => activo && setLista({ version, matches: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [version]);

  const cargando = lista.version !== version;

  const enviarActa = async (matchId, datos, borrador) => {
    setMensaje({ tipo: '', texto: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const r = await submitResult(matchId, datos);
      setMensaje({ tipo: 'ok', texto: r.message || (borrador ? 'Borrador guardado.' : 'Acta cerrada.') });
      setAbierto(null);
      setVersion((v) => v + 1);
      return true;
    } catch (err) {
      setMensaje({ tipo: 'error', texto: getErrorMessage(err) });
      return false;
    }
  };

  const visibles = lista.matches.filter((m) =>
    filtro === 'pendientes' ? m.estado !== 'finalizado' && m.estado !== 'cancelado' : m.estado === 'finalizado'
  );
  const partidoAbierto = lista.matches.find((m) => m._id === abierto);

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold text-white">Panel del Árbitro</h1>
          <p className="mt-2 text-gray-300">
            {user.nombre}: registra el acta digital de tus partidos asignados.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {mensaje.texto && (
          <div className={mensaje.tipo === 'ok' ? 'alert-ok' : 'alert-error'} role={mensaje.tipo === 'ok' ? 'status' : 'alert'}>
            {mensaje.texto}
          </div>
        )}
        {lista.error && (
          <div className="alert-error" role="alert">
            {lista.error}
          </div>
        )}

        {partidoAbierto ? (
          <ActaDigital key={partidoAbierto._id} partido={partidoAbierto} onCerrar={() => setAbierto(null)} onEnviar={enviarActa} />
        ) : (
          <>
            <div className="flex gap-2">
              {[
                ['pendientes', 'Pendientes'],
                ['cerrados', 'Actas cerradas'],
              ].map(([k, etiqueta]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filtro === k}
                  onClick={() => setFiltro(k)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    filtro === k ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            {cargando ? (
              <p className="text-gray-400" role="status">
                Cargando partidos...
              </p>
            ) : visibles.length === 0 ? (
              <div className="card text-center text-gray-400">No tienes partidos en esta categoría.</div>
            ) : (
              <ul className="space-y-3">
                {visibles.map((m) => {
                  const est = ESTADOS[m.estado] || ESTADOS.programado;
                  return (
                    <li
                      key={m._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#24405f] bg-[#0f1824] px-5 py-4"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {m.local?.nombre} <span className="text-xs font-normal text-gray-500">vs</span> {m.visitante?.nombre}
                          {m.estado === 'finalizado' && (
                            <span className="ml-2 text-[#34E08F]">
                              {m.marcador.local} - {m.marcador.visitante}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.torneo?.nombre} · Jornada {m.jornada} · {formatoFechaHora(m.fecha)} · {m.escenario}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${est.clase}`}>{est.texto}</span>
                        {m.estado !== 'finalizado' && m.estado !== 'cancelado' && (
                          <button type="button" className="btn-primary px-4 py-2" onClick={() => setAbierto(m._id)}>
                            Registrar acta
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
