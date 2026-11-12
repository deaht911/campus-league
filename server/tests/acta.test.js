require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

const id = () => String(new mongoose.Types.ObjectId());
const ADMIN = id();
const token = jwt.sign({ id: ADMIN }, process.env.JWT_SECRET, { expiresIn: '30m' });

// Consulta de Mongoose simulada: acepta populate() encadenado y se puede esperar con await
const cadena = (valor) => {
  const c = { populate: () => c, then: (ok, ko) => Promise.resolve(valor).then(ok, ko) };
  return c;
};

const escenario = (t, { disciplina = 'futsal', formato = 'liga', fase = 'liga', pendientes = 1 } = {}) => {
  const local = id();
  const visitante = id();
  const [pl1, pl2, pv1] = [id(), id(), id()];
  const torneoDoc = { _id: id(), disciplina, formato, estado: 'en_curso', calendarioPublicado: true, guardado: 0, save: async function () { this.guardado += 1; } };
  const partido = new Match({ torneo: torneoDoc._id, local, visitante, fase, jornada: 1, fecha: new Date(Date.now() - 3600000), escenario: 'Coliseo', estado: 'programado' });
  partido.save = async () => partido;
  t.mock.method(User, 'findById', async () => ({ _id: ADMIN, rol: 'administrador', activo: true }));
  t.mock.method(Match, 'findById', () => cadena(partido));
  t.mock.method(Match, 'countDocuments', async () => pendientes);
  t.mock.method(Tournament, 'findById', async () => torneoDoc);
  t.mock.method(Team, 'find', async () => [
    { _id: local, jugadores: [{ usuario: pl1 }, { usuario: pl2 }] },
    { _id: visitante, jugadores: [{ usuario: pv1 }] },
  ]);
  const enviar = (cuerpo) => request(app).put(`/api/matches/${partido._id}/result`).set('Authorization', `Bearer ${token}`).send(cuerpo);
  const est = (jugador, equipo, goles) => ({ jugador, equipo, goles });
  return { local, visitante, pl1, pl2, pv1, partido, torneoDoc, enviar, est };
};

test('Acta de futsal: el marcador se calcula solo como la suma de goles por jugador', async (t) => {
  const e = escenario(t);
  const r = await e.enviar({ estadisticas: [e.est(e.pl1, e.local, 2), e.est(e.pl2, e.local, 1), e.est(e.pv1, e.visitante, 1)] });
  assert.equal(r.status, 200);
  assert.deepEqual([e.partido.marcador.local, e.partido.marcador.visitante], [3, 1]);
  assert.equal(e.partido.estado, 'finalizado');
});

test('Acta de futsal: un marcador enviado que no coincide con la suma se rechaza', async (t) => {
  const e = escenario(t);
  const r = await e.enviar({ marcador: { local: 5, visitante: 0 }, estadisticas: [e.est(e.pl1, e.local, 2), e.est(e.pv1, e.visitante, 1)] });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /no coincide/);
});

test('Acta de futsal: sin goles registrados el partido queda 0-0', async (t) => {
  const e = escenario(t);
  const r = await e.enviar({});
  assert.equal(r.status, 200);
  assert.deepEqual([e.partido.marcador.local, e.partido.marcador.visitante], [0, 0]);
});

test('Acta de baloncesto: suma puntos y no admite empates al cerrar (sí como borrador)', async (t) => {
  const e = escenario(t, { disciplina: 'basquetbol' });
  const empate = [e.est(e.pl1, e.local, 70), e.est(e.pv1, e.visitante, 70)];
  const cierre = await e.enviar({ estadisticas: empate });
  assert.equal(cierre.status, 400);
  assert.match(cierre.body.message, /no hay empates/);
  const borrador = await e.enviar({ estadisticas: empate, borrador: true });
  assert.equal(borrador.status, 200);
  assert.equal(e.partido.estado, 'pendiente_confirmacion');
  const ok = await e.enviar({ estadisticas: [e.est(e.pl1, e.local, 72), e.est(e.pv1, e.visitante, 70)] });
  assert.equal(ok.status, 200);
  assert.deepEqual([e.partido.marcador.local, e.partido.marcador.visitante], [72, 70]);
});

test('Acta de voleibol: exige sets válidos (el ganador tiene 3 y el perdedor 0 a 2)', async (t) => {
  const e = escenario(t, { disciplina: 'voleibol' });
  assert.equal((await e.enviar({})).status, 400);
  assert.equal((await e.enviar({ marcador: { local: 3, visitante: 3 } })).status, 400);
  assert.equal((await e.enviar({ marcador: { local: 2, visitante: 1 } })).status, 400);
  const ok = await e.enviar({ marcador: { local: 3, visitante: 1 } });
  assert.equal(ok.status, 200);
  assert.deepEqual([e.partido.marcador.local, e.partido.marcador.visitante], [3, 1]);
  assert.equal(e.partido.estadisticas.length, 0);
});

test('Cerrar la final de un torneo de eliminación directa lo marca como finalizado', async (t) => {
  const e = escenario(t, { disciplina: 'basquetbol', formato: 'eliminacion', fase: 'final' });
  const r = await e.enviar({ estadisticas: [e.est(e.pl1, e.local, 80), e.est(e.pv1, e.visitante, 75)] });
  assert.equal(r.status, 200);
  assert.equal(e.torneoDoc.estado, 'finalizado');
  assert.equal(e.torneoDoc.guardado, 1);
});

test('Cerrar una semifinal no finaliza el torneo; el último partido de una liga sí', async (t) => {
  const semi = escenario(t, { disciplina: 'basquetbol', formato: 'eliminacion', fase: 'semifinal' });
  await semi.enviar({ estadisticas: [semi.est(semi.pl1, semi.local, 80), semi.est(semi.pv1, semi.visitante, 75)] });
  assert.equal(semi.torneoDoc.estado, 'en_curso');
  t.mock.restoreAll();

  const liga = escenario(t, { pendientes: 0 });
  await liga.enviar({ estadisticas: [liga.est(liga.pl1, liga.local, 1)] });
  assert.equal(liga.torneoDoc.estado, 'finalizado');
});
