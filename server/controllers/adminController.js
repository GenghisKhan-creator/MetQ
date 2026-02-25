const db = require('../config/db');

exports.getStats = async (req, res) => {
    const { hospital_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Today's Patients
        const todayPatients = await db.query(
            'SELECT COUNT(*) FROM appointments WHERE hospital_id = $1 AND appointment_date = $2',
            [hospital_id, today]
        );

        // Daily Volume (Last 7 days)
        const dailyVolume = await db.query(
            'SELECT appointment_date, COUNT(*) as count FROM appointments WHERE hospital_id = $1 GROUP BY appointment_date ORDER BY appointment_date DESC LIMIT 7',
            [hospital_id]
        );

        // No-Show Rate
        const totalAppointments = await db.query('SELECT COUNT(*) FROM appointments WHERE hospital_id = $1', [hospital_id]);
        const noShowCount = await db.query('SELECT COUNT(*) FROM appointments WHERE hospital_id = $1 AND status = $2', [hospital_id, 'no_show']);

        const totalCount = parseInt(totalAppointments.rows[0].count);
        const noShows = parseInt(noShowCount.rows[0].count);
        const noShowRate = totalCount > 0 ? (noShows / totalCount) * 100 : 0;

        // Active Queue Entries for the entire hospital
        const activeQueue = await db.query(
            `SELECT qe.*, u.full_name as patient_name, d_user.full_name as doctor_name,
                    t.urgency
             FROM queue_entries qe
             JOIN appointments a ON qe.appointment_id = a.id
             JOIN users u ON a.patient_id = u.id
             JOIN doctors dr ON a.doctor_id = dr.id
             JOIN users d_user ON dr.user_id = d_user.id
             LEFT JOIN triage_assessments t ON a.triage_id = t.id
             WHERE a.hospital_id = $1 AND qe.status IN ('waiting', 'serving')
             ORDER BY qe.entry_time ASC`,
            [hospital_id]
        );

        // All of Today's Appointments
        const todayApps = await db.query(
            `SELECT a.*, u.full_name as patient_name, d_user.full_name as doctor_name,
                    t.urgency,
                    EXISTS(SELECT 1 FROM queue_entries qe WHERE qe.appointment_id = a.id) as is_checked_in
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             JOIN doctors dr ON a.doctor_id = dr.id
             JOIN users d_user ON dr.user_id = d_user.id
             LEFT JOIN triage_assessments t ON a.triage_id = t.id
             WHERE a.hospital_id = $1 AND a.appointment_date = $2
             ORDER BY a.start_time ASC`,
            [hospital_id, today]
        );

        res.json({
            todayPatients: parseInt(todayPatients.rows[0].count),
            dailyVolume: dailyVolume.rows,
            noShowRate: noShowRate.toFixed(2),
            activeQueue: activeQueue.rows,
            todayAppointments: todayApps.rows,
            totalWaiting: activeQueue.rows.filter(q => q.status === 'waiting').length,
            currentlyServing: activeQueue.rows.filter(q => q.status === 'serving').length
        });
    } catch (err) {
        console.error('Admin Stats Error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/admin/users/:hospital_id
 * Returns all patients + doctors belonging to the hospital.
 * Query param: ?role=patient|doctor  (omit for both)
 */
exports.getHospitalUsers = async (req, res) => {
    const { hospital_id } = req.params;
    const { role, search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Admins can only manage their own hospital
    if (req.user.role === 'hospital_admin' && req.user.hospital_id !== hospital_id) {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        let roleFilter = '';
        let params = [hospital_id];
        let idx = 2;

        if (role === 'doctor') {
            roleFilter = `AND u.role = 'doctor' AND u.hospital_id = $1`;
        } else if (role === 'patient') {
            // Patients don't belong to a hospital directly — find via appointments
            roleFilter = `AND u.role = 'patient'`;
        } else {
            roleFilter = `AND u.role IN ('patient', 'doctor')`;
        }

        // For patients: join via appointments to get the hospital connection
        // For doctors: direct hospital_id on user record
        let query;
        let countQuery;

        if (role === 'patient') {
            const searchParam = search ? `%${search}%` : '%';
            query = `
                SELECT DISTINCT u.id, u.full_name, u.email, u.phone, u.role,
                       u.medical_id, u.avatar_url, u.status, u.created_at,
                       COUNT(a.id) as total_appointments
                FROM users u
                LEFT JOIN appointments a ON a.patient_id = u.id AND a.hospital_id = $1
                WHERE u.role = 'patient'
                  AND (a.hospital_id = $1 OR (SELECT COUNT(*) FROM appointments WHERE patient_id = u.id AND hospital_id = $1) > 0)
                  AND (u.full_name ILIKE $2 OR u.email ILIKE $2 OR u.medical_id ILIKE $2)
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT $3 OFFSET $4
            `;
            countQuery = `
                SELECT COUNT(DISTINCT u.id) FROM users u
                LEFT JOIN appointments a ON a.patient_id = u.id AND a.hospital_id = $1
                WHERE u.role = 'patient'
                  AND (a.hospital_id = $1 OR (SELECT COUNT(*) FROM appointments WHERE patient_id = u.id AND hospital_id = $1) > 0)
                  AND (u.full_name ILIKE $2 OR u.email ILIKE $2 OR u.medical_id ILIKE $2)
            `;
            params = [hospital_id, search ? `%${search}%` : '%', parseInt(limit), offset];
        } else if (role === 'doctor') {
            query = `
                SELECT u.id, u.full_name, u.email, u.phone, u.role,
                       u.medical_id, u.avatar_url, u.status, u.created_at,
                       s.name as specialty,
                       COUNT(DISTINCT a.id) as total_appointments
                FROM users u
                LEFT JOIN doctors d ON d.user_id = u.id
                LEFT JOIN specialties s ON d.specialty_id = s.id
                LEFT JOIN appointments a ON a.doctor_id = d.id
                WHERE u.role = 'doctor' AND u.hospital_id = $1
                  AND (u.full_name ILIKE $2 OR u.email ILIKE $2)
                GROUP BY u.id, s.name
                ORDER BY u.created_at DESC
                LIMIT $3 OFFSET $4
            `;
            countQuery = `
                SELECT COUNT(*) FROM users u
                WHERE u.role = 'doctor' AND u.hospital_id = $1
                  AND (u.full_name ILIKE $2 OR u.email ILIKE $2)
            `;
            params = [hospital_id, search ? `%${search}%` : '%', parseInt(limit), offset];
        } else {
            // Both — union
            query = `
                SELECT u.id, u.full_name, u.email, u.phone, u.role,
                       u.medical_id, u.avatar_url, u.status, u.created_at,
                       NULL as specialty,
                       0 as total_appointments
                FROM users u
                WHERE (u.role = 'patient' AND EXISTS(SELECT 1 FROM appointments WHERE patient_id = u.id AND hospital_id = $1))
                   OR (u.role = 'doctor' AND u.hospital_id = $1)
                ORDER BY u.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            countQuery = `
                SELECT COUNT(*) FROM users u
                WHERE (u.role = 'patient' AND EXISTS(SELECT 1 FROM appointments WHERE patient_id = u.id AND hospital_id = $1))
                   OR (u.role = 'doctor' AND u.hospital_id = $1)
            `;
            params = [hospital_id, parseInt(limit), offset];
        }

        const [results, countRes] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, role ? [hospital_id, search ? `%${search}%` : '%'] : [hospital_id])
        ]);

        res.json({
            users: results.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('getHospitalUsers error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * DELETE /api/admin/users/:user_id
 * Permanently deletes a patient or doctor account.
 * Admins cannot delete other admins or super_admins.
 */
exports.deleteUser = async (req, res) => {
    const { user_id } = req.params;
    const adminId = req.user.id;

    try {
        // Fetch target user
        const target = await db.query('SELECT id, role, full_name, hospital_id FROM users WHERE id = $1', [user_id]);
        if (target.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetUser = target.rows[0];

        // Safety: cannot delete admins or super_admins
        if (['hospital_admin', 'super_admin'].includes(targetUser.role)) {
            return res.status(403).json({ message: 'Cannot delete admin accounts' });
        }

        // Hospital admin can only delete users from their own hospital
        if (req.user.role === 'hospital_admin') {
            if (targetUser.role === 'doctor' && targetUser.hospital_id !== req.user.hospital_id) {
                return res.status(403).json({ message: 'Access denied — user belongs to a different hospital' });
            }
        }

        // Prevent self-deletion
        if (user_id === adminId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Delete avatar file if exists
        const path = require('path');
        const fs = require('fs');
        if (targetUser.avatar_url) {
            const filePath = path.join(__dirname, '..', targetUser.avatar_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Delete cascade — DB foreign keys handle appointments, queue, medical records
        await db.query('DELETE FROM users WHERE id = $1', [user_id]);

        res.json({ message: `${targetUser.full_name}'s account has been permanently deleted.`, deleted_id: user_id });
    } catch (err) {
        console.error('deleteUser error:', err);
        res.status(500).json({ message: err.message });
    }
};
