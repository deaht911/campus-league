const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, verifyOTP, resendOTP, login, me } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

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

const correoValido = body('correo')
  .isString().withMessage('El correo es obligatorio')
  .trim()
  .matches(/^[a-z0-9._%+-]+@uab\.edu\.bo$/i).withMessage('Debe usar un correo institucional @uab.edu.bo');

router.post(
  '/register',
  [
    body('nombre').isString().trim().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    correoValido,
    body('password').isString().isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  validar,
  register
);

router.post(
  '/verify-otp',
  [correoValido, body('codigo').isString().trim().matches(/^\d{6}$/).withMessage('El código debe tener 6 dígitos')],
  validar,
  verifyOTP
);

router.post('/resend-otp', [correoValido], validar, resendOTP);

router.post(
  '/login',
  [correoValido, body('password').isString().notEmpty().withMessage('La contraseña es obligatoria')],
  validar,
  login
);

router.get('/me', protect, me);

module.exports = router;