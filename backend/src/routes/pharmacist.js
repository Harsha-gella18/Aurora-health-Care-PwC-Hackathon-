const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Case = require('../models/Case');

// GET /api/pharmacist/pending
router.get('/pending', protect, authorize('pharmacist'), async (req, res) => {
  try {
    const cases = await Case.find({
      status: 'active',
      $or: [
        { pharmacy_sent: true },
        { 'stages': { $elemMatch: { name: 'pharmacy', status: 'in_progress' } } },
      ],
      'stages': { $elemMatch: { name: 'pharmacy', status: { $in: ['in_progress', 'pending'] } } },
    })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacist/case/:caseId/update-medicine/:prescId
router.post('/case/:caseId/update-medicine/:prescId', protect, authorize('pharmacist'), async (req, res) => {
  try {
    const { cost, status } = req.body;
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const presc = caseDoc.prescriptions.find(p => p._id.toString() === req.params.prescId);
    if (!presc) return res.status(404).json({ success: false, message: 'Prescription not found' });

    if (cost != null) presc.cost = Number(cost);
    if (status) presc.status = status;

    await caseDoc.save();
    res.json({ success: true, message: 'Medicine updated', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacist/case/:caseId/complete — all medicines done, advance to billing
router.post('/case/:caseId/complete', protect, authorize('pharmacist'), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    for (const p of caseDoc.prescriptions) {
      if (p.status === 'prescribed') p.status = 'prepared';
    }

    const pharmacyStage = caseDoc.stages.find(s => s.name === 'pharmacy');
    if (pharmacyStage) { pharmacyStage.status = 'completed'; pharmacyStage.completed_at = new Date(); }

    const billingStage = caseDoc.stages.find(s => s.name === 'billing');
    if (billingStage) { billingStage.status = 'in_progress'; billingStage.started_at = new Date(); }
    caseDoc.current_stage = 'billing';

    await caseDoc.save();

    res.json({ success: true, message: 'Pharmacy complete — sent to billing', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
