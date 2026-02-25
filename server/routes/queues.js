const express = require('express');
const router = express.Router();
const { getLiveQueue, updateQueueStatus, manualCheckIn } = require('../controllers/queueController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/live/:doctor_id', auth, getLiveQueue);
router.patch('/status', auth, updateQueueStatus);
router.post('/check-in', auth, authorize('hospital_admin', 'super_admin'), manualCheckIn);

module.exports = router;
