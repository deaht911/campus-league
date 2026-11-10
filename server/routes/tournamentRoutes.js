const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  createTournament,
  listTournaments,
  getTournament,
  updateTournament,
  updateStatus,
  registerTeam,
  listRegistrations,
  reviewRegistration,
  generateFixture,
  publishFixture,
  discardFixture,
} = require('../controllers/tournamentController');
const { protect, authorize } = require('../middlewares/auth');
const { DISCIPLINAS, FORMATOS, ESTADOS } = require('../models/Tournament');

const router = express.Router();

const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errores.array().map((e) => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
};

const idValido = param('id').isMongoId().withMessage('ID de torneo no válido');
const regIdValido = param('regId').isMongoId().withMessage('ID de inscripción no válido');
const organizadores = authorize('organizador', 'administrador');

const camposTorneo = (opcional) => {
  const o = (v) => (opcional ? v.optional() : v);
  return [
    o(body('nombre').isString().trim().isLength({ min: 3, max: 100 })).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    o(body('fechaInicio').isISO8601()).withMessage('Fecha de inicio no válida'),
    o(body('fechaFin').isISO8601()).withMessage('Fecha de fin no válida'),
    o(body('inscripcionInicio').isISO8601()).withMessage('Inicio de inscripciones no válido'),
    o(body('inscripcionFin').isISO8601()).withMessage('Fin de inscripciones no válido'),
    o(body('maxEquipos').isInt({ min: 4, max: 64 })).withMessage('El máximo de equipos debe estar entre 4 y 64').toInt(),
    body('minJugadores').optional().isInt({ min: 1 }).withMessage('El mínimo de jugadores debe ser al menos 1').toInt(),
    o(body('reglamento').isString().trim().isLength({ min: 1, max: 5000 })).withMessage('El reglamento es obligatorio (máx. 5000 caracteres)'),
    body('escenarios').optional().isArray().withMessage('Los escenarios deben ser una lista'),
  ];
};

// Consulta pública
router.get('/', listTournaments);
router.get('/:id', [idValido], validar, getTournament);

// Gestión de torneos (organizador / administrador)
router.post(
  '/',
  protect,
  organizadores,
  [
    ...camposTorneo(false),
    body('disciplina').isIn(DISCIPLINAS).withMessage('Disciplina no válida. Permitidas: ' + DISCIPLINAS.join(', ')),
    body('formato').isIn(FORMATOS).withMessage('Formato no válido. Permitidos: ' + FORMATOS.join(', ')),
  ],
  validar,
  createTournament
);
router.put('/:id', protect, organizadores, [idValido, ...camposTorneo(true)], validar, updateTournament);
router.patch(
  '/:id/status',
  protect,
  organizadores,
  [idValido, body('estado').isIn(ESTADOS).withMessage('Estado no válido. Permitidos: ' + ESTADOS.join(', '))],
  validar,
  updateStatus
);

// Inscripciones
router.post(
  '/:id/registrations',
  protect,
  authorize('capitan', 'administrador'),
  [
    idValido,
    body('equipo').isMongoId().withMessage('ID de equipo no válido'),
    body('aceptaReglamento').isBoolean().withMessage('Debe indicar si acepta el reglamento').toBoolean(),
  ],
  validar,
  registerTeam
);
router.get('/:id/registrations', protect, [idValido], validar, listRegistrations);
router.patch(
  '/:id/registrations/:regId',
  protect,
  organizadores,
  [
    idValido,
    regIdValido,
    body('estado').isIn(['aprobada', 'rechazada', 'pendiente']).withMessage('Estado permitido: aprobada, rechazada o pendiente'),
    body('motivoRechazo').optional().isString().trim().isLength({ max: 300 }).withMessage('El motivo no puede superar 300 caracteres'),
  ],
  validar,
  reviewRegistration
);

// Calendario
router.post(
  '/:id/fixture',
  protect,
  organizadores,
  [
    idValido,
    body('escenarios').optional().isArray().withMessage('Los escenarios deben ser una lista'),
    body('horarios').optional().isArray().withMessage('Los horarios deben ser una lista'),
    body('horarios.*').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Horario con formato HH:MM'),
    body('fechaInicio').optional().isISO8601().withMessage('Fecha de inicio no válida'),
    body('fechaFin').optional().isISO8601().withMessage('Fecha de fin no válida'),
    body('dobleVuelta').optional().isBoolean().withMessage('dobleVuelta debe ser booleano').toBoolean(),
    body('tipoDias').optional().isIn(['habiles', 'todos']).withMessage('tipoDias: habiles o todos'),
  ],
  validar,
  generateFixture
);
router.post('/:id/fixture/publish', protect, organizadores, [idValido], validar, publishFixture);
router.delete('/:id/fixture', protect, organizadores, [idValido], validar, discardFixture);

module.exports = router;