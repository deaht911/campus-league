const crypto = require('crypto');

// RNF-002: cifrado AES-256-GCM de datos sensibles en reposo.
// El IV se deriva con HMAC-SHA256 del texto plano (cifrado determinista): el mismo valor
// produce siempre el mismo cifrado, lo que permite conservar índices únicos y búsquedas exactas.
// La etiqueta de autenticación de GCM detecta cualquier alteración del dato almacenado.
const PREFIJO = 'enc:v1:';

let claves;
const obtenerClaves = () => {
  if (claves) return claves;
  let maestra;
  if (process.env.ENCRYPTION_KEY) {
    if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
      throw new Error('ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes)');
    }
    maestra = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY es obligatoria en producción');
  } else {
    // Solo desarrollo y pruebas: se deriva de JWT_SECRET para no exigir configuración extra
    maestra = crypto.createHash('sha256').update(`campus-league:${process.env.JWT_SECRET || 'dev'}`).digest();
  }
  claves = {
    cifrado: Buffer.from(crypto.hkdfSync('sha256', maestra, Buffer.alloc(0), 'campus-league-aes', 32)),
    iv: Buffer.from(crypto.hkdfSync('sha256', maestra, Buffer.alloc(0), 'campus-league-iv', 32)),
  };
  return claves;
};

const esCifrado = (valor) => typeof valor === 'string' && valor.startsWith(PREFIJO);

const cifrar = (valor) => {
  if (valor === undefined || valor === null || valor === '') return valor;
  const texto = String(valor).trim();
  if (esCifrado(texto)) return texto;
  const { cifrado, iv: claveIv } = obtenerClaves();
  const iv = crypto.createHmac('sha256', claveIv).update(texto).digest().subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cifrado, iv);
  const datos = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return PREFIJO + Buffer.concat([iv, cipher.getAuthTag(), datos]).toString('base64');
};

// Tolera datos antiguos sin cifrar (se devuelven tal cual)
const descifrar = (valor) => {
  if (!esCifrado(valor)) return valor;
  const buf = Buffer.from(valor.slice(PREFIJO.length), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerClaves().cifrado, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
};

// Opciones para un campo de Mongoose cifrado de forma transparente
const campoCifrado = { set: cifrar, get: descifrar };

module.exports = { cifrar, descifrar, esCifrado, campoCifrado };
