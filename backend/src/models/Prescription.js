const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medication_name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String },
    duration: { type: String },
    instructions: { type: String },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
