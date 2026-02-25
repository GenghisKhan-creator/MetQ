const bcrypt = require('bcrypt');
const db = require('../config/db');

async function createAdmin() {
    try {
        // 1. Create a hospital
        const hospitalRes = await db.query(
            'INSERT INTO hospitals (name, address, phone, email) VALUES ($1, $2, $3, $4) RETURNING id',
            ['MetQ Central Hospital', '123 Healthcare Ave, Accra', '+233 24 000 0000', 'contact@metqhospital.com']
        );
        const hospitalId = hospitalRes.rows[0].id;
        console.log('Created Hospital ID:', hospitalId);

        // 2. Create Admin user
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRes = await db.query(
            'INSERT INTO users (full_name, email, password_hash, phone, role, hospital_id, requires_password_change) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email',
            ['System Admin', 'admin@metq.com', hashedPassword, '+233 24 111 2222', 'super_admin', hospitalId, true]
        );

        console.log('Created Admin User:', userRes.rows[0]);
        console.log('Password set to:', password);

        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}

createAdmin();
