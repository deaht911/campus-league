const mongoose = require('mongoose');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Team = require('../models/Team');
const User = require('../models/User');

const HORA_MS = 60 * 60 * 1000;

const esOrganizador = (torneo, user) =>
  user && (user.rol === 'administrador' || String(torneo.organizador) === String(user._id));

// Función auxiliar para popular partidos sin fallos en objetos nulos
const poblar = (query) =>
  query
    .populate('torneo', 'nombre disciplina estado calendarioPublicado')
    .populate('local', 'nombre facultad logo')
    .populate('visitante', 'nombre facultad logo')
    .populate('arbitro', 'nombre correo')
    .populate({
      path: 'estadisticas.jugador',
      select: 'nombre correo'
    })
    .populate({
      path: 'estadisticas.equipo',
      select: 'nombre'
    });

// GET /api/matches
exports.listMatches = async (req, res, next) => {
  try {
    const filtro = {};

    if (req.query.torneo) {
      filtro.torneo = req.query.torneo;
    }

    if (req.query.equipo) filtro.$or = [{ local: req.query.equipo }, { visitante: req.query.equipo }];
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.fase) filtro.fase = req.query.fase;
    if (req.query.jornada) filtro.jornada = parseInt(req.query.jornada, 10);

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const matches = await poblar(Match.find(filtro).sort({ fecha: 1 }).limit(limit));
    
    res.json({ success: true, count: matches.length, matches });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/mine - partidos asignados al árbitro autenticado
exports.myMatches = async (req, res, next) => {
  try {
    const filtro = { arbitro: req.user._id };
    if (req.query.estado) filtro.estado = req.query.estado;
    const matches = await poblar(Match.find(filtro).sort({ fecha: 1 }));
    const resultado = matches || [];
    res.json({ success: true, count: resultado.length, matches: resultado });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/:id
exports.getMatch = async (req, res, next) => {
  try {
    const match = await poblar(Match.findById(req.params.id)).populate('estadisticas.jugador', 'nombre');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }
    const torneo = await Tournament.findById(match.torneo._id);
    const visible = torneo.calendarioPublicado || (req.user && esOrganizador(torneo, req.user));
    if (!visible) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }
    res.json({ success: true, match });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/standings/:torneoId (RF-012)
exports.standings = async (req, res, next) => {
  try {
    const torneo = await Tournament.findById(req.params.torneoId);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }

    const inscripciones = await Registration.find({ torneo: torneo._id, estado: 'aprobada' }).populate(
      'equipo',
      'nombre facultad'
    );

    const tabla = new Map();
    (inscripciones || []).forEach((i) => {
      if (!i.equipo) return;
      tabla.set(String(i.equipo._id), {
        equipo: { _id: i.equipo._id, nombre: i.equipo.nombre, facultad: i.equipo.facultad },
        pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      });
    });

    const partidos = await Match.find({ torneo: torneo._id, estado: 'finalizado' }).select('local visitante marcador');
    (partidos || []).forEach((p) => {
      const l = tabla.get(String(p.local));
      const v = tabla.get(String(p.visitante));
      if (!l || !v) return;
      const gl = p.marcador.local;
      const gv = p.marcador.visitante;

      l.pj++; v.pj++;
      l.gf += gl; l.gc += gv;
      v.gf += gv; v.gc += gl;

      if (gl > gv) { l.pg++; v.pp++; l.pts += 3; }
      else if (gv > gl) { v.pg++; l.pp++; v.pts += 3; }
      else { l.pe++; v.pe++; l.pts++; v.pts++; }
    });

    const ordenada = [...tabla.values()]
      .map((f) => ({ ...f, dg: f.gf - f.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.nombre.localeCompare(b.equipo.nombre))
      .map((f, i) => ({ posicion: i + 1, ...f }));

    res.json({ success: true, torneo: { _id: torneo._id, nombre: torneo.nombre }, standings: ordenada });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/scorers/:torneoId (RF-013)
exports.scorers = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const scorers = await Match.aggregate([
      { $match: { torneo: new mongoose.Types.ObjectId(req.params.torneoId), estado: 'finalizado' } },
      { $unwind: '$estadisticas' },
      {
        $group: {
          _id: { jugador: '$estadisticas.jugador', equipo: '$estadisticas.equipo' },
          goles: { $sum: '$estadisticas.goles' },
          faltas: { $sum: '$estadisticas.faltas' },
          partidos: { $sum: 1 },
          destacados: { $sum: { $cond: ['$estadisticas.destacado', 1, 0] } },
        },
      },
      { $match: { goles: { $gt: 0 } } },
      { $sort: { goles: -1, partidos: 1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id.jugador', foreignField: '_id', as: 'jugador' } },
      { $lookup: { from: 'teams', localField: '_id.equipo', foreignField: '_id', as: 'equipo' } },
      {
        $project: {
          _id: 0,
          goles: 1,
          faltas: 1,
          partidos: 1,
          destacados: 1,
          jugador: {
            $let: {
              vars: { j: { $arrayElemAt: ['$jugador', 0] } },
              in: { _id: '$$j._id', nombre: '$$j.nombre' },
            },
          },
          equipo: {
            $let: {
              vars: { e: { $arrayElemAt: ['$equipo', 0] } },
              in: { _id: '$$e._id', nombre: '$$e.nombre' },
            },
          },
        },
      },
    ]);

    const resultado = scorers || [];
    res.json({ success: true, count: resultado.length, scorers: resultado });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/players/:userId/stats?torneo= (RF-013, estadísticas individuales)
exports.playerStats = async (req, res, next) => {
  try {
    const jugadorId = new mongoose.Types.ObjectId(req.params.userId);
    const match = { estado: 'finalizado', 'estadisticas.jugador': jugadorId };
    if (req.query.torneo) match.torneo = new mongoose.Types.ObjectId(req.query.torneo);

    const [datos] = await Match.aggregate([
      { $match: match },
      { $unwind: '$estadisticas' },
      { $match: { 'estadisticas.jugador': jugadorId } },
      {
        $group: {
          _id: null,
          partidos: { $sum: 1 },
          goles: { $sum: '$estadisticas.goles' },
          faltas: { $sum: '$estadisticas.faltas' },
          destacados: { $sum: { $cond: ['$estadisticas.destacado', 1, 0] } },
          amarillas: {
            $sum: {
              $size: {
                $filter: { input: { $ifNull: ['$estadisticas.tarjetas', []] }, as: 't', cond: { $eq: ['$$t', 'amarilla'] } },
              },
            },
          },
          rojas: {
            $sum: {
              $size: {
                $filter: { input: { $ifNull: ['$estadisticas.tarjetas', []] }, as: 't', cond: { $eq: ['$$t', 'roja'] } },
              },
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]);

    res.json({
      success: true,
      stats: datos || { partidos: 0, goles: 0, faltas: 0, destacados: 0, amarillas: 0, rojas: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Gestión del organizador ----------

// PATCH /api/matches/:id/referee
exports.assignReferee = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }
    const torneo = await Tournament.findById(match.torneo);
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede asignar árbitros' });
    }
    if (match.estado === 'finalizado' || match.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'No se puede asignar árbitro a este partido' });
    }

    const arbitro = await User.findById(req.body.arbitro);
    if (!arbitro || !arbitro.activo || arbitro.rol !== 'arbitro') {
      return res.status(400).json({ success: false, message: 'El usuario indicado no es un árbitro activo' });
    }

    const choque = await Match.findOne({
      _id: { $ne: match._id },
      arbitro: arbitro._id,
      fecha: match.fecha,
      estado: { $ne: 'cancelado' },
    });
    if (choque) {
      return res.status(409).json({ success: false, message: 'El árbitro ya tiene un partido a esa misma hora' });
    }

    match.arbitro = arbitro._id;
    await match.save();
    res.json({ success: true, match: await poblar(Match.findById(match._id)) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/matches/:id/reschedule (CU-08, RF-010)
exports.rescheduleMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }
    const torneo = await Tournament.findById(match.torneo);
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede reprogramar partidos' });
    }
    if (match.estado === 'finalizado' || match.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'No se puede reprogramar un partido finalizado o cancelado' });
    }

    const nuevaFecha = req.body.fecha ? new Date(req.body.fecha) : match.fecha;
    const nuevoEscenario = req.body.escenario || match.escenario;

    if (nuevaFecha.getTime() === match.fecha.getTime() && nuevoEscenario === match.escenario) {
      return res.status(400).json({ success: false, message: 'La fecha y el escenario no cambiaron' });
    }

    const equipos = [match.local, match.visitante];
    const condiciones = [
      { escenario: nuevoEscenario },
      { local: { $in: equipos } },
      { visitante: { $in: equipos } },
    ];
    if (match.arbitro) condiciones.push({ arbitro: match.arbitro });

    const choque = await Match.findOne({
      _id: { $ne: match._id },
      fecha: nuevaFecha,
      estado: { $ne: 'cancelado' },
      $or: condiciones,
    });
    if (choque) {
      return res.status(409).json({
        success: false,
        message: 'Conflicto de horario: el escenario, un equipo o el árbitro ya están ocupados a esa hora',
      });
    }

    match.historialReprogramacion.push({
      fechaAnterior: match.fecha,
      escenarioAnterior: match.escenario,
      modificadoPor: req.user._id,
    });
    match.fecha = nuevaFecha;
    match.escenario = nuevoEscenario;
    match.estado = 'reprogramado';
    await match.save();

    res.json({ success: true, message: 'Partido reprogramado', match: await poblar(Match.findById(match._id)) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/matches/:id/reopen - reabre el acta dentro de las 24 h siguientes (CU-09, 7a)
exports.reopenMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }
    const torneo = await Tournament.findById(match.torneo);
    if (!esOrganizador(torneo, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el organizador puede reabrir el acta' });
    }
    if (match.estado !== 'finalizado') {
      return res.status(400).json({ success: false, message: 'El acta no está cerrada' });
    }
    const vencido = !match.actaCerradaEn || Date.now() - match.actaCerradaEn.getTime() > 24 * HORA_MS;
    if (vencido && req.user.rol !== 'administrador') {
      return res.status(400).json({ success: false, message: 'Pasaron más de 24 horas desde el cierre del acta' });
    }

    match.estado = 'pendiente_confirmacion';
    match.actaCerradaEn = undefined;
    await match.save();

    if (torneo.estado === 'finalizado') {
      torneo.estado = 'en_curso';
      await torneo.save();
    }

    res.json({ success: true, message: 'Acta reabierta. El árbitro puede corregirla', match: await poblar(Match.findById(match._id)) });
  } catch (error) {
    next(error);
  }
};

// ---------- Acta digital ----------

// PUT /api/matches/:id/result (CU-09, RF-011 y RF-012)
exports.registerResult = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Partido no encontrado' });
    }

    const esAdmin = req.user.rol === 'administrador';
    if (!esAdmin && String(match.arbitro) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'No está asignado como árbitro de este partido' });
    }
    if (match.estado === 'finalizado') {
      return res.status(409).json({
        success: false,
        message: 'El acta ya está cerrada. El organizador puede reabrirla dentro de las 24 horas',
      });
    }
    if (match.estado === 'cancelado') {
      return res.status(400).json({ success: false, message: 'El partido fue cancelado' });
    }
    if (!esAdmin && match.fecha > new Date()) {
      return res.status(400).json({ success: false, message: 'El partido aún no se disputó' });
    }

    const torneo = await Tournament.findById(match.torneo);
    if (!torneo || !torneo.calendarioPublicado) {
      return res.status(400).json({ success: false, message: 'El calendario del torneo no está publicado' });
    }

    const { walkover, ganadorWalkover, motivoWalkover, marcador, borrador } = req.body;
    const estadisticas = Array.isArray(req.body.estadisticas) ? req.body.estadisticas : [];

    if (walkover === true) {
      if (!motivoWalkover) {
        return res.status(400).json({ success: false, message: 'Indique el motivo del walkover' });
      }
      const presente = String(ganadorWalkover);
      if (presente !== String(match.local) && presente !== String(match.visitante)) {
        return res.status(400).json({ success: false, message: 'Indique el equipo presente en ganadorWalkover (local o visitante)' });
      }
      match.walkover = true;
      match.motivoWalkover = motivoWalkover;
      match.marcador = presente === String(match.local) ? { local: 3, visitante: 0 } : { local: 0, visitante: 3 };
      match.estadisticas = [];
    } else {
      if (!marcador || marcador.local === undefined || marcador.visitante === undefined) {
        return res.status(400).json({ success: false, message: 'Debe registrar el marcador de ambos equipos' });
      }

      const equipos = await Team.find({ _id: { $in: [match.local, match.visitante] } });
      const plantillas = {};
      (equipos || []).forEach((e) => {
        const jugadoresList = e.jugadores || [];
        plantillas[String(e._id)] = new Set(jugadoresList.map((j) => String(j.usuario)));
      });

      const vistos = new Set();
      for (const e of estadisticas) {
        const plantilla = plantillas[String(e.equipo)];
        if (!plantilla) {
          return res.status(400).json({ success: false, message: 'Una estadística pertenece a un equipo que no juega este partido' });
        }
        if (!plantilla.has(String(e.jugador))) {
          return res.status(400).json({ success: false, message: 'Un jugador de las estadísticas no pertenece a la plantilla de su equipo' });
        }
        if (vistos.has(String(e.jugador))) {
          return res.status(400).json({ success: false, message: 'Un jugador está repetido en las estadísticas' });
        }
        vistos.add(String(e.jugador));
      }

      match.walkover = false;
      match.motivoWalkover = undefined;
      match.marcador = { local: marcador.local, visitante: marcador.visitante };
      match.estadisticas = estadisticas;

      if (borrador !== true) {
        const sumaLocal = match.golesIndividuales(match.local);
        const sumaVisitante = match.golesIndividuales(match.visitante);
        if (sumaLocal !== marcador.local || sumaVisitante !== marcador.visitante) {
          return res.status(400).json({
            success: false,
            message: 'Los goles individuales no coinciden con el marcador. Corrija el acta antes de cerrarla',
            diferencia: {
              local: { marcador: marcador.local, individuales: sumaLocal },
              visitante: { marcador: marcador.visitante, individuales: sumaVisitante },
            },
          });
        }
      }
    }

    if (borrador === true) {
      match.estado = 'pendiente_confirmacion';
    } else {
      match.estado = 'finalizado';
      match.actaCerradaEn = new Date();
    }
    await match.save();

    if (match.estado === 'finalizado' && torneo.formato === 'liga') {
      const pendientes = await Match.countDocuments({
        torneo: torneo._id,
        estado: { $nin: ['finalizado', 'cancelado'] },
      });
      if (pendientes === 0) {
        torneo.estado = 'finalizado';
        await torneo.save();
      }
    }

    res.json({
      success: true,
      message: match.estado === 'finalizado' ? 'Acta cerrada. Tabla de posiciones actualizada' : 'Acta guardada como borrador',
      match: await poblar(Match.findById(match._id)).populate('estadisticas.jugador', 'nombre'),
    });
  } catch (error) {
    next(error);
  }
};