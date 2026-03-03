const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    diagnosis: { type: String, required: true },
    notes: { type: String },
    symptoms: [{ type: String }],
    vitals: {
      blood_pressure: { type: String },
      heart_rate: { type: Number },
      temperature: { type: Number },
      oxygen_saturation: { type: Number },
      weight: { type: Number },
    },
    lab_results: { type: String },
    follow_up_date: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
