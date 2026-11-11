const nodemailer = require('nodemailer');

// RF-014 / CU-13: envío de correos. Con SMTP_HOST definido envía de verdad;
// sin él, el mensaje se registra en consola (modo desarrollo, no se pierde el flujo).
let transporte;
const obtenerTransporte = () => {
  if (transporte) return transporte;
  if (process.env.SMTP_HOST) {
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    transporte = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporte;
};

const REMITENTE = () => process.env.MAIL_FROM || 'Campus League <no-reply@uab.edu.bo>';

// Nunca lanza: una falla de correo no debe romper la operación principal
const enviarCorreo = async ({ to, subject, text }) => {
  if (!to) return false;
  try {
    // MAIL_REDIRECT_TO: en demostraciones envía todo a un buzón de pruebas
    const destino = process.env.MAIL_REDIRECT_TO || to;
    const info = await obtenerTransporte().sendMail({ from: REMITENTE(), to: destino, subject, text });
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'test') {
      console.log(`[MAIL simulado] a ${to} | ${subject}`);
    }
    return !!info;
  } catch (error) {
    console.error(`[MAIL] No se pudo enviar a ${to}:`, error.message);
    return false;
  }
};

const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });

const notificarOTP = (user, codigo, motivo = 'verificar su cuenta') =>
  enviarCorreo({
    to: user.correo,
    subject: 'Campus League: su código de verificación',
    text: `Hola ${user.nombre},\n\nSu código para ${motivo} es: ${codigo}\nVence en 10 minutos.\n\nSi usted no lo solicitó, ignore este mensaje.`,
  });

const notificarInscripcion = ({ usuario, equipo, torneo, estado, motivo }) => {
  const estados = {
    aprobada: 'fue APROBADA',
    rechazada: `fue RECHAZADA${motivo ? ` (motivo: ${motivo})` : ''}`,
    lista_espera: 'quedó en LISTA DE ESPERA',
    pendiente: 'fue registrada y está pendiente de revisión',
  };
  return enviarCorreo({
    to: usuario.correo,
    subject: `Campus League: inscripción de ${equipo.nombre}`,
    text: `Hola ${usuario.nombre},\n\nLa inscripción de su equipo "${equipo.nombre}" al torneo "${torneo.nombre}" ${estados[estado] || estado}.`,
  });
};

const notificarReprogramacion = ({ destinatarios, partido }) =>
  Promise.all(
    destinatarios.map((u) =>
      enviarCorreo({
        to: u.correo,
        subject: 'Campus League: partido reprogramado',
        text: `Hola ${u.nombre},\n\nEl partido ${partido.local} vs ${partido.visitante} (${partido.torneo}) fue reprogramado.\nNueva fecha: ${formatoFecha(partido.fecha)}\nEscenario: ${partido.escenario}`,
      })
    )
  );

module.exports = { enviarCorreo, notificarOTP, notificarInscripcion, notificarReprogramacion };
