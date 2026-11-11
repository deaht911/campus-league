const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Team = require('../models/Team');
const User = require('../models/User');
const Match = require('../models/Match');
const { notificarInscripcion } = require('../services/mailer');

const esOrganizador = (torneo, user) =>
  user.rol === 'administrador' || String(torneo.organizador) === String(user._id);

const DIA_MS = 24 * 60 * 60 * 1000;

// ---------- Torneos ----------

// POST /api/tournaments (CU-06, RF-007)
exports.createTournament = async (req, res, next) => {
  try {
    const campos = [
      'nombre', 'disciplina', 'formato', 'fechaInicio', 'fechaFin',
      'inscripcionInicio', 'inscripcionFin', 'maxEquipos', 'minJugadores',
      'reglamento', 'escenarios',
    ];
    const datos = {};
    campos.forEach((c) => {
      if (req.body[c] !== undefined) datos[c] = req.body[c];
    });
    datos.organizador = req.user._id;

    const torneo = await Tournament.create(datos);
    res.status(201).json({ success: true, tournament: torneo });
  } catch (error) {
    next(error);
  }
};

// GET /api/tournaments - público. Filtros: disciplina, estado
exports.listTournaments = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.disciplina) filtro.disciplina = req.query.disciplina;
    if (req.query.estado) filtro.estado = req.query.estado;
    else filtro.estado = { $ne: 'borrador' };

    const torneos = await Tournament.find(filtro).sort({ fechaInicio: -1 });
    res.json({ success: true, count: torneos.length, tournaments: torneos });
  } catch (error) {
    next(error);
  }
};

// GET /api/tournaments/:id - público
exports.getTournament = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id).populate('organizador', 'nombre correo');
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    const equiposAprobados = await Registration.countDocuments({ torneo: torneo._id, estado: 'aprobada' });
    res.json({
      success: true,
      tournament: torneo,
      equiposAprobados,
      inscripcionAbierta: torneo.inscripcionAbierta(),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tournaments/:id
exports.updateTournament = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede editar el torneo' });
    }
    if (torneo.calendarioPublicado && (req.body.formato || req.body.disciplina)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cambiar formato ni disciplina con el calendario publicado',
      });
    }

    const editables = [
      'nombre', 'formato', 'fechaInicio', 'fechaFin', 'inscripcionInicio',
      'inscripcionFin', 'maxEquipos', 'minJugadores', 'reglamento', 'escenarios',
    ];
    editables.forEach((c) => {
      if (req.body[c] !== undefined) torneo[c] = req.body[c];
    });
    await torneo.save();

    res.json({ success: true, tournament: torneo });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tournaments/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede cambiar el estado' });
    }

    torneo.estado = req.body.estado;
    await torneo.save();
    res.json({ success: true, tournament: torneo });
  } catch (error) {
    next(error);
  }
};

// ---------- Inscripciones ----------

