const mongoose = require('mongoose');

const ESTADOS_INSCRIPCION = ['pendiente', 'aprobada', 'rechazada', 'lista_espera', 'cancelada'];

const registrationSchema = new mongoose.Schema(
  {
    torneo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'El torneo es obligatorio'],
    },
    equipo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo es obligatorio'],
    },
    inscritoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario que inscribe es obligatorio'],
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_INSCRIPCION,
        message: 'Estado no válido. Permitidos: ' + ESTADOS_INSCRIPCION.join(', '),
      },
      default: 'pendiente',
    },
    aceptaReglamento: {
      type: Boolean,
      required: [true, 'Debe aceptar el reglamento'],
      validate: {
        validator: (v) => v === true,
        message: 'Debe aceptar el reglamento del torneo',
      },
    },
    motivoRechazo: {
      type: String,
      trim: true,
      maxlength: [300, 'El motivo no puede superar 300 caracteres'],
    },
    revisadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    fechaRevision: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Un equipo solo puede inscribirse una vez por torneo
registrationSchema.index({ torneo: 1, equipo: 1 }, { unique: true });
registrationSchema.index({ torneo: 1, estado: 1 });
registrationSchema.index({ equipo: 1 });
registrationSchema.index({ inscritoPor: 1 });

registrationSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
module.exports.ESTADOS_INSCRIPCION = ESTADOS_INSCRIPCION;