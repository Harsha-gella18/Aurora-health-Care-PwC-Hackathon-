import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

import PatientDashboard from './pages/patient/PatientDashboard';
import Appointments from './pages/patient/Appointments';
import Profile from './pages/patient/Profile';
import MyCases from './pages/patient/MyCases';
import CaseDetail from './pages/patient/CaseDetail';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import MyPatients from './pages/doctor/MyPatients';
import PatientDetails from './pages/doctor/PatientDetails';
import CaseManage from './pages/doctor/CaseManage';

import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseTasks from './pages/nurse/NurseTasks';
import NursePatients from './pages/nurse/NursePatients';

import LabDashboard from './pages/lab/LabDashboard';
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard';
import BillingDashboard from './pages/billing/BillingDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import ReadmissionStats from './pages/admin/ReadmissionStats';
import HighRiskPatients from './pages/admin/HighRiskPatients';
import StaffWorkload from './pages/admin/StaffWorkload';
import AuditLogPage from './pages/admin/AuditLog';
import StaffManagement from './pages/admin/StaffManagement';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/patient" element={<DashboardLayout allowedRole="patient" />}>
            <Route index element={<PatientDashboard />} />
            <Route path="cases" element={<MyCases />} />
            <Route path="case/:id" element={<CaseDetail />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/doctor" element={<DashboardLayout allowedRole="doctor" />}>
            <Route index element={<DoctorDashboard />} />
            <Route path="patients" element={<MyPatients />} />
            <Route path="patient/:id" element={<PatientDetails />} />
            <Route path="case/:caseId" element={<CaseManage />} />
          </Route>

          <Route path="/nurse" element={<DashboardLayout allowedRole="nurse" />}>
            <Route index element={<NurseDashboard />} />
            <Route path="tasks" element={<NurseTasks />} />
            <Route path="patients" element={<NursePatients />} />
          </Route>

          <Route path="/lab_technician" element={<DashboardLayout allowedRole="lab_technician" />}>
            <Route index element={<LabDashboard />} />
          </Route>

          <Route path="/pharmacist" element={<DashboardLayout allowedRole="pharmacist" />}>
            <Route index element={<PharmacistDashboard />} />
          </Route>

          <Route path="/billing_officer" element={<DashboardLayout allowedRole="billing_officer" />}>
            <Route index element={<BillingDashboard />} />
          </Route>

          <Route path="/admin" element={<DashboardLayout allowedRole="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="readmission-stats" element={<ReadmissionStats />} />
            <Route path="high-risk" element={<HighRiskPatients />} />
            <Route path="staff-workload" element={<StaffWorkload />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="staff" element={<StaffManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
