const Joi = require('joi');

const registerSchema = Joi.object({
    full_name: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().max(20),
    role: Joi.string().valid('patient', 'doctor', 'hospital_admin'),
    hospital_id: Joi.string().uuid()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {
    registerSchema,
    loginSchema
};
