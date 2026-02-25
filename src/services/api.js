import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData)
};

export const appointmentService = {
    book: (data) => api.post('/appointments', data),
    getMyAppointments: () => api.get('/appointments/my')
};

export const queueService = {
    getLiveQueue: (doctorId) => api.get(`/queues/live/${doctorId}`),
    updateStatus: (data) => api.patch('/queues/status', data)
};

export const medicalService = {
    getPassport: () => api.get('/medical/passport'),
    addRecord: (record) => api.post('/medical/record', record)
};

export default api;
