require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middlewares/auth');
const { errorHandler, notFound } = require('../middlewares/errorHandler');

const res = () => {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
};
const token = (payload, opts = {}) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m', ...opts });

test('authorize: permite solo los roles indicados (RBAC)', () => {
  const r1 = res();
  authorize('administrador')({ user: { rol: 'jugador' } }, r1, () => assert.fail('no debe continuar'));
  assert.equal(r1.codigo, 403);
  let sigue = false;
  authorize('administrador', 'organizador')({ user: { rol: 'organizador' } }, res(), () => { sigue = true; });
  assert.ok(sigue);
  const r2 = res();
  authorize('administrador')({}, r2, () => {});
  assert.equal(r2.codigo, 401);
});

test('protect: rechaza petición sin token, con token inválido y expirado', async () => {
  const a = res();
  await protect({ headers: {} }, a, () => {});
  assert.equal(a.codigo, 401);
  const b = res();
  await protect({ headers: { authorization: 'Bearer basura' } }, b, () => {});
  assert.equal(b.codigo, 401);
  const c = res();
  await protect({ headers: { authorization: `Bearer ${token({ id: 'x' }, { expiresIn: -10 })}` } }, c, () => {});
  assert.equal(c.codigo, 401);
  assert.match(c.cuerpo.message, /expirada/i);
});

test('protect: con token válido carga req.user; rechaza cuentas desactivadas', async (t) => {
  const req = { headers: { authorization: `Bearer ${token({ id: 'u1' })}` } };
  t.mock.method(User, 'findById', async () => ({ _id: 'u1', rol: 'jugador', activo: true }));
  let sigue = false;
  await protect(req, res(), () => { sigue = true; });
  assert.ok(sigue);
  assert.equal(req.user.rol, 'jugador');

  t.mock.method(User, 'findById', async () => ({ _id: 'u1', activo: false }));
  const r = res();
  await protect({ headers: { authorization: `Bearer ${token({ id: 'u1' })}` } }, r, () => {});
  assert.equal(r.codigo, 401);
});

test('errorHandler: traduce errores de validación, duplicados y CastError', () => {
  const v = res();
  errorHandler({ name: 'ValidationError', errors: { a: { path: 'a', message: 'mal' } } }, {}, v, () => {});
  assert.equal(v.codigo, 400);
  const d = res();
  errorHandler({ code: 11000, keyValue: { correo: 'x' } }, {}, d, () => {});
  assert.equal(d.codigo, 409);
  const c = res();
  errorHandler({ name: 'CastError', path: '_id' }, {}, c, () => {});
  assert.equal(c.codigo, 400);
  const n = res();
  notFound({ method: 'GET', originalUrl: '/x' }, n);
  assert.equal(n.codigo, 404);
});
