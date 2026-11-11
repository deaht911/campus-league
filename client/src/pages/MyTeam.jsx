import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import {
  addPlayer,
  createTeam,
  deleteTeam,
  getErrorMessage,
  getMyTeams,
  getTournaments,
  registerTeam,
  removePlayer,
  updatePlayer,
} from '../services/api';

const DISCIPLINAS = [
  ['futsal', 'Futsal'],
  ['futbol', 'Fútbol'],
  ['basquetbol', 'Baloncesto'],
  ['voleibol', 'Voleibol'],
  ['otra', 'Otra'],
];

const nombreDisciplina = (valor) => (DISCIPLINAS.find(([k]) => k === valor) || [null, valor])[1];

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });

function CrearEquipo({ facultadInicial, onCrear, onCancelar }) {
  const [form, setForm] = useState({ nombre: '', disciplina: 'futsal', facultad: facultadInicial || '' });
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const datos = { nombre: form.nombre.trim(), disciplina: form.disciplina };
    if (form.facultad.trim()) datos.facultad = form.facultad.trim();
    const exito = await onCrear(datos);
    if (!exito) setEnviando(false);
  };

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6" noValidate>
      <h2 className="font-display text-lg font-semibold text-white">Crear equipo</h2>
      <p className="mt-1 text-sm text-gray-400">Serás el capitán y quedarás registrado en la plantilla.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="eq-nombre" className="label-dark">
            Nombre del equipo
          </label>
          <input
            id="eq-nombre"
            name="nombre"
            className="input-dark"
            placeholder="Los Tornillos"
            value={form.nombre}
            onChange={cambiar}
          />
        </div>
        <div>
          <label htmlFor="eq-disciplina" className="label-dark">
            Disciplina
          </label>
          <select id="eq-disciplina" name="disciplina" className="input-dark" value={form.disciplina} onChange={cambiar}>
            {DISCIPLINAS.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="eq-facultad" className="label-dark">
            Facultad
          </label>
          <input id="eq-facultad" name="facultad" className="input-dark" value={form.facultad} onChange={cambiar} />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button type="submit" className="btn-primary px-5 py-2.5" disabled={enviando || form.nombre.trim().length < 3}>
          {enviando ? 'Creando...' : 'Crear equipo'}
        </button>
        {onCancelar && (
          <button type="button" className="btn-outline px-5 py-2.5" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function FilaJugador({ jugador, esCapitanEquipo, puedeEditar, onGuardar, onBaja }) {
  const [editando, setEditando] = useState(false);
  const [camiseta, setCamiseta] = useState(jugador.numeroCamiseta ?? '');
  const [posicion, setPosicion] = useState(jugador.posicion || '');

  const usuario = jugador.usuario || {};

  const guardar = async () => {
    const datos = { posicion: posicion.trim() };
    if (camiseta !== '') datos.numeroCamiseta = Number(camiseta);
    const exito = await onGuardar(usuario._id, datos);
    if (exito) setEditando(false);
  };

  return (
    <tr>
      <td className="w-20">
        {editando ? (
          <input
            type="number"
            min="0"
            max="99"
            aria-label="Número de camiseta"
            className="input-dark w-16 px-2 py-1"
            value={camiseta}
            onChange={(e) => setCamiseta(e.target.value)}
          />
        ) : (
          <span className="inline-block min-w-9 rounded-md bg-[#0B2545] px-2 py-1 text-center font-bold text-white">
            {jugador.numeroCamiseta ?? '–'}
          </span>
        )}
      </td>
      <td>
        <p className="font-semibold text-white">
          {usuario.nombre || 'Usuario eliminado'}
          {esCapitanEquipo && <span className="badge ml-2">Capitán</span>}
        </p>
        <p className="text-xs text-gray-500">{usuario.correo}</p>
      </td>
      <td>
        {editando ? (
          <input
            aria-label="Posición"
            className="input-dark px-2 py-1"
            placeholder="Posición"
            maxLength={30}
            value={posicion}
            onChange={(e) => setPosicion(e.target.value)}
          />
        ) : (
          jugador.posicion || '–'
        )}
      </td>
      {puedeEditar && (
        <td className="whitespace-nowrap text-right">
          {editando ? (
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={guardar}>
                Guardar
              </button>
              <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline px-3 py-1 text-xs" onClick={() => setEditando(true)}>
                Editar
              </button>
              {!esCapitanEquipo && (
                <button
                  type="button"
                  className="rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                  onClick={() => onBaja(usuario._id, usuario.nombre)}
                >
                  Dar de baja
                </button>
              )}
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

export default function MyTeam() {
  const { user, refreshUser } = useAuth();
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ version: -1, teams: [], error: '' });
  const [seleccion, setSeleccion] = useState('');
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [torneos, setTorneos] = useState([]);
  const [acepta, setAcepta] = useState(false);
  const [nuevo, setNuevo] = useState({ correo: '', numeroCamiseta: '', posicion: '' });

  // Estado para el modal de confirmación personalizado
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: true,
  });

  useEffect(() => {
    let activo = true;
    getMyTeams()
      .then((d) => activo && setDatos({ version, teams: d.teams, error: '' }))
      .catch((err) => activo && setDatos({ version, teams: [], error: getErrorMessage(err) }));
    return () => {
      activo = false;
    };
  }, [version]);

  useEffect(() => {
    let activo = true;
    getTournaments({ estado: 'inscripcion' })
      .then((d) => activo && setTorneos(d.tournaments))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const recargar = () => setVersion((v) => v + 1);
  const cargando = datos.version !== version;
  const equipos = datos.teams;
  const equipo = equipos.find((t) => t._id === seleccion) || equipos[0] || null;
  const esDuenio = !!equipo && (user.rol === 'administrador' || equipo.capitan?._id === user._id);
  const activos = equipo ? equipo.jugadores.filter((j) => j.activo) : [];
  const torneosAbiertos = equipo ? torneos.filter((t) => t.disciplina === equipo.disciplina) : [];

  const ejecutar = async (accion, textoOk) => {
    setMensaje({ tipo: '', texto: '' });
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

  const crear = async (datosEquipo) => {
    const exito = await ejecutar(async () => {
      const r = await createTeam(datosEquipo);
      await refreshUser();
      setSeleccion(r.team._id);
      setMostrarCrear(false);
    }, 'Equipo creado. Ya eres el capitán.');
    return exito;
  };

  const agregar = async (e) => {
    e.preventDefault();
    const body = { correo: nuevo.correo.trim() };
    if (nuevo.numeroCamiseta !== '') body.numeroCamiseta = Number(nuevo.numeroCamiseta);
    if (nuevo.posicion.trim()) body.posicion = nuevo.posicion.trim();
    const exito = await ejecutar(() => addPlayer(equipo._id, body), 'Jugador agregado a la plantilla.');
    if (exito) setNuevo({ correo: '', numeroCamiseta: '', posicion: '' });
  };

  const guardarJugador = (userId, cambios) =>
    ejecutar(() => updatePlayer(equipo._id, userId, cambios), 'Jugador actualizado.');

  const solicitarBajaJugador = (userId, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: 'Dar de baja jugador',
      message: `¿Estás seguro de dar de baja a ${nombre || 'este jugador'} de la plantilla?`,
      confirmText: 'Dar de baja',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        await ejecutar(() => removePlayer(equipo._id, userId), 'Jugador dado de baja.');
      },
    });
  };

  const solicitarBajaEquipo = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Dar de baja equipo',
      message: `¿Estás seguro de dar de baja el equipo "${equipo.nombre}"? Esta acción lo quitará de la lista pública.`,
      confirmText: 'Eliminar equipo',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const exito = await ejecutar(() => deleteTeam(equipo._id), 'Equipo dado de baja.');
        if (exito) setSeleccion('');
      },
    });
  };

  const inscribir = (torneo) =>
    ejecutar(
      () => registerTeam(torneo._id, { equipo: equipo._id, aceptaReglamento: true }).then((d) => d.message),
      'Inscripción registrada.'
    );

  const cambiarNuevo = (e) => setNuevo((n) => ({ ...n, [e.target.name]: e.target.value }));

  return (
    <div>
      <header className="border-b border-[#24405f] bg-[#0B2545]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Mi Equipo</h1>
          <p className="mt-2 text-gray-300">Gestiona tu plantilla e inscríbela en los torneos abiertos.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {mensaje.texto && (
          <div className={mensaje.tipo === 'ok' ? 'alert-ok' : 'alert-error'} role={mensaje.tipo === 'ok' ? 'status' : 'alert'}>
            {mensaje.texto}
          </div>
        )}
        {datos.error && (
          <div className="alert-error" role="alert">
            {datos.error}
          </div>
        )}

        {cargando ? (
          <p className="text-gray-400" role="status">
            Cargando equipos...
          </p>
        ) : (
          <>
            {(equipos.length === 0 || mostrarCrear) && (
              <CrearEquipo
                facultadInicial={user.facultad}
                onCrear={crear}
                onCancelar={equipos.length > 0 ? () => setMostrarCrear(false) : null}
              />
            )}

            {equipos.length > 0 && equipo && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {equipos.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      aria-pressed={t._id === equipo._id}
                      onClick={() => setSeleccion(t._id)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        t._id === equipo._id
                          ? 'bg-[#0B2545] text-white ring-1 ring-[#00C16E]'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {t.nombre}
                    </button>
                  ))}
                  {!mostrarCrear && (
                    <button type="button" className="btn-outline px-4 py-1.5 text-xs" onClick={() => setMostrarCrear(true)}>
                      + Nuevo equipo
                    </button>
                  )}
                </div>

                <section className="rounded-2xl border border-[#24405f] bg-[#0f1824]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24405f] px-6 py-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-white">{equipo.nombre}</h2>
                      <p className="text-sm text-gray-400">
                        {nombreDisciplina(equipo.disciplina)} · {equipo.facultad} · {activos.length} jugadores activos
                      </p>
                    </div>
                    {esDuenio && (
                      <button
                        type="button"
                        className="rounded-lg border border-red-500/50 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                        onClick={solicitarBajaEquipo}
                      >
                        Dar de baja el equipo
                      </button>
                    )}
                  </div>

                  <div className="table-wrap rounded-none border-0">
                    <table className="table-dark">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Jugador</th>
                          <th>Posición</th>
                          {esDuenio && <th className="text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {activos.map((j) => (
                          <FilaJugador
                            key={j.usuario?._id || String(j.usuario)}
                            jugador={j}
                            esCapitanEquipo={j.usuario?._id === equipo.capitan?._id}
                            puedeEditar={esDuenio}
                            onGuardar={guardarJugador}
                            onBaja={solicitarBajaJugador}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!esDuenio && (
                    <p className="border-t border-[#24405f] px-6 py-3 text-xs text-gray-500">
                      Solo el capitán puede modificar la plantilla.
                    </p>
                  )}
                </section>

                {esDuenio && (
                  <>
                    <form onSubmit={agregar} className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6" noValidate>
                      <h2 className="font-display text-lg font-semibold text-white">Agregar jugador</h2>
                      <p className="mt-1 text-sm text-gray-400">
                        Debe ser un estudiante verificado que no pertenezca a otro equipo de {nombreDisciplina(equipo.disciplina)}.
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                        <div>
                          <label htmlFor="j-correo" className="label-dark">
                            Correo institucional
                          </label>
                          <input
                            id="j-correo"
                            name="correo"
                            type="email"
                            className="input-dark"
                            placeholder="estudiante@uab.edu.bo"
                            value={nuevo.correo}
                            onChange={cambiarNuevo}
                          />
                        </div>
                        <div>
                          <label htmlFor="j-camiseta" className="label-dark">
                            Camiseta
                          </label>
                          <input
                            id="j-camiseta"
                            name="numeroCamiseta"
                            type="number"
                            min="0"
                            max="99"
                            className="input-dark"
                            value={nuevo.numeroCamiseta}
                            onChange={cambiarNuevo}
                          />
                        </div>
                        <div>
                          <label htmlFor="j-posicion" className="label-dark">
                            Posición
                          </label>
                          <input
                            id="j-posicion"
                            name="posicion"
                            maxLength={30}
                            className="input-dark"
                            value={nuevo.posicion}
                            onChange={cambiarNuevo}
                          />
                        </div>
                        <button type="submit" className="btn-primary px-5 py-2.5" disabled={!nuevo.correo.trim()}>
                          Agregar
                        </button>
                      </div>
                    </form>

                    <section className="rounded-2xl border border-[#24405f] bg-[#0f1824] p-6">
                      <h2 className="font-display text-lg font-semibold text-white">Inscribir en un torneo</h2>
                      {torneosAbiertos.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-400">
                          No hay torneos de {nombreDisciplina(equipo.disciplina)} con inscripción abierta.
                        </p>
                      ) : (
                        <>
                          <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#00C16E]"
                              checked={acepta}
                              onChange={(e) => setAcepta(e.target.checked)}
                            />
                            Acepto el reglamento del torneo
                          </label>
                          <ul className="mt-4 space-y-3">
                            {torneosAbiertos.map((t) => (
                              <li
                                key={t._id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-white">{t.nombre}</p>
                                  <p className="text-xs text-gray-400">
                                    Cierra el {formatoFecha(t.inscripcionFin)} · mínimo {t.minJugadores} jugadores · máx. {t.maxEquipos} equipos
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="btn-primary px-4 py-2"
                                  disabled={!acepta}
                                  onClick={() => inscribir(t)}
                                >
                                  Inscribir equipo
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  );
}
