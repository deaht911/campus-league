const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  createTeam,
  listTeams,
  myTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addPlayer,
  updatePlayer,
  removePlayer,
} = require('../controllers/teamController');
const { protect, authorize } = require('../middlewares/auth');
const { DISCIPLINAS } = require('../models/Team');

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

const idValido = param('id').isMongoId().withMessage('ID de equipo no válido');
const userIdValido = param('userId').isMongoId().withMessage('ID de usuario no válido');

const camposJugador = [
  body('numeroCamiseta').optional().isInt({ min: 0, max: 99 }).withMessage('La camiseta debe estar entre 0 y 99').toInt(),
  body('posicion').optional().isString().trim().isLength({ max: 30 }).withMessage('La posición no puede superar 30 caracteres'),
];

// Consulta pública
router.get('/', listTeams);

// A partir de aquí se requiere sesión
router.get('/mine', protect, myTeams);
router.get('/:id', [idValido], validar, getTeam);

router.post(
  '/',
  protect,
  authorize('jugador', 'capitan', 'administrador'),
  [
    body('nombre').isString().trim().isLength({ min: 3, max: 60 }).withMessage('El nombre debe tener entre 3 y 60 caracteres'),
    body('disciplina').isIn(DISCIPLINAS).withMessage('Disciplina no válida. Permitidas: ' + DISCIPLINAS.join(', ')),
    body('facultad').optional().isString().trim().isLength({ max: 100 }).withMessage('La facultad no puede superar 100 caracteres'),
  ],
  validar,
  createTeam
);

router.put(
  '/:id',
  protect,
  [
    idValido,
    body('nombre').optional().isString().trim().isLength({ min: 3, max: 60 }).withMessage('El nombre debe tener entre 3 y 60 caracteres'),
    body('facultad').optional().isString().trim().isLength({ max: 100 }).withMessage('La facultad no puede superar 100 caracteres'),
  ],
  validar,
  updateTeam
);

router.delete('/:id', protect, [idValido], validar, deleteTeam);

router.post(
  '/:id/players',
  protect,
  [idValido, body('correo').isEmail().withMessage('Correo no válido'), ...camposJugador],
  validar,
  addPlayer
);
router.put('/:id/players/:userId', protect, [idValido, userIdValido, ...camposJugador], validar, updatePlayer);
router.delete('/:id/players/:userId', protect, [idValido, userIdValido], validar, removePlayer);

module.exports = router;
