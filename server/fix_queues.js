const db = require('./config/db');

async function fixQueues() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Today:', today);

        const apps = await db.query(
            'SELECT * FROM appointments WHERE appointment_date = $1',
            [today]
        );

        console.log(`Found ${apps.rows.length} appointments for today.`);

        for (const app of apps.rows) {
            // Check if queue exists
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
                console.log(`Created new queue for doctor ${app.doctor_id}`);
            } else {
                queueId = queueRes.rows[0].id;
                currentTotal = queueRes.rows[0].total_in_queue;
            }

            // Check if entry already exists
            const entryCheck = await db.query('SELECT id FROM queue_entries WHERE appointment_id = $1', [app.id]);
            if (entryCheck.rows.length === 0) {
                const priority = app.urgency === 'Critical' ? 1 : app.urgency === 'Moderate' ? 2 : 3;
                await db.query(
                    'INSERT INTO queue_entries (queue_id, appointment_id, position, priority_level, status) VALUES ($1, $2, $3, $4, $5)',
                    [queueId, app.id, currentTotal + 1, priority, 'waiting']
                );
                await db.query(
                    'UPDATE queues SET total_in_queue = total_in_queue + 1 WHERE id = $1',
                    [queueId]
                );
                console.log(`Added appointment ${app.id} to queue.`);
            }
        }

        console.log('Finished backfilling queues.');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fixQueues();
