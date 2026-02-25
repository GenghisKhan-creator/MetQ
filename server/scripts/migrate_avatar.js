// Run this script to add avatar_url column to users table
// Command: node scripts/migrate_avatar.js
const db = require('../config/db');

async function migrate() {
    try {
        await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
        console.log('✅ Migration successful: avatar_url column added to users table');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
