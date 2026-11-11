require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');

const id = () => new mongoose.Types.ObjectId();
const dia = (n) => new Date(Date.now() + n * 86400000);
const errores = async (doc) => {
  try {
    await doc.validate();
    return [];
  } catch (e) {
    return Object.keys(e.errors);
  }
};

test('User: acepta correo institucional y rechaza otros dominios y roles inválidos', async () => {
  assert.deepEqual(await errores(new User({ nombre: 'Test User', correo: 'a@uab.edu.bo', password: '12345678' })), []);
  const malo = await errores(new User({ nombre: 'Test User', correo: 'a@gmail.com', password: '12345678', rol: 'x' }));
  assert.ok(malo.includes('correo') && malo.includes('rol'));
});

test('User: el rol por defecto es jugador y la contraseña corta se rechaza', async () => {
  const u = new User({ nombre: 'Test User', correo: 'b@uab.edu.bo', password: '123' });
  assert.equal(u.rol, 'jugador');
  assert.ok((await errores(u)).includes('password'));
});

test('User: matchPassword compara contra el hash bcrypt (salt >= 10)', async () => {
  const bcrypt = require('bcryptjs');
  const u = new User({ nombre: 'Test User', correo: 'c@uab.edu.bo', password: await bcrypt.hash('Campus2026!', 10) });
  assert.equal(await u.matchPassword('Campus2026!'), true);
  assert.equal(await u.matchPassword('otra-clave'), false);
  assert.match(u.password, /^\$2[aby]\$10\$/);
});

test('User: el OTP se guarda hasheado, se verifica y vence', async () => {
  const u = new User({ nombre: 'Test User', correo: 'd@uab.edu.bo', password: '12345678' });
  const codigo = await u.generarOTP();
  assert.match(codigo, /^\d{6}$/);
  assert.notEqual(u.otp.codigo, codigo);
  assert.equal(await u.verificarOTP(codigo), true);
  assert.equal(await u.verificarOTP('000000'), false);
  u.otp.expira = new Date(Date.now() - 1000);
  assert.equal(await u.verificarOTP(codigo), false);
});

test('User: toJSON oculta password y otp', () => {
  const u = new User({ nombre: 'Test User', correo: 'e@uab.edu.bo', password: '12345678' }).toJSON();
  assert.equal(u.password, undefined);
  assert.equal(u.otp, undefined);
});

test('User: define índices de rendimiento y correo único', () => {
  const idx = User.schema.indexes().map(([campos]) => Object.keys(campos).join('+'));
  assert.ok(idx.includes('rol'));
  assert.ok(idx.includes('facultad+rol'));
  assert.equal(User.schema.path('correo').options.unique, true);
});

test('Team: rechaza jugadores y camisetas repetidos y disciplinas inválidas', async () => {
  const u = id();
  const e = await errores(
    new Team({ nombre: 'AB', disciplina: 'ajedrez', facultad: 'X', capitan: id(), jugadores: [{ usuario: u, numeroCamiseta: 5 }, { usuario: u, numeroCamiseta: 5 }] })
  );
  assert.ok(e.includes('nombre') && e.includes('disciplina') && e.includes('jugadores'));
  const ok = new Team({ nombre: 'Los Tornillos', disciplina: 'futsal', facultad: 'Ingeniería', capitan: id(), jugadores: [{ usuario: id() }] });
  assert.deepEqual(await errores(ok), []);
  assert.equal(ok.totalJugadoresActivos, 1);
});

test('Tournament: valida fechas coherentes y cupos', async () => {
  const base = { nombre: 'Copa UAB', disciplina: 'futsal', formato: 'liga', reglamento: 'R', organizador: id() };
  const ok = new Tournament({ ...base, fechaInicio: dia(10), fechaFin: dia(30), inscripcionInicio: dia(-1), inscripcionFin: dia(5), maxEquipos: 8 });
  assert.deepEqual(await errores(ok), []);
  assert.equal(ok.inscripcionAbierta(), true);
  const mal = await errores(new Tournament({ ...base, fechaInicio: dia(10), fechaFin: dia(1), inscripcionInicio: dia(1), inscripcionFin: dia(0), maxEquipos: 2 }));
  assert.ok(mal.includes('fechaFin') && mal.includes('inscripcionFin') && mal.includes('maxEquipos'));
});

test('Registration: exige aceptar el reglamento', async () => {
  const base = { torneo: id(), equipo: id(), inscritoPor: id() };
  assert.deepEqual(await errores(new Registration({ ...base, aceptaReglamento: true })), []);
  assert.deepEqual(await errores(new Registration({ ...base, aceptaReglamento: false })), ['aceptaReglamento']);
  const unico = Registration.schema.indexes().find(([c]) => c.torneo && c.equipo);
  assert.equal(unico[1].unique, true);
});

test('Match: equipos distintos, marcador no negativo y coherencia de goles', async () => {
  const a = id();
  const b = id();
  const mal = await errores(new Match({ torneo: id(), local: a, visitante: a, estado: 'x', marcador: { local: -1 } }));
  assert.ok(mal.includes('visitante') && mal.includes('estado') && mal.includes('marcador.local'));
  const m = new Match({
    torneo: id(), local: a, visitante: b, fecha: new Date(), escenario: 'Coliseo', marcador: { local: 2, visitante: 1 },
    estadisticas: [{ jugador: id(), equipo: a, goles: 2 }, { jugador: id(), equipo: b, goles: 1 }],
  });
  assert.equal(m.estadisticasCoinciden(), true);
  m.marcador.local = 3;
  assert.equal(m.estadisticasCoinciden(), false);
});
