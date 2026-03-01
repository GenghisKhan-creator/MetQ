const db = require('../config/db');
const bcrypt = require('bcrypt');

const initDB = async () => {
    try {
        // Check if the super_admin exists
        const res = await db.query('SELECT * FROM users WHERE email = $1 AND role = $2', ['admin@metq.com', 'super_admin']);

        if (res.rows.length === 0) {
            console.log('No default super_admin found. Creating one...');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            await db.query(`
                INSERT INTO users (full_name, email, password_hash, role, requires_password_change) 
                VALUES ($1, $2, $3, $4, $5)
            `, ['admin', 'admin@metq.com', hashedPassword, 'super_admin', false]);

            console.log('Default super_admin created successfully!');
            console.log('Email: admin@metq.com');
            console.log('Password: password123');
        } else {
            console.log('Default super_admin already exists. Skipping creation.');
        }
    } catch (err) {
        console.error('Error auto-creating default super_admin:', err.message);
    }
};

module.exports = initDB;
