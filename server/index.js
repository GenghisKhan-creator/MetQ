const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Make io accessible to routes/controllers
app.set('io', io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded files (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Default Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to MetQ API - Smart Queue & Appointment Management' });
});

// Import Routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queues');
const medicalRoutes = require('./routes/medical');
const adminRoutes = require('./routes/admin');
const hospitalRoutes = require('./routes/hospitals');
const { startJobs } = require('./services/cronService');

// Start Background Jobs
startJobs();

// Routes Middleware
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Socket.io Real-time Connection
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Client joins a doctor's queue room to get live updates
    socket.on('join_queue', ({ doctor_id }) => {
        if (doctor_id) {
            socket.join(`queue_${doctor_id}`);
            console.log(`[Socket] Client ${socket.id} joined queue room: queue_${doctor_id}`);
        }
    });

    // Client joins hospital admin room
    socket.on('join_hospital', ({ hospital_id }) => {
        if (hospital_id) {
            socket.join(`hospital_${hospital_id}`);
            console.log(`[Socket] Client ${socket.id} joined hospital room: hospital_${hospital_id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.io enabled`);
});
