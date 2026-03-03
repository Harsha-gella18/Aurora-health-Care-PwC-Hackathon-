import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import {
  Sparkles, Shield, Brain, Activity, Users, Clock, ArrowRight,
  X, Mail, Lock, User, LogIn, UserPlus, Stethoscope,
  BarChart3, Bell, CheckCircle2
} from 'lucide-react';

function LoginModal({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      navigate(`/${userData.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-modal-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl shadow-lg shadow-teal-200 mb-3">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-1">Sign in to your Aurora Health account</p>
        </div>

        <Alert type="error" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="you@hospital.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-teal-200"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <><LogIn className="h-5 w-5" />Sign In</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="text-teal-600 hover:text-teal-700 font-medium">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterModal({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [patientFields, setPatientFields] = useState({ date_of_birth: '', gender: 'male', phone: '', blood_group: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await register(form.name, form.email, form.password, 'patient', patientFields);
      navigate(`/${userData.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-modal-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl shadow-lg shadow-teal-200 mb-3">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Registration</h2>
          <p className="text-gray-500 text-sm mt-1">Create your Aurora Health account</p>
        </div>

        <Alert type="error" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text" required value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email" required value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                placeholder="you@hospital.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password" required value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                placeholder="Min 6 characters" minLength={6}
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-teal-50 rounded-xl">
            <p className="text-sm font-medium text-teal-800">Patient Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                <input type="date" value={patientFields.date_of_birth}
                  onChange={(e) => setPatientFields({ ...patientFields, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select value={patientFields.gender}
                onChange={(e) => setPatientFields({ ...patientFields, gender: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="tel" value={patientFields.phone}
                onChange={(e) => setPatientFields({ ...patientFields, phone: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Phone"
              />
              <input type="text" value={patientFields.blood_group}
                onChange={(e) => setPatientFields({ ...patientFields, blood_group: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Blood Group"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-60 shadow-lg shadow-teal-200"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <><UserPlus className="h-5 w-5" />Create Account</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-teal-600 hover:text-teal-700 font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Predictions',
    desc: 'Advanced machine learning models predict readmission risks before discharge, enabling proactive care.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Shield,
    title: 'Secure Health Records',
    desc: 'End-to-end encrypted medical records with role-based access control for complete data privacy.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    desc: 'Track patient vitals and recovery progress in real-time with intelligent alert systems.',
    color: 'bg-red-100 text-red-600',
  },
  {
    icon: Users,
    title: 'Multi-Role Access',
    desc: 'Tailored dashboards for patients, doctors, nurses, and administrators — everyone stays connected.',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    desc: 'Comprehensive readmission statistics and hospital performance metrics at your fingertips.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Automated alerts for high-risk patients, upcoming appointments, and pending tasks.',
    color: 'bg-cyan-100 text-cyan-600',
  },
];

const stats = [
  { value: '35%', label: 'Reduction in Readmissions' },
  { value: '10K+', label: 'Patients Managed' },
  { value: '500+', label: 'Healthcare Providers' },
  { value: '99.9%', label: 'Uptime Guarantee' },
];

export default function LandingPage() {
  const [modal, setModal] = useState(null);

  const openLogin = () => setModal('login');
  const openRegister = () => setModal('register');
  const closeModal = () => setModal(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-teal-600 rounded-xl shadow-md shadow-teal-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Aurora Health</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-teal-600 transition-colors">Features</a>
            <a href="#stats" className="hover:text-teal-600 transition-colors">Impact</a>
            <a href="#roles" className="hover:text-teal-600 transition-colors">For Teams</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openLogin}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-teal-600 border border-gray-200 rounded-xl hover:border-teal-200 hover:bg-teal-50 transition-all"
            >
              Login
            </button>
            <button
              onClick={openRegister}
              className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-200 transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-8">
            <Stethoscope className="h-4 w-4" />
            AI-Powered Healthcare Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Smarter Care,
            <br />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
              Fewer Readmissions
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Aurora Health uses predictive analytics to identify at-risk patients, streamline
            discharge planning, and connect care teams — reducing hospital readmissions by up to 35%.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openRegister}
              className="group flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold text-lg shadow-xl shadow-teal-200 transition-all hover:shadow-2xl hover:shadow-teal-300"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={openLogin}
              className="flex items-center gap-2 px-8 py-4 border-2 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-600 rounded-2xl font-semibold text-lg transition-all hover:bg-teal-50"
            >
              <LogIn className="h-5 w-5" />
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section id="stats" className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Better Outcomes
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A comprehensive platform designed to reduce readmissions and improve patient care at every stage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-teal-100 transition-all group">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.color} mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Every Role
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Whether you're a patient, doctor, nurse, or administrator — Aurora Health has a tailored experience for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: 'Patient', icon: User, items: ['View medical history', 'Track appointments', 'Access discharge summaries', 'Monitor health profile'] },
              { role: 'Doctor', icon: Stethoscope, items: ['Manage patient records', 'AI risk assessments', 'Discharge planning', 'Treatment tracking'] },
              { role: 'Nurse', icon: Activity, items: ['Assigned patient list', 'Task management', 'Vitals recording', 'Care coordination'] },
              { role: 'Admin', icon: BarChart3, items: ['Readmission analytics', 'High-risk monitoring', 'System-wide dashboards', 'Performance metrics'] },
            ].map((r, i) => (
              <div key={i} className="bg-gradient-to-b from-teal-50 to-white rounded-2xl p-6 border border-teal-100 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                    <r.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{r.role}</h3>
                </div>
                <ul className="space-y-3">
                  {r.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-teal-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Patient Care?
          </h2>
          <p className="text-teal-100 text-lg mb-10 leading-relaxed">
            Join hundreds of healthcare providers already using Aurora Health to reduce
            readmissions and deliver better outcomes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openRegister}
              className="group flex items-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:bg-teal-50"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={openLogin}
              className="flex items-center gap-2 px-8 py-4 border-2 border-white/30 hover:border-white/60 text-white rounded-2xl font-semibold text-lg transition-all hover:bg-white/10"
            >
              <LogIn className="h-5 w-5" />
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-teal-400" />
          <span className="text-white font-semibold">Aurora Health</span>
        </div>
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Aurora Health. Smart Healthcare Management.
        </p>
      </footer>

      {/* Modals */}
      {modal === 'login' && (
        <LoginModal onClose={closeModal} onSwitchToRegister={() => setModal('register')} />
      )}
      {modal === 'register' && (
        <RegisterModal onClose={closeModal} onSwitchToLogin={() => setModal('login')} />
      )}
    </div>
  );
}
