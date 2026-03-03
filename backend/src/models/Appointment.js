const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    appointment_date: { type: Date, required: true },
    time_slot: { type: String },
    department: { type: String },
    reason: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    is_follow_up: { type: Boolean, default: false },
    reminder_sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
