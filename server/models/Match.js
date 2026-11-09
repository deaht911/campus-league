const mongoose = require('mongoose');

const ESTADOS_PARTIDO = ['programado', 'en_juego', 'pendiente_confirmacion', 'finalizado', 'reprogramado', 'cancelado'];
const FASES = ['liga', 'octavos', 'cuartos', 'semifinal', 'final', 'tercer_puesto'];
const TIPOS_TARJETA = ['amarilla', 'roja'];

const estadisticaJugadorSchema = new mongoose.Schema(
  {
    jugador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El jugador es obligatorio'],
    },
    equipo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo del jugador es obligatorio'],
    },
    goles: {
      type: Number,
      default: 0,
      min: [0, 'Los goles no pueden ser negativos'],
    },
    faltas: {
      type: Number,
      default: 0,
      min: [0, 'Las faltas no pueden ser negativas'],
    },
    tarjetas: {
      type: [{ type: String, enum: TIPOS_TARJETA }],
      default: [],
    },
    destacado: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    torneo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'El torneo es obligatorio'],
    },
    local: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo local es obligatorio'],
    },
    visitante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo visitante es obligatorio'],
      validate: {
        validator: function (valor) {
          return !this.local || String(valor) !== String(this.local);
        },
        message: 'El equipo local y el visitante deben ser distintos',
      },
    },
    fase: {
      type: String,
      enum: {
        values: FASES,
        message: 'Fase no válida. Permitidas: ' + FASES.join(', '),
      },
      default: 'liga',
    },
    jornada: {
      type: Number,
      min: [1, 'La jornada debe ser al menos 1'],
      default: 1,
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha del partido es obligatoria'],
    },
    escenario: {
      type: String,
      required: [true, 'El escenario deportivo es obligatorio'],
      trim: true,
      maxlength: [80, 'El escenario no puede superar 80 caracteres'],
    },
    arbitro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_PARTIDO,
        message: 'Estado no válido. Permitidos: ' + ESTADOS_PARTIDO.join(', '),
      },
      default: 'programado',
    },
    marcador: {
      local: { type: Number, min: [0, 'El marcador no puede ser negativo'], default: 0 },
      visitante: { type: Number, min: [0, 'El marcador no puede ser negativo'], default: 0 },
    },
    walkover: {
      type: Boolean,
      default: false,
    },
    motivoWalkover: {
      type: String,
      trim: true,
      maxlength: [300, 'El motivo no puede superar 300 caracteres'],
    },
    estadisticas: {
      type: [estadisticaJugadorSchema],
      default: [],
    },
    actaCerradaEn: {
      type: Date,
    },
    historialReprogramacion: {
      type: [
        new mongoose.Schema(
          {
            fechaAnterior: Date,
            escenarioAnterior: String,
            modificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            fecha: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

matchSchema.index({ torneo: 1, fecha: 1 });
matchSchema.index({ torneo: 1, estado: 1 });
matchSchema.index({ local: 1 });
matchSchema.index({ visitante: 1 });
matchSchema.index({ arbitro: 1, estado: 1 });
matchSchema.index({ torneo: 1, fecha: 1, escenario: 1 }, { unique: true });

// Suma de goles individuales por equipo (para validar contra el marcador)
matchSchema.methods.golesIndividuales = function (equipoId) {
  return this.estadisticas
    .filter((e) => String(e.equipo) === String(equipoId))
    .reduce((acc, e) => acc + e.goles, 0);
};

// Verifica que los goles individuales coincidan con el marcador (CU-09, paso 5)
matchSchema.methods.estadisticasCoinciden = function () {
  if (this.walkover || this.estadisticas.length === 0) return true;
  return (
    this.golesIndividuales(this.local) === this.marcador.local &&
    this.golesIndividuales(this.visitante) === this.marcador.visitante
  );
};

// Equipo ganador (null si empate o no finalizado)
matchSchema.virtual('ganador').get(function () {
  if (this.estado !== 'finalizado') return null;
  if (this.marcador.local > this.marcador.visitante) return this.local;
  if (this.marcador.visitante > this.marcador.local) return this.visitante;
  return null;
});

matchSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.id;
    delete ret.__v;
    return ret;
  },
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
module.exports.ESTADOS_PARTIDO = ESTADOS_PARTIDO;
module.exports.FASES = FASES;
module.exports.TIPOS_TARJETA = TIPOS_TARJETA;