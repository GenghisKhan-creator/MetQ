const db = require('../config/db');
const { assessTriage } = require('../services/triageService');
const { calculateWaitTime } = require('../services/queueService');

exports.bookAppointment = async (req, res) => {
    const { doctor_id, appointment_date, start_time, triage_responses, hospital_id } = req.body;
    const patient_id = req.user.id;

    try {
        // 1. Check for double booking
        const existing = await db.query(
            'SELECT * FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND start_time = $3 AND status != $4',
            [doctor_id, appointment_date, start_time, 'canceled']
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Time slot already booked' });
        }

        // 2. Run Triage
        let triage_id = null;
        let urgency = 'Routine';
        if (triage_responses) {
            const triageResult = assessTriage(triage_responses);
            urgency = triageResult.urgency;

            const triageRec = await db.query(
                'INSERT INTO triage_assessments (patient_id, responses, urgency, score, recommended_action) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [patient_id, triage_responses, triageResult.urgency, triageResult.score, triageResult.recommendedAction]
            );
            triage_id = triageRec.rows[0].id;
        }

        // 3. Create Appointment
        const appointment = await db.query(
            'INSERT INTO appointments (patient_id, doctor_id, hospital_id, triage_id, appointment_date, start_time, end_time, is_emergency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [patient_id, doctor_id, hospital_id, triage_id, appointment_date, start_time, start_time, urgency === 'Critical']
        );

        // 4. Add to Queue if today
        const today = new Date().toISOString().split('T')[0];
        if (appointment_date === today) {
            // Check if queue exists for this doctor/hospital today
            let queueRes = await db.query(
                'SELECT id, total_in_queue FROM queues WHERE doctor_id = $1 AND date = $2',
                [doctor_id, today]
            );

            let queueId;
            let currentTotal;

            if (queueRes.rows.length === 0) {
                const newQueue = await db.query(
                    'INSERT INTO queues (hospital_id, doctor_id, date, total_in_queue) VALUES ($1, $2, $3, $4) RETURNING id',
                    [hospital_id, doctor_id, today, 0]
                );
                queueId = newQueue.rows[0].id;
                currentTotal = 0;
            } else {
                queueId = queueRes.rows[0].id;
                currentTotal = queueRes.rows[0].total_in_queue;
            }

            // Determine priority 1=Critical (High), 2=Moderate (Medium), 3=Routine (Low)
            const priority = urgency === 'Critical' ? 1 : urgency === 'Moderate' ? 2 : 3;

            // Add queue entry
            await db.query(
                'INSERT INTO queue_entries (queue_id, appointment_id, position, priority_level, status) VALUES ($1, $2, $3, $4, $5)',
                [queueId, appointment.rows[0].id, currentTotal + 1, priority, 'waiting']
            );

            // Update queue count
            await db.query(
                'UPDATE queues SET total_in_queue = total_in_queue + 1 WHERE id = $1',
                [queueId]
            );
        }

        res.status(201).json(appointment.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT a.*, d.full_name as doctor_name, s.name as specialty, qe.status as queue_status FROM appointments a JOIN doctors dr ON a.doctor_id = dr.id JOIN users d ON dr.user_id = d.id LEFT JOIN specialties s ON dr.specialty_id = s.id LEFT JOIN queue_entries qe ON a.id = qe.appointment_id WHERE a.patient_id = $1 ORDER BY a.appointment_date DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDoctorDashboardData = async (req, res) => {
    try {
        // 1. Get Doctor ID from User ID
        const doctorRes = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (doctorRes.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        const doctor_id = doctorRes.rows[0].id;
        const today = new Date().toISOString().split('T')[0];

        // 2. Get Today's Appointments
        const appointments = await db.query(
            `SELECT a.*, u.full_name as patient_name, qe.status as queue_status, qe.position, qe.id as queue_entry_id 
             FROM appointments a 
             JOIN users u ON a.patient_id = u.id 
             LEFT JOIN queue_entries qe ON a.id = qe.appointment_id
             WHERE a.doctor_id = $1 AND a.appointment_date = $2
             ORDER BY a.start_time ASC`,
            [doctor_id, today]
        );

        // 3. Aggregate Stats
        const totalPatients = appointments.rows.length;
        const pending = appointments.rows.filter(a => a.status === 'confirmed' || a.status === 'pending').length;
        const completed = appointments.rows.filter(a => a.status === 'completed').length;

        // Mock avg wait for now or calculate from queue if available
        const avgWait = "12m";

        res.json({
            stats: [
                { label: "Today's Patients", value: totalPatients.toString(), icon: 'Users', color: "bg-blue-500" },
                { label: "Pending", value: pending.toString(), icon: 'Clock', color: "bg-orange-500" },
                { label: "Completed", value: completed.toString(), icon: 'CheckCircle', color: "bg-green-500" },
                { label: "Avg. Wait", value: avgWait, icon: 'Activity', color: "bg-purple-500" }
            ],
            appointments: appointments.rows.map(a => ({
                id: a.id,
                queue_entry_id: a.queue_entry_id,
                patient_id: a.patient_id,
                patient: a.patient_name,
                time: a.start_time,
                type: a.is_emergency ? "Emergency" : "Regular Visit",
                status: a.queue_status || a.status
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
