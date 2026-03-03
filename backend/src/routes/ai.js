const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { summarizeHistory, simplifyDischarge, predictReadmissionRisk, generateNurseTasks, suggestDiagnosis, suggestPrescription, generateConsultationDoc, assessLabPriority, checkBillingAnomaly, summarizePastCases } = require('../utils/aiEngine');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Admission = require('../models/Admission');
const Case = require('../models/Case');

// POST /api/ai/summarize-history
router.post('/summarize-history', protect, async (req, res) => {
  try {
    const { patient_history, patient_id } = req.body;

    let historyText = patient_history;

    // If patient_id given, auto-build history from DB
    if (!historyText && patient_id) {
      const records = await MedicalRecord.find({ patient_id }).sort({ created_at: -1 }).limit(10);
      const prescriptions = await Prescription.find({ patient_id, is_active: true });
      const admissions = await Admission.find({ patient_id }).sort({ admission_date: -1 }).limit(5);

      historyText = [
        'DIAGNOSES & NOTES:',
        ...records.map((r) => `- ${r.diagnosis}: ${r.notes || ''}`),
        '\nACTIVE MEDICATIONS:',
        ...prescriptions.map((p) => `- ${p.medication_name} ${p.dosage} (${p.instructions || ''})`),
        '\nHOSPITAL ADMISSIONS:',
        ...admissions.map((a) => `- ${new Date(a.admission_date).toDateString()}: ${a.reason_for_admission || a.discharge_summary || 'N/A'}`),
      ].join('\n');
    }

    if (!historyText) {
      return res.status(400).json({ success: false, message: 'patient_history text or patient_id is required' });
    }

    const summary = await summarizeHistory(historyText);

    res.json({ success: true, data: { summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/simplify-discharge
router.post('/simplify-discharge', protect, async (req, res) => {
  try {
    const { discharge_text, admission_id } = req.body;

    let text = discharge_text;

    if (!text && admission_id) {
      const admission = await Admission.findById(admission_id);
      if (!admission || !admission.discharge_summary) {
        return res.status(404).json({ success: false, message: 'Discharge summary not found' });
      }
      text = admission.discharge_summary;
    }

    if (!text) {
      return res.status(400).json({ success: false, message: 'discharge_text or admission_id is required' });
    }

    const simple_explanation = await simplifyDischarge(text);

    // Save simplified text back to admission if admission_id was provided
    if (admission_id) {
      await Admission.findByIdAndUpdate(admission_id, { simplified_discharge: simple_explanation });
    }

    res.json({ success: true, data: { simple_explanation } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/predict-risk
router.post('/predict-risk', protect, async (req, res) => {
  try {
    const { age, conditions, previous_admissions, medication_count, patient_id } = req.body;

    let inputAge = age;
    let inputConditions = conditions || [];
    let inputPrevAdmissions = previous_admissions || 0;
    let inputMedCount = medication_count || 0;

    // Auto-populate from DB if patient_id given
    if (patient_id) {
      const patient = await Patient.findById(patient_id);
      if (patient && patient.date_of_birth) {
        inputAge = Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
      }
      const records = await MedicalRecord.find({ patient_id }).distinct('diagnosis');
      const prevAdmissions = await Admission.countDocuments({ patient_id, status: 'discharged' });
      const meds = await Prescription.countDocuments({ patient_id, is_active: true });

      if (!age) inputAge = inputAge || 0;
      if (!conditions) inputConditions = records;
      if (!previous_admissions) inputPrevAdmissions = prevAdmissions;
      if (!medication_count) inputMedCount = meds;
    }

    if (!inputAge && inputAge !== 0) {
      return res.status(400).json({ success: false, message: 'age is required (or provide patient_id)' });
    }

    const result = predictReadmissionRisk(inputAge, inputConditions, inputPrevAdmissions, inputMedCount);

    res.json({
      success: true,
      data: {
        input: {
          age: inputAge,
          conditions: inputConditions,
          previous_admissions: inputPrevAdmissions,
          medication_count: inputMedCount,
        },
        ...result,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/generate-nurse-tasks
router.post('/generate-nurse-tasks', protect, async (req, res) => {
  try {
    const { diagnosis } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ success: false, message: 'diagnosis is required' });
    }

    const tasks = await generateNurseTasks(diagnosis);

    res.json({ success: true, data: { tasks } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/suggest-diagnosis
router.post('/suggest-diagnosis', protect, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'symptoms is required' });

    const suggestion = await suggestDiagnosis(symptoms);
    res.json({ success: true, data: { suggestion } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/suggest-prescription
router.post('/suggest-prescription', protect, async (req, res) => {
  try {
    const { diagnosis, symptoms } = req.body;
    if (!diagnosis) return res.status(400).json({ success: false, message: 'diagnosis is required' });

    const suggestion = await suggestPrescription(diagnosis, symptoms);
    res.json({ success: true, data: { suggestion } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/generate-consultation-doc
router.post('/generate-consultation-doc', protect, async (req, res) => {
  try {
    const { case_id } = req.body;
    if (!case_id) return res.status(400).json({ success: false, message: 'case_id is required' });

    const caseDoc = await Case.findById(case_id)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } });

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const caseInfo = {
      title: caseDoc.title,
      patient_name: caseDoc.patient_id?.user_id?.name,
      doctor_name: caseDoc.doctor_id?.user_id?.name,
      diagnosis: caseDoc.diagnosis,
      symptoms: caseDoc.symptoms,
      prescriptions: caseDoc.prescriptions,
      lab_tests: caseDoc.lab_tests,
      notes: caseDoc.stages?.find(s => s.name === caseDoc.current_stage)?.notes,
    };

    const document = await generateConsultationDoc(caseInfo);
    res.json({ success: true, data: { document } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/assess-lab-priority
router.post('/assess-lab-priority', protect, async (req, res) => {
  try {
    const { test_name, diagnosis, symptoms } = req.body;
    if (!test_name) return res.status(400).json({ success: false, message: 'test_name is required' });

    const priority = await assessLabPriority(test_name, diagnosis, symptoms);
    res.json({ success: true, data: { priority } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/check-billing
router.post('/check-billing', protect, async (req, res) => {
  try {
    const { billing_info } = req.body;
    if (!billing_info) return res.status(400).json({ success: false, message: 'billing_info is required' });

    const result = await checkBillingAnomaly(billing_info);
    res.json({ success: true, data: { analysis: result } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/summarize-past-cases
router.post('/summarize-past-cases', protect, async (req, res) => {
  try {
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id is required' });

    const cases = await Case.find({ patient_id })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ createdAt: -1 });

    if (cases.length === 0) return res.json({ success: true, data: { summary: 'No past cases found for this patient.' } });

    const casesData = cases.map(c => ({
      title: c.title,
      date: c.createdAt,
      status: c.status,
      diagnosis: c.diagnosis,
      symptoms: c.symptoms,
      doctor: c.doctor_id?.user_id?.name,
      prescriptions: c.prescriptions?.map(p => ({ name: p.medication_name, dosage: p.dosage })),
      lab_tests: c.lab_tests?.map(t => ({ name: t.name, results: t.results, status: t.status })),
      consultation_document: c.consultation_document ? c.consultation_document.substring(0, 300) : null,
    }));

    const summary = await summarizePastCases(casesData);
    res.json({ success: true, data: { summary, total_cases: cases.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
