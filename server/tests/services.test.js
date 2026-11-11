require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const { enviarCorreo, notificarOTP, notificarInscripcion } = require('../services/mailer');
const { generarPDF } = require('../services/reportes');

test('mailer: sin SMTP simula el envío y no lanza errores (RF-014)', async () => {
  assert.equal(await enviarCorreo({ to: 'a@uab.edu.bo', subject: 's', text: 't' }), true);
  assert.equal(await enviarCorreo({ to: '', subject: 's', text: 't' }), false);
  assert.equal(await notificarOTP({ nombre: 'Ana', correo: 'a@uab.edu.bo' }, '123456'), true);
  const r = await notificarInscripcion({
    usuario: { nombre: 'Ana', correo: 'a@uab.edu.bo' }, equipo: { nombre: 'Los Tornillos' }, torneo: { nombre: 'Copa' }, estado: 'aprobada',
  });
  assert.equal(r, true);
});

test('reportes: genera PDF válido de posiciones, calendario y resultados (RF-015)', async () => {
  const torneo = { nombre: 'Copa UAB', disciplina: 'futsal', formato: 'liga' };
  const fila = { posicion: 1, equipo: { nombre: 'A' }, pj: 1, pg: 1, pe: 0, pp: 0, gf: 3, gc: 0, dg: 3, pts: 3 };
  const partido = { jornada: 1, fecha: new Date(), local: { nombre: 'A' }, visitante: { nombre: 'B' }, escenario: 'Coliseo', estado: 'finalizado', marcador: { local: 3, visitante: 0 } };
  for (const tipo of ['posiciones', 'calendario', 'resultados']) {
    const pdf = await generarPDF({ tipo, torneo, standings: [fila], partidos: [partido], goleadores: [{ jugador: { nombre: 'X' }, equipo: { nombre: 'A' }, goles: 3 }] });
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdf.length > 1000);
  }
});
