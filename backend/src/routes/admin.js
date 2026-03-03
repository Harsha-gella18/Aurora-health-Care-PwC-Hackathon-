const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admission = require('../models/Admission');
const Appointment = require('../models/Appointment');
const NurseTask = require('../models/NurseTask');

// GET /api/admin/dashboard
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalNurses,
      totalLabTechs,
      totalPharmacists,
      totalBillers,
      activeAdmissions,
      dischargedToday,
      scheduledAppointments,
      highRiskPatients,
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      User.countDocuments({ role: 'nurse' }),
      User.countDocuments({ role: 'lab_technician' }),
      User.countDocuments({ role: 'pharmacist' }),
      User.countDocuments({ role: 'billing_officer' }),
      Admission.countDocuments({ status: 'admitted' }),
      Admission.countDocuments({
        status: 'discharged',
        discharge_date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Appointment.countDocuments({ status: 'scheduled' }),
      Admission.countDocuments({ risk_level: 'High', status: 'discharged' }),
    ]);

    const totalStaff = totalDoctors + totalNurses + totalLabTechs + totalPharmacists + totalBillers;

    const recentAdmissions = await Admission.find({ status: 'admitted' })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ admission_date: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          total_patients: totalPatients,
          total_doctors: totalDoctors,
          total_nurses: totalNurses,
          total_lab_techs: totalLabTechs,
          total_pharmacists: totalPharmacists,
          total_billers: totalBillers,
          total_staff: totalStaff,
          active_admissions: activeAdmissions,
          discharged_today: dischargedToday,
          scheduled_appointments: scheduledAppointments,
          high_risk_patients: highRiskPatients,
        },
        recent_admissions: recentAdmissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/readmission-stats
