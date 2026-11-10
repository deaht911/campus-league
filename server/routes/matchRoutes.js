const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const {
  listMatches,
  myMatches,
  getMatch,
  standings,
  scorers,
  playerStats,
  assignReferee,
  rescheduleMatch,
  reopenMatch,
  registerResult,
} = require('../controllers/matchController');
const { protect, optionalAuth, authorize } = require('../middlewares/auth');
const { ESTADOS_PARTIDO, FASES, TIPOS_TARJETA } = require('../models/Match');

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

const idValido = param('id').isMongoId().withMessage('ID de partido no válido');
const torneoIdValido = param('torneoId').isMongoId().withMessage('ID de torneo no válido');
const organizadores = authorize('organizador', 'administrador');

// Consulta pública (el visitante no necesita cuenta)
router.get(
  '/',
  optionalAuth,
  [
    query('torneo').optional().isMongoId().withMessage('ID de torneo no válido'),
    query('equipo').optional().isMongoId().withMessage('ID de equipo no válido'),
    query('estado').optional().isIn(ESTADOS_PARTIDO).withMessage('Estado no válido'),
    query('fase').optional().isIn(FASES).withMessage('Fase no válida'),
    query('jornada').optional().isInt({ min: 1 }).withMessage('Jornada no válida'),
    query('desde').optional().isISO8601().withMessage('Fecha desde no válida'),
    query('hasta').optional().isISO8601().withMessage('Fecha hasta no válida'),
  ],
  validar,
  listMatches
);
router.get('/mine', protect, authorize('arbitro', 'administrador'), myMatches);
router.get('/standings/:torneoId', [torneoIdValido], validar, standings);
router.get('/scorers/:torneoId', [torneoIdValido], validar, scorers);
router.get(
  '/players/:userId/stats',
  [
    param('userId').isMongoId().withMessage('ID de usuario no válido'),
    query('torneo').optional().isMongoId().withMessage('ID de torneo no válido'),
  ],
  validar,
  playerStats
);
router.get('/:id', optionalAuth, [idValido], validar, getMatch);

// Gestión del organizador
router.patch(
  '/:id/referee',
  protect,
  organizadores,
  [idValido, body('arbitro').isMongoId().withMessage('ID de árbitro no válido')],
  validar,
  assignReferee
);
router.patch(
  '/:id/reschedule',
  protect,
  organizadores,
  [
    idValido,
    body('fecha').optional().isISO8601().withMessage('Fecha no válida'),
    body('escenario').optional().isString().trim().isLength({ min: 1, max: 80 }).withMessage('El escenario debe tener entre 1 y 80 caracteres'),
    body().custom((_, { req }) => req.body.fecha || req.body.escenario).withMessage('Indique la nueva fecha o el escenario'),
  ],
  validar,
  rescheduleMatch
);
router.patch('/:id/reopen', protect, organizadores, [idValido], validar, reopenMatch);

// Acta digital (árbitro asignado o administrador)
router.put(
  '/:id/result',
  protect,
  authorize('arbitro', 'administrador'),
  [
    idValido,
    body('walkover').optional().isBoolean().withMessage('walkover debe ser booleano').toBoolean(),
    body('borrador').optional().isBoolean().withMessage('borrador debe ser booleano').toBoolean(),
    body('ganadorWalkover').optional().isMongoId().withMessage('ID de equipo no válido'),
    body('motivoWalkover').optional().isString().trim().isLength({ max: 300 }).withMessage('El motivo no puede superar 300 caracteres'),
    body('marcador.local').optional().isInt({ min: 0 }).withMessage('Marcador local no válido').toInt(),
    body('marcador.visitante').optional().isInt({ min: 0 }).withMessage('Marcador visitante no válido').toInt(),
    body('estadisticas').optional().isArray({ max: 60 }).withMessage('Las estadísticas deben ser una lista'),
    body('estadisticas.*.jugador').isMongoId().withMessage('ID de jugador no válido'),
    body('estadisticas.*.equipo').isMongoId().withMessage('ID de equipo no válido'),
    body('estadisticas.*.goles').optional().isInt({ min: 0 }).withMessage('Goles no válidos').toInt(),
    body('estadisticas.*.faltas').optional().isInt({ min: 0 }).withMessage('Faltas no válidas').toInt(),
    body('estadisticas.*.tarjetas').optional().isArray().withMessage('Las tarjetas deben ser una lista'),
    body('estadisticas.*.tarjetas.*').isIn(TIPOS_TARJETA).withMessage('Tarjeta no válida: ' + TIPOS_TARJETA.join(', ')),
    body('estadisticas.*.destacado').optional().isBoolean().withMessage('destacado debe ser booleano').toBoolean(),
  ],
  validar,
  registerResult
);

module.exports = router;