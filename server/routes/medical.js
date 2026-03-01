const express = require('express');
const router = express.Router();
const { getMedicalPassport, addMedicalRecord, getLatestVitals, getPatientMedicalPassport, searchPatients } = require('../controllers/medicalController');
const auth = require('../middleware/auth');

router.get('/passport', auth, getMedicalPassport);
router.get('/passport/:patient_id', auth, getPatientMedicalPassport);
router.get('/patients/search', auth, searchPatients);
router.get('/vitals', auth, getLatestVitals);
router.post('/record', auth, addMedicalRecord);

module.exports = router;
