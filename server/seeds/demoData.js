const mongoose = require('mongoose');

// Generador de datos de demostración (sin acceso a la base de datos).
// Devuelve documentos listos para insertar con insertMany. Es determinista: la misma
// "semilla" produce siempre los mismos equipos, partidos y resultados.
const DIA = 24 * 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();

const mulberry32 = (semilla) => () => {
  let t = (semilla += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const slug = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const NOMBRES = ['Carlos', 'Luis', 'Diego', 'Andrés', 'Jorge', 'Mateo', 'Sebastián', 'Daniel', 'Gabriel', 'Fernando', 'Rodrigo', 'Pablo', 'Marco', 'Álvaro', 'Iván', 'Sergio', 'Hugo', 'Bruno', 'Nicolás', 'Joaquín', 'Valeria', 'Camila', 'Daniela', 'Fernanda', 'Paola'];
const APELLIDOS = ['Mamani', 'Quispe', 'Flores', 'Rojas', 'Vargas', 'Condori', 'Choque', 'Gutiérrez', 'Mendoza', 'Rivera', 'Torrez', 'Alvarado', 'Suárez', 'Zambrana', 'Peredo', 'Villarroel', 'Montaño', 'Arce', 'Camacho', 'Salvatierra'];

const POSICIONES = {
  futsal: ['Pivot', 'Ala', 'Ala', 'Cierre', 'Arquero', 'Ala'],
  futbol: ['Delantero', 'Volante', 'Volante', 'Defensa', 'Defensa', 'Defensa', 'Delantero', 'Arquero'],
  basquetbol: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot', 'Alero'],
  voleibol: ['Armador', 'Opuesto', 'Central', 'Central', 'Punta', 'Líbero', 'Punta'],
};

const inicioDia = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
};
const sumarDias = (fecha, n) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
};
const aHora = (fecha, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(fecha);
  d.setHours(h, m, 0, 0);
  return d;
};

// Todos contra todos (algoritmo del círculo)
const generarLiga = (ids) => {
  const lista = [...ids];
  if (lista.length % 2 !== 0) lista.push(null);
  const n = lista.length;
  const partidos = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a && b) {
        const invertir = (r + i) % 2 === 1;
        partidos.push({ jornada: r + 1, local: invertir ? b : a, visitante: invertir ? a : b });
      }
    }
    lista.splice(1, 0, lista.pop());
  }
  return partidos;
};

