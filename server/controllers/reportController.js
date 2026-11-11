const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const { calcularStandings, calcularGoleadores } = require('./matchController');
const { generarPDF } = require('../services/reportes');

const TIPOS = ['posiciones', 'calendario', 'resultados'];

// GET /api/reports/tournaments/:id/pdf?tipo=posiciones|calendario|resultados (RF-015, CU-12)
exports.exportTournamentPDF = async (req, res, next) => {
  try {
    const tipo = req.query.tipo || 'posiciones';
    if (!TIPOS.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de reporte no válido. Permitidos: ' + TIPOS.join(', ') });
    }

    const torneo = await Tournament.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ success: false, message: 'Torneo no encontrado' });
    }
    const esDuenio = req.user.rol === 'administrador' || String(torneo.organizador) === String(req.user._id);
    if (!esDuenio) {
      return res.status(403).json({ success: false, message: 'Solo el organizador del torneo puede exportar reportes' });
    }

    const datos = { tipo, torneo };
    if (tipo === 'posiciones') {
      datos.standings = await calcularStandings(torneo);
      datos.goleadores = await calcularGoleadores(torneo._id, 10);
    } else {
      const filtro = { torneo: torneo._id };
      if (tipo === 'resultados') filtro.estado = 'finalizado';
      datos.partidos = await Match.find(filtro)
        .sort({ fecha: 1 })
        .populate('local', 'nombre')
        .populate('visitante', 'nombre');
    }

    const pdf = await generarPDF(datos);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${tipo}-${torneo._id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};
