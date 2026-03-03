const mongoose = require('mongoose');

const STAGE_NAMES = [
  'appointment',
  'doctor_consultation',
  'surgery',
  'lab',
  'doctor_review',
  'pharmacy',
  'billing',
  'closed',
];

const MASTER_ORDER = {};
STAGE_NAMES.forEach((name, i) => { MASTER_ORDER[name] = i; });

const stageSchema = new mongoose.Schema({
  name: { type: String, enum: STAGE_NAMES, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
  started_at: Date,
  completed_at: Date,
  notes: String,
  order: Number,
}, { _id: true });

const labTestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['ordered', 'in_progress', 'completed'], default: 'ordered' },
  priority: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
  results: String,
  report_file: String,
  technician_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cost: { type: Number, default: 0 },
  ordered_at: { type: Date, default: Date.now },
  completed_at: Date,
}, { _id: true });

const prescriptionItemSchema = new mongoose.Schema({
  medication_name: { type: String, required: true },
  dosage: String,
  frequency: String,
  duration: String,
  instructions: String,
  cost: { type: Number, default: 0 },
  status: { type: String, enum: ['prescribed', 'prepared', 'dispensed'], default: 'prescribed' },
}, { _id: true });

const billingItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: String,
}, { _id: true });

const surgerySchema = new mongoose.Schema({
  type: { type: String, required: true },
  scheduled_date: Date,
  notes: String,
  pre_op_instructions: String,
  post_op_notes: String,
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' },
  surgeon_notes: String,
  estimated_cost: { type: Number, default: 0 },
  completed_at: Date,
}, { _id: true });

const caseSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  title: { type: String, default: 'General Consultation' },

  stages: [stageSchema],
  current_stage: { type: String, enum: STAGE_NAMES },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },

  diagnosis: String,
  symptoms: [String],

  lab_required: { type: Boolean, default: false },
  lab_tests: [labTestSchema],

  surgery_required: { type: Boolean, default: false },
  surgery: surgerySchema,

  prescriptions: [prescriptionItemSchema],

  billing: {
    consultation_fee: { type: Number, default: 0 },
    lab_charges: { type: Number, default: 0 },
    medicine_cost: { type: Number, default: 0 },
    surgery_cost: { type: Number, default: 0 },
    items: [billingItemSchema],
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'generated', 'paid'], default: 'pending' },
    generated_at: Date,
    paid_at: Date,
  },

  consultation_document: String,
  consultation_pdf_path: String,

  lab_sent: { type: Boolean, default: false },
  pharmacy_sent: { type: Boolean, default: false },
  surgery_sent: { type: Boolean, default: false },

  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
}, { timestamps: true });

caseSchema.index({ patient_id: 1, status: 1 });
caseSchema.index({ doctor_id: 1, current_stage: 1 });
caseSchema.index({ current_stage: 1, status: 1 });

caseSchema.statics.MASTER_ORDER = MASTER_ORDER;
caseSchema.statics.STAGE_NAMES = STAGE_NAMES;

caseSchema.statics.buildDefaultStages = function () {
  return [
    { name: 'appointment', status: 'completed', started_at: new Date(), completed_at: new Date(), order: MASTER_ORDER.appointment },
    { name: 'doctor_consultation', status: 'in_progress', started_at: new Date(), order: MASTER_ORDER.doctor_consultation },
    { name: 'surgery', status: 'skipped', order: MASTER_ORDER.surgery },
    { name: 'lab', status: 'skipped', order: MASTER_ORDER.lab },
    { name: 'doctor_review', status: 'skipped', order: MASTER_ORDER.doctor_review },
    { name: 'pharmacy', status: 'skipped', order: MASTER_ORDER.pharmacy },
    { name: 'billing', status: 'pending', order: MASTER_ORDER.billing },
    { name: 'closed', status: 'pending', order: MASTER_ORDER.closed },
  ];
};

module.exports = mongoose.model('Case', caseSchema);