const generarDatosDemo = ({ hash, ahora = Date.now(), semilla = 2026 } = {}) => {
  if (!hash) throw new Error('Se requiere el hash de la contraseña de demostración');
  const rand = mulberry32(semilla);
  const gauss = () => (rand() + rand() + rand() - 1.5) * 2;
  const poisson = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rand();
    } while (p > L);
    return k - 1;
  };

  // ---------- Usuarios ----------
  const users = [];
  let codigo = 0;
  let correlativo = 0;
  const addUser = ({ nombre, correo, rol, facultad }) => {
    const u = {
      _id: oid(),
      nombre,
      correo,
      password: hash,
      rol,
      facultad,
      codigoEstudiantil: `UAB-${String(++codigo).padStart(4, '0')}`,
      verificado: true,
      activo: true,
      estudianteActivo: true,
    };
    users.push(u);
    return u;
  };

  const admin = addUser({ nombre: 'Administrador UAB', correo: 'admin@uab.edu.bo', rol: 'administrador', facultad: 'Administración' });
  const org1 = addUser({ nombre: 'Lucía Fernández', correo: 'organizador@uab.edu.bo', rol: 'organizador', facultad: 'Bienestar Universitario' });
  const org2 = addUser({ nombre: 'Marcelo Quispe', correo: 'organizador2@uab.edu.bo', rol: 'organizador', facultad: 'Bienestar Universitario' });
  const arbitros = [
    addUser({ nombre: 'Árbitro Central', correo: 'arbitro@uab.edu.bo', rol: 'arbitro', facultad: 'Bienestar Universitario' }),
    addUser({ nombre: 'Árbitro Norte', correo: 'arbitro2@uab.edu.bo', rol: 'arbitro', facultad: 'Bienestar Universitario' }),
    addUser({ nombre: 'Árbitro Sur', correo: 'arbitro3@uab.edu.bo', rol: 'arbitro', facultad: 'Bienestar Universitario' }),
  ];
  const capitanDemo = addUser({ nombre: 'Mateo Rivas', correo: 'capitan@uab.edu.bo', rol: 'capitan', facultad: 'Ingeniería' });
  const jugadorDemo = addUser({ nombre: 'Jugador Demo', correo: 'jugador@uab.edu.bo', rol: 'jugador', facultad: 'Ingeniería' });

  const nombreAleatorio = () => {
    const i = ++correlativo;
    const nombre = NOMBRES[(i * 7) % NOMBRES.length];
    const a1 = APELLIDOS[(i * 3) % APELLIDOS.length];
    const a2 = APELLIDOS[(i * 11 + 5) % APELLIDOS.length];
    return { nombre: `${nombre} ${a1} ${a2}`, correo: `${slug(nombre)}.${slug(a1)}${i}@uab.edu.bo` };
  };

  // ---------- Equipos ----------
  const teams = [];
  const capitanes = [];
  const plantilla = {}; // equipoId -> [usuarioId]
  const fuerza = {}; // equipoId -> fuerza simulada
  let numCapitan = 4; // capitan2@ a capitan4@ los usan los 3 equipos originales de futsal

  const registrarEquipo = ({ nombre, disciplina, facultad, capitan, integrantes }) => {
    const equipo = {
      _id: oid(),
      nombre,
      disciplina,
      facultad,
      capitan: capitan._id,
      jugadores: integrantes.map((u, idx) => ({
        usuario: u._id,
        numeroCamiseta: idx + 1,
        posicion: POSICIONES[disciplina] ? POSICIONES[disciplina][idx % POSICIONES[disciplina].length] : undefined,
        activo: true,
      })),
      activo: true,
    };
    teams.push(equipo);
    plantilla[equipo._id] = integrantes.map((u) => u._id);
    fuerza[equipo._id] = 0.7 + rand() * 0.9;
    capitanes.push({ correo: capitan.correo, capitan: capitan.nombre, equipo: nombre, disciplina });
    return equipo;
  };

  // Los 4 equipos originales de futsal (plantilla de 5, como antes)
  const originales = [
    { nombre: 'Los Tornillos', facultad: 'Ingeniería' },
    { nombre: 'Teólogos FC', facultad: 'Teología' },
    { nombre: 'Salud United', facultad: 'Ciencias de la Salud' },
    { nombre: 'Econo Stars', facultad: 'Ciencias Empresariales' },
  ];
  const futsalOriginales = originales.map((def, i) => {
    const cap = i === 0 ? capitanDemo : addUser({ nombre: `Capitán ${def.nombre}`, correo: `capitan${i + 1}@uab.edu.bo`, rol: 'capitan', facultad: def.facultad });
    const integrantes = [cap];
    if (i === 0) integrantes.push(jugadorDemo);
    let n = 1;
    while (integrantes.length < 5) {
      integrantes.push(addUser({ nombre: `Jugador ${n} ${def.nombre}`, correo: `jugador${i + 1}${n}@uab.edu.bo`, rol: 'jugador', facultad: def.facultad }));
      n++;
    }
    return registrarEquipo({ nombre: def.nombre, disciplina: 'futsal', facultad: def.facultad, capitan: cap, integrantes });
  });

  // Equipos nuevos de demostración con jugadores de nombres realistas
  const crearEquipoDemo = (nombre, disciplina, facultad, tamano) => {
    numCapitan += 1;
    const c = nombreAleatorio();
    const cap = addUser({ nombre: c.nombre, correo: `capitan${numCapitan}@uab.edu.bo`, rol: 'capitan', facultad });
    const integrantes = [cap];
    while (integrantes.length < tamano) {
      const j = nombreAleatorio();
      integrantes.push(addUser({ nombre: j.nombre, correo: j.correo, rol: 'jugador', facultad }));
    }
    return registrarEquipo({ nombre, disciplina, facultad, capitan: cap, integrantes });
  };

  const futsalNuevos = [
    ['Leones Jurídicos', 'Ciencias Jurídicas'],
    ['Humanistas FC', 'Humanidades'],
    ['Médicos Unidos', 'Ciencias de la Salud'],
    ['Ingeniería Norte', 'Ingeniería'],
  ].map(([n, f]) => crearEquipoDemo(n, 'futsal', f, 6));
  const futsal = [...futsalOriginales, ...futsalNuevos];

  const basquet = [
    ['Halcones de Ingeniería', 'Ingeniería'],
    ['Titanes de Salud', 'Ciencias de la Salud'],
    ['Dragones de Humanidades', 'Humanidades'],
    ['Águilas Empresariales', 'Ciencias Empresariales'],
    ['Panteras Jurídicas', 'Ciencias Jurídicas'],
    ['Cóndores de Teología', 'Teología'],
    ['Lobos del Norte', 'Ingeniería'],
    ['Toros de Medicina', 'Ciencias de la Salud'],
  ].map(([n, f]) => crearEquipoDemo(n, 'basquetbol', f, 6));

  const voley = [
    ['Rayos de Ingeniería', 'Ingeniería'],
    ['Fénix de Salud', 'Ciencias de la Salud'],
    ['Gaviotas de Humanidades', 'Humanidades'],
    ['Estrellas Empresariales', 'Ciencias Empresariales'],
    ['Tigres Jurídicos', 'Ciencias Jurídicas'],
    ['Pioneros de Teología', 'Teología'],
  ].map(([n, f]) => crearEquipoDemo(n, 'voleibol', f, 7));

  const futbol = [
    ['Real Ingeniería', 'Ingeniería'],
    ['Atlético Salud', 'Ciencias de la Salud'],
    ['Deportivo Humanidades', 'Humanidades'],
    ['Unión Empresarial', 'Ciencias Empresariales'],
    ['Club Jurídico', 'Ciencias Jurídicas'],
    ['Teología United', 'Teología'],
  ].map(([n, f]) => crearEquipoDemo(n, 'futbol', f, 8));

  // ---------- Torneos ----------
  const tournaments = [];
  const registrations = [];
  const matches = [];
  const hoy = inicioDia(ahora);

  const crearTorneo = (datos) => {
    const t = {
      _id: oid(),
      minJugadores: 5,
      escenarios: ['Coliseo UAB', 'Cancha techada'],
      estado: 'inscripcion',
      calendarioPublicado: false,
      ...datos,
    };
    tournaments.push(t);
    return t;
  };

  const inscribir = (torneo, equipo, estado, organizador) => {
    const capitan = users.find((u) => String(u._id) === String(equipo.capitan));
    const revisada = ['aprobada', 'rechazada'].includes(estado);
    registrations.push({
      _id: oid(),
      torneo: torneo._id,
      equipo: equipo._id,
      inscritoPor: capitan._id,
      aceptaReglamento: true,
      estado,
      revisadoPor: revisada ? organizador._id : undefined,
      fechaRevision: revisada ? new Date(ahora - 5 * DIA) : undefined,
    });
  };

  // --- Simulación de resultados ---
  const pesos = (n) => Array.from({ length: n }, (_, i) => Math.max(1, 6 - i));
  const elegir = (n) => {
    const w = pesos(n);
    let r = rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      r -= w[i];
      if (r <= 0) return i;
    }
    return 0;
  };

  const estadisticasEquipo = (disciplina, equipoId, total) => {
    if (disciplina === 'voleibol') return [];
    const jugadores = plantilla[equipoId];
    const acumulado = jugadores.map(() => ({ goles: 0, faltas: 0, tarjetas: [] }));
    if (disciplina === 'basquetbol') {
      let restante = total;
      while (restante > 0) {
        const tiro = restante >= 3 && rand() < 0.35 ? 3 : restante >= 2 ? 2 : 1;
        acumulado[elegir(jugadores.length)].goles += tiro;
        restante -= tiro;
      }
    } else {
      for (let g = 0; g < total; g++) acumulado[elegir(jugadores.length)].goles += 1;
    }
    const maxFaltas = disciplina === 'basquetbol' ? 5 : 3;
    acumulado.forEach((a) => {
      a.faltas = Math.floor(rand() * maxFaltas);
      if (disciplina !== 'basquetbol') {
        if (rand() < 0.08) a.tarjetas.push('amarilla');
        if (rand() < 0.01) a.tarjetas.push('roja');
      }
    });
    const maximo = Math.max(...acumulado.map((a) => a.goles));
    const destacado = maximo > 0 ? acumulado.findIndex((a) => a.goles === maximo) : -1;
    return acumulado
      .map((a, i) => ({
        jugador: jugadores[i],
        equipo: equipoId,
        goles: a.goles,
        faltas: a.faltas,
        tarjetas: a.tarjetas,
        destacado: i === destacado,
      }))
      .filter((e) => e.goles > 0 || e.faltas > 0 || e.tarjetas.length > 0 || e.destacado);
  };

  const simular = (disciplina, local, visitante, sinEmpate) => {
    const fL = fuerza[local];
    const fV = fuerza[visitante];
    if (disciplina === 'voleibol') {
      const pL = (fL * 1.05) / (fL * 1.05 + fV);
      const perdidos = Math.floor(rand() * 3);
      return rand() < pL ? { local: 3, visitante: perdidos } : { local: perdidos, visitante: 3 };
    }
    if (disciplina === 'basquetbol') {
      const dif = (fL - fV) * 14 + 2;
      let pl = Math.round(72 + dif / 2 + gauss() * 7);
      let pv = Math.round(72 - dif / 2 + gauss() * 7);
      if (pl === pv) pl += 1;
      return { local: Math.max(50, pl), visitante: Math.max(50, pv) };
    }
    const lam = disciplina === 'futbol' ? 1.3 : 2.4;
    const razon = Math.sqrt(fL / fV);
    let gl = Math.min(9, poisson(lam * razon * 1.1));
    let gv = Math.min(9, poisson(lam / razon));
    if (sinEmpate && gl === gv) (rand() < 0.5 ? gl++ : gv++);
    return { local: gl, visitante: gv };
  };

  const partido = ({ torneo, local, visitante, fase = 'liga', jornada, fecha, escenario, arbitro, estado = 'programado', resultado = null, disciplina }) => {
    const p = {
      _id: oid(),
      torneo: torneo._id,
      local,
      visitante,
      fase,
      jornada,
      fecha,
      escenario,
      arbitro: arbitro ? arbitro._id : undefined,
      estado,
      marcador: resultado ? { local: resultado.local, visitante: resultado.visitante } : { local: 0, visitante: 0 },
      estadisticas: [],
      historialReprogramacion: [],
    };
    if (resultado && ['finalizado', 'pendiente_confirmacion'].includes(estado)) {
      p.estadisticas = [
        ...estadisticasEquipo(disciplina, local, resultado.local),
        ...estadisticasEquipo(disciplina, visitante, resultado.visitante),
      ];
    }
    if (estado === 'finalizado') p.actaCerradaEn = new Date(fecha.getTime() + 2 * 60 * 60 * 1000);
    matches.push(p);
    return p;
  };

  const HORARIOS = ['18:00', '19:30', '21:00'];
  const franjasDelDia = (dia, escenarios) => HORARIOS.flatMap((h) => escenarios.map((e) => ({ fecha: aHora(dia, h), escenario: e })));

  // 1) Copa UAB 2026: inscripciones abiertas (tal como estaba el seed original)
  const copa = crearTorneo({
    nombre: 'Copa UAB 2026',
    disciplina: 'futsal',
    formato: 'liga',
    fechaInicio: new Date(ahora + 10 * DIA),
    fechaFin: new Date(ahora + 40 * DIA),
    inscripcionInicio: new Date(ahora - DIA),
    inscripcionFin: new Date(ahora + 7 * DIA),
    maxEquipos: 8,
    reglamento: 'Reglamento oficial de torneos internos de la UAB.',
    organizador: org1._id,
  });
  futsalOriginales.forEach((e, i) => inscribir(copa, e, i < 3 ? 'aprobada' : 'pendiente', org1));

  // 2) Liga de futsal 2025/2026: FINALIZADA (8 equipos, todos contra todos)
  const inicioLigaFutsal = sumarDias(hoy, -150);
  const ligaFutsal = crearTorneo({
    nombre: 'Liga Universitaria de Futsal 2025/2026',
    disciplina: 'futsal',
    formato: 'liga',
    fechaInicio: inicioLigaFutsal,
    fechaFin: sumarDias(hoy, -60),
    inscripcionInicio: sumarDias(hoy, -190),
    inscripcionFin: sumarDias(hoy, -160),
    maxEquipos: 8,
    reglamento: 'Liga a una vuelta. Victoria 3 puntos, empate 1. Desempate por diferencia de goles.',
    estado: 'finalizado',
    calendarioPublicado: true,
    organizador: org1._id,
  });
  futsal.forEach((e) => inscribir(ligaFutsal, e, 'aprobada', org1));
  const cuentaFutsal = {};
  generarLiga(futsal.map((e) => e._id)).forEach((m, idx) => {
    const k = (cuentaFutsal[m.jornada] = (cuentaFutsal[m.jornada] || 0) + 1) - 1;
    const slot = franjasDelDia(sumarDias(inicioLigaFutsal, (m.jornada - 1) * 7), ligaFutsal.escenarios)[k];
    partido({
      torneo: ligaFutsal, local: m.local, visitante: m.visitante, jornada: m.jornada, fecha: slot.fecha, escenario: slot.escenario,
      arbitro: arbitros[idx % 3], estado: 'finalizado', resultado: simular('futsal', m.local, m.visitante, false), disciplina: 'futsal',
    });
  });

  // 3) Intercarreras de baloncesto: FINALIZADO (eliminación directa con final)
  const inicioBasquet = sumarDias(hoy, -45);
  const escBasquet = ['Coliseo UAB', 'Gimnasio Central'];
  const intercarreras = crearTorneo({
    nombre: 'Torneo Intercarreras de Baloncesto 2026',
    disciplina: 'basquetbol',
    formato: 'eliminacion',
    fechaInicio: inicioBasquet,
    fechaFin: sumarDias(hoy, -25),
    inscripcionInicio: sumarDias(hoy, -80),
    inscripcionFin: sumarDias(hoy, -55),
    maxEquipos: 8,
    escenarios: escBasquet,
    reglamento: 'Eliminación directa a partido único. Incluye partido por el tercer puesto.',
    estado: 'finalizado',
    calendarioPublicado: true,
    organizador: org2._id,
  });
  basquet.forEach((e) => inscribir(intercarreras, e, 'aprobada', org2));
  const ganador = (p) => (p.marcador.local > p.marcador.visitante ? p.local : p.visitante);
  const perdedor = (p) => (p.marcador.local > p.marcador.visitante ? p.visitante : p.local);
  const ronda = (pares, fase, jornada, dia) => {
    const slots = franjasDelDia(dia, escBasquet);
    return pares.map(([l, v], i) =>
      partido({
        torneo: intercarreras, local: l, visitante: v, fase, jornada, fecha: slots[i].fecha, escenario: slots[i].escenario,
        arbitro: arbitros[i % 3], estado: 'finalizado', resultado: simular('basquetbol', l, v, true), disciplina: 'basquetbol',
      })
    );
  };
  const ids = basquet.map((e) => e._id);
  const cuartos = ronda([[ids[0], ids[7]], [ids[1], ids[6]], [ids[2], ids[5]], [ids[3], ids[4]]], 'cuartos', 1, inicioBasquet);
  const semis = ronda([[ganador(cuartos[0]), ganador(cuartos[3])], [ganador(cuartos[1]), ganador(cuartos[2])]], 'semifinal', 2, sumarDias(inicioBasquet, 7));
  const diaFinal = sumarDias(inicioBasquet, 14);
  const franjasFinal = franjasDelDia(diaFinal, escBasquet);
  const lanzar = (l, v, fase, slot, arb) =>
    partido({
      torneo: intercarreras, local: l, visitante: v, fase, jornada: 3, fecha: slot.fecha, escenario: slot.escenario,
      arbitro: arb, estado: 'finalizado', resultado: simular('basquetbol', l, v, true), disciplina: 'basquetbol',
    });
  lanzar(perdedor(semis[0]), perdedor(semis[1]), 'tercer_puesto', franjasFinal[0], arbitros[1]);
  lanzar(ganador(semis[0]), ganador(semis[1]), 'final', franjasFinal[2], arbitros[0]);

  // 4) Liga de voleibol: EN CURSO (jornadas 1 y 2 jugadas, la 3 pendiente de acta, 4 y 5 por jugar)
  const inicioVoley = sumarDias(hoy, -16);
  const ligaVoley = crearTorneo({
    nombre: 'Liga de Voleibol Apertura 2026',
    disciplina: 'voleibol',
    formato: 'liga',
    fechaInicio: inicioVoley,
    fechaFin: sumarDias(hoy, 20),
    inscripcionInicio: sumarDias(hoy, -50),
    inscripcionFin: sumarDias(hoy, -20),
    maxEquipos: 8,
    minJugadores: 6,
    reglamento: 'Partidos al mejor de 5 sets. El marcador registra los sets ganados.',
    estado: 'en_curso',
    calendarioPublicado: true,
    organizador: org1._id,
  });
  voley.forEach((e) => inscribir(ligaVoley, e, 'aprobada', org1));
  const contadorJornada = {};
  generarLiga(voley.map((e) => e._id)).forEach((m, idx) => {
    const k = (contadorJornada[m.jornada] = (contadorJornada[m.jornada] || 0) + 1) - 1;
    const dia = sumarDias(inicioVoley, (m.jornada - 1) * 7);
    const fecha = aHora(dia, HORARIOS[k]);
    const base = { torneo: ligaVoley, local: m.local, visitante: m.visitante, jornada: m.jornada, fecha, escenario: 'Coliseo UAB', disciplina: 'voleibol' };
    if (m.jornada <= 2) {
      partido({ ...base, arbitro: arbitros[idx % 3], estado: 'finalizado', resultado: simular('voleibol', m.local, m.visitante, true) });
    } else if (m.jornada === 3) {
      // Jornada reciente: el árbitro de demostración aún debe registrar las actas
      partido({
        ...base, arbitro: arbitros[0],
        estado: k === 2 ? 'pendiente_confirmacion' : 'programado',
        resultado: k === 2 ? simular('voleibol', m.local, m.visitante, true) : null,
      });
    } else {
      partido({ ...base, arbitro: m.jornada === 4 ? arbitros[0] : arbitros[idx % 3], estado: 'programado' });
    }
  });

  // 5) Copa de fútbol: inscripción cerrada con calendario en BORRADOR (para probar "Publicar")
  const inicioFutbol = sumarDias(hoy, 10);
  const copaFutbol = crearTorneo({
    nombre: 'Copa Fútbol 11 Clausura 2026',
    disciplina: 'futbol',
    formato: 'liga',
    fechaInicio: inicioFutbol,
    fechaFin: sumarDias(hoy, 50),
    inscripcionInicio: sumarDias(hoy, -30),
    inscripcionFin: sumarDias(hoy, -5),
    maxEquipos: 8,
    minJugadores: 7,
    escenarios: ['Estadio Universitario'],
    reglamento: 'Partidos de 2 tiempos de 30 minutos.',
    estado: 'inscripcion_cerrada',
    calendarioPublicado: false,
    organizador: org1._id,
  });
  futbol.forEach((e) => inscribir(copaFutbol, e, 'aprobada', org1));
  const cuentaFutbol = {};
  generarLiga(futbol.map((e) => e._id)).forEach((m) => {
    const k = (cuentaFutbol[m.jornada] = (cuentaFutbol[m.jornada] || 0) + 1) - 1;
    partido({
      torneo: copaFutbol, local: m.local, visitante: m.visitante, jornada: m.jornada,
      fecha: aHora(sumarDias(inicioFutbol, (m.jornada - 1) * 7), HORARIOS[k]), escenario: 'Estadio Universitario', disciplina: 'futbol',
    });
  });

  // 6) Copa de baloncesto 2027: inscripciones abiertas con lista de espera
  const copaBasquet = crearTorneo({
    nombre: 'Copa Baloncesto 2027',
    disciplina: 'basquetbol',
    formato: 'liga',
    fechaInicio: sumarDias(hoy, 40),
    fechaFin: sumarDias(hoy, 90),
    inscripcionInicio: sumarDias(hoy, -5),
    inscripcionFin: sumarDias(hoy, 20),
    maxEquipos: 4,
    escenarios: escBasquet,
    reglamento: 'Cupo limitado a 4 equipos; el resto queda en lista de espera.',
    estado: 'inscripcion',
    organizador: org2._id,
  });
  basquet.slice(0, 6).forEach((e, i) => inscribir(copaBasquet, e, i < 2 ? 'aprobada' : i < 4 ? 'pendiente' : 'lista_espera', org2));

  // 7) Torneo cancelado
  crearTorneo({
    nombre: 'Torneo Relámpago de Tenis de Mesa',
    disciplina: 'otra',
    formato: 'eliminacion',
    fechaInicio: sumarDias(hoy, 30),
    fechaFin: sumarDias(hoy, 32),
    inscripcionInicio: sumarDias(hoy, -3),
    inscripcionFin: sumarDias(hoy, 10),
    maxEquipos: 8,
    minJugadores: 1,
    escenarios: ['Sala Polivalente'],
    reglamento: 'Torneo individual y de dobles. Cancelado por falta de inscritos.',
    estado: 'cancelado',
    organizador: org2._id,
  });

  return {
    users, teams, tournaments, registrations, matches, capitanes,
    cuentas: { admin, organizador: org1, organizador2: org2, arbitro: arbitros[0], capitan: capitanDemo, jugador: jugadorDemo },
  };
};

module.exports = { generarDatosDemo, generarLiga };