// POST /api/tournaments/:id/registrations (CU-05, RF-008)
exports.registerTeam = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!torneo.inscripcionAbierta()) {
      return res.status(400).json({ success: false, message: 'El período de inscripción no está habilitado' });
    }
    if (req.body.aceptaReglamento !== true) {
      return res.status(400).json({ success: false, message: 'Debe aceptar el reglamento del torneo' });
    }

    const equipo = await Team.findById(req.body.equipo).populate('jugadores.usuario', 'activo verificado estudianteActivo nombre');
    if (!equipo || !equipo.activo) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (String(equipo.capitan) !== String(req.user._id) && req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede inscribir al equipo' });
    }
    if (equipo.disciplina !== torneo.disciplina) {
      return res.status(400).json({ success: false, message: 'La disciplina del equipo no coincide con la del torneo' });
    }

    const activos = equipo.jugadores.filter((j) => j.activo);
    if (activos.length < torneo.minJugadores) {
      return res.status(400).json({
        success: false,
        message: `Plantilla incompleta: faltan ${torneo.minJugadores - activos.length} jugador(es)`,
      });
    }
    const noHabilitados = activos.filter(
      (j) => !j.usuario || !j.usuario.activo || !j.usuario.estudianteActivo || !j.usuario.verificado
    );
    if (noHabilitados.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hay jugadores no habilitados en la plantilla',
        jugadores: noHabilitados.map((j) => (j.usuario ? j.usuario.nombre : 'Usuario eliminado')),
      });
    }

    const duplicada = await Registration.findOne({ torneo: torneo._id, equipo: equipo._id });
    if (duplicada && duplicada.estado !== 'cancelada') {
      return res.status(409).json({ success: false, message: 'El equipo ya está inscrito en este torneo' });
    }

    const ocupados = await Registration.countDocuments({
      torneo: torneo._id,
      estado: { $in: ['pendiente', 'aprobada'] },
    });
    const estado = ocupados >= torneo.maxEquipos ? 'lista_espera' : 'pendiente';

    let inscripcion;
    if (duplicada) {
      duplicada.estado = estado;
      duplicada.aceptaReglamento = true;
      duplicada.inscritoPor = req.user._id;
      duplicada.motivoRechazo = undefined;
      inscripcion = await duplicada.save();
    } else {
      inscripcion = await Registration.create({
        torneo: torneo._id,
        equipo: equipo._id,
        inscritoPor: req.user._id,
        aceptaReglamento: true,
        estado,
      });
    }

    // RF-014: confirmación al capitán que inscribe
    notificarInscripcion({ usuario: req.user, equipo, torneo, estado });

    res.status(201).json({
      success: true,
      message: estado === 'lista_espera'
        ? 'El torneo alcanzó el máximo de equipos: quedó en lista de espera'
        : 'Inscripción registrada, pendiente de aprobación',
      registration: inscripcion,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tournaments/:id/registrations - organizador/admin; capitán ve solo las suyas
exports.listRegistrations = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }

    const filtro = { torneo: torneo._id };
    if (req.query.estado) filtro.estado = req.query.estado;

    if (esOrganizador(torneo, req.user)) {
      // ve todas
    } else if (req.user.rol === 'capitan') {
      filtro.inscritoPor = req.user._id;
    } else {
      return res.status(403).json({ success: false, message: 'No tiene permiso para ver las inscripciones' });
    }

    const inscripciones = await Registration.find(filtro)
      .populate({
        path: 'equipo',
        select: 'nombre facultad disciplina jugadores',
        populate: { path: 'jugadores.usuario', select: 'nombre correo activo' }
      })
      .populate('inscritoPor', 'nombre correo')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: inscripciones.length, registrations: inscripciones });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tournaments/:id/registrations/:regId - aprobar o rechazar
exports.reviewRegistration = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede revisar inscripciones' });
    }

    const inscripcion = await Registration.findOne({ _id: req.params.regId, torneo: torneo._id });
    if (!inscripcion) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada' });
    }

    const { estado, motivoRechazo } = req.body;

    if (estado === 'aprobada') {
      const aprobadas = await Registration.countDocuments({ torneo: torneo._id, estado: 'aprobada' });
      if (inscripcion.estado !== 'aprobada' && aprobadas >= torneo.maxEquipos) {
        return res.status(409).json({ success: false, message: 'El torneo ya alcanzó el máximo de equipos aprobados' });
      }
    }
    if (estado === 'rechazada' && !motivoRechazo) {
      return res.status(400).json({ success: false, message: 'Indique el motivo del rechazo' });
    }
    if (torneo.calendarioPublicado) {
      return res.status(400).json({ success: false, message: 'El calendario ya fue publicado: no se pueden modificar inscripciones' });
    }

    inscripcion.estado = estado;
    inscripcion.motivoRechazo = estado === 'rechazada' ? motivoRechazo : undefined;
    inscripcion.revisadoPor = req.user._id;
    inscripcion.fechaRevision = new Date();
    await inscripcion.save();

    // RF-014: avisa al capitán que inscribió el equipo
    const [usuario, equipoNotif] = await Promise.all([
      User.findById(inscripcion.inscritoPor).select('nombre correo'),
      Team.findById(inscripcion.equipo).select('nombre'),
    ]);
    if (usuario && equipoNotif) {
      notificarInscripcion({ usuario, equipo: equipoNotif, torneo, estado, motivo: motivoRechazo });
    }

    res.json({ success: true, registration: inscripcion });
  } catch (error) {
    next(error);
  }
};

