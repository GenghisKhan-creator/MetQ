const express = require('express');
const router = express.Router();
const { getMedicalPassport, addMedicalRecord } = require('../controllers/medicalController');
const auth = require('../middleware/auth');

router.get('/passport', auth, getMedicalPassport);
router.post('/record', auth, addMedicalRecord);

module.exports = router;
