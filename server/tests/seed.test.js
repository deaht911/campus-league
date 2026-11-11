require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');
const { cifrar } = require('../services/crypto');
const { generarDatosDemo } = require('../seeds/demoData');

const AHORA = Date.parse('2026-11-11T15:00:00');
const HASH = `$2b$10$${'x'.repeat(53)}`;
const d = generarDatosDemo({ hash: HASH, ahora: AHORA });
const torneo = (nombre) => d.tournaments.find((t) => t.nombre.includes(nombre));
const partidosDe = (t) => d.matches.filter((m) => String(m.torneo) === String(t._id));
const inscripcionesDe = (t) => d.registrations.filter((r) => String(r.torneo) === String(t._id));
const sinDuplicados = (lista) => new Set(lista).size === lista.length;

test('Seed: cantidades y estados de los torneos de demostración', () => {
  assert.equal(d.tournaments.length, 7);
  assert.equal(d.teams.length, 28);
  assert.ok(d.users.length > 150);
  assert.ok(d.matches.length > 60);
  const estados = new Set(d.tournaments.map((t) => t.estado));
  for (const e of ['inscripcion', 'inscripcion_cerrada', 'en_curso', 'finalizado', 'cancelado']) assert.ok(estados.has(e), `falta un torneo ${e}`);
  const disciplinas = new Set(d.tournaments.map((t) => t.disciplina));
  for (const x of ['futsal', 'basquetbol', 'voleibol', 'futbol', 'otra']) assert.ok(disciplinas.has(x), `falta la disciplina ${x}`);
});

test('Seed: todos los documentos cumplen los validadores de Mongoose', async () => {
  const colecciones = [[User, d.users], [Team, d.teams], [Tournament, d.tournaments], [Registration, d.registrations], [Match, d.matches]];
  for (const [Modelo, docs] of colecciones) {
    for (const doc of docs) await new Modelo(doc).validate();
  }
});

test('Seed: respeta los índices únicos de la base de datos', () => {
  assert.ok(sinDuplicados(d.users.map((u) => u.correo)), 'correos repetidos');
  assert.ok(sinDuplicados(d.users.map((u) => cifrar(u.codigoEstudiantil))), 'códigos repetidos');
  assert.ok(sinDuplicados(d.teams.map((t) => `${t.nombre}|${t.disciplina}`)), 'equipos repetidos');
  assert.ok(sinDuplicados(d.tournaments.map((t) => `${t.nombre}|${t.disciplina}`)), 'torneos repetidos');
  assert.ok(sinDuplicados(d.registrations.map((r) => `${r.torneo}|${r.equipo}`)), 'inscripciones repetidas');
  assert.ok(sinDuplicados(d.matches.map((m) => `${m.torneo}|${m.fecha.toISOString()}|${m.escenario}`)), 'partidos con mismo escenario y hora');
});

test('Seed: ningún jugador está en dos equipos de la misma disciplina', () => {
  const vistos = new Set();
  for (const t of d.teams) {
    for (const j of t.jugadores) {
      const clave = `${j.usuario}|${t.disciplina}`;
      assert.ok(!vistos.has(clave), 'jugador repetido en la disciplina');
      vistos.add(clave);
    }
  }
});

test('Seed: los equipos aprobados cumplen disciplina y plantilla mínima del torneo', () => {
  for (const t of d.tournaments) {
    for (const r of inscripcionesDe(t).filter((x) => x.estado === 'aprobada')) {
      const e = d.teams.find((x) => String(x._id) === String(r.equipo));
      assert.equal(e.disciplina, t.disciplina);
      assert.ok(e.jugadores.length >= t.minJugadores, `${e.nombre} no alcanza el mínimo de ${t.nombre}`);
    }
  }
});

test('Seed: Copa UAB 2026 conserva 3 inscripciones aprobadas, 1 pendiente y sin partidos', () => {
  const t = torneo('Copa UAB');
  const est = inscripcionesDe(t).map((r) => r.estado).sort();
  assert.deepEqual(est, ['aprobada', 'aprobada', 'aprobada', 'pendiente']);
  assert.equal(partidosDe(t).length, 0);
  assert.equal(t.estado, 'inscripcion');
});

