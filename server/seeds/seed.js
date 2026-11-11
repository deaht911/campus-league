const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Match = require('../models/Match');

const PASSWORD = 'Campus2026!';
const DIA_MS = 24 * 60 * 60 * 1000;

let contador = 0;
const crearUsuario = (nombre, correo, rol, facultad) =>
  User.create({
    nombre,
    correo,
    password: PASSWORD,
    rol,
    facultad,
    codigoEstudiantil: `UAB-${String(++contador).padStart(4, '0')}`,
    verificado: true,
  });

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

  // Usuarios de los 5 roles
  const admin = await crearUsuario('Administrador UAB', 'admin@uab.edu.bo', 'administrador', 'Administración');
  const organizador = await crearUsuario('Lucía Fernández', 'organizador@uab.edu.bo', 'organizador', 'Bienestar Universitario');
  const arbitro = await crearUsuario('Árbitro Central', 'arbitro@uab.edu.bo', 'arbitro', 'Bienestar Universitario');
  await crearUsuario('Árbitro Norte', 'arbitro2@uab.edu.bo', 'arbitro', 'Bienestar Universitario');
  await crearUsuario('Árbitro Sur', 'arbitro3@uab.edu.bo', 'arbitro', 'Bienestar Universitario');
  const capitan = await crearUsuario('Mateo Rivas', 'capitan@uab.edu.bo', 'capitan', 'Ingeniería');
  const jugador = await crearUsuario('Jugador Demo', 'jugador@uab.edu.bo', 'jugador', 'Ingeniería');

  // Cuatro equipos de futsal con plantilla completa (5 jugadores)
  const definiciones = [
    { nombre: 'Los Tornillos', facultad: 'Ingeniería', capitan, base: [jugador] },
    { nombre: 'Teólogos FC', facultad: 'Teología', capitan: null, base: [] },
    { nombre: 'Salud United', facultad: 'Ciencias de la Salud', capitan: null, base: [] },
    { nombre: 'Econo Stars', facultad: 'Ciencias Empresariales', capitan: null, base: [] },
  ];

  const equipos = [];
  for (let i = 0; i < definiciones.length; i++) {
    const def = definiciones[i];
    const cap = def.capitan || (await crearUsuario(`Capitán ${def.nombre}`, `capitan${i + 1}@uab.edu.bo`, 'capitan', def.facultad));

    const integrantes = [cap, ...def.base];
    let n = 1;
    while (integrantes.length < 5) {
      integrantes.push(
        await crearUsuario(`Jugador ${n} ${def.nombre}`, `jugador${i + 1}${n}@uab.edu.bo`, 'jugador', def.facultad)
      );
      n++;
    }

    const equipo = await Team.create({
      nombre: def.nombre,
      disciplina: 'futsal',
      facultad: def.facultad,
      capitan: cap._id,
      jugadores: integrantes.map((u, idx) => ({ usuario: u._id, numeroCamiseta: idx + 1 })),
    });
    equipos.push({ equipo, capitan: cap });
  }

  // Torneo con inscripciones abiertas
  const ahora = Date.now();
  const torneo = await Tournament.create({
    nombre: 'Copa UAB 2026',
    disciplina: 'futsal',
    formato: 'liga',
    fechaInicio: new Date(ahora + 10 * DIA_MS),
    fechaFin: new Date(ahora + 40 * DIA_MS),
    inscripcionInicio: new Date(ahora - DIA_MS),
    inscripcionFin: new Date(ahora + 7 * DIA_MS),
    maxEquipos: 8,
    minJugadores: 5,
    reglamento: 'Reglamento oficial de torneos internos de la UAB.',
    escenarios: ['Coliseo UAB', 'Cancha techada'],
    estado: 'inscripcion',
    organizador: organizador._id,
  });

  // 3 inscripciones aprobadas y 1 pendiente (para probar la revisión del organizador)
  for (let i = 0; i < equipos.length; i++) {
    const aprobada = i < 3;
    await Registration.create({
      torneo: torneo._id,
      equipo: equipos[i].equipo._id,
      inscritoPor: equipos[i].capitan._id,
      aceptaReglamento: true,
      estado: aprobada ? 'aprobada' : 'pendiente',
      revisadoPor: aprobada ? organizador._id : undefined,
      fechaRevision: aprobada ? new Date() : undefined,
    });
  }

  console.log('\nSeed completado. Contraseña de todas las cuentas:', PASSWORD);
  console.table([
    { rol: 'administrador', correo: admin.correo },
    { rol: 'organizador', correo: organizador.correo },
    { rol: 'arbitro', correo: arbitro.correo },
    { rol: 'capitan', correo: capitan.correo },
    { rol: 'jugador', correo: jugador.correo },
  ]);
  console.log(`Torneo: "${torneo.nombre}" (${equipos.length} equipos, 3 aprobados y 1 pendiente)`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Error en el seed:', error);
  await mongoose.disconnect();
  process.exit(1);
});