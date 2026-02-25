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
            `SELECT qe.*, u.full_name as patient_name, d_user.full_name as doctor_name, a.urgency
             FROM queue_entries qe
             JOIN appointments a ON qe.appointment_id = a.id
             JOIN users u ON a.patient_id = u.id
             JOIN doctors dr ON a.doctor_id = dr.id
             JOIN users d_user ON dr.user_id = d_user.id
             WHERE a.hospital_id = $1 AND qe.status IN ('waiting', 'serving')
             ORDER BY qe.entry_time ASC`,
            [hospital_id]
        );

        // All of Today's Appointments
        const todayApps = await db.query(
            `SELECT a.*, u.full_name as patient_name, d_user.full_name as doctor_name, 
             EXISTS(SELECT 1 FROM queue_entries qe WHERE qe.appointment_id = a.id) as is_checked_in
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             JOIN doctors dr ON a.doctor_id = dr.id
             JOIN users d_user ON dr.user_id = d_user.id
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
