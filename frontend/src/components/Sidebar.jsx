import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, ClipboardList, User,
  Users, LogOut, Activity, BarChart3, AlertTriangle,
  CheckSquare, Sparkles, Menu, X, FolderOpen
} from 'lucide-react';
import { useState } from 'react';

const menuConfig = {
  patient: [
    { to: '/patient', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/patient/cases', icon: FolderOpen, label: 'My Cases' },
    { to: '/patient/appointments', icon: Calendar, label: 'Book Appointment' },
    { to: '/patient/profile', icon: User, label: 'Profile' },
  ],
  doctor: [
    { to: '/doctor', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/doctor/patients', icon: Users, label: 'All Patients' },
  ],
  nurse: [
    { to: '/nurse', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/nurse/tasks', icon: CheckSquare, label: 'My Tasks' },
    { to: '/nurse/patients', icon: Users, label: 'Patients' },
  ],
  lab_technician: [
    { to: '/lab_technician', icon: LayoutDashboard, label: 'Dashboard', end: true },
  ],
  pharmacist: [
    { to: '/pharmacist', icon: LayoutDashboard, label: 'Dashboard', end: true },
  ],
  billing_officer: [
    { to: '/billing_officer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/admin/staff', icon: Users, label: 'Staff Management' },
    { to: '/admin/readmission-stats', icon: BarChart3, label: 'Readmission Stats' },
    { to: '/admin/high-risk', icon: AlertTriangle, label: 'High Risk Patients' },
    { to: '/admin/staff-workload', icon: Activity, label: 'Staff Workload' },
    { to: '/admin/audit-log', icon: ClipboardList, label: 'Audit Log' },
  ],
};

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab_technician: 'Lab Tech',
  pharmacist: 'Pharmacist',
  billing_officer: 'Billing',
  admin: 'Admin',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'patient';
  const items = menuConfig[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-teal-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Aurora Health</h1>
            <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={linkClasses}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 mb-3">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="w-72 h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:min-h-screen bg-white border-r border-gray-200 shadow-sm">
        {sidebarContent}
      </aside>
    </>
  );
}
