const db = require('../config/db');

exports.getMedicalPassport = async (req, res) => {
    const patient_id = req.user.id;

    try {
        const profile = await db.query(
            'SELECT full_name, email, phone, medical_id, avatar_url, created_at FROM users WHERE id = $1',
            [patient_id]
        );

        const records = await db.query(
            `SELECT m.*, u.full_name as doctor_name
             FROM medical_records m
             LEFT JOIN doctors dr ON m.doctor_id = dr.id
             LEFT JOIN users u ON dr.user_id = u.id
             WHERE m.patient_id = $1
             ORDER BY m.visit_date DESC`,
            [patient_id]
        );

        const summary = {
            profile: profile.rows[0],
            records: records.rows,
            totalVisits: records.rows.length
        };

        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/medical/vitals
 * Returns the most recent vitals (BP, BMI, heart rate, etc.) recorded
 * for the logged-in patient, pulled from the vitals JSONB column of
 * the most recent medical record that contains vitals data.
 */
exports.getLatestVitals = async (req, res) => {
    const patient_id = req.user.id;

    try {
        // Most recent record that actually has vitals data
        const result = await db.query(
            `SELECT vitals, visit_date, u.full_name as doctor_name
             FROM medical_records m
             LEFT JOIN doctors dr ON m.doctor_id = dr.id
             LEFT JOIN users u ON dr.user_id = u.id
             WHERE m.patient_id = $1
               AND m.vitals IS NOT NULL
               AND m.vitals != '{}'::jsonb
             ORDER BY m.visit_date DESC
             LIMIT 1`,
            [patient_id]
        );

        if (result.rows.length === 0) {
            return res.json({ vitals: null, visit_date: null, doctor_name: null });
        }

        const row = result.rows[0];
        res.json({
            vitals: row.vitals,
            visit_date: row.visit_date,
            doctor_name: row.doctor_name
        });
    } catch (err) {
        console.error('getLatestVitals error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.addMedicalRecord = async (req, res) => {
    // Only doctors should call this
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can add medical records' });
    }

    const { patient_id, diagnosis, symptoms, prescriptions, lab_results, visit_summary, vitals } = req.body;
    const user_id = req.user.id;

    try {
        // Find the doctor's record from the user_id
        const doctorRes = await db.query('SELECT id FROM doctors WHERE user_id = $1', [user_id]);

        if (doctorRes.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found for this user' });
        }

        const doctor_id = doctorRes.rows[0].id;

        const newRecord = await db.query(
            `INSERT INTO medical_records
             (patient_id, doctor_id, diagnosis, symptoms, prescriptions, lab_results, visit_summary, vitals)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                patient_id, doctor_id, diagnosis, symptoms,
                prescriptions ? JSON.stringify(prescriptions) : null,
                lab_results ? JSON.stringify(lab_results) : null,
                visit_summary,
                vitals ? JSON.stringify(vitals) : '{}'
            ]
        );

        res.status(201).json(newRecord.rows[0]);
    } catch (err) {
        console.error('Error adding medical record:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getPatientMedicalPassport = async (req, res) => {
    // Both doctors and admins can view patient passport
    if (!['doctor', 'hospital_admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { patient_id } = req.params;

    try {
        const profile = await db.query(
            'SELECT id, full_name, email, phone, medical_id, avatar_url, created_at FROM users WHERE id = $1 AND role = $2',
            [patient_id, 'patient']
        );

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const records = await db.query(
            `SELECT m.*, u.full_name as doctor_name
             FROM medical_records m
             LEFT JOIN doctors dr ON m.doctor_id = dr.id
             LEFT JOIN users u ON dr.user_id = u.id
             WHERE m.patient_id = $1
             ORDER BY m.visit_date DESC`,
            [patient_id]
        );

        const summary = {
            profile: profile.rows[0],
            records: records.rows,
            totalVisits: records.rows.length
        };

        res.json(summary);
    } catch (err) {
        console.error('getPatientMedicalPassport error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.searchPatients = async (req, res) => {
    // Both doctors and admins can search patients
    if (!['doctor', 'hospital_admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { search = '', hospital_id } = req.query;

    try {
        let query = `
            SELECT DISTINCT u.id, u.full_name, u.email, u.phone, u.medical_id, u.avatar_url
            FROM users u
        `;
        let params = [];

        if (hospital_id) {
            query += ` LEFT JOIN appointments a ON a.patient_id = u.id `;
        }

        query += ` WHERE u.role = 'patient' `;

        let paramIdx = 1;

        if (hospital_id) {
            query += ` AND a.hospital_id = $${paramIdx} `;
            params.push(hospital_id);
            paramIdx++;
        }

        if (search) {
            query += ` AND (u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.medical_id ILIKE $${paramIdx}) `;
            params.push(`%${search}%`);
            paramIdx++;
        }

        query += ` LIMIT 50 `; // cap to 50 for search

        const patients = await db.query(query, params);
        res.json({ patients: patients.rows });
    } catch (err) {
        console.error('searchPatients error:', err);
        res.status(500).json({ message: err.message });
    }
};
