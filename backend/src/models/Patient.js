const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    date_of_birth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String },
    address: { type: String },
    blood_group: { type: String },
    emergency_contact: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