// ---------- Calendario (fixture) ----------

// Todos contra todos por algoritmo del círculo. Devuelve [{ jornada, local, visitante }]
const generarLiga = (equipos, dobleVuelta) => {
  const lista = [...equipos];
  if (lista.length % 2 !== 0) lista.push(null); // descanso
  const n = lista.length;
  const jornadas = n - 1;
  const partidos = [];

  for (let r = 0; r < jornadas; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a && b) {
        const invertir = (r + i) % 2 === 1;
        partidos.push({ jornada: r + 1, local: invertir ? b : a, visitante: invertir ? a : b });
      }
    }
    // rotación manteniendo fijo el primero
    lista.splice(1, 0, lista.pop());
  }

  if (dobleVuelta) {
    const vuelta = partidos.map((p) => ({
      jornada: p.jornada + jornadas,
      local: p.visitante,
      visitante: p.local,
    }));
    return partidos.concat(vuelta);
  }
  return partidos;
};

const nombreFase = (equiposRestantes) => {
  if (equiposRestantes === 2) return 'final';
  if (equiposRestantes === 4) return 'semifinal';
  if (equiposRestantes === 8) return 'cuartos';
  return 'octavos';
};

// Eliminación directa: solo se programa la primera ronda (con byes si hace falta)
const generarEliminacion = (equipos) => {
  let tam = 1;
  while (tam < equipos.length) tam *= 2;

  const lista = [...equipos];
  const byes = tam - lista.length;
  const partidos = [];
  const conBye = lista.slice(0, byes); // pasan directo a la siguiente ronda
  const jugando = lista.slice(byes);

  for (let i = 0; i < jugando.length; i += 2) {
    partidos.push({
      jornada: 1,
      fase: nombreFase(tam),
      local: jugando[i],
      visitante: jugando[i + 1],
    });
  }
  return { partidos, conBye };
};

// Asigna fecha/escenario a cada partido sin choques de escenario ni de equipo
const asignarHorarios = (partidos, { fechaInicio, fechaFin, escenarios, horarios, tipoDias }) => {
  const franjas = [];
  const desde = new Date(fechaInicio);
  const hasta = new Date(fechaFin);
  desde.setHours(0, 0, 0, 0);
  hasta.setHours(23, 59, 59, 999);

  for (let d = new Date(desde); d <= hasta; d = new Date(d.getTime() + DIA_MS)) {
    const dow = d.getDay();
    if (tipoDias === 'habiles' && (dow === 0 || dow === 6)) continue;
    horarios.forEach((hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      const f = new Date(d);
      f.setHours(h, m, 0, 0);
      escenarios.forEach((esc) => franjas.push({ fecha: f, escenario: esc }));
    });
  }

  const resultado = [];
  const ocupadoEquipo = new Set(); // `${fechaISO}|${equipoId}`
  const usadas = new Set();

  // Respeta el orden de jornadas para que una jornada no se programe antes que la anterior
  const ordenados = [...partidos].sort((a, b) => a.jornada - b.jornada);

  for (const p of ordenados) {
    const franja = franjas.find((f, idx) => {
      if (usadas.has(idx)) return false;
      const k = f.fecha.toISOString();
      return !ocupadoEquipo.has(`${k}|${p.local}`) && !ocupadoEquipo.has(`${k}|${p.visitante}`);
    });
    if (!franja) return null; // no alcanzan franjas

    usadas.add(franjas.indexOf(franja));
    const k = franja.fecha.toISOString();
    ocupadoEquipo.add(`${k}|${p.local}`);
    ocupadoEquipo.add(`${k}|${p.visitante}`);
    resultado.push({ ...p, fecha: franja.fecha, escenario: franja.escenario });
  }
  return resultado;
};

