const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Case = require('../models/Case');
const { sendConsultationEmail } = require('../utils/emailService');

// GET /api/billing/pending — cases in billing stage or with generated/unpaid invoices
router.get('/pending', protect, authorize('billing_officer'), async (req, res) => {
  try {
    const cases = await Case.find({
      $or: [
        { status: 'active', current_stage: 'billing' },
        { status: 'active', 'billing.status': 'generated' },
      ],
    })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/billing/case/:caseId/generate — auto-calculate and generate invoice
router.post('/case/:caseId/generate', protect, authorize('billing_officer'), async (req, res) => {
  try {
    const { consultation_fee, extra_items } = req.body;
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const consFee = consultation_fee || 500;
    const labCharges = caseDoc.lab_tests.reduce((sum, t) => sum + (t.cost || 0), 0);
    const medicineCost = caseDoc.prescriptions.reduce((sum, p) => sum + (p.cost || 0), 0);

    caseDoc.billing.consultation_fee = consFee;
    caseDoc.billing.lab_charges = labCharges;
    caseDoc.billing.medicine_cost = medicineCost;

    caseDoc.billing.items = [
      { description: 'Consultation Fee', amount: consFee, category: 'consultation' },
    ];

    if (labCharges > 0) {
      caseDoc.billing.items.push({ description: 'Lab Charges', amount: labCharges, category: 'lab' });
    }
    if (medicineCost > 0) {
      caseDoc.billing.items.push({ description: 'Medicine Cost', amount: medicineCost, category: 'medicine' });
    }

    if (extra_items && Array.isArray(extra_items)) {
      for (const item of extra_items) {
        if (item.description && item.amount) {
          caseDoc.billing.items.push(item);
        }
      }
    }

    caseDoc.billing.total = caseDoc.billing.items.reduce((sum, i) => sum + (i.amount || 0), 0);
    caseDoc.billing.status = 'generated';
    caseDoc.billing.generated_at = new Date();

    await caseDoc.save();
    res.json({ success: true, message: 'Invoice generated', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/billing/case/:caseId/mark-paid — mark paid and close case
router.post('/case/:caseId/mark-paid', protect, authorize('billing_officer'), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name email' } });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    caseDoc.billing.status = 'paid';
    caseDoc.billing.paid_at = new Date();

    const billingStage = caseDoc.stages.find(s => s.name === 'billing');
    if (billingStage) { billingStage.status = 'completed'; billingStage.completed_at = new Date(); }

    const closedStage = caseDoc.stages.find(s => s.name === 'closed');
    if (closedStage) { closedStage.status = 'completed'; closedStage.started_at = new Date(); closedStage.completed_at = new Date(); }
    caseDoc.current_stage = 'closed';
    caseDoc.status = 'completed';

    await caseDoc.save();

    const patientEmail = caseDoc.patient_id?.user_id?.email;
    const patientName = caseDoc.patient_id?.user_id?.name || 'Patient';
    if (patientEmail) {
      sendConsultationEmail(patientEmail, patientName, caseDoc).catch(() => {});
    }

    res.json({ success: true, message: 'Payment received — case closed', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
