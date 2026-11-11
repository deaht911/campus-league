const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');
const { generarDatosDemo } = require('./demoData');

const PASSWORD = 'Campus2026!';

const run = async () => {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('El seed borra todos los datos. Use --force para ejecutarlo en producción.');
    process.exit(1);
  }

  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Tournament.deleteMany({}),
    Registration.deleteMany({}),
    Match.deleteMany({}),
  ]);

  // Un único hash para todas las cuentas de demostración (misma contraseña)
  const rondas = Math.max(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10, 10);
  const hash = await bcrypt.hash(PASSWORD, rondas);
  const datos = generarDatosDemo({ hash });

  await User.insertMany(datos.users);
  await Team.insertMany(datos.teams);
  await Tournament.insertMany(datos.tournaments);
  await Registration.insertMany(datos.registrations);
  await Match.insertMany(datos.matches);

  console.log('\nSeed completado. Contraseña de todas las cuentas:', PASSWORD);
  console.log('\nCuentas por rol:');
  const c = datos.cuentas;
  console.table([
    { rol: 'administrador', correo: c.admin.correo },
    { rol: 'organizador (futsal, voleibol, fútbol)', correo: c.organizador.correo },
    { rol: 'organizador (baloncesto, tenis de mesa)', correo: c.organizador2.correo },
    { rol: 'árbitro (tiene actas pendientes)', correo: c.arbitro.correo },
    { rol: 'capitán (Los Tornillos, futsal)', correo: c.capitan.correo },
    { rol: 'jugador', correo: c.jugador.correo },
  ]);

  console.log('\nCapitanes de los demás equipos (para probar inscripciones por disciplina):');
  console.table(datos.capitanes.filter((x) => x.correo !== c.capitan.correo).map((x) => ({ correo: x.correo, equipo: x.equipo, disciplina: x.disciplina })));

  const porTorneo = (id) => datos.matches.filter((m) => String(m.torneo) === String(id)).length;
  const equipos = (id) => datos.registrations.filter((r) => String(r.torneo) === String(id) && r.estado === 'aprobada').length;
  console.log('\nTorneos cargados:');
  console.table(
    datos.tournaments.map((t) => ({
      torneo: t.nombre,
      disciplina: t.disciplina,
      estado: t.estado,
      'equipos aprobados': equipos(t._id),
      partidos: porTorneo(t._id),
    }))
  );
  console.log(`Usuarios: ${datos.users.length} · Equipos: ${datos.teams.length} · Partidos: ${datos.matches.length}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Error en el seed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
