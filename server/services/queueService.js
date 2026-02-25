/**
 * Predictive Wait Time Algorithm
 * Estimated Wait = (Patients Ahead × Avg Duration) × Attendance Probability
 */
exports.calculateWaitTime = (patientsAhead, avgConsultationTime, attendanceProbability = 0.85) => {
    const estimatedMinutes = (patientsAhead * avgConsultationTime) * (1 / attendanceProbability);
    return Math.round(estimatedMinutes);
};

/**
 * Queue Recalculation Service
 * Safely reshuffles queue when an emergency priority override occurs
 */
exports.recalculateQueue = (entries) => {
    // Sort logic: High priority first, then by entry time/position
    return entries.sort((a, b) => {
        if (a.priority_level !== b.priority_level) {
            return a.priority_level - b.priority_level;
        }
        return new Date(a.entry_time) - new Date(b.entry_time);
    });
};

/**
 * Anti No-Show Penalty System
 * Flags frequent no-show users and limits booking window
 */
exports.checkNoShowPenalty = (noShowCount) => {
    if (noShowCount >= 3) {
        return {
            isPenalized: true,
            message: 'Soft penalty: Limited booking window due to frequent no-shows.',
            bookingLimitDays: 2 // Can only book 2 days ahead
        };
    }
    return { isPenalized: false };
};
