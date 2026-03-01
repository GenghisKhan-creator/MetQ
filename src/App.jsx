import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import UserSignup from './pages/UserSignup';
import AdminSignup from './pages/AdminSignup';
import Home from './pages/Home';
import BookAppointment from './pages/BookAppointment';
import QueueStatus from './pages/QueueStatus';
import AdminDashboard from './pages/AdminDashboard';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import MedicalPassport from './pages/MedicalPassport';
import Login from './pages/Login';
import About from './pages/About';
import Services from './pages/Services';
import Technology from './pages/Technology';
import PatientProfile from './pages/PatientProfile';
import UserManagement from './pages/UserManagement';
import SpecialtyManagement from './pages/SpecialtyManagement';
import DoctorSchedule from './pages/DoctorSchedule';
import Invoices from './pages/Invoices';

import { ProtectedRoute } from './components/ProtectedRoute';
import ChangePasswordModal from './components/ChangePasswordModal';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#E2E8F0]">
          <ChangePasswordModal />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/technology" element={<Technology />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<UserSignup />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/book" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
            <Route path="/queue" element={<ProtectedRoute><QueueStatus /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/doctor-dashboard" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/schedule" element={<ProtectedRoute><DoctorSchedule /></ProtectedRoute>} />
            <Route path="/patient-dashboard" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
            <Route path="/passport" element={<ProtectedRoute><MedicalPassport /></ProtectedRoute>} />
            <Route path="/passport/:patientId" element={<ProtectedRoute><MedicalPassport /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/specialties" element={<ProtectedRoute requireAdmin={true}><SpecialtyManagement /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
