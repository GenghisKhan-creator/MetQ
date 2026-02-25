import { io } from 'socket.io-client';

const URL = 'http://localhost:5000';

export const socket = io(URL, {
    autoConnect: false,
});

export const connectSocket = () => {
    if (!socket.connected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

export const joinQueueRoom = (doctor_id) => {
    socket.emit('join_queue', { doctor_id });
};

export const joinHospitalRoom = (hospital_id) => {
    socket.emit('join_hospital', { hospital_id });
};
