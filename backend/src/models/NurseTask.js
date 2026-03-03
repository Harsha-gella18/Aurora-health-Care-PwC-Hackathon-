const mongoose = require('mongoose');

const nurseTaskSchema = new mongoose.Schema(
  {
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    task_description: { type: String, required: true },
    frequency: { type: String },
    warning_signs: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    due_date: { type: Date },
    completed_at: { type: Date },
    notes: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('NurseTask', nurseTaskSchema);
