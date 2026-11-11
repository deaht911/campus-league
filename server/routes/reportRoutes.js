const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { exportTournamentPDF } = require('../controllers/reportController');
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

router.get(
  '/tournaments/:id/pdf',
  protect,
  authorize('organizador', 'administrador'),
  [
    param('id').isMongoId().withMessage('ID de torneo no válido'),
    query('tipo').optional().isIn(['posiciones', 'calendario', 'resultados']).withMessage('Tipo de reporte no válido'),
  ],
  validar,
  exportTournamentPDF
);

module.exports = router;
