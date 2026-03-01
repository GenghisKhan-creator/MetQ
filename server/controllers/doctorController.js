const pool = require('../config/db');

exports.getMySchedule = async (req, res) => {
    try {
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can fetch their schedule' });
        }
        const doctorCheck = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (doctorCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        const scheduleData = await pool.query(
            'SELECT * FROM doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week ASC',
            [doctorCheck.rows[0].id]
        );
        res.json(scheduleData.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching schedule' });
    }
};

exports.getSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        // Verify doctor exists
        const doctorCheck = await pool.query('SELECT * FROM doctors WHERE id = $1', [id]);
        if (doctorCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const scheduleData = await pool.query(
            'SELECT * FROM doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week ASC',
            [id]
        );

        res.json(scheduleData.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error fetching schedule' });
    }
};

exports.updateSchedule = async (req, res) => {
    try {
        // req.user must be a doctor
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can update schedules' });
        }

        // Get doctor id from user id
        const doctorCheck = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (doctorCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        const doctorId = doctorCheck.rows[0].id;

        const { schedules } = req.body;
        // schedules: array of { day_of_week, start_time, end_time, is_off, lunch_start, lunch_end }

        await pool.query('BEGIN');

        for (const s of schedules) {
            // Check if exists
            const existing = await pool.query('SELECT id FROM doctor_schedules WHERE doctor_id = $1 AND day_of_week = $2', [doctorId, s.day_of_week]);
            if (existing.rows.length > 0) {
                await pool.query(
                    `UPDATE doctor_schedules 
                     SET start_time = $1, end_time = $2, is_off = $3, lunch_start = $4, lunch_end = $5
                     WHERE doctor_id = $6 AND day_of_week = $7`,
                    [s.start_time || null, s.end_time || null, s.is_off || false, s.lunch_start || null, s.lunch_end || null, doctorId, s.day_of_week]
                );
            } else {
                await pool.query(
                    `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_off, lunch_start, lunch_end)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [doctorId, s.day_of_week, s.start_time || null, s.end_time || null, s.is_off || false, s.lunch_start || null, s.lunch_end || null]
                );
            }
        }

        await pool.query('COMMIT');
        res.json({ message: 'Schedule updated successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: 'Server error updating schedule' });
    }
};