router.get('/readmission-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, highRisk, mediumRisk, lowRisk, withFollowUp] = await Promise.all([
      Admission.countDocuments({ status: 'discharged', discharge_date: { $gte: since } }),
      Admission.countDocuments({ status: 'discharged', risk_level: 'High', discharge_date: { $gte: since } }),
      Admission.countDocuments({ status: 'discharged', risk_level: 'Medium', discharge_date: { $gte: since } }),
      Admission.countDocuments({ status: 'discharged', risk_level: 'Low', discharge_date: { $gte: since } }),
      Admission.countDocuments({ status: 'discharged', follow_up_confirmed: true, discharge_date: { $gte: since } }),
    ]);

    const readmissionRate = total > 0 ? parseFloat(((highRisk / total) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        period_days: Number(days),
        total_discharged: total,
        risk_breakdown: { high: highRisk, medium: mediumRisk, low: lowRisk },
        follow_up_rate: total > 0 ? `${((withFollowUp / total) * 100).toFixed(1)}%` : '0%',
        estimated_readmission_rate: `${readmissionRate}%`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/high-risk-patients
router.get('/high-risk-patients', protect, authorize('admin'), async (req, res) => {
  try {
    const highRiskAdmissions = await Admission.find({
      risk_level: 'High',
      status: 'discharged',
      follow_up_confirmed: false,
    })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .sort({ readmission_risk_score: -1 })
      .limit(20);

    res.json({
      success: true,
      count: highRiskAdmissions.length,
      data: highRiskAdmissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/staff-overtime  
router.get('/staff-overtime', protect, authorize('admin'), async (req, res) => {
  try {
    const nurses = await User.find({ role: 'nurse' }).select('name email');

    const nurseWorkload = await Promise.all(
      nurses.map(async (nurse) => {
        const [pendingTasks, completedToday] = await Promise.all([
          NurseTask.countDocuments({ nurse_id: nurse._id, status: { $ne: 'completed' } }),
          NurseTask.countDocuments({
            nurse_id: nurse._id,
            status: 'completed',
            completed_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          }),
        ]);
        return {
          nurse: { id: nurse._id, name: nurse.name, email: nurse.email },
          pending_tasks: pendingTasks,
          completed_today: completedToday,
          workload_status: pendingTasks > 10 ? 'Overloaded' : pendingTasks > 5 ? 'Busy' : 'Normal',
        };
      })
    );

    const doctors = await User.find({ role: 'doctor' }).select('name email');
    const doctorWorkload = await Promise.all(
      doctors.map(async (doc) => {
        const doctor = await Doctor.findOne({ user_id: doc._id });
        const todayAppointments = await Appointment.countDocuments({
          doctor_id: doctor?._id,
          appointment_date: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        });
        return {
          doctor: { id: doc._id, name: doc.name, specialization: doctor?.specialization },
          appointments_today: todayAppointments,
          workload_status: todayAppointments > 15 ? 'Overloaded' : todayAppointments > 8 ? 'Busy' : 'Normal',
        };
      })
    );

    res.json({
      success: true,
      data: { nurses: nurseWorkload, doctors: doctorWorkload },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/bed-occupancy — real bed data from admissions
router.get('/bed-occupancy', protect, authorize('admin'), async (req, res) => {
  try {
    const wardCapacity = { ICU: 25, General: 60, Emergency: 15, Pediatric: 20, Surgical: 30 };
    const occupancy = await Admission.aggregate([
      { $match: { status: 'admitted' } },
      { $group: { _id: '$ward', occupied: { $sum: 1 } } },
    ]);

    const data = Object.entries(wardCapacity).map(([name, total]) => {
      const match = occupancy.find((o) => o._id === name);
      return { name, occupied: match ? match.occupied : 0, total };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/alerts — operational alerts
router.get('/alerts', protect, authorize('admin'), async (req, res) => {
  try {
    const alerts = [];

    const wardCapacity = { ICU: 25, General: 60, Emergency: 15, Pediatric: 20, Surgical: 30 };
    const occupancy = await Admission.aggregate([
      { $match: { status: 'admitted' } },
      { $group: { _id: '$ward', count: { $sum: 1 } } },
    ]);
    occupancy.forEach((w) => {
      const cap = wardCapacity[w._id] || 30;
      const pct = Math.round((w.count / cap) * 100);
      if (pct >= 85) {
        alerts.push({ type: 'critical', message: `${w._id} ward at ${pct}% capacity (${w.count}/${cap} beds)` });
      }
    });

    const nurses = await User.find({ role: 'nurse' }).select('_id name');
    for (const nurse of nurses) {
      const pending = await NurseTask.countDocuments({ nurse_id: nurse._id, status: { $ne: 'completed' } });
      if (pending > 10) {
        alerts.push({ type: 'warning', message: `${nurse.name} has ${pending} pending tasks (overloaded)` });
      }
    }

    const unconfirmedFollowups = await Admission.countDocuments({
      status: 'discharged',
      risk_level: 'High',
      follow_up_confirmed: false,
    });
    if (unconfirmedFollowups > 0) {
      alerts.push({ type: 'critical', message: `${unconfirmedFollowups} high-risk patient(s) without confirmed follow-up` });
    }

    const todayScheduled = await Appointment.countDocuments({
      status: 'scheduled',
      appointment_date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });
    if (todayScheduled > 20) {
      alerts.push({ type: 'info', message: `${todayScheduled} appointments scheduled for today` });
    }

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/all-patients
router.get('/all-patients', protect, authorize('admin'), async (req, res) => {
  try {
    const patients = await Patient.find().populate('user_id', 'name email created_at');
    res.json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/all-staff — enhanced version returning all non-patient users
router.get('/all-staff', protect, authorize('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: { $nin: ['patient'] } }).select('-password_hash').sort({ createdAt: -1 });

    const enriched = await Promise.all(staff.map(async (s) => {
      const obj = s.toObject();
      if (s.role === 'doctor') {
        const doc = await Doctor.findOne({ user_id: s._id });
        obj.specialization = doc?.specialization;
        obj.department = doc?.department;
      }
      return obj;
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/assign-nurse-task
router.post('/assign-nurse-task', protect, authorize('admin'), async (req, res) => {
  try {
    const { patient_id, nurse_id, task_description, frequency, warning_signs, due_date } = req.body;
    if (!patient_id || !nurse_id || !task_description) {
      return res.status(400).json({ success: false, message: 'patient_id, nurse_id, task_description are required' });
    }
    const NurseTask = require('../models/NurseTask');
    const task = await NurseTask.create({ patient_id, nurse_id, task_description, frequency, warning_signs, due_date });
    res.status(201).json({ success: true, message: 'Nurse task assigned', data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const { page = 1, limit = 50, action, role } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (role) filter.user_role = role;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: Number(page), data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/create-staff — admin creates doctor/nurse/lab_technician/pharmacist/billing_officer
router.post('/create-staff', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      name, email, password, role,
      specialization, license_number, department,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'name, email, password, role are required' });
    }

    const allowedRoles = ['doctor', 'nurse', 'lab_technician', 'pharmacist', 'billing_officer', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password_hash: password, role });

    if (role === 'doctor') {
      await Doctor.create({
        user_id: user._id,
        specialization: specialization || 'General',
        license_number: license_number || '',
        department: department || 'General Medicine',
      });
    }

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/update-staff/:userId — admin edits staff details
router.put('/update-staff/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, specialization, license_number, department } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'patient') return res.status(400).json({ success: false, message: 'Cannot edit patients from staff panel' });

    if (name) user.name = name;
    if (email && email !== user.email) {
      const dup = await User.findOne({ email });
      if (dup) return res.status(400).json({ success: false, message: 'Email already in use' });
      user.email = email;
    }
    if (password && password.length >= 6) user.password_hash = password;
    await user.save();

    if (user.role === 'doctor') {
      const updates = {};
      if (specialization) updates.specialization = specialization;
      if (license_number !== undefined) updates.license_number = license_number;
      if (department) updates.department = department;
      if (Object.keys(updates).length > 0) {
        await Doctor.findOneAndUpdate({ user_id: user._id }, updates, { upsert: true });
      }
    }

    res.json({ success: true, message: 'Staff updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/delete-staff/:userId
router.delete('/delete-staff/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'patient') return res.status(400).json({ success: false, message: 'Cannot delete patients from staff panel' });

    if (user.role === 'doctor') {
      await Doctor.deleteOne({ user_id: user._id });
    }

    await User.deleteOne({ _id: user._id });
    res.json({ success: true, message: 'Staff member deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
