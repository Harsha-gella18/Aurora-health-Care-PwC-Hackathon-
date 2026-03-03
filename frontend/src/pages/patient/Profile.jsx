import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Droplets, Heart } from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/patient/profile')
      .then(res => {
        const d = res.data.data;
        setProfile({ ...d.profile, user_id: d.user });
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Your personal information</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {profile && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center">
              <User className="h-10 w-10 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.user_id?.name || 'Patient'}</h2>
              <p className="text-gray-500">{profile.user_id?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoItem icon={User} label="Gender" value={profile.gender || 'N/A'} />
            <InfoItem icon={Heart} label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'} />
            <InfoItem icon={Phone} label="Phone" value={profile.phone || 'N/A'} />
            <InfoItem icon={Droplets} label="Blood Group" value={profile.blood_group || 'N/A'} />
            <InfoItem icon={MapPin} label="Address" value={profile.address || 'N/A'} />
            <InfoItem icon={Phone} label="Emergency Contact" value={profile.emergency_contact || 'N/A'} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-teal-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