// POST /api/tournaments/:id/fixture (CU-07, RF-009) - genera el calendario en modo borrador
exports.generateFixture = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede generar el calendario' });
    }
    if (torneo.calendarioPublicado) {
      return res.status(400).json({ success: false, message: 'El calendario ya fue publicado' });
    }
    if (new Date() <= torneo.inscripcionFin && torneo.estado === 'inscripcion') {
      return res.status(400).json({
        success: false,
        message: 'El período de inscripción sigue abierto. Ciérrelo antes de generar el calendario',
      });
    }

    const aprobadas = await Registration.find({ torneo: torneo._id, estado: 'aprobada' }).sort({ createdAt: 1 });
    if (aprobadas.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 4 equipos aprobados. Considere ampliar el plazo de inscripción',
      });
    }

    const escenarios = (req.body.escenarios && req.body.escenarios.length ? req.body.escenarios : torneo.escenarios) || [];
    if (escenarios.length === 0) {
      return res.status(400).json({ success: false, message: 'Defina al menos un escenario deportivo' });
    }
    const horarios = req.body.horarios && req.body.horarios.length ? req.body.horarios : ['18:00', '19:30', '21:00'];
    const fechaInicio = req.body.fechaInicio || torneo.fechaInicio;
    const fechaFin = req.body.fechaFin || torneo.fechaFin;
    const tipoDias = req.body.tipoDias === 'todos' ? 'todos' : 'habiles';

    // Mezcla estable: orden de inscripción
    const ids = aprobadas.map((r) => String(r.equipo));
    let base;
    let conBye = [];
    if (torneo.formato === 'liga') {
      base = generarLiga(ids, req.body.dobleVuelta === true);
    } else {
      const el = generarEliminacion(ids);
      base = el.partidos;
      conBye = el.conBye;
    }

    const programados = asignarHorarios(base, { fechaInicio, fechaFin, escenarios, horarios, tipoDias });
    if (!programados) {
      return res.status(409).json({
        success: false,
        message: 'Escenarios u horarios insuficientes para las fechas indicadas. Amplíe el rango de fechas o agregue escenarios',
      });
    }

    // Reemplaza cualquier borrador anterior
    await Match.deleteMany({ torneo: torneo._id });
    const creados = await Match.insertMany(
      programados.map((p) => ({
        torneo: torneo._id,
        local: p.local,
        visitante: p.visitante,
        fase: p.fase || 'liga',
        jornada: p.jornada,
        fecha: p.fecha,
        escenario: p.escenario,
        estado: 'programado',
      }))
    );

    torneo.estado = 'inscripcion_cerrada';
    await torneo.save();

    res.status(201).json({
      success: true,
      message: 'Calendario generado en modo borrador. Revíselo y publíquelo',
      total: creados.length,
      equiposConBye: conBye,
      matches: creados,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/tournaments/:id/fixture/publish
exports.publishFixture = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede publicar el calendario' });
    }
    if (torneo.calendarioPublicado) {
      return res.status(400).json({ success: false, message: 'El calendario ya fue publicado' });
    }

    const total = await Match.countDocuments({ torneo: torneo._id });
    if (total === 0) {
      return res.status(400).json({ success: false, message: 'No hay un calendario en borrador para publicar' });
    }

    torneo.calendarioPublicado = true;
    torneo.estado = 'en_curso';
    await torneo.save();

    res.json({ success: true, message: 'Calendario publicado', total, tournament: torneo });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tournaments/:id/fixture - descarta el borrador
exports.discardFixture = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede descartar el borrador' });
    }
    if (torneo.calendarioPublicado) {
      return res.status(400).json({ success: false, message: 'No se puede descartar un calendario publicado' });
    }

    const { deletedCount } = await Match.deleteMany({ torneo: torneo._id });
    res.json({ success: true, message: 'Borrador descartado', eliminados: deletedCount });
  } catch (error) {
    next(error);
  }
};  