require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');

const OID = '64b7f0f2f2f2f2f2f2f2f2f2';
const token = (id = OID) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30m' });
const comoUsuario = (t, rol) =>
  t.mock.method(User, 'findById', async () => ({ _id: OID, nombre: 'Test', rol, activo: true }));

test('GET /api/health responde ok', async () => {
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('Swagger: /api-docs.json sirve OpenAPI 3 con todos los módulos', async () => {
  const r = await request(app).get('/api-docs.json');
  assert.equal(r.status, 200);
  assert.match(r.body.openapi, /^3\./);
  for (const ruta of ['/auth/login', '/teams', '/tournaments', '/matches', '/users', '/auth/forgot-password', '/reports/tournaments/{id}/pdf']) {
    assert.ok(r.body.paths[ruta], `falta ${ruta} en Swagger`);
  }
  assert.ok((await request(app).get('/api-docs/')).status < 400);
});

test('Ruta inexistente devuelve 404 JSON', async () => {
  const r = await request(app).get('/api/nada');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test('Auth: registro exige correo institucional y contraseña de 8+ (400)', async () => {
  const r = await request(app).post('/api/auth/register').send({ nombre: 'Ana Perez', correo: 'ana@gmail.com', password: '123' });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.length >= 2);
});

test('Auth: login con credenciales inexistentes devuelve 401', async (t) => {
  t.mock.method(User, 'findOne', () => ({ select: async () => null }));
  const r = await request(app).post('/api/auth/login').send({ correo: 'x@uab.edu.bo', password: 'Campus2026!' });
  assert.equal(r.status, 401);
});

test('Auth: login exitoso devuelve JWT firmado con id y rol', async (t) => {
  const usuario = { _id: OID, rol: 'capitan', activo: true, verificado: true, matchPassword: async () => true, toJSON() { return { _id: OID }; } };
  t.mock.method(User, 'findOne', () => ({ select: async () => usuario }));
  const r = await request(app).post('/api/auth/login').send({ correo: 'x@uab.edu.bo', password: 'Campus2026!' });
  assert.equal(r.status, 200);
  const dec = jwt.verify(r.body.token, process.env.JWT_SECRET);
  assert.equal(dec.rol, 'capitan');
  assert.ok(dec.exp - dec.iat === 1800, 'el token debe expirar a los 30 minutos');
});

test('Auth: login de cuenta sin verificar devuelve 403', async (t) => {
  const usuario = { _id: OID, activo: true, verificado: false, matchPassword: async () => true };
  t.mock.method(User, 'findOne', () => ({ select: async () => usuario }));
  const r = await request(app).post('/api/auth/login').send({ correo: 'x@uab.edu.bo', password: 'Campus2026!' });
  assert.equal(r.status, 403);
});

test('Auth: /me exige token (401) y responde con sesión válida (200)', async (t) => {
  assert.equal((await request(app).get('/api/auth/me')).status, 401);
  comoUsuario(t, 'jugador');
  const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token()}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.user.rol, 'jugador');
});

test('RF-002: forgot-password responde igual exista o no el correo', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const r = await request(app).post('/api/auth/forgot-password').send({ correo: 'nadie@uab.edu.bo' });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(r.body.otpDesarrollo, undefined);
});

test('RF-002: reset-password con código inválido devuelve 400 y valida la contraseña', async (t) => {
  t.mock.method(User, 'findOne', () => ({ select: async () => null }));
  const r = await request(app).post('/api/auth/reset-password').send({ correo: 'x@uab.edu.bo', codigo: '123456', password: 'NuevaClave1' });
  assert.equal(r.status, 400);
  const corta = await request(app).post('/api/auth/reset-password').send({ correo: 'x@uab.edu.bo', codigo: '123456', password: '1' });
  assert.equal(corta.status, 400);
});

test('RF-002: reset-password con OTP válido cambia la contraseña (200)', async (t) => {
  let guardado = false;
  const usuario = { activo: true, verificarOTP: async () => true, save: async () => { guardado = true; } };
  t.mock.method(User, 'findOne', () => ({ select: async () => usuario }));
  const r = await request(app).post('/api/auth/reset-password').send({ correo: 'x@uab.edu.bo', codigo: '123456', password: 'NuevaClave1' });
  assert.equal(r.status, 200);
  assert.ok(guardado);
  assert.equal(usuario.password, 'NuevaClave1');
  assert.equal(usuario.otp, undefined);
});

test('RBAC: /users exige sesión (401) y rol administrador (403)', async (t) => {
  assert.equal((await request(app).get('/api/users')).status, 401);
  comoUsuario(t, 'jugador');
  const r = await request(app).get('/api/users').set('Authorization', `Bearer ${token()}`);
  assert.equal(r.status, 403);
});

test('RBAC: crear torneo está vedado a un capitán (403)', async (t) => {
  comoUsuario(t, 'capitan');
  const r = await request(app).post('/api/tournaments').set('Authorization', `Bearer ${token()}`).send({});
  assert.equal(r.status, 403);
});

test('RBAC: registrar resultado exige árbitro o administrador (403)', async (t) => {
  comoUsuario(t, 'organizador');
  const r = await request(app).put(`/api/matches/${OID}/result`).set('Authorization', `Bearer ${token()}`).send({});
  assert.equal(r.status, 403);
});

test('Validación: IDs mal formados devuelven 400', async () => {
  assert.equal((await request(app).get('/api/teams/no-es-id')).status, 400);
  assert.equal((await request(app).get('/api/tournaments/xyz')).status, 400);
});

test('RF-015: exportar PDF exige organizador/admin y devuelve application/pdf', async (t) => {
  assert.equal((await request(app).get(`/api/reports/tournaments/${OID}/pdf`)).status, 401);

  comoUsuario(t, 'jugador');
  assert.equal((await request(app).get(`/api/reports/tournaments/${OID}/pdf`).set('Authorization', `Bearer ${token()}`)).status, 403);

  t.mock.restoreAll();
  comoUsuario(t, 'organizador');
  const torneo = { _id: OID, nombre: 'Copa UAB', disciplina: 'futsal', formato: 'liga', organizador: OID };
  t.mock.method(Tournament, 'findById', async () => torneo);
  t.mock.method(Registration, 'find', () => ({ populate: async () => [] }));
  const cadena = { sort: () => cadena, populate: () => cadena, select: async () => [], then: (ok) => ok([]) };
  t.mock.method(Match, 'find', () => cadena);
  t.mock.method(Match, 'aggregate', async () => []);

  const r = await request(app).get(`/api/reports/tournaments/${OID}/pdf?tipo=posiciones`).set('Authorization', `Bearer ${token()}`).buffer().parse((res, cb) => {
    const partes = [];
    res.on('data', (c) => partes.push(c));
    res.on('end', () => cb(null, Buffer.concat(partes)));
  });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /application\/pdf/);
  assert.equal(r.body.subarray(0, 4).toString(), '%PDF');

  const mal = await request(app).get(`/api/reports/tournaments/${OID}/pdf?tipo=otro`).set('Authorization', `Bearer ${token()}`);
  assert.equal(mal.status, 400);
});
