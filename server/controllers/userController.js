const User = require('../models/User');
const { cifrar } = require('../services/crypto');

const { ROLES } = User;

const escapeRegex = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users (admin) - filtros: rol, activo, q; paginación: page, limit
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const filtro = {};
    if (req.query.rol) filtro.rol = req.query.rol;
    if (req.query.activo === 'true' || req.query.activo === 'false') {
      filtro.activo = req.query.activo === 'true';
    }
    if (req.query.q) {
      const regex = new RegExp(escapeRegex(req.query.q), 'i');
      filtro.$or = [{ nombre: regex }, { correo: regex }, { codigoEstudiantil: cifrar(String(req.query.q).trim()) }];
    }

    const [usuarios, total] = await Promise.all([
      User.find(filtro)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: usuarios.length,
      users: usuarios,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id (admin)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/role (admin) - RF-003
exports.updateRole = async (req, res, next) => {
  try {
    const { rol } = req.body;

    if (!ROLES.includes(rol)) {
      return res.status(400).json({ success: false, message: 'Rol no válido. Permitidos: ' + ROLES.join(', ') });
    }
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'No puede modificar su propio rol' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    user.rol = rol;
    await user.save();

    res.json({ success: true, message: `Rol actualizado a '${rol}'`, user });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/status (admin) - activar / desactivar cuenta
exports.updateStatus = async (req, res, next) => {
  try {
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: "El campo 'activo' debe ser booleano" });
    }
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'No puede desactivar su propia cuenta' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    user.activo = activo;
    await user.save();

    res.json({ success: true, message: activo ? 'Cuenta activada' : 'Cuenta desactivada', user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/me (cualquier usuario autenticado) - actualiza su propio perfil
exports.updateMe = async (req, res, next) => {
  try {
    const { nombre, facultad, codigoEstudiantil } = req.body;

    const user = await User.findById(req.user._id);
    if (nombre !== undefined) user.nombre = nombre;
    if (facultad !== undefined) user.facultad = facultad;
    if (codigoEstudiantil !== undefined) user.codigoEstudiantil = codigoEstudiantil;
    await user.save();

    res.json({ success: true, message: 'Perfil actualizado', user });
  } catch (error) {
    next(error);
  }
};
// GET /api/users/referees (organizador / admin) - árbitros activos para asignarlos a partidos
exports.listReferees = async (req, res, next) => {
  try {
    const users = await User.find({ rol: 'arbitro', activo: true }).select('nombre correo').sort({ nombre: 1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};
