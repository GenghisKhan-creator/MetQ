/**
 * Rule-based triage system
 * Categorizes urgency based on symptom responses
 */
exports.assessTriage = (responses) => {
    let score = 0;

    // Example rules
    if (responses.shortnessOfBreath) score += 5;
    if (responses.chestPain) score += 5;
    if (responses.highFever) score += 3;
    if (responses.severePain) score += 3;
    if (responses.duration === 'long') score += 1;

    let urgency = 'Routine';
    let recommendedAction = 'Schedule a regular visit.';

    if (score >= 8) {
        urgency = 'Critical';
        recommendedAction = 'Proceed to Emergency Department immediately.';
    } else if (score >= 4) {
        urgency = 'Moderate';
        recommendedAction = 'See a doctor within 24 hours.';
    }

    return {
        urgency,
        score,
        recommendedAction
    };
};
