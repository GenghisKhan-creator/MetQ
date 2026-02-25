const express = require('express');
const router = express.Router();
const { getMedicalPassport, addMedicalRecord, getLatestVitals } = require('../controllers/medicalController');
const auth = require('../middleware/auth');

router.get('/passport', auth, getMedicalPassport);
router.get('/vitals', auth, getLatestVitals);
router.post('/record', auth, addMedicalRecord);

module.exports = router;
