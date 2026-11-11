const PDFDocument = require('pdfkit');

const VERDE = '#00A35D';
const AZUL = '#0B2545';

const fechaHora = (f) =>
  new Date(f).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });

// Dibuja una tabla simple con cabecera. columnas: [{ titulo, ancho, alinear }]
const tabla = (doc, columnas, filas) => {
  const x0 = doc.page.margins.left;
  const alto = 20;
  const dibujaFila = (valores, cabecera) => {
    if (doc.y + alto > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    if (cabecera) doc.rect(x0, y, columnas.reduce((a, c) => a + c.ancho, 0), alto).fill(AZUL);
    let x = x0;
    columnas.forEach((c, i) => {
      doc
        .fillColor(cabecera ? '#FFFFFF' : '#111111')
        .font(cabecera ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .text(String(valores[i] ?? ''), x + 4, y + 6, { width: c.ancho - 8, align: c.alinear || 'left', lineBreak: false });
      x += c.ancho;
    });
    doc.y = y + alto;
    if (!cabecera) doc.moveTo(x0, doc.y).lineTo(x0 + columnas.reduce((a, c) => a + c.ancho, 0), doc.y).strokeColor('#DDDDDD').stroke();
  };
  dibujaFila(columnas.map((c) => c.titulo), true);
  filas.forEach((f) => dibujaFila(f, false));
};

const encabezado = (doc, titulo, torneo) => {
  doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(10).text('CAMPUS LEAGUE · Universidad Adventista de Bolivia');
  doc.moveDown(0.3).fillColor(AZUL).fontSize(20).text(titulo);
  doc.moveDown(0.2).fillColor('#444444').font('Helvetica').fontSize(11).text(`Torneo: ${torneo.nombre} (${torneo.disciplina}, ${torneo.formato})`);
  doc.fontSize(9).text(`Generado: ${fechaHora(new Date())}`);
  doc.moveDown(1);
};

// RF-015 / CU-12: genera el PDF en memoria y lo devuelve como Buffer
const generarPDF = ({ tipo, torneo, standings = [], partidos = [], goleadores = [] }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    if (tipo === 'posiciones') {
      encabezado(doc, 'Tabla de posiciones', torneo);
      tabla(
        doc,
        [
          { titulo: '#', ancho: 28 }, { titulo: 'Equipo', ancho: 175 },
          { titulo: 'PJ', ancho: 40, alinear: 'center' }, { titulo: 'PG', ancho: 40, alinear: 'center' },
          { titulo: 'PE', ancho: 40, alinear: 'center' }, { titulo: 'PP', ancho: 40, alinear: 'center' },
          { titulo: 'GF', ancho: 40, alinear: 'center' }, { titulo: 'GC', ancho: 40, alinear: 'center' },
          { titulo: 'DG', ancho: 40, alinear: 'center' }, { titulo: 'PTS', ancho: 40, alinear: 'center' },
        ],
        standings.map((s) => [s.posicion, s.equipo.nombre, s.pj, s.pg, s.pe, s.pp, s.gf, s.gc, s.dg, s.pts])
      );
      if (goleadores.length) {
        doc.moveDown(1.5).fillColor(AZUL).font('Helvetica-Bold').fontSize(14).text('Goleadores');
        doc.moveDown(0.5);
        tabla(
          doc,
          [{ titulo: '#', ancho: 28 }, { titulo: 'Jugador', ancho: 220 }, { titulo: 'Equipo', ancho: 175 }, { titulo: 'Goles', ancho: 60, alinear: 'center' }],
          goleadores.map((g, i) => [i + 1, g.jugador?.nombre, g.equipo?.nombre, g.goles])
        );
      }
    } else {
      const titulo = tipo === 'resultados' ? 'Resultados' : 'Calendario de partidos';
      encabezado(doc, titulo, torneo);
      tabla(
        doc,
        [
          { titulo: 'J', ancho: 26, alinear: 'center' }, { titulo: 'Fecha', ancho: 110 },
          { titulo: 'Partido', ancho: 220 }, { titulo: tipo === 'resultados' ? 'Marcador' : 'Escenario', ancho: 100 },
          { titulo: 'Estado', ancho: 70 },
        ],
        partidos.map((p) => [
          p.jornada, fechaHora(p.fecha), `${p.local?.nombre} vs ${p.visitante?.nombre}`,
          tipo === 'resultados' ? `${p.marcador.local} - ${p.marcador.visitante}` : p.escenario, p.estado,
        ])
      );
    }
    doc.end();
  });

module.exports = { generarPDF };
