const express = require('express');
const router = express.Router();
const { getStats, getHospitalUsers, deleteUser } = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const isAdmin = authorize('hospital_admin', 'super_admin');

router.get('/stats/:hospital_id', auth, isAdmin, getStats);
router.get('/users/:hospital_id', auth, isAdmin, getHospitalUsers);
router.delete('/users/:user_id', auth, isAdmin, deleteUser);

module.exports = router;
