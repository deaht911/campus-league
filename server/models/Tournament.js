const mongoose = require('mongoose');

const DISCIPLINAS = ['futsal', 'basquetbol', 'voleibol', 'futbol', 'otra'];
const FORMATOS = ['liga', 'eliminacion'];
const ESTADOS = ['borrador', 'inscripcion', 'inscripcion_cerrada', 'en_curso', 'finalizado', 'cancelado'];

const tournamentSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del torneo es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede superar 100 caracteres'],
    },
    disciplina: {
      type: String,
      required: [true, 'La disciplina es obligatoria'],
      enum: {
        values: DISCIPLINAS,
        message: 'Disciplina no válida. Permitidas: ' + DISCIPLINAS.join(', '),
      },
    },
    formato: {
      type: String,
      required: [true, 'El formato es obligatorio'],
      enum: {
        values: FORMATOS,
        message: 'Formato no válido. Permitidos: ' + FORMATOS.join(', '),
      },
    },
    fechaInicio: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fechaFin: {
      type: Date,
      required: [true, 'La fecha de fin es obligatoria'],
      validate: {
        validator: function (valor) {
          return !this.fechaInicio || valor >= this.fechaInicio;
        },
        message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      },
    },
    inscripcionInicio: {
      type: Date,
      required: [true, 'El inicio de inscripciones es obligatorio'],
    },
    inscripcionFin: {
      type: Date,
      required: [true, 'El fin de inscripciones es obligatorio'],
      validate: {
        validator: function (valor) {
          return !this.inscripcionInicio || valor >= this.inscripcionInicio;
        },
        message: 'El fin de inscripciones debe ser posterior al inicio',
      },
    },
    maxEquipos: {
      type: Number,
      required: [true, 'El número máximo de equipos es obligatorio'],
      min: [4, 'El torneo debe permitir al menos 4 equipos'],
      max: [64, 'El torneo no puede superar 64 equipos'],
    },
    minJugadores: {
      type: Number,
      default: 5,
      min: [1, 'El mínimo de jugadores debe ser al menos 1'],
    },
    reglamento: {
      type: String,
      required: [true, 'El reglamento es obligatorio'],
      trim: true,
      maxlength: [5000, 'El reglamento no puede superar 5000 caracteres'],
    },
    escenarios: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS,
        message: 'Estado no válido. Permitidos: ' + ESTADOS.join(', '),
      },
      default: 'inscripcion',
    },
    calendarioPublicado: {
      type: Boolean,
      default: false,
    },
    organizador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El organizador es obligatorio'],
    },
  },
  { timestamps: true }
);

tournamentSchema.index({ disciplina: 1, estado: 1 });
tournamentSchema.index({ organizador: 1 });
tournamentSchema.index({ fechaInicio: -1 });
tournamentSchema.index({ nombre: 1, disciplina: 1 }, { unique: true });

// Indica si hoy está dentro del período de inscripción
tournamentSchema.methods.inscripcionAbierta = function () {
  const ahora = new Date();
  return (
    this.estado === 'inscripcion' &&
    ahora >= this.inscripcionInicio &&
    ahora <= this.inscripcionFin
  );
};

tournamentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
module.exports.DISCIPLINAS = DISCIPLINAS;
module.exports.FORMATOS = FORMATOS;
module.exports.ESTADOS = ESTADOS;