const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Case = require('../models/Case');

// GET /api/patient/profile
router.get('/profile', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    res.json({
      success: true,
      data: {
        user: { id: req.user._id, name: req.user.name, email: req.user.email },
        profile: patient,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/medical-history
router.get('/medical-history', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const [records, prescriptions, admissions] = await Promise.all([
      MedicalRecord.find({ patient_id: patient._id })
        .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
        .sort({ created_at: -1 }),
      Prescription.find({ patient_id: patient._id, is_active: true })
        .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
        .sort({ created_at: -1 }),
      Admission.find({ patient_id: patient._id }).sort({ admission_date: -1 }),
    ]);

    res.json({
      success: true,
      data: { medical_records: records, active_prescriptions: prescriptions, admissions },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/appointments
router.get('/appointments', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const appointments = await Appointment.find({ patient_id: patient._id })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ appointment_date: -1 });

    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/departments — list departments that have active doctors
router.get('/departments', protect, authorize('patient'), async (req, res) => {
  try {
    const departments = await Doctor.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const result = departments.map((d) => ({
      name: d._id || 'General Medicine',
      doctorCount: d.count,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/doctors-by-department?department=Cardiology
router.get('/doctors-by-department', protect, authorize('patient'), async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'department query param is required' });
    }

    const doctors = await Doctor.find({ department })
      .populate('user_id', 'name email');

    const result = doctors.map((doc) => ({
      _id: doc._id,
      name: doc.user_id?.name || 'Doctor',
      specialization: doc.specialization,
      department: doc.department,
      consultation_fee: doc.consultation_fee,
      available_days: doc.available_days,
      start_hour: doc.start_hour,
      end_hour: doc.end_hour,
      slot_duration: doc.slot_duration,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/doctor-slots?doctorId=XXX&date=YYYY-MM-DD
router.get('/doctor-slots', protect, authorize('patient'), async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'doctorId and date are required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const dayOfWeek = new Date(date + 'T12:00:00.000Z')
      .toLocaleDateString('en-US', { weekday: 'long' });

    if (!doctor.available_days.includes(dayOfWeek)) {
      return res.json({
        success: true,
        data: { available: [], booked: [], doctorAvailable: false, message: `Doctor is not available on ${dayOfWeek}s` },
      });
    }

    const startH = doctor.start_hour || 9;
    const endH = doctor.end_hour || 17;
    const duration = doctor.slot_duration || 30;

    const allSlots = [];
    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += duration) {
        allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }

    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const bookedAppointments = await Appointment.find({
      doctor_id: doctorId,
      appointment_date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'cancelled' },
    }).select('appointment_date time_slot');

    const bookedSlots = bookedAppointments.map((a) => {
      if (a.time_slot) return a.time_slot;
      const d = new Date(a.appointment_date);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    });

    const available = allSlots.filter((s) => !bookedSlots.includes(s));

    res.json({
      success: true,
      data: { available, booked: bookedSlots, doctorAvailable: true, allSlots },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/booked-slots?date=YYYY-MM-DD — all booked slots for a date (legacy)
router.get('/booked-slots', protect, authorize('patient'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'date query param is required' });
    }

    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const bookedAppointments = await Appointment.find({
      appointment_date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'cancelled' },
    }).select('appointment_date');

    const bookedSlots = bookedAppointments.map((a) => {
      const d = new Date(a.appointment_date);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });

    res.json({ success: true, data: bookedSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/patient/book-appointment
router.post('/book-appointment', protect, authorize('patient'), async (req, res) => {
  try {
    const { appointment_date, reason, doctor_id, department, time_slot } = req.body;

    if (!appointment_date) {
      return res.status(400).json({ success: false, message: 'appointment_date is required' });
    }

    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const requestedDate = new Date(appointment_date);
    let selectedDoctor;

    if (doctor_id) {
      selectedDoctor = await Doctor.findById(doctor_id);
      if (!selectedDoctor) {
        return res.status(404).json({ success: false, message: 'Selected doctor not found' });
      }

      const slotStart = new Date(requestedDate);
      const slotEnd = new Date(requestedDate.getTime() + (selectedDoctor.slot_duration || 30) * 60 * 1000);

      const conflict = await Appointment.findOne({
        doctor_id,
        status: { $ne: 'cancelled' },
        appointment_date: { $gte: slotStart, $lt: slotEnd },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'This slot is already booked with this doctor. Please choose a different slot.',
        });
      }
    } else {
      const query = department ? { department } : {};
      const allDoctors = await Doctor.find(query);
      if (allDoctors.length === 0) {
        return res.status(400).json({ success: false, message: 'No doctors available.' });
      }

      const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const availableDoctors = allDoctors.filter(
        (d) => !d.available_days || d.available_days.length === 0 || d.available_days.includes(dayOfWeek)
      );

      if (availableDoctors.length === 0) {
        return res.status(400).json({ success: false, message: `No doctors available on ${dayOfWeek}.` });
      }

      const doctorLoads = await Appointment.aggregate([
        { $match: { status: 'scheduled', doctor_id: { $in: availableDoctors.map((d) => d._id) } } },
        { $group: { _id: '$doctor_id', count: { $sum: 1 } } },
      ]);

      const loadMap = {};
      doctorLoads.forEach((d) => { loadMap[d._id.toString()] = d.count; });

      selectedDoctor = availableDoctors[0];
      let minCount = loadMap[availableDoctors[0]._id.toString()] || 0;
      for (const doc of availableDoctors) {
        const count = loadMap[doc._id.toString()] || 0;
        if (count < minCount) {
          minCount = count;
          selectedDoctor = doc;
        }
      }

      const slotStart = new Date(requestedDate);
      const slotEnd = new Date(requestedDate.getTime() + (selectedDoctor.slot_duration || 30) * 60 * 1000);
      const conflict = await Appointment.findOne({
        doctor_id: selectedDoctor._id,
        status: { $ne: 'cancelled' },
        appointment_date: { $gte: slotStart, $lt: slotEnd },
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'This slot is not available. Please choose a different time.',
        });
      }
    }

    const appointment = await Appointment.create({
      patient_id: patient._id,
      doctor_id: selectedDoctor._id,
      appointment_date: requestedDate,
      time_slot: time_slot || null,
      department: department || selectedDoctor.department,
      reason,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } });

    const newCase = await Case.create({
      patient_id: patient._id,
      doctor_id: selectedDoctor._id,
      title: reason || 'General Consultation',
      stages: Case.buildDefaultStages(),
      current_stage: 'doctor_consultation',
      appointment_id: appointment._id,
    });

    res.status(201).json({
      success: true,
      message: `Appointment booked with Dr. ${populated.doctor_id?.user_id?.name || 'Doctor'} (${department || selectedDoctor.department}).`,
      data: populated,
      case_id: newCase._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/discharge-summary
router.get('/discharge-summary', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const latestAdmission = await Admission.findOne({
      patient_id: patient._id,
      status: 'discharged',
      discharge_summary: { $exists: true, $ne: null },
    }).sort({ discharge_date: -1 });

    if (!latestAdmission) {
      return res.status(404).json({ success: false, message: 'No discharge summary found' });
    }

    res.json({ success: true, data: latestAdmission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/patient/confirm-followup
router.post('/confirm-followup', protect, authorize('patient'), async (req, res) => {
  try {
    const { admission_id, follow_up_date } = req.body;

    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const admission = await Admission.findOne({ _id: admission_id, patient_id: patient._id });
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }

    admission.follow_up_confirmed = true;
    admission.follow_up_date = follow_up_date ? new Date(follow_up_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await admission.save();

    res.json({ success: true, message: 'Follow-up confirmed', data: admission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/cases
router.get('/cases', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const cases = await Case.find({ patient_id: patient._id })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/case/:id
router.get('/case/:id', protect, authorize('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ user_id: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const caseDoc = await Case.findOne({ _id: req.params.id, patient_id: patient._id })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .populate('appointment_id');

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    res.json({ success: true, data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
