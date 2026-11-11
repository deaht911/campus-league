const mongoose = require('mongoose');

const DISCIPLINAS = ['futsal', 'basquetbol', 'voleibol', 'futbol', 'otra'];

const jugadorSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario del jugador es obligatorio'],
    },
    numeroCamiseta: {
      type: Number,
      min: [0, 'El número de camiseta no puede ser negativo'],
      max: [99, 'El número de camiseta no puede superar 99'],
    },
    posicion: {
      type: String,
      trim: true,
      maxlength: [30, 'La posición no puede superar 30 caracteres'],
    },
    activo: {
      type: Boolean,
      default: true,
    },
    fechaAlta: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del equipo es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [60, 'El nombre no puede superar 60 caracteres'],
    },
    disciplina: {
      type: String,
      required: [true, 'La disciplina es obligatoria'],
      enum: {
        values: DISCIPLINAS,
        message: 'Disciplina no válida. Permitidas: ' + DISCIPLINAS.join(', '),
      },
    },
    facultad: {
      type: String,
      required: [true, 'La facultad es obligatoria'],
      trim: true,
      maxlength: [100, 'La facultad no puede superar 100 caracteres'],
    },
    capitan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El capitán es obligatorio'],
    },
    jugadores: {
      type: [jugadorSchema],
      validate: [
        {
          validator: function (lista) {
            const ids = lista.map((j) => String(j.usuario));
            return new Set(ids).size === ids.length;
          },
          message: 'Un jugador no puede repetirse en la plantilla',
        },
        {
          validator: function (lista) {
            const camisetas = lista
              .filter((j) => j.activo && j.numeroCamiseta !== undefined && j.numeroCamiseta !== null)
              .map((j) => j.numeroCamiseta);
            return new Set(camisetas).size === camisetas.length;
          },
          message: 'El número de camiseta no puede repetirse entre jugadores activos',
        },
        {
          validator: function (lista) {
            return lista.length <= 30;
          },
          message: 'La plantilla no puede superar 30 jugadores',
        },
      ],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Un nombre de equipo es único dentro de la misma disciplina
teamSchema.index({ nombre: 1, disciplina: 1 }, { unique: true });
teamSchema.index({ capitan: 1 });
teamSchema.index({ disciplina: 1, activo: 1 });
teamSchema.index({ 'jugadores.usuario': 1, disciplina: 1 });

// Cantidad de jugadores activos en la plantilla
teamSchema.virtual('totalJugadoresActivos').get(function () {
  return (this.jugadores || []).filter((j) => j && j.activo).length;
});

// Indica si un usuario pertenece activamente a la plantilla
teamSchema.methods.tieneJugador = function (usuarioId) {
  return this.jugadores.some((j) => j.activo && String(j.usuario) === String(usuarioId));
};

teamSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.id;
    delete ret.__v;
    return ret;
  },
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
module.exports.DISCIPLINAS = DISCIPLINAS;