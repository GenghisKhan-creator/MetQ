const db = require('../config/db');

exports.getMedicalPassport = async (req, res) => {
    const patient_id = req.user.id;

    try {
        const profile = await db.query(
            'SELECT full_name, email, phone, medical_id, created_at FROM users WHERE id = $1',
            [patient_id]
        );

        const records = await db.query(
            'SELECT m.*, d.full_name as doctor_name FROM medical_records m LEFT JOIN users d ON m.doctor_id = d.id WHERE m.patient_id = $1 ORDER BY m.visit_date DESC',
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

exports.addMedicalRecord = async (req, res) => {
    // Only doctors should call this
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ message: 'Only doctors can add medical records' });
    }

    const { patient_id, diagnosis, symptoms, prescriptions, lab_results, visit_summary } = req.body;
    const user_id = req.user.id;

    try {
        // Find the doctor's record from the user_id
        const doctorRes = await db.query('SELECT id FROM doctors WHERE user_id = $1', [user_id]);

        if (doctorRes.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found for this user' });
        }

        const doctor_id = doctorRes.rows[0].id;

        const newRecord = await db.query(
            'INSERT INTO medical_records (patient_id, doctor_id, diagnosis, symptoms, prescriptions, lab_results, visit_summary) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [patient_id, doctor_id, diagnosis, symptoms, prescriptions, JSON.stringify(lab_results), visit_summary]
        );

        res.status(201).json(newRecord.rows[0]);
    } catch (err) {
        console.error('Error adding medical record:', err);
        res.status(500).json({ message: err.message });
    }
};
