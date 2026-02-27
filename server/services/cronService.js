const db = require('../config/db');
const { sendCancellationNotice } = require('./emailService');

const runJobs = async () => {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

        // 1. Mark past pending appointments as no_show
        // appointment_date < today AND status = 'pending'
        await db.query(
            `UPDATE appointments 
             SET status = 'no_show', updated_at = CURRENT_TIMESTAMP
             WHERE appointment_date < $1 AND status = 'pending'`,
            [today]
        );

        // 2. Cancel today's pending appointments if 30 minutes past start_time
        // Find appointments that are pending, for today, where start_time + 30 mins < current_time
        const overdueApps = await db.query(
            `SELECT a.id as appointment_id, a.appointment_date, a.start_time, 
                    u.email, u.full_name as patient_name,
                    d_user.full_name as doctor_name
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             JOIN doctors d ON a.doctor_id = d.id
             JOIN users d_user ON d.user_id = d_user.id
             WHERE a.appointment_date = $1 
             AND a.status = 'pending'
             AND a.start_time + interval '30 minutes' < $2::time`,
            [today, currentTimeStr]
        );

        for (const app of overdueApps.rows) {
            // Remove from queue if present
            await db.query('DELETE FROM queue_entries WHERE appointment_id = $1', [app.appointment_id]);

            // Cancel the appointment
            await db.query(
                `UPDATE appointments 
                 SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [app.appointment_id]
            );

            // Send email
            try {
                await sendCancellationNotice({
                    to: app.email,
                    patientName: app.patient_name,
                    doctorName: app.doctor_name,
                    appointmentDate: app.appointment_date,
                    startTime: app.start_time
                });
            } catch (emailErr) {
                console.error('[Cron] Failed to send cancellation email:', emailErr.message);
            }
        }

    } catch (err) {
        console.error('[Cron Error]:', err.message);
    }
};

const startJobs = () => {
    // Run immediately on boot
    runJobs();

    // Run every 5 minutes
    setInterval(runJobs, 5 * 60 * 1000); // 5 minutes

    console.log('[Cron] Background jobs started');
};

module.exports = { startJobs };
