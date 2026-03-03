import { useState, useEffect } from 'react';
import {
  Users, Plus, Trash2, Loader2, X, Stethoscope, UserCheck,
  FlaskConical, Pill, Receipt, Shield, Search, Pencil, Eye, EyeOff,
} from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const ROLE_OPTIONS = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'billing_officer', label: 'Billing Officer' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_BADGE = {
  doctor: 'bg-teal-100 text-teal-700',
  nurse: 'bg-purple-100 text-purple-700',
  lab_technician: 'bg-amber-100 text-amber-700',
  pharmacist: 'bg-green-100 text-green-700',
  billing_officer: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

const ROLE_ICON = {
  doctor: Stethoscope,
  nurse: UserCheck,
  lab_technician: FlaskConical,
  pharmacist: Pill,
  billing_officer: Receipt,
  admin: Shield,
};

const DEPARTMENTS = [
  'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'General Medicine', 'ENT', 'Ophthalmology',
  'Psychiatry', 'Gynecology',
];

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'doctor',
  specialization: '', license_number: '', department: 'General Medicine',
};

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchStaff = async () => {
    try {
      const res = await API.get('/admin/all-staff');
      setStaff(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingUser(member);
    setForm({
      name: member.name || '',
      email: member.email || '',
      password: '',
      role: member.role || 'doctor',
      specialization: member.specialization || '',
      license_number: member.license_number || '',
      department: member.department || 'General Medicine',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActing(true); setError(''); setSuccess('');
    try {
      if (editingUser) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        if (editingUser.role === 'doctor') {
          payload.specialization = form.specialization;
          payload.license_number = form.license_number;
          payload.department = form.department;
        }
        await API.put(`/admin/update-staff/${editingUser._id}`, payload);
        setSuccess('Staff member updated successfully');
      } else {
        const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
        if (form.role === 'doctor') {
          payload.specialization = form.specialization;
          payload.license_number = form.license_number;
          payload.department = form.department;
        }
        const res = await API.post('/admin/create-staff', payload);
        setSuccess(res.data.message || 'Staff created successfully');
      }
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      setEditingUser(null);
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) return;
    setActing(true); setError(''); setSuccess('');
    try {
      await API.delete(`/admin/delete-staff/${userId}`);
      setSuccess('Staff member deleted');
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const filtered = staff.filter(s => {
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    const matchesSearch = !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const grouped = ROLE_OPTIONS.map(r => ({
    ...r,
    members: filtered.filter(s => s.role === r.value),
  })).filter(g => g.members.length > 0);

  const roleCounts = {};
  staff.forEach(s => { roleCounts[s.role] = (roleCounts[s.role] || 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">{staff.length} staff member(s) registered</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all">
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Search & Role Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, specialization..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterRole('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterRole === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              All ({staff.length})
            </button>
            {ROLE_OPTIONS.map(r => (
              <button key={r.value} onClick={() => setFilterRole(r.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filterRole === r.value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {r.label}s ({roleCounts[r.value] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Staff List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {staff.length === 0
              ? 'No staff members yet. Click "Add Staff" to create one.'
              : 'No staff match your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => {
            const Icon = ROLE_ICON[group.value] || Users;
            return (
              <div key={group.value} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ROLE_BADGE[group.value]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{group.label}s</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{group.members.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.members.map(s => (
                    <div key={s._id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-gray-500">{(s.name || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email}</p>
                        </div>
                        {s.specialization && (
                          <span className="hidden sm:inline-flex text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{s.specialization}</span>
                        )}
                        {s.department && (
                          <span className="hidden sm:inline-flex text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.department}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEditModal(s)} disabled={acting}
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(s._id, s.name)} disabled={acting}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditingUser(null); }} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowModal(false); setEditingUser(null); }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-400" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {editingUser ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {editingUser ? `Editing ${editingUser.name}'s details` : 'Create a new account for a staff member'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Dr. John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                  {editingUser ? (
                    <div className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 capitalize">
                      {editingUser.role?.replace('_', ' ')}
                    </div>
                  ) : (
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="john@hospital.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={editingUser ? 'Enter new password to change' : 'Min 6 characters'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {(editingUser ? editingUser.role : form.role) === 'doctor' && (
                <div className="space-y-3 p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <p className="text-xs font-semibold text-teal-800">Doctor Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Specialization</label>
                      <input type="text" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="e.g. Cardiologist" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">License Number</label>
                      <input type="text" value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        placeholder="LIC-XXXXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Department</label>
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200">
                  {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      {editingUser ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingUser ? 'Update' : 'Create Account'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
