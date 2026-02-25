const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, getDoctorDashboardData } = require('../controllers/appointmentController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/', auth, bookAppointment);
router.get('/my', auth, getMyAppointments);
router.get('/doctor', auth, authorize('doctor'), getDoctorDashboardData);

module.exports = router;
