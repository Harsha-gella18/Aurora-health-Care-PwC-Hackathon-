import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import LoadingSpinner from './LoadingSpinner';

export default function DashboardLayout({ allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading Aurora Health..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowedRole) return <Navigate to={`/${user.role}`} replace />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:p-8 p-4 pt-16 lg:pt-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
