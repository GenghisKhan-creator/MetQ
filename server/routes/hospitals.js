const express = require('express');
const router = express.Router();
const { getHospitals, getDoctorsByHospital } = require('../controllers/hospitalController');

router.get('/', getHospitals);
router.get('/:hospital_id/doctors', getDoctorsByHospital);

module.exports = router;
