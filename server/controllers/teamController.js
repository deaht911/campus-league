const Team = require('../models/Team');
const User = require('../models/User');

const esDuenio = (team, user) =>
  user.rol === 'administrador' || String(team.capitan) === String(user._id);

const poblar = (query) =>
  query
    .populate('capitan', 'nombre correo facultad')
    .populate('jugadores.usuario', 'nombre correo facultad codigoEstudiantil');

// Busca al jugador en otro equipo activo de la misma disciplina (RF-006)
const equipoConflictivo = (usuarioId, disciplina, excluirEquipoId) => {
  const filtro = {
    disciplina,
    activo: true,
    $or: [
      { capitan: usuarioId },
      { jugadores: { $elemMatch: { usuario: usuarioId, activo: true } } },
    ],
  };
  if (excluirEquipoId) filtro._id = { $ne: excluirEquipoId };
  return Team.findOne(filtro);
};

// POST /api/teams (CU-03)
exports.createTeam = async (req, res, next) => {
  try {
    const { nombre, disciplina, facultad } = req.body;

    const conflicto = await equipoConflictivo(req.user._id, disciplina);
    if (conflicto) {
      return res.status(409).json({
        success: false,
        message: `Ya pertenece al equipo '${conflicto.nombre}' en la disciplina ${disciplina}`,
      });
    }

    const team = await Team.create({
      nombre,
      disciplina,
      facultad: facultad || req.user.facultad,
      capitan: req.user._id,
      jugadores: [{ usuario: req.user._id }],
    });

    if (req.user.rol === 'jugador') {
      await User.findByIdAndUpdate(req.user._id, { rol: 'capitan' });
    }

    const creado = await poblar(Team.findById(team._id));
    res.status(201).json({ success: true, team: creado });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams - filtros: disciplina, facultad, q
exports.listTeams = async (req, res, next) => {
  try {
    const filtro = { activo: true };
    if (req.query.disciplina) filtro.disciplina = req.query.disciplina;
    if (req.query.facultad) filtro.facultad = req.query.facultad;
    if (req.query.q) {
      filtro.nombre = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const teams = await poblar(Team.find(filtro).sort({ nombre: 1 }));
    res.json({ success: true, count: teams.length, teams });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/mine - equipos donde el usuario es capitán o jugador activo
exports.myTeams = async (req, res, next) => {
  try {
    const teams = await poblar(
      Team.find({
        activo: true,
        $or: [
          { capitan: req.user._id },
          { jugadores: { $elemMatch: { usuario: req.user._id, activo: true } } },
        ],
      }).sort({ nombre: 1 })
    );
    res.json({ success: true, count: teams.length, teams });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/:id
exports.getTeam = async (req, res, next) => {
  try {
    const team = await poblar(Team.findById(req.params.id));
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    res.json({ success: true, team });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teams/:id
exports.updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (!esDuenio(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede editar el equipo' });
    }

    const { nombre, facultad } = req.body;
    if (nombre !== undefined) team.nombre = nombre;
    if (facultad !== undefined) team.facultad = facultad;
    await team.save();

    res.json({ success: true, team: await poblar(Team.findById(team._id)) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id - baja lógica
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (!esDuenio(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede dar de baja el equipo' });
    }

    team.activo = false;
    await team.save();
    res.json({ success: true, message: 'Equipo dado de baja' });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams/:id/players (CU-04, RF-005 y RF-006)
exports.addPlayer = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !team.activo) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (!esDuenio(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede gestionar la plantilla' });
    }

    const { correo, numeroCamiseta, posicion } = req.body;
    const jugador = await User.findOne({ correo: String(correo).toLowerCase() });

    if (!jugador || !jugador.activo || !jugador.verificado) {
      return res.status(404).json({ success: false, message: 'No existe un estudiante verificado con ese correo' });
    }
    if (!jugador.estudianteActivo) {
      return res.status(400).json({ success: false, message: 'El estudiante no tiene matrícula activa' });
    }

    const existente = team.jugadores.find((j) => String(j.usuario) === String(jugador._id));
    if (existente && existente.activo) {
      return res.status(409).json({ success: false, message: 'El jugador ya está en la plantilla' });
    }

    const conflicto = await equipoConflictivo(jugador._id, team.disciplina, team._id);
    if (conflicto) {
      return res.status(409).json({
        success: false,
        message: `El jugador ya pertenece al equipo '${conflicto.nombre}' en ${team.disciplina}`,
      });
    }

    if (existente) {
      existente.activo = true;
      existente.fechaAlta = new Date();
      if (numeroCamiseta !== undefined) existente.numeroCamiseta = numeroCamiseta;
      if (posicion !== undefined) existente.posicion = posicion;
    } else {
      team.jugadores.push({ usuario: jugador._id, numeroCamiseta, posicion });
    }
    await team.save();

    res.status(201).json({ success: true, team: await poblar(Team.findById(team._id)) });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teams/:id/players/:userId
exports.updatePlayer = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !team.activo) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (!esDuenio(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede gestionar la plantilla' });
    }

    const jugador = team.jugadores.find((j) => String(j.usuario) === req.params.userId);
    if (!jugador) {
      return res.status(404).json({ success: false, message: 'El jugador no está en la plantilla' });
    }

    const { numeroCamiseta, posicion } = req.body;
    if (numeroCamiseta !== undefined) jugador.numeroCamiseta = numeroCamiseta;
    if (posicion !== undefined) jugador.posicion = posicion;
    await team.save();

    res.json({ success: true, team: await poblar(Team.findById(team._id)) });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id/players/:userId - baja lógica del jugador
exports.removePlayer = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team || !team.activo) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    }
    if (!esDuenio(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Solo el capitán puede gestionar la plantilla' });
    }
    if (String(team.capitan) === req.params.userId) {
      return res.status(400).json({ success: false, message: 'No se puede dar de baja al capitán' });
    }

    const jugador = team.jugadores.find((j) => String(j.usuario) === req.params.userId && j.activo);
    if (!jugador) {
      return res.status(404).json({ success: false, message: 'El jugador no está en la plantilla' });
    }

    jugador.activo = false;
    await team.save();

    res.json({ success: true, team: await poblar(Team.findById(team._id)) });
  } catch (error) {
    next(error);
  }
};