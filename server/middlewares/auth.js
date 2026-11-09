const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifica el JWT del encabezado Authorization: Bearer <token> y carga req.user
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No autorizado: falta el token' });
    }

    const token = header.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definida en las variables de entorno');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Sesión expirada, inicie sesión nuevamente' : 'Token inválido';
      return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.activo) {
      return res.status(401).json({ success: false, message: 'No autorizado: usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Si hay token válido carga req.user, si no continúa como visitante (portal público)
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return next();

    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.activo) req.user = user;
    } catch (err) {
      // Token inválido: se trata como visitante
    }
    next();
  } catch (error) {
    next(error);
  }
};

// RBAC: restringe el acceso a los roles indicados
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: `El rol '${req.user.rol}' no tiene permiso para esta acción`,
    });
  }
  next();
};

module.exports = { protect, optionalAuth, authorize };