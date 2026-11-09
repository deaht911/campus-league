const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30m',
  });

const sendToken = (user, statusCode, res) => {
  res.status(statusCode).json({
    success: true,
    token: signToken(user),
    user,
  });
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { nombre, correo, password, facultad, codigoEstudiantil } = req.body;

    // El rol nunca se acepta desde el cliente: todo registro inicia como jugador
    const user = await User.create({ nombre, correo, password, facultad, codigoEstudiantil });

    const codigo = await user.generarOTP();
    await user.save();

    // En producción el código se enviaría por correo institucional (CU-13).
    // En desarrollo se devuelve en la respuesta para poder probar el flujo.
    const respuesta = {
      success: true,
      message: 'Registro exitoso. Verifique su correo con el código OTP enviado',
      user,
    };
    if (process.env.NODE_ENV !== 'production') {
      respuesta.otpDesarrollo = codigo;
      console.log(`[OTP] ${user.correo}: ${codigo}`);
    }

    res.status(201).json(respuesta);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const { correo, codigo } = req.body;

    const user = await User.findOne({ correo: String(correo).toLowerCase() }).select('+otp.codigo +otp.expira');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }
    if (user.verificado) {
      return res.status(400).json({ success: false, message: 'La cuenta ya fue verificada' });
    }

    const valido = await user.verificarOTP(codigo);
    if (!valido) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }

    user.verificado = true;
    user.otp = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-otp
exports.resendOTP = async (req, res, next) => {
  try {
    const { correo } = req.body;
    const user = await User.findOne({ correo: String(correo).toLowerCase() });

    // Respuesta genérica para no revelar si el correo existe
    const generica = { success: true, message: 'Si el correo existe y no está verificado, se envió un nuevo código' };

    if (!user || user.verificado) return res.json(generica);

    const codigo = await user.generarOTP();
    await user.save();

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] ${user.correo}: ${codigo}`);
      return res.json({ ...generica, otpDesarrollo: codigo });
    }
    res.json(generica);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    const user = await User.findOne({ correo: String(correo).toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
    if (!user.activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada. Contacte al administrador' });
    }
    if (!user.verificado) {
      return res.status(403).json({ success: false, message: 'Debe verificar su correo con el código OTP' });
    }

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};