test('Seed: liga de futsal finalizada tiene 28 partidos cerrados con estadísticas coherentes', () => {
  const t = torneo('Liga Universitaria de Futsal');
  const ps = partidosDe(t);
  assert.equal(t.estado, 'finalizado');
  assert.equal(ps.length, 28);
  for (const p of ps) {
    assert.equal(p.estado, 'finalizado');
    assert.ok(p.actaCerradaEn);
    assert.equal(new Match(p).estadisticasCoinciden(), true, 'los goles individuales no suman el marcador');
  }
  assert.ok(ps.some((p) => p.marcador.local === p.marcador.visitante), 'se esperan empates en una liga');
});

test('Seed: baloncesto en eliminación directa tiene cuartos, semifinales, final y tercer puesto sin empates', () => {
  const ps = partidosDe(torneo('Intercarreras'));
  const por = (fase) => ps.filter((p) => p.fase === fase);
  assert.equal(por('cuartos').length, 4);
  assert.equal(por('semifinal').length, 2);
  assert.equal(por('final').length, 1);
  assert.equal(por('tercer_puesto').length, 1);
  for (const p of ps) {
    assert.notEqual(p.marcador.local, p.marcador.visitante);
    assert.equal(new Match(p).estadisticasCoinciden(), true);
  }
  // el campeón llega a la final y gana
  const final = por('final')[0];
  const ganadores = por('semifinal').map((p) => String(p.marcador.local > p.marcador.visitante ? p.local : p.visitante));
  assert.ok(ganadores.includes(String(final.local)) && ganadores.includes(String(final.visitante)));
});

test('Seed: liga de voleibol en curso mezcla resultados, actas pendientes y partidos futuros', () => {
  const t = torneo('Voleibol');
  const ps = partidosDe(t);
  assert.equal(t.estado, 'en_curso');
  assert.equal(ps.length, 15);
  assert.equal(ps.filter((p) => p.estado === 'finalizado').length, 6);
  assert.equal(ps.filter((p) => p.estado === 'pendiente_confirmacion').length, 1);
  const pasadosSinActa = ps.filter((p) => p.estado === 'programado' && p.fecha.getTime() < AHORA);
  assert.equal(pasadosSinActa.length, 2);
  const arbitroDemo = d.cuentas.arbitro._id;
  assert.ok(pasadosSinActa.every((p) => String(p.arbitro) === String(arbitroDemo)), 'el árbitro de demostración debe poder registrar actas');
  assert.ok(ps.filter((p) => p.fecha.getTime() > AHORA).length >= 6);
  for (const p of ps.filter((x) => x.estado === 'finalizado')) {
    assert.ok([p.marcador.local, p.marcador.visitante].includes(3), 'un equipo gana 3 sets');
  }
});

test('Seed: copa de fútbol cerrada tiene el calendario en borrador (sin publicar)', () => {
  const t = torneo('Fútbol 11');
  assert.equal(t.estado, 'inscripcion_cerrada');
  assert.equal(t.calendarioPublicado, false);
  const ps = partidosDe(t);
  assert.equal(ps.length, 15);
  assert.ok(ps.every((p) => p.estado === 'programado' && p.fecha.getTime() > AHORA));
});

test('Seed: Copa Baloncesto 2027 demuestra la lista de espera', () => {
  const t = torneo('Baloncesto 2027');
  const est = inscripcionesDe(t).map((r) => r.estado).sort();
  assert.deepEqual(est, ['aprobada', 'aprobada', 'lista_espera', 'lista_espera', 'pendiente', 'pendiente']);
  assert.equal(t.maxEquipos, 4);
});

test('Seed: ningún árbitro tiene dos partidos solapados (ventana de 90 minutos)', () => {
  const porArbitro = {};
  for (const p of d.matches.filter((m) => m.arbitro)) (porArbitro[p.arbitro] = porArbitro[p.arbitro] || []).push(p.fecha.getTime());
  for (const tiempos of Object.values(porArbitro)) {
    tiempos.sort((a, b) => a - b);
    for (let i = 1; i < tiempos.length; i++) assert.ok(tiempos[i] - tiempos[i - 1] >= 90 * 60 * 1000, 'árbitro solapado');
  }
});

test('Seed: es determinista (mismos resultados con la misma semilla)', () => {
  const otro = generarDatosDemo({ hash: HASH, ahora: AHORA });
  const marcadores = (x) => x.matches.map((m) => `${m.marcador.local}-${m.marcador.visitante}`).join(',');
  assert.equal(marcadores(d), marcadores(otro));
});
