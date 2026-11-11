// Reglas de puntuación y estadísticas por disciplina (RF-012, RF-013).
// Cada deporte puntúa distinto: goles (fútbol y futsal), puntos (baloncesto) y sets (voleibol).
const LEYENDA_BASE = 'Desempate: diferencia y luego anotación a favor.';

const REGLAS = {
  futsal: {
    unidad: 'goles',
    empate: true,
    etiquetas: { gf: 'GF', gc: 'GC', dg: 'DG' },
    texto: 'Victoria 3 pts · Empate 1 pt · Derrota 0. Desempate: diferencia de goles y goles a favor.',
    individual: { activo: true, titulo: 'Goleadores', campo: 'Goles' },
  },
  futbol: {
    unidad: 'goles',
    empate: true,
    etiquetas: { gf: 'GF', gc: 'GC', dg: 'DG' },
    texto: 'Victoria 3 pts · Empate 1 pt · Derrota 0. Desempate: diferencia de goles y goles a favor.',
    individual: { activo: true, titulo: 'Goleadores', campo: 'Goles' },
  },
  basquetbol: {
    unidad: 'puntos',
    empate: false,
    etiquetas: { gf: 'PF', gc: 'PC', dg: 'DP' },
    texto: 'Victoria 2 pts · Derrota 1 pt (no hay empates). Desempate: diferencia de puntos y puntos a favor.',
    individual: { activo: true, titulo: 'Anotadores', campo: 'Puntos' },
  },
  voleibol: {
    unidad: 'sets',
    empate: false,
    etiquetas: { gf: 'SG', gc: 'SC', dg: 'DS' },
    texto: 'Victoria 3-0 o 3-1: 3 pts · Victoria 3-2: 2 pts · Derrota 2-3: 1 pt · Derrota 0-3 o 1-3: 0. Desempate: diferencia de sets y sets a favor.',
    individual: { activo: false, titulo: '', campo: '' },
  },
  otra: {
    unidad: 'puntos',
    empate: true,
    etiquetas: { gf: 'PF', gc: 'PC', dg: 'DP' },
    texto: 'Victoria 3 pts · Empate 1 pt · Derrota 0. ' + LEYENDA_BASE,
    individual: { activo: false, titulo: '', campo: '' },
  },
};

const obtenerReglas = (disciplina) => REGLAS[disciplina] || REGLAS.otra;

// Puntos de tabla para cada equipo según la disciplina.
// gl y gv son goles, puntos o sets del local y del visitante.
const puntosPartido = (disciplina, gl, gv, walkover = false) => {
  const local = gl > gv;
  const visitante = gv > gl;
  if (disciplina === 'basquetbol') {
    if (local) return { pl: 2, pv: walkover ? 0 : 1, resultado: 'L' };
    return { pl: walkover ? 0 : 1, pv: 2, resultado: 'V' };
  }
  if (disciplina === 'voleibol') {
    const ganador = Math.max(gl, gv);
    const perdedor = Math.min(gl, gv);
    const reñido = ganador === 3 && perdedor === 2;
    const [pg, pp] = reñido ? [2, 1] : [3, 0];
    return local ? { pl: pg, pv: pp, resultado: 'L' } : { pl: pp, pv: pg, resultado: 'V' };
  }
  if (local) return { pl: 3, pv: 0, resultado: 'L' };
  if (visitante) return { pl: 0, pv: 3, resultado: 'V' };
  return { pl: 1, pv: 1, resultado: 'E' };
};

module.exports = { obtenerReglas, puntosPartido };
