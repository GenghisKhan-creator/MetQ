const express = require('express');
const router = express.Router();
const { getHospitals, getDoctorsByHospital, getSpecialties, addSpecialty, deleteSpecialty } = require('../controllers/hospitalController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const authorizeAdmin = authorize('hospital_admin', 'super_admin');

router.get('/', getHospitals);
router.get('/specialties', getSpecialties);
router.post('/specialties', auth, authorizeAdmin, addSpecialty);
router.delete('/specialties/:id', auth, authorizeAdmin, deleteSpecialty);
router.get('/:hospital_id/doctors', getDoctorsByHospital);

module.exports = router;
