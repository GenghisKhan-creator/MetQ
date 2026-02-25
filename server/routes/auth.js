const express = require('express');
const router = express.Router();
const { register, login, changePassword, getProfile, updateProfile, uploadAvatar } = require('../controllers/authController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', auth, changePassword);
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);
router.post('/profile/avatar', auth, upload.single('avatar'), uploadAvatar);

module.exports = router;
