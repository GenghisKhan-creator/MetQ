const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { registerSchema, loginSchema } = require('../utils/validation');

exports.register = async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { full_name, email, password, phone, role = 'patient', hospital_id } = req.body;

    // Security: Only admins can create doctor or hospital_admin accounts
    if (role !== 'patient') {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized. Staff accounts must be created by an admin.' });
        }

        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'hospital_admin' && decoded.role !== 'super_admin') {
                return res.status(403).json({ message: 'Forbidden. Only admins can create staff accounts.' });
            }
        } catch (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    }

    try {
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const medical_id = role === 'patient' ? `METQ-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null;
        const requires_password_change = role !== 'patient';

        const newUser = await db.query(
            'INSERT INTO users (full_name, email, password_hash, phone, role, hospital_id, medical_id, requires_password_change) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, full_name, email, role, medical_id, requires_password_change',
            [full_name, email, hashedPassword, phone, role, hospital_id, medical_id, requires_password_change]
        );

        const token = jwt.sign({ id: newUser.rows[0].id, role: newUser.rows[0].role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.status(201).json({
            token,
            user: newUser.rows[0]
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password } = req.body;

    try {
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.json({
            token,
            user: {
                id: user.rows[0].id,
                full_name: user.rows[0].full_name,
                email: user.rows[0].email,
                role: user.rows[0].role,
                medical_id: user.rows[0].medical_id,
                requires_password_change: user.rows[0].requires_password_change
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.changePassword = async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(
            'UPDATE users SET password_hash = $1, requires_password_change = FALSE WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
