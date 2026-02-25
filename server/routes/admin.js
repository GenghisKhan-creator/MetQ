const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/stats/:hospital_id', auth, authorize('hospital_admin', 'super_admin'), getStats);

module.exports = router;
