const db = require('./config/db');

async function checkData() {
    try {
        const apps = await db.query('SELECT id, hospital_id, appointment_date, status FROM appointments');
        console.log('--- APPOINTMENTS ---');
        console.table(apps.rows);

        const queues = await db.query('SELECT * FROM queues');
        console.log('--- QUEUES ---');
        console.table(queues.rows);

        const entries = await db.query('SELECT * FROM queue_entries');
        console.log('--- QUEUE ENTRIES ---');
        console.table(entries.rows);

        const users = await db.query("SELECT id, full_name, role, hospital_id FROM users WHERE role = 'hospital_admin' OR role = 'doctor'");
        console.log('--- STAFF ---');
        console.table(users.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
