const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    admission_date: { type: Date, required: true, default: Date.now },
    discharge_date: { type: Date },
    discharge_summary: { type: String },
    simplified_discharge: { type: String },
    readmission_risk_score: { type: Number, min: 0, max: 1 },
    risk_level: { type: String, enum: ['Low', 'Medium', 'High'] },
    ward: { type: String },
    reason_for_admission: { type: String },
    follow_up_confirmed: { type: Boolean, default: false },
    follow_up_date: { type: Date },
    status: { type: String, enum: ['admitted', 'discharged'], default: 'admitted' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', admissionSchema);
