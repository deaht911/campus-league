require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { cifrar, descifrar, esCifrado } = require('../services/crypto');
const User = require('../models/User');

test('AES-256-GCM: cifra y descifra, y el texto cifrado no contiene el dato', () => {
  const c = cifrar('UAB-20231234');
  assert.ok(esCifrado(c));
  assert.ok(!c.includes('UAB-20231234'));
  assert.equal(descifrar(c), 'UAB-20231234');
});

test('AES-256-GCM: es determinista (permite índice único y búsqueda exacta) y no recifra', () => {
  assert.equal(cifrar('ABC-1234'), cifrar('ABC-1234'));
  assert.notEqual(cifrar('ABC-1234'), cifrar('ABC-1235'));
  assert.equal(cifrar(cifrar('ABC-1234')), cifrar('ABC-1234'));
});

test('AES-256-GCM: detecta datos alterados (etiqueta de autenticación)', () => {
  const buf = Buffer.from(cifrar('UAB-0001').slice('enc:v1:'.length), 'base64');
  buf[buf.length - 1] ^= 0xff;
  assert.throws(() => descifrar('enc:v1:' + buf.toString('base64')));
});

test('AES-256-GCM: tolera datos antiguos sin cifrar y valores vacíos', () => {
  assert.equal(descifrar('UAB-0001'), 'UAB-0001');
  assert.equal(cifrar(undefined), undefined);
  assert.equal(cifrar(''), '');
});

test('AES-256-GCM: la clave de 256 bits (32 bytes) se deriva con HKDF', () => {
  const k = crypto.hkdfSync('sha256', Buffer.alloc(32, 1), Buffer.alloc(0), 'campus-league-aes', 32);
  assert.equal(Buffer.from(k).length, 32);
});

test('User: codigoEstudiantil se guarda cifrado y se expone descifrado', () => {
  const u = new User({ nombre: 'Test User', correo: 'k@uab.edu.bo', password: '12345678', codigoEstudiantil: 'UAB-0042' });
  const guardado = u.get('codigoEstudiantil', null, { getters: false });
  assert.ok(esCifrado(guardado));
  assert.ok(!guardado.includes('UAB-0042'));
  assert.equal(u.codigoEstudiantil, 'UAB-0042');
  assert.equal(u.toJSON().codigoEstudiantil, 'UAB-0042');
});

test('User: el validador del código estudiantil opera sobre el valor en claro', async () => {
  const mal = new User({ nombre: 'Test User', correo: 'm@uab.edu.bo', password: '12345678', codigoEstudiantil: 'a' });
  await assert.rejects(() => mal.validate(), (e) => Object.keys(e.errors).includes('codigoEstudiantil'));
  const bien = new User({ nombre: 'Test User', correo: 'n@uab.edu.bo', password: '12345678', codigoEstudiantil: 'UAB-0043' });
  await bien.validate();
});
