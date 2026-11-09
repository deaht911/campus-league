// 404 para rutas inexistentes
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

// Manejador global de errores
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors;

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message }));
    message = 'Error de validación';
  }

  // ObjectId inválido
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Valor inválido para '${err.path}'`;
  }

  // Clave duplicada (índice único)
  if (err.code === 11000) {
    statusCode = 409;
    const campos = Object.keys(err.keyValue || {}).join(', ');
    message = `Ya existe un registro con ese valor único (${campos})`;
  }

  // JSON mal formado
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON mal formado en el cuerpo de la petición';
  }

  if (statusCode === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Error interno del servidor';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };