require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/auditLogger'));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏥 Aurora Health Backend is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      patient: '/api/patient',
      doctor: '/api/doctor',
      nurse: '/api/nurse',
      lab: '/api/lab',
      pharmacist: '/api/pharmacist',
      billing: '/api/billing',
      admin: '/api/admin',
      ai: '/api/ai',
    },
  });
});

// Seed doctors endpoint — hit once to populate departments & doctors
app.post('/api/seed-doctors', async (req, res) => {
  try {
    const User = require('./models/User');
    const Doctor = require('./models/Doctor');
    const bcrypt = require('bcryptjs');

    const doctors = [
      { name: 'Dr. Sarah Johnson', email: 'sarah@carebridge.com', specialization: 'Cardiologist', department: 'Cardiology', fee: 800, days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
      { name: 'Dr. Anil Mehta', email: 'anil@carebridge.com', specialization: 'Cardiologist', department: 'Cardiology', fee: 750, days: ['Monday','Wednesday','Friday'] },
      { name: 'Dr. Priya Sharma', email: 'priya@carebridge.com', specialization: 'Dermatologist', department: 'Dermatology', fee: 600, days: ['Monday','Tuesday','Thursday','Friday'] },
      { name: 'Dr. Ravi Kumar', email: 'ravi@carebridge.com', specialization: 'Dermatologist', department: 'Dermatology', fee: 550, days: ['Tuesday','Wednesday','Thursday','Saturday'] },
      { name: 'Dr. Emily Chen', email: 'emily@carebridge.com', specialization: 'Neurologist', department: 'Neurology', fee: 900, days: ['Monday','Tuesday','Wednesday','Friday'] },
      { name: 'Dr. James Wilson', email: 'james@carebridge.com', specialization: 'Orthopedic Surgeon', department: 'Orthopedics', fee: 850, days: ['Monday','Wednesday','Thursday','Friday'] },
      { name: 'Dr. Neha Gupta', email: 'neha@carebridge.com', specialization: 'Pediatrician', department: 'Pediatrics', fee: 500, days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
      { name: 'Dr. Rajesh Patel', email: 'rajesh@carebridge.com', specialization: 'General Physician', department: 'General Medicine', fee: 400, days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
      { name: 'Dr. Lisa Anderson', email: 'lisa@carebridge.com', specialization: 'General Physician', department: 'General Medicine', fee: 400, days: ['Monday','Wednesday','Friday','Saturday'] },
      { name: 'Dr. Suresh Reddy', email: 'suresh@carebridge.com', specialization: 'ENT Specialist', department: 'ENT', fee: 650, days: ['Tuesday','Thursday','Friday','Saturday'] },
      { name: 'Dr. Maria Lopez', email: 'maria@carebridge.com', specialization: 'Ophthalmologist', department: 'Ophthalmology', fee: 700, days: ['Monday','Tuesday','Thursday'] },
      { name: 'Dr. Kavitha Nair', email: 'kavitha@carebridge.com', specialization: 'Psychiatrist', department: 'Psychiatry', fee: 900, days: ['Monday','Wednesday','Friday'] },
      { name: 'Dr. Deepa Iyer', email: 'deepa@carebridge.com', specialization: 'Gynecologist', department: 'Gynecology', fee: 700, days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
    ];

    let created = 0, updated = 0;
    for (const doc of doctors) {
      const existing = await User.findOne({ email: doc.email });
      if (existing) {
        await Doctor.findOneAndUpdate(
          { user_id: existing._id },
          { department: doc.department, specialization: doc.specialization, consultation_fee: doc.fee, available_days: doc.days },
          { upsert: true }
        );
        updated++;
      } else {
        const user = await User.create({ name: doc.name, email: doc.email, password_hash: 'Doctor@123', role: 'doctor' });
        await Doctor.create({
          user_id: user._id, specialization: doc.specialization, department: doc.department,
          consultation_fee: doc.fee, available_days: doc.days, license_number: `LIC-${Date.now().toString(36).toUpperCase()}`,
        });
        created++;
      }
    }

    res.json({ success: true, message: `Seeded! Created: ${created}, Updated: ${updated}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Email test endpoints
const { verifyEmailConfig, sendTestEmail } = require('./utils/emailService');

app.get('/api/email/verify', async (req, res) => {
  const result = await verifyEmailConfig();
  res.json({ success: result.ok, ...result });
});

app.post('/api/email/test', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'Provide "to" email address in body' });
  console.log(`Sending test email to ${to}...`);
  const result = await sendTestEmail(to);
  res.json({ success: result.ok, ...result });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/nurse', require('./routes/nurse'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/pharmacist', require('./routes/pharmacist'));
app.use('/api/billing', require('./routes/billing'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏥 Aurora Health Backend running on port ${PORT}`);
  console.log(`📋 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🤖 AI Engine: ${process.env.OPENAI_API_KEY ? 'OpenAI GPT' : 'Rule-based (set OPENAI_API_KEY for GPT)'}\n`);
});

module.exports = app;
