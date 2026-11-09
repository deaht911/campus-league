const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['jugador', 'capitan', 'organizador', 'arbitro', 'administrador'];
const EMAIL_REGEX = /^[a-z0-9._%+-]+@uab\.edu\.bo$/i;
const SALT_ROUNDS = Math.max(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10, 10);
const OTP_TTL_MS = 10 * 60 * 1000;

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede superar 100 caracteres'],
    },
    correo: {
      type: String,
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Debe usar un correo institucional @uab.edu.bo'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false,
    },
    rol: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Rol no válido. Roles permitidos: ' + ROLES.join(', '),
      },
      default: 'jugador',
    },
    facultad: {
      type: String,
      trim: true,
      maxlength: [100, 'La facultad no puede superar 100 caracteres'],
    },
    codigoEstudiantil: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[A-Za-z0-9-]{4,20}$/, 'Código estudiantil no válido'],
    },
    estudianteActivo: {
      type: Boolean,
      default: true,
    },
    verificado: {
      type: Boolean,
      default: false,
    },
    otp: {
      codigo: { type: String, select: false },
      expira: { type: Date, select: false },
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índices de rendimiento
userSchema.index({ rol: 1 });
userSchema.index({ facultad: 1, rol: 1 });
userSchema.index({ createdAt: -1 });

// Hash de contraseña antes de guardar
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Comparar contraseña ingresada con el hash almacenado
userSchema.methods.matchPassword = async function (passwordIngresada) {
  return bcrypt.compare(passwordIngresada, this.password);
};

// Genera un OTP de 6 dígitos, guarda su hash y devuelve el código en claro
userSchema.methods.generarOTP = async function () {
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.otp = {
    codigo: await bcrypt.hash(codigo, salt),
    expira: new Date(Date.now() + OTP_TTL_MS),
  };
  return codigo;
};

// Verifica el OTP ingresado (requiere haber cargado otp con select('+otp.codigo +otp.expira'))
userSchema.methods.verificarOTP = async function (codigoIngresado) {
  if (!this.otp || !this.otp.codigo || !this.otp.expira) return false;
  if (this.otp.expira.getTime() < Date.now()) return false;
  return bcrypt.compare(String(codigoIngresado), this.otp.codigo);
};

// Limpia campos sensibles al serializar
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.otp;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
module.exports.EMAIL_REGEX = EMAIL_REGEX;