import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  assignReferee,
  createTournament,
  discardFixture,
  generateFixture,
  getErrorMessage,
  getMatches,
  getRegistrations,
  getTournaments,
  getReferees,
  publishFixture,
  rescheduleMatch,
  reviewRegistration,
  updateTournamentStatus,
} from '../../services/api';

const DISCIPLINAS = [
  ['futsal', 'Futsal'],
  ['futbol', 'Fútbol'],
  ['basquetbol', 'Baloncesto'],
  ['voleibol', 'Voleibol'],
  ['otra', 'Otra'],
];

const ESTADOS_TORNEO = {
  borrador: 'Borrador',
  inscripcion: 'Inscripción abierta',
  inscripcion_cerrada: 'Inscripción cerrada',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const ESTADOS_INSCRIPCION = {
  pendiente: 'bg-amber-500/20 text-amber-300',
  aprobada: 'bg-[#00C16E]/20 text-[#34E08F]',
  rechazada: 'bg-red-500/20 text-red-300',
  lista_espera: 'bg-blue-500/20 text-blue-300',
  cancelada: 'bg-slate-500/20 text-slate-300',
};

const FORM_VACIO = {
  nombre: '',
  disciplina: 'futsal',
  formato: 'liga',
  fechaInicio: '',
  fechaFin: '',
  inscripcionInicio: '',
  inscripcionFin: '',
  maxEquipos: '8',
  minJugadores: '5',
  reglamento: '',
  escenarios: '',
};

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });

const formatoFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// Valor para <input type="datetime-local"> en hora local
const aInputLocal = (fecha) => {
  const d = new Date(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function FormTorneo({ onCrear, onCancelar }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const datos = {
      nombre: form.nombre.trim(),
      disciplina: form.disciplina,
      formato: form.formato,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      inscripcionInicio: form.inscripcionInicio,
      inscripcionFin: form.inscripcionFin,
      maxEquipos: Number(form.maxEquipos),
      minJugadores: Number(form.minJugadores),
      reglamento: form.reglamento.trim(),
      escenarios: form.escenarios
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const exito = await onCrear(datos);
    if (!exito) setEnviando(false);
  };

  const campo = (id, etiqueta, props = {}) => (
    <div>
      <label htmlFor={`t-${id}`} className="label-dark">
        {etiqueta}
      </label>
      <input id={`t-${id}`} name={id} className="input-dark" value={form[id]} onChange={cambiar} {...props} />
    </div>
  );

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6" noValidate>
      <h2 className="font-display text-lg font-semibold text-white">Nuevo torneo</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campo('nombre', 'Nombre', { placeholder: 'Copa UAB 2026' })}
        <div>
          <label htmlFor="t-disciplina" className="label-dark">
            Disciplina
          </label>
          <select id="t-disciplina" name="disciplina" className="input-dark" value={form.disciplina} onChange={cambiar}>
            {DISCIPLINAS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="t-formato" className="label-dark">
            Formato
          </label>
          <select id="t-formato" name="formato" className="input-dark" value={form.formato} onChange={cambiar}>
            <option value="liga">Liga (todos contra todos)</option>
            <option value="eliminacion">Eliminación directa</option>
          </select>
        </div>
        {campo('inscripcionInicio', 'Inicio de inscripciones', { type: 'date' })}
        {campo('inscripcionFin', 'Fin de inscripciones', { type: 'date' })}
        {campo('fechaInicio', 'Inicio del torneo', { type: 'date' })}
        {campo('fechaFin', 'Fin del torneo', { type: 'date' })}
        {campo('maxEquipos', 'Máximo de equipos', { type: 'number', min: 4, max: 64 })}
        {campo('minJugadores', 'Mínimo de jugadores por equipo', { type: 'number', min: 1 })}
        {campo('escenarios', 'Escenarios (separados por coma)', { placeholder: 'Coliseo UAB, Cancha techada' })}
      </div>

      <div className="mt-4">
        <label htmlFor="t-reglamento" className="label-dark">
          Reglamento
        </label>
        <textarea
          id="t-reglamento"
          name="reglamento"
          rows={3}
          maxLength={5000}
          className="input-dark"
          value={form.reglamento}
          onChange={cambiar}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="btn-primary px-5 py-2.5"
          disabled={enviando || form.nombre.trim().length < 3 || !form.reglamento.trim()}
        >
          {enviando ? 'Creando...' : 'Crear torneo'}
        </button>
        <button type="button" className="btn-outline px-5 py-2.5" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function OrganizerPanel() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [lista, setLista] = useState({ version: -1, torneos: [], error: '' });
  const [seleccion, setSeleccion] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [arbitros, setArbitros] = useState([]);
  const [rechazo, setRechazo] = useState(null); // { id, motivo }
  const [reprogramando, setReprogramando] = useState(null); // { id, fecha }
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [dobleVuelta, setDobleVuelta] = useState(false);
  const [detalle, setDetalle] = useState({ clave: '', regs: [], matches: [], error: '' });

  const esAdmin = user.rol === 'administrador';

  // Torneos del organizador (el administrador ve todos)
  useEffect(() => {
    let activo = true;
    getTournaments()
      .then((d) => {
        if (!activo) return;
        const propios = d.tournaments.filter((t) => esAdmin || t.organizador === user._id);
        setLista({ version, torneos: propios, error: '' });
      })
      .catch((err) => activo && setLista({ version, torneos: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [version, esAdmin, user._id]);

  // Árbitros activos disponibles para asignar a los partidos
  useEffect(() => {
    let activo = true;
    getReferees()
      .then((d) => activo && setArbitros(d.users))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const cargandoLista = lista.version !== version;
  const torneos = lista.torneos;
  const torneo = torneos.find((t) => t._id === seleccion) || torneos[0] || null;
  const claveDetalle = torneo ? `${torneo._id}|${version}` : '';

  // Inscripciones y partidos del torneo elegido
  useEffect(() => {
    if (!torneo) return undefined;
    let activo = true;
    const clave = `${torneo._id}|${version}`;
    Promise.all([getRegistrations(torneo._id), getMatches({ torneo: torneo._id, limit: 300 })])
      .then(([r, m]) => activo && setDetalle({ clave, regs: r.registrations, matches: m.matches, error: '' }))
      .catch((err) => activo && setDetalle({ clave, regs: [], matches: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [torneo, version]);

  const cargandoDetalle = !!torneo && detalle.clave !== claveDetalle;

  const recargar = () => setVersion((v) => v + 1);

  const ejecutar = async (accion, textoOk) => {
    setMensaje({ tipo: '', texto: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const resultado = await accion();
      setMensaje({ tipo: 'ok', texto: (typeof resultado === 'string' && resultado) || textoOk });
      recargar();
      return true;
    } catch (err) {
      setMensaje({ tipo: 'error', texto: getErrorMessage(err) });
      return false;
    }
  };

  const crear = (datos) =>
    ejecutar(async () => {
      const r = await createTournament(datos);
      setSeleccion(r.tournament._id);
      setMostrarForm(false);
    }, 'Torneo creado.');

  const aprobar = (reg) =>
    ejecutar(() => reviewRegistration(torneo._id, reg._id, { estado: 'aprobada' }), 'Inscripción aprobada.');

  const rechazar = async () => {
    const exito = await ejecutar(
      () => reviewRegistration(torneo._id, rechazo.id, { estado: 'rechazada', motivoRechazo: rechazo.motivo.trim() }),
      'Inscripción rechazada.'
    );
    if (exito) setRechazo(null);
  };

  const cerrarInscripcion = () =>
    ejecutar(() => updateTournamentStatus(torneo._id, 'inscripcion_cerrada'), 'Período de inscripción cerrado.');

  const generar = () =>
    ejecutar(() => generateFixture(torneo._id, { dobleVuelta }).then((d) => d.message), 'Calendario generado.');

  const publicar = () =>
    ejecutar(() => publishFixture(torneo._id).then((d) => d.message), 'Calendario publicado.');

  const descartar = async () => {
    await ejecutar(() => discardFixture(torneo._id).then((d) => d.message), 'Borrador descartado.');
    setConfirmarDescarte(false);
  };

  const reprogramar = async () => {
    const exito = await ejecutar(
      () => rescheduleMatch(reprogramando.id, { fecha: new Date(reprogramando.fecha).toISOString() }),
      'Partido reprogramado.'
    );
    if (exito) setReprogramando(null);
  };

  const asignar = (matchId, arbitroId) => {
    if (!arbitroId) return;
    ejecutar(() => assignReferee(matchId, arbitroId), 'Árbitro asignado.');
  };

  const regs = detalle.regs;
  const matches = detalle.matches;
  const aprobadas = regs.filter((r) => r.estado === 'aprobada').length;
  const publicado = !!torneo?.calendarioPublicado;

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold text-white">Panel del Organizador</h1>
          <p className="mt-2 text-gray-300">Crea torneos, aprueba inscripciones y gestiona el calendario.</p>
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

        {mostrarForm ? (
          <FormTorneo onCrear={crear} onCancelar={() => setMostrarForm(false)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {torneos.map((t) => (
              <button
                key={t._id}
                type="button"
                aria-pressed={torneo?._id === t._id}
                onClick={() => {
                  setSeleccion(t._id);
                  setRechazo(null);
                  setReprogramando(null);
                  setConfirmarDescarte(false);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  torneo?._id === t._id
                    ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {t.nombre}
              </button>
            ))}
            <button type="button" className="btn-outline px-4 py-1.5 text-xs" onClick={() => setMostrarForm(true)}>
              + Nuevo torneo
            </button>
          </div>
        )}

        {cargandoLista && <p className="text-gray-400" role="status">Cargando torneos...</p>}

        {!cargandoLista && !mostrarForm && torneos.length === 0 && (
          <div className="card text-center text-gray-400">Aún no tienes torneos. Crea el primero con «+ Nuevo torneo».</div>
        )}

        {!cargandoLista && !mostrarForm && torneo && (
          <>
            <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">{torneo.nombre}</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    {torneo.disciplina} · {torneo.formato === 'liga' ? 'Liga' : 'Eliminación directa'} · del{' '}
                    {formatoFecha(torneo.fechaInicio)} al {formatoFecha(torneo.fechaFin)}
                  </p>
                  <p className="text-sm text-gray-400">
                    Inscripciones hasta el {formatoFecha(torneo.inscripcionFin)} · {aprobadas}/{torneo.maxEquipos} equipos aprobados
                  </p>
                </div>
                <span className="badge">{ESTADOS_TORNEO[torneo.estado] || torneo.estado}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {torneo.estado === 'inscripcion' && (
                  <button type="button" className="btn-outline px-4 py-2" onClick={cerrarInscripcion}>
                    Cerrar inscripción
                  </button>
                )}
                {!publicado && torneo.formato === 'liga' && (
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#00C16E]"
                      checked={dobleVuelta}
                      onChange={(e) => setDobleVuelta(e.target.checked)}
                    />
                    Ida y vuelta
                  </label>
                )}
                {!publicado && (
                  <button type="button" className="btn-primary px-4 py-2" onClick={generar}>
                    {matches.length > 0 ? 'Regenerar calendario' : 'Generar calendario'}
                  </button>
                )}
                {!publicado && matches.length > 0 && (
                  <>
                    <button type="button" className="btn-primary px-4 py-2" onClick={publicar}>
                      Publicar calendario
                    </button>
                    {confirmarDescarte ? (
                      <span className="flex items-center gap-2 text-sm text-red-300">
                        ¿Descartar el borrador?
                        <button type="button" className="rounded-lg bg-red-500/80 px-3 py-1 text-xs font-semibold text-white" onClick={descartar}>
                          Sí, descartar
                        </button>
                        <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setConfirmarDescarte(false)}>
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                        onClick={() => setConfirmarDescarte(true)}
                      >
                        Descartar borrador
                      </button>
                    )}
                  </>
                )}
                {publicado && <span className="alert-ok">Calendario publicado en el portal público.</span>}
              </div>
              {!publicado && aprobadas < 4 && (
                <p className="mt-3 text-xs text-amber-400">
                  Se necesitan al menos 4 equipos aprobados para generar el calendario.
                </p>
              )}
            </section>

            {detalle.error && (
              <div className="alert-error" role="alert">
                {detalle.error}
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824]">
              <div className="border-b border-[#24405f] px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-white">Inscripciones ({regs.length})</h2>
              </div>
              {cargandoDetalle ? (
                <p className="p-6 text-sm text-gray-400" role="status">Cargando...</p>
              ) : regs.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">Todavía no hay equipos inscritos.</p>
              ) : (
                <div className="table-wrap rounded-none border-0">
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Inscrito por</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regs.map((r) => (
                        <tr key={r._id}>
                          <td>
                            <p className="font-semibold text-white">{r.equipo?.nombre}</p>
                            <p className="text-xs text-gray-500">{r.equipo?.facultad}</p>
                          </td>
                          <td className="text-xs">{r.inscritoPor?.nombre}</td>
                          <td>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADOS_INSCRIPCION[r.estado] || ''}`}>
                              {r.estado.replace('_', ' ')}
                            </span>
                            {r.motivoRechazo && <p className="mt-1 text-xs text-gray-500">{r.motivoRechazo}</p>}
                          </td>
                          <td className="text-right">
                            {publicado ? (
                              <span className="text-xs text-gray-500">Bloqueado</span>
                            ) : rechazo?.id === r._id ? (
                              <div className="flex justify-end gap-2">
                                <input
                                  aria-label="Motivo del rechazo"
                                  className="input-dark w-48 px-2 py-1"
                                  placeholder="Motivo"
                                  maxLength={300}
                                  value={rechazo.motivo}
                                  onChange={(e) => setRechazo({ id: r._id, motivo: e.target.value })}
                                />
                                <button type="button" className="btn-primary px-3 py-1 text-xs" disabled={!rechazo.motivo.trim()} onClick={rechazar}>
                                  Rechazar
                                </button>
                                <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setRechazo(null)}>
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {r.estado !== 'aprobada' && (
                                  <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => aprobar(r)}>
                                    Aprobar
                                  </button>
                                )}
                                {r.estado !== 'rechazada' && (
                                  <button
                                    type="button"
                                    className="rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                                    onClick={() => setRechazo({ id: r._id, motivo: '' })}
                                  >
                                    Rechazar
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#24405f] bg-[#0f1824]">
              <div className="border-b border-[#24405f] px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Calendario {publicado ? '' : '(borrador)'} · {matches.length} partidos
                </h2>
              </div>
              {cargandoDetalle ? (
                <p className="p-6 text-sm text-gray-400" role="status">Cargando...</p>
              ) : matches.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">
                  Aún no hay calendario. Cierra la inscripción y pulsa «Generar calendario».
                </p>
              ) : (
                <div className="table-wrap rounded-none border-0">
                  <table className="table-dark">
                    <thead>
                      <tr>
                        <th>Jornada</th>
                        <th>Fecha</th>
                        <th>Partido</th>
                        <th>Escenario</th>
                        <th>Árbitro</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m) => {
                        const cerrado = m.estado === 'finalizado' || m.estado === 'cancelado';
                        return (
                          <tr key={m._id}>
                            <td>{m.jornada}</td>
                            <td className="whitespace-nowrap">
                              {reprogramando?.id === m._id ? (
                                <input
                                  type="datetime-local"
                                  aria-label="Nueva fecha"
                                  min={aInputLocal(new Date())}
                                  className="input-dark px-2 py-1"
                                  value={reprogramando.fecha}
                                  onChange={(e) => setReprogramando({ id: m._id, fecha: e.target.value })}
                                />
                              ) : (
                                formatoFechaHora(m.fecha)
                              )}
                            </td>
                            <td className="font-semibold text-white">
                              {m.local?.nombre} <span className="text-xs font-normal text-gray-500">vs</span> {m.visitante?.nombre}
                              {m.estado === 'finalizado' && (
                                <span className="ml-2 text-[#34E08F]">
                                  {m.marcador.local}-{m.marcador.visitante}
                                </span>
                              )}
                            </td>
                            <td>{m.escenario}</td>
                            <td>
                              {arbitros.length > 0 && !cerrado ? (
                                <select
                                  aria-label="Asignar árbitro"
                                  className="input-dark px-2 py-1"
                                  value={m.arbitro?._id || ''}
                                  onChange={(e) => asignar(m._id, e.target.value)}
                                >
                                  <option value="">Sin asignar</option>
                                  {arbitros.map((a) => (
                                    <option key={a._id} value={a._id}>
                                      {a.nombre}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                m.arbitro?.nombre || '–'
                              )}
                            </td>
                            <td className="text-right">
                              {cerrado ? (
                                <span className="text-xs text-gray-500">{m.estado}</span>
                              ) : reprogramando?.id === m._id ? (
                                <div className="flex justify-end gap-2">
                                  <button type="button" className="btn-primary px-3 py-1 text-xs" disabled={!reprogramando.fecha} onClick={reprogramar}>
                                    Guardar
                                  </button>
                                  <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setReprogramando(null)}>
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-outline px-3 py-1 text-xs"
                                  onClick={() => setReprogramando({ id: m._id, fecha: aInputLocal(m.fecha) })}
                                >
                                  Reprogramar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
