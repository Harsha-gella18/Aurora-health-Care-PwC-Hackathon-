const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Admission = require('../models/Admission');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Case = require('../models/Case');
const { generateConsultationPDF } = require('../utils/pdfGenerator');
const { sendConsultationEmail } = require('../utils/emailService');

// GET /api/doctor/patients — only patients assigned to this doctor, enriched with case stats
router.get('/patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const doctorCases = await Case.find({ doctor_id: doctor._id })
      .select('patient_id status current_stage createdAt diagnosis title')
      .sort({ createdAt: -1 });

    const apptPatientIds = await Appointment.find({ doctor_id: doctor._id }).distinct('patient_id');

    const patientMap = {};
    for (const c of doctorCases) {
      const pid = c.patient_id?.toString();
      if (!pid) continue;
      if (!patientMap[pid]) {
        patientMap[pid] = { totalCases: 0, activeCases: 0, lastCaseDate: c.createdAt, lastDiagnosis: c.diagnosis, lastTitle: c.title };
      }
      patientMap[pid].totalCases++;
      if (c.status === 'active') patientMap[pid].activeCases++;
    }

    for (const apId of apptPatientIds) {
      const pid = apId.toString();
      if (!patientMap[pid]) {
        patientMap[pid] = { totalCases: 0, activeCases: 0, lastCaseDate: null, lastDiagnosis: null, lastTitle: null };
      }
    }

    const allIds = Object.keys(patientMap);
    const patients = await Patient.find({ _id: { $in: allIds } }).populate('user_id', 'name email');

    const enriched = patients.map(p => {
      const stats = patientMap[p._id.toString()] || {};
      return {
        ...p.toObject(),
        totalCases: stats.totalCases || 0,
        activeCases: stats.activeCases || 0,
        lastCaseDate: stats.lastCaseDate || null,
        lastDiagnosis: stats.lastDiagnosis || null,
        lastTitle: stats.lastTitle || null,
      };
    });

    enriched.sort((a, b) => {
      if (a.activeCases && !b.activeCases) return -1;
      if (!a.activeCases && b.activeCases) return 1;
      const dateA = a.lastCaseDate ? new Date(a.lastCaseDate) : new Date(0);
      const dateB = b.lastCaseDate ? new Date(b.lastCaseDate) : new Date(0);
      return dateB - dateA;
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/doctor/today-cases — active cases assigned to this doctor
router.get('/today-cases', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const cases = await Case.find({
      doctor_id: doctor._id,
      status: 'active',
      current_stage: { $in: ['doctor_consultation', 'doctor_review'] },
    })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/doctor/all-cases — all cases for this doctor
router.get('/all-cases', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const cases = await Case.find({ doctor_id: doctor._id })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/doctor/case/:caseId — only the assigned doctor can view
router.get('/case/:caseId', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const caseDoc = await Case.findById(req.params.caseId)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .populate('appointment_id');

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    if (caseDoc.doctor_id?._id.toString() !== doctor._id.toString()) {
      return res.status(403).json({ success: false, message: 'This case is not assigned to you' });
    }

    res.json({ success: true, data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/diagnose — add diagnosis and symptoms
router.post('/case/:caseId/diagnose', protect, authorize('doctor'), async (req, res) => {
  try {
    const { diagnosis, symptoms, notes } = req.body;
    if (!diagnosis) return res.status(400).json({ success: false, message: 'diagnosis is required' });

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.diagnosis = diagnosis;
    if (symptoms) caseDoc.symptoms = Array.isArray(symptoms) ? symptoms : symptoms.split(',').map(s => s.trim()).filter(Boolean);

    const stage = caseDoc.stages.find(s => s.name === caseDoc.current_stage);
    if (stage && notes) {
      stage.notes = stage.notes ? stage.notes + '\n' + notes : notes;
    }

    await caseDoc.save();
    res.json({ success: true, message: 'Diagnosis added', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/request-lab — request lab tests, moves case to lab stage
router.post('/case/:caseId/request-lab', protect, authorize('doctor'), async (req, res) => {
  try {
    const { tests } = req.body;
    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ success: false, message: 'tests array is required' });
    }

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.lab_required = true;
    caseDoc.lab_sent = true;

    for (const t of tests) {
      caseDoc.lab_tests.push({
        name: t.name || t,
        priority: t.priority || 'normal',
        ordered_at: new Date(),
      });
    }

    const labStage = caseDoc.stages.find(s => s.name === 'lab');
    if (labStage) { labStage.status = 'pending'; }
    const reviewStage = caseDoc.stages.find(s => s.name === 'doctor_review');
    if (reviewStage) { reviewStage.status = 'pending'; }

    const currentStage = caseDoc.stages.find(s => s.name === caseDoc.current_stage);
    if (currentStage) { currentStage.status = 'completed'; currentStage.completed_at = new Date(); }

    if (labStage) { labStage.status = 'in_progress'; labStage.started_at = new Date(); }
    caseDoc.current_stage = 'lab';

    await caseDoc.save();
    res.json({ success: true, message: 'Lab tests ordered, case sent to lab', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/schedule-surgery — schedule surgery, moves case to surgery stage
router.post('/case/:caseId/schedule-surgery', protect, authorize('doctor'), async (req, res) => {
  try {
    const { surgery_type, scheduled_date, notes, pre_op_instructions, estimated_cost } = req.body;
    if (!surgery_type) return res.status(400).json({ success: false, message: 'surgery_type is required' });

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.surgery_required = true;
    caseDoc.surgery_sent = true;
    caseDoc.surgery = {
      type: surgery_type,
      scheduled_date: scheduled_date ? new Date(scheduled_date) : new Date(),
      notes: notes || '',
      pre_op_instructions: pre_op_instructions || '',
      status: 'scheduled',
      estimated_cost: estimated_cost || 0,
    };

    const surgeryStage = caseDoc.stages.find(s => s.name === 'surgery');
    if (surgeryStage) { surgeryStage.status = 'pending'; }
    const reviewStage = caseDoc.stages.find(s => s.name === 'doctor_review');
    if (reviewStage && reviewStage.status === 'skipped') { reviewStage.status = 'pending'; }

    const currentStage = caseDoc.stages.find(s => s.name === caseDoc.current_stage);
    if (currentStage) { currentStage.status = 'completed'; currentStage.completed_at = new Date(); }

    if (surgeryStage) { surgeryStage.status = 'in_progress'; surgeryStage.started_at = new Date(); }
    caseDoc.current_stage = 'surgery';

    await caseDoc.save();
    res.json({ success: true, message: 'Surgery scheduled, case moved to surgery stage', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/complete-surgery — mark surgery as completed, advance to doctor_review
router.post('/case/:caseId/complete-surgery', protect, authorize('doctor'), async (req, res) => {
  try {
    const { post_op_notes, surgeon_notes } = req.body;

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    if (!caseDoc.surgery) return res.status(400).json({ success: false, message: 'No surgery found on this case' });

    caseDoc.surgery.status = 'completed';
    caseDoc.surgery.completed_at = new Date();
    if (post_op_notes) caseDoc.surgery.post_op_notes = post_op_notes;
    if (surgeon_notes) caseDoc.surgery.surgeon_notes = surgeon_notes;

    const surgeryStage = caseDoc.stages.find(s => s.name === 'surgery');
    if (surgeryStage) { surgeryStage.status = 'completed'; surgeryStage.completed_at = new Date(); }

    const reviewStage = caseDoc.stages.find(s => s.name === 'doctor_review');
    if (reviewStage) { reviewStage.status = 'in_progress'; reviewStage.started_at = new Date(); }
    caseDoc.current_stage = 'doctor_review';

    await caseDoc.save();
    res.json({ success: true, message: 'Surgery completed, case moved to doctor review', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/add-prescription — add medicine to case
router.post('/case/:caseId/add-prescription', protect, authorize('doctor'), async (req, res) => {
  try {
    const { medication_name, dosage, frequency, duration, instructions } = req.body;
    if (!medication_name) return res.status(400).json({ success: false, message: 'medication_name is required' });

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.prescriptions.push({ medication_name, dosage, frequency, duration, instructions });
    await caseDoc.save();

    res.json({ success: true, message: 'Prescription added', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/doctor/case/:caseId/update-prescription/:prescId
router.put('/case/:caseId/update-prescription/:prescId', protect, authorize('doctor'), async (req, res) => {
  try {
    const { medication_name, dosage, frequency, duration, instructions } = req.body;
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const presc = caseDoc.prescriptions.find(p => p._id.toString() === req.params.prescId);
    if (!presc) return res.status(404).json({ success: false, message: 'Prescription not found' });

    if (medication_name !== undefined && medication_name !== '') presc.medication_name = medication_name;
    if (dosage !== undefined) presc.dosage = dosage;
    if (frequency !== undefined) presc.frequency = frequency;
    if (duration !== undefined) presc.duration = duration;
    if (instructions !== undefined) presc.instructions = instructions;

    await caseDoc.save();
    res.json({ success: true, message: 'Prescription updated', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/doctor/case/:caseId/remove-prescription/:prescId
router.delete('/case/:caseId/remove-prescription/:prescId', protect, authorize('doctor'), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const presc = caseDoc.prescriptions.find(p => p._id.toString() === req.params.prescId);
    if (!presc) return res.status(404).json({ success: false, message: 'Prescription not found' });

    caseDoc.prescriptions = caseDoc.prescriptions.filter(p => p._id.toString() !== req.params.prescId);
    await caseDoc.save();
    res.json({ success: true, message: 'Prescription removed', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/send-to-pharmacy — works from consultation OR review stage, generates PDF + emails patient
router.post('/case/:caseId/send-to-pharmacy', protect, authorize('doctor'), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    if (caseDoc.prescriptions.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one prescription before sending to pharmacy' });
    }
    if (!caseDoc.consultation_document) {
      return res.status(400).json({ success: false, message: 'Save a consultation document before sending to pharmacy' });
    }

    let pdfPath = null;
    try {
      pdfPath = await generateConsultationPDF(caseDoc);
      caseDoc.consultation_pdf_path = pdfPath;
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr.message);
    }

    caseDoc.pharmacy_sent = true;

    const currentStage = caseDoc.stages.find(s => s.name === caseDoc.current_stage);
    if (currentStage) { currentStage.status = 'completed'; currentStage.completed_at = new Date(); }

    const pharmacyStage = caseDoc.stages.find(s => s.name === 'pharmacy');
    if (pharmacyStage) { pharmacyStage.status = 'in_progress'; pharmacyStage.started_at = new Date(); }
    caseDoc.current_stage = 'pharmacy';

    await caseDoc.save();

    const patientEmail = caseDoc.patient_id?.user_id?.email;
    const patientName = caseDoc.patient_id?.user_id?.name || 'Patient';
    if (patientEmail) {
      sendConsultationEmail(patientEmail, patientName, caseDoc, pdfPath).catch(() => {});
    }

    res.json({
      success: true,
      message: `Case sent to pharmacy. ${pdfPath ? 'PDF generated.' : ''} ${patientEmail ? 'Email sent to patient.' : ''}`,
      data: caseDoc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/finalize-review — generate PDF, email patient, advance to billing
router.post('/case/:caseId/finalize-review', protect, authorize('doctor'), async (req, res) => {
  try {
    const { document } = req.body;

    const caseDoc = await Case.findById(req.params.caseId)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } });

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    if (document) {
      caseDoc.consultation_document = document;
    }

    let pdfPath = null;
    try {
      pdfPath = await generateConsultationPDF(caseDoc);
      caseDoc.consultation_pdf_path = pdfPath;
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr.message);
    }

    const reviewStage = caseDoc.stages.find(s => s.name === 'doctor_review');
    if (reviewStage) { reviewStage.status = 'completed'; reviewStage.completed_at = new Date(); }

    const billingStage = caseDoc.stages.find(s => s.name === 'billing');
    if (billingStage) { billingStage.status = 'in_progress'; billingStage.started_at = new Date(); }
    caseDoc.current_stage = 'billing';

    await caseDoc.save();

    const patientEmail = caseDoc.patient_id?.user_id?.email;
    const patientName = caseDoc.patient_id?.user_id?.name || 'Patient';
    if (patientEmail) {
      sendConsultationEmail(patientEmail, patientName, caseDoc, pdfPath).catch(() => {});
    }

    res.json({
      success: true,
      message: `Review finalized — sent to billing. ${pdfPath ? 'PDF generated.' : ''} ${patientEmail ? 'Email sent to patient.' : ''}`,
      data: caseDoc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/save-document — save consultation document
router.post('/case/:caseId/save-document', protect, authorize('doctor'), async (req, res) => {
  try {
    const { document } = req.body;
    if (!document) return res.status(400).json({ success: false, message: 'document is required' });

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.consultation_document = document;
    await caseDoc.save();

    res.json({ success: true, message: 'Consultation document saved', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/doctor/case/:caseId/notes
router.post('/case/:caseId/notes', protect, authorize('doctor'), async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ success: false, message: 'notes is required' });

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const stage = caseDoc.stages.find(s => s.name === caseDoc.current_stage);
    if (stage) {
      stage.notes = stage.notes ? stage.notes + '\n' + notes : notes;
    }

    await caseDoc.save();
    res.json({ success: true, message: 'Notes added', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/doctor/patient/:id — full patient details, separates my cases vs other doctor cases
router.get('/patient/:id', protect, authorize('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user_id: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const patient = await Patient.findById(req.params.id).populate('user_id', 'name email');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [records, prescriptions, admissions, appointments, allCases] = await Promise.all([
      MedicalRecord.find({ patient_id: patient._id }).sort({ created_at: -1 }),
      Prescription.find({ patient_id: patient._id }).sort({ created_at: -1 }),
      Admission.find({ patient_id: patient._id }).sort({ admission_date: -1 }),
      Appointment.find({ patient_id: patient._id })
        .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
        .sort({ appointment_date: -1 }),
      Case.find({ patient_id: patient._id })
        .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
        .sort({ createdAt: -1 }),
    ]);

    const myCases = allCases.filter(c => c.doctor_id?._id.toString() === doctor._id.toString());
    const otherDoctorCases = allCases.filter(c => c.doctor_id?._id.toString() !== doctor._id.toString());

    res.json({
      success: true,
      data: {
        patient,
        medical_records: records,
        prescriptions,
        admissions,
        appointments,
        cases: allCases,
        myCases,
        otherDoctorCases,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/doctor/readmission-risk/:patientId
router.get('/readmission-risk/:patientId', protect, authorize('doctor'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId).populate('user_id', 'name');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const admissions = await Admission.find({ patient_id: patient._id });
    const records = await MedicalRecord.find({ patient_id: patient._id });
    const prescriptions = await Prescription.find({ patient_id: patient._id, is_active: true });

    let age = 0;
    if (patient.date_of_birth) {
      age = Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const conditions = records.map(r => r.diagnosis);
    const previousAdmissions = admissions.filter(a => a.status === 'discharged').length;
    const medicationCount = prescriptions.length;

    let score = 0;
    if (age > 65) score += 0.25; else if (age > 50) score += 0.15;
    if (previousAdmissions >= 3) score += 0.3; else if (previousAdmissions >= 1) score += 0.15;
    if (medicationCount >= 5) score += 0.2; else if (medicationCount >= 3) score += 0.1;

    const chronic = ['hypertension', 'diabetes', 'heart failure', 'copd', 'kidney'];
    if (conditions.some(c => chronic.some(cc => c.toLowerCase().includes(cc)))) score += 0.2;
    score = Math.min(score, 1);

    let risk_level, recommendation;
    if (score >= 0.6) { risk_level = 'High'; recommendation = 'Schedule follow-up within 48 hours.'; }
    else if (score >= 0.3) { risk_level = 'Medium'; recommendation = 'Schedule follow-up within 1 week.'; }
    else { risk_level = 'Low'; recommendation = 'Routine follow-up in 2-4 weeks.'; }

    res.json({ success: true, data: { patient_name: patient.user_id?.name, age, risk_score: parseFloat(score.toFixed(2)), risk_level, recommendation } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
