const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT '{}'";

pool.query(sql)
    .then(() => {
        console.log('SUCCESS: vitals column added to medical_records');
        pool.end();
    })
    .catch(e => {
        console.error('ERROR:', e.message);
        pool.end();
    });
