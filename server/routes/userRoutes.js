const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  listUsers,
  getUser,
  updateRole,
  updateStatus,
  updateMe,
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

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

const idValido = param('id').isMongoId().withMessage('ID de usuario no válido');

router.use(protect);

// Perfil propio (debe ir antes de '/:id')
router.put(
  '/me',
  [
    body('nombre').optional().isString().trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('facultad').optional().isString().trim().isLength({ max: 100 }).withMessage('La facultad no puede superar 100 caracteres'),
    body('codigoEstudiantil').optional().isString().trim().matches(/^[A-Za-z0-9-]{4,20}$/).withMessage('Código estudiantil no válido'),
  ],
  validar,
  updateMe
);

// Administración de usuarios
router.get('/', authorize('administrador'), listUsers);
router.get('/:id', authorize('administrador'), [idValido], validar, getUser);
router.patch('/:id/role', authorize('administrador'), [idValido], validar, updateRole);
router.patch('/:id/status', authorize('administrador'), [idValido], validar, updateStatus);

module.exports = router;