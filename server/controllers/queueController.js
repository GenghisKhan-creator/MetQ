const db = require('../config/db');
const { calculateWaitTime } = require('../services/queueService');

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
            'SELECT qe.*, u.full_name as patient_name FROM queue_entries qe JOIN appointments a ON qe.appointment_id = a.id JOIN users u ON a.patient_id = u.id WHERE qe.queue_id = $1 AND qe.status = $2 ORDER BY qe.position ASC',
            [queueRes.rows[0].id, 'waiting']
        );

        res.json({
            currentNumber: queueRes.rows[0].current_serving_number,
            waitingCount: entries.rows.length,
            entries: entries.rows
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateQueueStatus = async (req, res) => {
    // Only admin or doctor can update
    const { queue_entry_id, status } = req.body;

    try {
        const updated = await db.query(
            'UPDATE queue_entries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, queue_entry_id]
        );

        if (status === 'serving') {
            await db.query(
                'UPDATE queues SET current_serving_number = current_serving_number + 1 WHERE id = $1',
                [updated.rows[0].queue_id]
            );
        }

        res.json(updated.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.manualCheckIn = async (req, res) => {
    const { appointment_id } = req.body;

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

        res.json({ message: 'Checked in successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
