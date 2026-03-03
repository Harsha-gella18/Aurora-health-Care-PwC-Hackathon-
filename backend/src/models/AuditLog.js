const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_name: { type: String },
    user_role: { type: String },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    details: { type: String },
    ip_address: { type: String },
    method: { type: String },
    status_code: { type: Number },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
