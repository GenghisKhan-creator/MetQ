const db = require('../config/db');

exports.getHospitals = async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, address, phone FROM hospitals ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDoctorsByHospital = async (req, res) => {
    const { hospital_id } = req.params;
    try {
        const query = `
            SELECT 
                d.id, 
                u.full_name, 
                s.name as specialty,
                d.bio
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE u.hospital_id = $1 AND d.is_available = TRUE
        `;
        console.log('Executing Query:', query);
        console.log('With Params:', [hospital_id]);
        const result = await db.query(query, [hospital_id]);
        res.json(result.rows);
    } catch (err) {
        console.error('DATABASE ERROR:', err);
        res.status(500).json({
            message: 'Database error occurred',
            error: err.message,
            detail: err.detail
        });
    }
};
