const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const Case = require('../models/Case');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'lab-reports');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `lab-${req.params.caseId}-${req.params.testId}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/lab/pending-tests
router.get('/pending-tests', protect, authorize('lab_technician'), async (req, res) => {
  try {
    const cases = await Case.find({
      status: 'active',
      $or: [
        { lab_sent: true },
        { 'stages': { $elemMatch: { name: 'lab', status: 'in_progress' } } },
      ],
      'stages': { $elemMatch: { name: 'lab', status: { $in: ['in_progress', 'pending'] } } },
    })
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
      .populate({ path: 'doctor_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/lab/my-workload
router.get('/my-workload', protect, authorize('lab_technician'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allLabCases = await Case.find({
      status: 'active',
      lab_sent: true,
    });
    let pending = 0, inProgress = 0, completedToday = 0, urgent = 0;

    for (const c of allLabCases) {
      for (const t of c.lab_tests) {
        if (t.status === 'ordered') pending++;
        if (t.status === 'in_progress') inProgress++;
        if (t.status === 'completed' && t.completed_at >= today) completedToday++;
        if (t.priority === 'urgent' || t.priority === 'critical') urgent++;
      }
    }

    res.json({ success: true, data: { pending, in_progress: inProgress, completed_today: completedToday, urgent } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lab/case/:caseId/start-test/:testId
router.post('/case/:caseId/start-test/:testId', protect, authorize('lab_technician'), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    const test = caseDoc.lab_tests.find(t => t._id.toString() === req.params.testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    test.status = 'in_progress';
    test.technician_id = req.user._id;
    await caseDoc.save();

    res.json({ success: true, message: 'Test started', data: caseDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lab/case/:caseId/complete-test/:testId — with optional file upload
router.post('/case/:caseId/complete-test/:testId', protect, authorize('lab_technician'),
  upload.single('report_file'),
  async (req, res) => {
    try {
      const { results, cost } = req.body;
      if (!results) return res.status(400).json({ success: false, message: 'results are required' });

      const caseDoc = await Case.findById(req.params.caseId);
      if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

      const test = caseDoc.lab_tests.find(t => t._id.toString() === req.params.testId);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

      test.status = 'completed';
      test.results = results;
      test.completed_at = new Date();
      test.technician_id = req.user._id;
      if (cost != null) test.cost = Number(cost);

      if (req.file) {
        test.report_file = `/uploads/lab-reports/${req.file.filename}`;
      }

      const allComplete = caseDoc.lab_tests.every(t => t.status === 'completed');
      let msg = 'Test completed';

      if (allComplete) {
        const labStage = caseDoc.stages.find(s => s.name === 'lab');
        if (labStage) { labStage.status = 'completed'; labStage.completed_at = new Date(); }

        const reviewStage = caseDoc.stages.find(s => s.name === 'doctor_review');
        if (reviewStage) { reviewStage.status = 'in_progress'; reviewStage.started_at = new Date(); }
        caseDoc.current_stage = 'doctor_review';

        msg = 'All tests complete — sent to doctor review';
      }

      await caseDoc.save();
      res.json({ success: true, message: msg, data: caseDoc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
