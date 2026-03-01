const express = require('express');
const router = express.Router();
const { getSchedule, updateSchedule, getMySchedule } = require('../controllers/doctorController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Get current doctor's schedule
router.get('/my-schedule', auth, authorize('doctor'), getMySchedule);

// Get schedule for a specific doctor
router.get('/:id/schedule', auth, getSchedule);

// Update schedule (only doctors)
router.put('/schedule', auth, authorize('doctor'), updateSchedule);

module.exports = router;
