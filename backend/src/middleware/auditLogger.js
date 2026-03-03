const AuditLog = require('../models/AuditLog');

const actionMap = {
  'POST /api/auth/login': 'Login',
  'POST /api/auth/register': 'Register',
  'GET /api/doctor/patient/': 'View Patient Details',
  'GET /api/doctor/patients': 'View Patient List',
  'POST /api/doctor/add-record': 'Add Medical Record',
  'POST /api/doctor/prescribe': 'Create Prescription',
  'POST /api/doctor/discharge': 'Discharge Patient',
  'POST /api/doctor/admit-patient': 'Admit Patient',
  'GET /api/patient/medical-history': 'View Medical History',
  'GET /api/patient/discharge-summary': 'View Discharge Summary',
  'POST /api/patient/book-appointment': 'Book Appointment',
  'POST /api/patient/confirm-followup': 'Confirm Follow-Up',
  'POST /api/nurse/update-task': 'Update Nurse Task',
  'POST /api/admin/assign-nurse-task': 'Assign Nurse Task',
  'GET /api/admin/high-risk-patients': 'View High Risk Patients',
  'GET /api/ai/': 'AI Request',
  'POST /api/ai/': 'AI Request',
};

function getAction(method, path) {
  const key = `${method} ${path}`;
  for (const [pattern, action] of Object.entries(actionMap)) {
    if (key.startsWith(pattern)) return action;
  }
  return null;
}

function auditLogger(req, res, next) {
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);

    const action = getAction(req.method, req.originalUrl);
    if (!action) return;

    const logEntry = {
      user_id: req.user?._id || null,
      user_name: req.user?.name || 'Anonymous',
      user_role: req.user?.role || 'unknown',
      action,
      resource: req.originalUrl,
      details: req.method === 'POST' ? summarizeBody(req.body) : undefined,
      ip_address: req.ip || req.connection?.remoteAddress,
      method: req.method,
      status_code: res.statusCode,
    };

    AuditLog.create(logEntry).catch(() => {});
  };

  next();
}

function summarizeBody(body) {
  if (!body || typeof body !== 'object') return undefined;
  const safe = { ...body };
  delete safe.password;
  delete safe.password_hash;
  delete safe.token;
  const str = JSON.stringify(safe);
  return str.length > 200 ? str.substring(0, 200) + '...' : str;
}

module.exports = auditLogger;
