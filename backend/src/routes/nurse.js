const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const NurseTask = require('../models/NurseTask');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const Case = require('../models/Case');

// GET /api/nurse/assigned-patients
router.get('/assigned-patients', protect, authorize('nurse'), async (req, res) => {
  try {
    const taskPatientIds = await NurseTask.find({ nurse_id: req.user._id, status: { $ne: 'completed' } }).distinct('patient_id');
    const activeAdmissions = await Admission.find({ status: 'admitted' }).distinct('patient_id');
    const allIds = [...new Set([...taskPatientIds.map(String), ...activeAdmissions.map(String)])];

    const patients = await Patient.find({ _id: { $in: allIds } }).populate('user_id', 'name email');

    const patientsWithInfo = await Promise.all(
      patients.map(async (p) => {
        const admission = await Admission.findOne({ patient_id: p._id, status: 'admitted' });
        const pendingTasks = await NurseTask.countDocuments({ patient_id: p._id, nurse_id: req.user._id, status: { $ne: 'completed' } });
        const activeCase = await Case.findOne({ patient_id: p._id, status: 'active' });
        return { patient: p, current_admission: admission, pending_tasks: pendingTasks, active_case: activeCase };
      })
    );

    res.json({ success: true, count: patientsWithInfo.length, data: patientsWithInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/nurse/tasks
router.get('/tasks', protect, authorize('nurse'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { nurse_id: req.user._id };
    if (status) filter.status = status;

    const tasks = await NurseTask.find(filter)
      .populate({ path: 'patient_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ created_at: -1 });

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/nurse/update-task
router.post('/update-task', protect, authorize('nurse'), async (req, res) => {
  try {
    const { task_id, status, notes } = req.body;
    if (!task_id || !status) return res.status(400).json({ success: false, message: 'task_id and status are required' });

    const task = await NurseTask.findOne({ _id: task_id, nurse_id: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.status = status;
    if (notes) task.notes = notes;
    if (status === 'completed') task.completed_at = new Date();
    await task.save();

    res.json({ success: true, message: 'Task updated', data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/nurse/workload-stats — burnout reduction dashboard data
router.get('/workload-stats', protect, authorize('nurse'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, completedTodayCount, totalTasks, allNurseTasks] = await Promise.all([
      NurseTask.countDocuments({ nurse_id: req.user._id, status: { $ne: 'completed' } }),
      NurseTask.countDocuments({ nurse_id: req.user._id, status: 'completed', completed_at: { $gte: today } }),
      NurseTask.countDocuments({ nurse_id: req.user._id }),
      NurseTask.find({ nurse_id: req.user._id }).sort({ created_at: -1 }).limit(100),
    ]);

    // Calculate rough overtime: completed tasks beyond 8 per shift
    const tasksThisWeek = allNurseTasks.filter(t => {
      const d = t.completed_at || t.created_at;
      return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;

    const averagePerDay = (tasksThisWeek / 7).toFixed(1);
    const burnoutRisk = pendingCount > 10 ? 'high' : pendingCount > 5 ? 'medium' : 'low';

    const activePatients = await Admission.countDocuments({ status: 'admitted' });

    res.json({
      success: true,
      data: {
        pending_tasks: pendingCount,
        completed_today: completedTodayCount,
        total_tasks: totalTasks,
        tasks_this_week: tasksThisWeek,
        average_per_day: parseFloat(averagePerDay),
        burnout_risk: burnoutRisk,
        active_patients: activePatients,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
