const db = require('../config/db');
const bcrypt = require('bcrypt');

async function seedDoctor() {
    try {
        // 1. Get the hospital
        const hospitalRes = await db.query("SELECT id FROM hospitals WHERE name = 'MetQ Central Hospital' LIMIT 1");
        if (hospitalRes.rows.length === 0) {
            console.log('Hospital not found. Please run seedAdmin.js first.');
            process.exit(1);
        }
        const hospitalId = hospitalRes.rows[0].id;

        // 2. Create Specialty
        await db.query("INSERT INTO specialties (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
            ['Cardiology', 'Heart and vascular specialist']);
        const specRes = await db.query("SELECT id FROM specialties WHERE name = 'Cardiology'");
        const specId = specRes.rows[0].id;

        // 3. Create Doctor User
        const password = 'doctor123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRes = await db.query(
            "INSERT INTO users (full_name, email, password_hash, role, hospital_id, requires_password_change) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET hospital_id = $5 RETURNING id",
            ['Dr. Issah Ahmed', 'issah@metq.com', hashedPassword, 'doctor', hospitalId, true]
        );
        const userId = userRes.rows[0].id;

        // 4. Create Doctor Profile
        await db.query(
            "INSERT INTO doctors (user_id, specialty_id, bio, is_available) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
            [userId, specId, 'Experienced cardiology specialist with 15+ years in practice.', true]
        );

        console.log('Successfully seeded Dr. Issah Ahmed linked to hospital');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedDoctor();
