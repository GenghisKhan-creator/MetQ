const db = require('../config/db');
const { assessTriage } = require('../services/triageService');
const { calculateWaitTime } = require('../services/queueService');
const { sendAppointmentConfirmation, sendCancellationNotice } = require('../services/emailService');

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
            return res.status(400).json({ message: 'This time slot is already booked. Please choose another.' });
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

            const priority = urgency === 'Critical' ? 1 : urgency === 'Moderate' ? 2 : 3;
            await db.query(
                'INSERT INTO queue_entries (queue_id, appointment_id, position, priority_level, status) VALUES ($1, $2, $3, $4, $5)',
                [queueId, appointment.rows[0].id, currentTotal + 1, priority, 'waiting']
            );
            await db.query(
                'UPDATE queues SET total_in_queue = total_in_queue + 1 WHERE id = $1',
                [queueId]
            );
        }

        // 5. Send confirmation email (async, don't block response)
        setImmediate(async () => {
            try {
                const patientRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [patient_id]);
                const doctorRes = await db.query(
                    'SELECT u.full_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = $1',
                    [doctor_id]
                );
                const hospitalRes = await db.query('SELECT name FROM hospitals WHERE id = $1', [hospital_id]);

                if (patientRes.rows.length > 0 && doctorRes.rows.length > 0) {
                    await sendAppointmentConfirmation({
                        to: patientRes.rows[0].email,
                        patientName: patientRes.rows[0].full_name,
                        doctorName: doctorRes.rows[0].full_name,
                        hospitalName: hospitalRes.rows[0]?.name || 'MetQ Clinic',
                        appointmentDate: appointment_date,
                        startTime: start_time,
                        urgency
                    });
                }
            } catch (emailErr) {
                console.error('[Email] Confirmation email error:', emailErr.message);
            }
        });

        res.status(201).json(appointment.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.*, d.full_name as doctor_name, s.name as specialty, 
             qe.status as queue_status, qe.position as queue_position
             FROM appointments a 
             JOIN doctors dr ON a.doctor_id = dr.id 
             JOIN users d ON dr.user_id = d.id 
             LEFT JOIN specialties s ON dr.specialty_id = s.id 
             LEFT JOIN queue_entries qe ON a.id = qe.appointment_id 
             WHERE a.patient_id = $1 
             ORDER BY a.appointment_date DESC, a.start_time DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    const { id } = req.params;
    const patient_id = req.user.id;

    try {
        // Verify ownership
        const apptRes = await db.query('SELECT * FROM appointments WHERE id = $1 AND patient_id = $2', [id, patient_id]);
        if (apptRes.rows.length === 0) {
            return res.status(404).json({ message: 'Appointment not found or access denied' });
        }

        const appt = apptRes.rows[0];
        if (appt.status === 'canceled') {
            return res.status(400).json({ message: 'Appointment is already cancelled' });
        }
        if (appt.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
        }

        // Update status
        await db.query(
            'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['canceled', id]
        );

        // Remove from queue if present
        await db.query('DELETE FROM queue_entries WHERE appointment_id = $1', [id]);

        // Send cancellation email (async)
        setImmediate(async () => {
            try {
                const patientRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [patient_id]);
                const doctorRes = await db.query(
                    'SELECT u.full_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = $1',
                    [appt.doctor_id]
                );
                if (patientRes.rows.length > 0 && doctorRes.rows.length > 0) {
                    await sendCancellationNotice({
                        to: patientRes.rows[0].email,
                        patientName: patientRes.rows[0].full_name,
                        doctorName: doctorRes.rows[0].full_name,
                        appointmentDate: appt.appointment_date,
                        startTime: appt.start_time,
                    });
                }
            } catch (emailErr) {
                console.error('[Email] Cancellation email error:', emailErr.message);
            }
        });

        res.json({ message: 'Appointment cancelled successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDoctorDashboardData = async (req, res) => {
    try {
        const doctorRes = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
        if (doctorRes.rows.length === 0) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        const doctor_id = doctorRes.rows[0].id;
        const today = new Date().toISOString().split('T')[0];

        const appointments = await db.query(
            `SELECT a.*, u.full_name as patient_name, u.id as patient_id,
             qe.status as queue_status, qe.position, qe.id as queue_entry_id 
             FROM appointments a 
             JOIN users u ON a.patient_id = u.id 
             LEFT JOIN queue_entries qe ON a.id = qe.appointment_id
             WHERE a.doctor_id = $1 AND a.appointment_date = $2
             ORDER BY a.start_time ASC`,
            [doctor_id, today]
        );

        const totalPatients = appointments.rows.length;
        const pending = appointments.rows.filter(a => a.status === 'confirmed' || a.status === 'pending').length;
        const completed = appointments.rows.filter(a => a.status === 'completed').length;
        const avgWait = '12m';

        res.json({
            stats: [
                { label: "Today's Patients", value: totalPatients.toString(), icon: 'Users', color: 'bg-blue-500' },
                { label: 'Pending', value: pending.toString(), icon: 'Clock', color: 'bg-orange-500' },
                { label: 'Completed', value: completed.toString(), icon: 'CheckCircle', color: 'bg-green-500' },
                { label: 'Avg. Wait', value: avgWait, icon: 'Activity', color: 'bg-purple-500' }
            ],
            appointments: appointments.rows.map(a => ({
                id: a.id,
                queue_entry_id: a.queue_entry_id,
                patient_id: a.patient_id,
                patient: a.patient_name,
                time: a.start_time,
                type: a.is_emergency ? 'Emergency' : 'Regular Visit',
                status: a.queue_status || a.status
            }))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
