require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Doctor = require('./src/models/Doctor');

const doctors = [
  { name: 'Dr. Sarah Johnson', email: 'sarah@carebridge.com', specialization: 'Cardiologist', department: 'Cardiology', fee: 800, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  { name: 'Dr. Anil Mehta', email: 'anil@carebridge.com', specialization: 'Cardiologist', department: 'Cardiology', fee: 750, days: ['Monday', 'Wednesday', 'Friday'] },
  { name: 'Dr. Priya Sharma', email: 'priya@carebridge.com', specialization: 'Dermatologist', department: 'Dermatology', fee: 600, days: ['Monday', 'Tuesday', 'Thursday', 'Friday'] },
  { name: 'Dr. Ravi Kumar', email: 'ravi@carebridge.com', specialization: 'Dermatologist', department: 'Dermatology', fee: 550, days: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'] },
  { name: 'Dr. Emily Chen', email: 'emily@carebridge.com', specialization: 'Neurologist', department: 'Neurology', fee: 900, days: ['Monday', 'Tuesday', 'Wednesday', 'Friday'] },
  { name: 'Dr. James Wilson', email: 'james@carebridge.com', specialization: 'Orthopedic Surgeon', department: 'Orthopedics', fee: 850, days: ['Monday', 'Wednesday', 'Thursday', 'Friday'] },
  { name: 'Dr. Neha Gupta', email: 'neha@carebridge.com', specialization: 'Pediatrician', department: 'Pediatrics', fee: 500, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  { name: 'Dr. Rajesh Patel', email: 'rajesh@carebridge.com', specialization: 'General Physician', department: 'General Medicine', fee: 400, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  { name: 'Dr. Lisa Anderson', email: 'lisa@carebridge.com', specialization: 'General Physician', department: 'General Medicine', fee: 400, days: ['Monday', 'Wednesday', 'Friday', 'Saturday'] },
  { name: 'Dr. Suresh Reddy', email: 'suresh@carebridge.com', specialization: 'ENT Specialist', department: 'ENT', fee: 650, days: ['Tuesday', 'Thursday', 'Friday', 'Saturday'] },
  { name: 'Dr. Maria Lopez', email: 'maria@carebridge.com', specialization: 'Ophthalmologist', department: 'Ophthalmology', fee: 700, days: ['Monday', 'Tuesday', 'Thursday'] },
  { name: 'Dr. Kavitha Nair', email: 'kavitha@carebridge.com', specialization: 'Psychiatrist', department: 'Psychiatry', fee: 900, days: ['Monday', 'Wednesday', 'Friday'] },
  { name: 'Dr. Deepa Iyer', email: 'deepa@carebridge.com', specialization: 'Gynecologist', department: 'Gynecology', fee: 700, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
];

async function seed() {
  await connectDB();
  let created = 0;
  let skipped = 0;

  for (const doc of doctors) {
    const existing = await User.findOne({ email: doc.email });
    if (existing) {
      const doctorProfile = await Doctor.findOne({ user_id: existing._id });
      if (doctorProfile) {
        doctorProfile.department = doc.department;
        doctorProfile.specialization = doc.specialization;
        doctorProfile.consultation_fee = doc.fee;
        doctorProfile.available_days = doc.days;
        await doctorProfile.save();
        console.log(`  Updated: ${doc.name} -> ${doc.department}`);
      }
      skipped++;
      continue;
    }

    const user = await User.create({
      name: doc.name,
      email: doc.email,
      password_hash: 'Doctor@123',
      role: 'doctor',
    });

    await Doctor.create({
      user_id: user._id,
      specialization: doc.specialization,
      department: doc.department,
      consultation_fee: doc.fee,
      available_days: doc.days,
      license_number: `LIC-${Date.now().toString(36).toUpperCase()}`,
    });

    console.log(`  Created: ${doc.name} (${doc.department})`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Updated/Skipped: ${skipped}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
