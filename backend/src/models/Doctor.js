const mongoose = require('mongoose');

const DEPARTMENTS = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'General Medicine',
  'ENT',
  'Ophthalmology',
  'Psychiatry',
  'Gynecology',
];

const doctorSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, required: true },
    license_number: { type: String },
    department: { type: String, enum: DEPARTMENTS, default: 'General Medicine' },
    consultation_fee: { type: Number, default: 500 },
    available_days: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    slot_duration: { type: Number, default: 30 },
    start_hour: { type: Number, default: 9 },
    end_hour: { type: Number, default: 17 },
  },
  { timestamps: true }
);

doctorSchema.statics.DEPARTMENTS = DEPARTMENTS;

module.exports = mongoose.model('Doctor', doctorSchema);
