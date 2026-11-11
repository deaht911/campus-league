require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');
const { obtenerReglas, puntosPartido } = require('../services/reglas');
const { calcularStandings } = require('../controllers/matchController');

const OID = '64b7f0f2f2f2f2f2f2f2f2f2';

test('Reglas: fútbol y futsal dan 3 por victoria y 1 por empate', () => {
  for (const d of ['futsal', 'futbol']) {
    assert.deepEqual(puntosPartido(d, 3, 1), { pl: 3, pv: 0, resultado: 'L' });
    assert.deepEqual(puntosPartido(d, 0, 2), { pl: 0, pv: 3, resultado: 'V' });
    assert.deepEqual(puntosPartido(d, 2, 2), { pl: 1, pv: 1, resultado: 'E' });
  }
});

test('Reglas: baloncesto da 2 por victoria, 1 por derrota y 0 si pierde por walkover', () => {
  assert.deepEqual(puntosPartido('basquetbol', 80, 70), { pl: 2, pv: 1, resultado: 'L' });
  assert.deepEqual(puntosPartido('basquetbol', 60, 71), { pl: 1, pv: 2, resultado: 'V' });
  assert.deepEqual(puntosPartido('basquetbol', 3, 0, true), { pl: 2, pv: 0, resultado: 'L' });
  assert.equal(obtenerReglas('basquetbol').empate, false);
});

test('Reglas: voleibol por sets (3-0 y 3-1 valen 3, 3-2 vale 2 y 1)', () => {
  assert.deepEqual(puntosPartido('voleibol', 3, 0), { pl: 3, pv: 0, resultado: 'L' });
  assert.deepEqual(puntosPartido('voleibol', 1, 3), { pl: 0, pv: 3, resultado: 'V' });
  assert.deepEqual(puntosPartido('voleibol', 3, 2), { pl: 2, pv: 1, resultado: 'L' });
  assert.deepEqual(puntosPartido('voleibol', 2, 3), { pl: 1, pv: 2, resultado: 'V' });
  assert.equal(obtenerReglas('voleibol').individual.activo, false);
});

test('Reglas: cada disciplina tiene sus propias etiquetas de columnas', () => {
  assert.deepEqual(obtenerReglas('futsal').etiquetas, { gf: 'GF', gc: 'GC', dg: 'DG' });
  assert.deepEqual(obtenerReglas('basquetbol').etiquetas, { gf: 'PF', gc: 'PC', dg: 'DP' });
  assert.deepEqual(obtenerReglas('voleibol').etiquetas, { gf: 'SG', gc: 'SC', dg: 'DS' });
  assert.equal(obtenerReglas('futsal').individual.titulo, 'Goleadores');
  assert.equal(obtenerReglas('basquetbol').individual.titulo, 'Anotadores');
});

const equipos = ['A', 'B', 'C'].map((n, i) => ({ _id: `e${i}`, nombre: `Equipo ${n}`, facultad: 'X' }));
const prepararTabla = (t, partidos) => {
  t.mock.method(Registration, 'find', () => ({ populate: async () => equipos.map((e) => ({ equipo: e })) }));
  t.mock.method(Match, 'find', () => ({ select: async () => partidos }));
};

test('Posiciones de voleibol: acumula puntos y sets según el resultado', async (t) => {
  prepararTabla(t, [
    { local: 'e0', visitante: 'e1', marcador: { local: 3, visitante: 2 } }, // A gana 3-2: A 2, B 1
    { local: 'e1', visitante: 'e2', marcador: { local: 3, visitante: 0 } }, // B gana 3-0: B 3, C 0
  ]);
  const tabla = await calcularStandings({ _id: OID, disciplina: 'voleibol' });
  const por = Object.fromEntries(tabla.map((f) => [f.equipo.nombre, f]));
  assert.equal(por['Equipo A'].pts, 2);
  assert.equal(por['Equipo B'].pts, 4);
  assert.equal(por['Equipo C'].pts, 0);
  assert.equal(por['Equipo B'].gf, 5);
  assert.equal(por['Equipo B'].dg, 2); // 5 sets a favor y 3 en contra
  assert.equal(tabla[0].equipo.nombre, 'Equipo B');
  assert.equal(por['Equipo B'].pe, 0);
});

test('Posiciones de baloncesto: no hay empates y suma 2 y 1 puntos', async (t) => {
  prepararTabla(t, [{ local: 'e0', visitante: 'e1', marcador: { local: 80, visitante: 75 } }]);
  const tabla = await calcularStandings({ _id: OID, disciplina: 'basquetbol' });
  const a = tabla.find((f) => f.equipo.nombre === 'Equipo A');
  const b = tabla.find((f) => f.equipo.nombre === 'Equipo B');
  assert.deepEqual([a.pts, b.pts, a.dg, b.dg], [2, 1, 5, -5]);
  assert.equal(tabla[0].posicion, 1);
});

test('GET /matches/standings: devuelve estado del torneo, reglas por disciplina y avance', async (t) => {
  const torneo = { _id: OID, nombre: 'Liga', disciplina: 'voleibol', formato: 'liga', estado: 'en_curso', calendarioPublicado: true, fechaInicio: new Date(), fechaFin: new Date() };
  t.mock.method(Tournament, 'findById', async () => torneo);
  prepararTabla(t, [{ local: 'e0', visitante: 'e1', marcador: { local: 3, visitante: 0 } }]);
  t.mock.method(Match, 'countDocuments', async (filtro) => (filtro.estado === 'finalizado' ? 1 : 15));
  const r = await request(app).get(`/api/matches/standings/${OID}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.torneo.estado, 'en_curso');
  assert.equal(r.body.torneo.disciplina, 'voleibol');
  assert.deepEqual(r.body.reglas.etiquetas, { gf: 'SG', gc: 'SC', dg: 'DS' });
  assert.equal(r.body.reglas.individual.activo, false);
  assert.deepEqual(r.body.progreso, { jugados: 1, total: 15 });
  assert.equal(r.body.standings[0].equipo.nombre, 'Equipo A');
});

test('GET /matches/standings: un calendario sin publicar no revela el total de partidos', async (t) => {
  const torneo = { _id: OID, nombre: 'Copa', disciplina: 'futbol', formato: 'liga', estado: 'inscripcion_cerrada', calendarioPublicado: false, fechaInicio: new Date(), fechaFin: new Date() };
  t.mock.method(Tournament, 'findById', async () => torneo);
  prepararTabla(t, []);
  t.mock.method(Match, 'countDocuments', async () => 0);
  const r = await request(app).get(`/api/matches/standings/${OID}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.progreso, { jugados: 0, total: 0 });
  assert.ok(r.body.standings.every((f) => f.pj === 0 && f.pts === 0));
});
