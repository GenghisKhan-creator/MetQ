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

exports.getSpecialties = async (req, res) => {
    try {
        const result = await db.query('SELECT id, name FROM specialties ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addSpecialty = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Specialty name is required" });
        const result = await db.query('INSERT INTO specialties (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'Specialty already exists' });
        res.status(500).json({ message: err.message });
    }
};

exports.deleteSpecialty = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM specialties WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Specialty not found" });
        res.json({ message: "Specialty deleted successfully" });
    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ message: 'Cannot delete specialty: it is assigned to one or more doctors.' });
        res.status(500).json({ message: err.message });
    }
}
