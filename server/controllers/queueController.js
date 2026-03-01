const db = require('../config/db');
const { calculateWaitTime } = require('../services/queueService');
const { sendQueueTurnNotification } = require('../services/emailService');

exports.getLiveQueue = async (req, res) => {
    const { doctor_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        const queueRes = await db.query(
            'SELECT * FROM queues WHERE doctor_id = $1 AND date = $2',
            [doctor_id, today]
        );

        if (queueRes.rows.length === 0) {
            return res.json({
                currentNumber: 0,
                waitingCount: 0,
                entries: []
            });
        }

        const entries = await db.query(
            `SELECT qe.*, u.full_name as patient_name, u.id as patient_user_id
             FROM queue_entries qe
             JOIN appointments a ON qe.appointment_id = a.id
             JOIN users u ON a.patient_id = u.id
             WHERE qe.queue_id = $1 AND qe.status IN ('waiting', 'serving')
             ORDER BY qe.position ASC`,
            [queueRes.rows[0].id]
        );

        res.json({
            queueId: queueRes.rows[0].id,
            is_active: queueRes.rows[0].is_active,
            currentNumber: queueRes.rows[0].current_serving_number,
            waitingCount: entries.rows.filter(e => e.status === 'waiting').length,
            entries: entries.rows
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateQueueStatus = async (req, res) => {
    const { queue_entry_id, status } = req.body;
    const io = req.app.get('io');

    try {
        const updated = await db.query(
            'UPDATE queue_entries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, queue_entry_id]
        );
        const entry = updated.rows[0];

        if (status === 'serving') {
            await db.query(
                'UPDATE queues SET current_serving_number = current_serving_number + 1 WHERE id = $1',
                [entry.queue_id]
            );
        }

        // Add this to sync appointment status when queue entry is completed or marked as no_show
        if (['completed', 'no_show', 'canceled'].includes(status)) {
            await db.query(
                'UPDATE appointments SET status = $1 WHERE id = $2',
                [status, entry.appointment_id]
            );
        }

        // Get updated queue data to broadcast
        const queueData = await buildQueuePayload(entry.queue_id);

        // Get doctor_id from the queue
        const queueInfo = await db.query('SELECT doctor_id FROM queues WHERE id = $1', [entry.queue_id]);
        if (queueInfo.rows.length > 0) {
            const doctor_id = queueInfo.rows[0].doctor_id;
            // Emit to all clients in this doctor's queue room
            io.to(`queue_${doctor_id}`).emit('queue_updated', queueData);
        }

        // Also notify the specific patient if it's their turn
        if (status === 'serving') {
            const aptRes = await db.query(
                `SELECT a.patient_id, u.email, u.full_name, d.full_name as doctor_name
                 FROM appointments a 
                 JOIN queue_entries qe ON a.id = qe.appointment_id 
                 JOIN users u ON a.patient_id = u.id
                 JOIN doctors doc ON a.doctor_id = doc.id
                 JOIN users d ON doc.user_id = d.id
                 WHERE qe.id = $1`,
                [queue_entry_id]
            );
            if (aptRes.rows.length > 0) {
                const patient = aptRes.rows[0];
                io.emit(`patient_turn_${patient.patient_id}`, {
                    message: "It's your turn! Please proceed to the consultation room."
                });

                // Send Queue Turn Email Notification
                setImmediate(async () => {
                    await sendQueueTurnNotification({
                        to: patient.email,
                        patientName: patient.full_name,
                        doctorName: patient.doctor_name
                    });
                });
            }
        }

        res.json(entry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.manualCheckIn = async (req, res) => {
    const { appointment_id } = req.body;
    const io = req.app.get('io');

    try {
        // 1. Get appointment details
        const appRes = await db.query('SELECT * FROM appointments WHERE id = $1', [appointment_id]);
        if (appRes.rows.length === 0) return res.status(404).json({ message: 'Appointment not found' });

        const app = appRes.rows[0];
        const today = new Date().toISOString().split('T')[0];

        // 2. Check if already in queue
        const entryCheck = await db.query('SELECT id FROM queue_entries WHERE appointment_id = $1', [appointment_id]);
        if (entryCheck.rows.length > 0) return res.status(400).json({ message: 'Already in queue' });

        // 3. Get or Create Queue
        let queueRes = await db.query(
            'SELECT id, total_in_queue FROM queues WHERE doctor_id = $1 AND date = $2',
            [app.doctor_id, today]
        );

        let queueId;
        let currentTotal;

        if (queueRes.rows.length === 0) {
            const newQueue = await db.query(
                'INSERT INTO queues (hospital_id, doctor_id, date, total_in_queue) VALUES ($1, $2, $3, $4) RETURNING id',
                [app.hospital_id, app.doctor_id, today, 0]
            );
            queueId = newQueue.rows[0].id;
            currentTotal = 0;
        } else {
            queueId = queueRes.rows[0].id;
            currentTotal = queueRes.rows[0].total_in_queue;
        }

        // 4. Create Entry
        const priority = app.urgency === 'Critical' ? 1 : app.urgency === 'Moderate' ? 2 : 3;
        await db.query(
            'INSERT INTO queue_entries (queue_id, appointment_id, position, priority_level, status) VALUES ($1, $2, $3, $4, $5)',
            [queueId, appointment_id, currentTotal + 1, priority, 'waiting']
        );

        // 5. Update Queue Count
        await db.query(
            'UPDATE queues SET total_in_queue = total_in_queue + 1 WHERE id = $1',
            [queueId]
        );

        // 6. Emit real-time update
        const queueData = await buildQueuePayload(queueId);
        io.to(`queue_${app.doctor_id}`).emit('queue_updated', queueData);

        // Also emit to hospital admin room
        io.to(`hospital_${app.hospital_id}`).emit('queue_updated', queueData);

        res.json({ message: 'Checked in successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.toggleQueueStatus = async (req, res) => {
    const { doctor_id } = req.params;
    const { is_active } = req.body;
    const io = req.app.get('io');
    const today = new Date().toISOString().split('T')[0];

    try {
        const queueRes = await db.query(
            'UPDATE queues SET is_active = $1 WHERE doctor_id = $2 AND date = $3 RETURNING *',
            [is_active, doctor_id, today]
        );

        if (queueRes.rows.length === 0) {
            return res.status(404).json({ message: 'Queue not found today' });
        }

        const queueData = await buildQueuePayload(queueRes.rows[0].id);

        io.to(`queue_${doctor_id}`).emit('queue_updated', queueData);
        // Also notify hospital room
        io.to(`hospital_${queueRes.rows[0].hospital_id}`).emit('queue_updated', queueData);

        res.json({ message: `Queue ${is_active ? 'resumed' : 'paused'} successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Helper: build queue snapshot for broadcasting
async function buildQueuePayload(queueId) {
    const entries = await db.query(
        `SELECT qe.*, u.full_name as patient_name
         FROM queue_entries qe
         JOIN appointments a ON qe.appointment_id = a.id
         JOIN users u ON a.patient_id = u.id
         WHERE qe.queue_id = $1 AND qe.status IN ('waiting', 'serving')
         ORDER BY qe.position ASC`,
        [queueId]
    );
    const queueRow = await db.query('SELECT * FROM queues WHERE id = $1', [queueId]);
    return {
        queueId,
        is_active: queueRow.rows[0]?.is_active,
        currentNumber: queueRow.rows[0]?.current_serving_number || 0,
        waitingCount: entries.rows.filter(e => e.status === 'waiting').length,
        entries: entries.rows
    };
}
