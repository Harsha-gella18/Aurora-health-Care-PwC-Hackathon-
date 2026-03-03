import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User, Sparkles, FolderOpen, ChevronRight, ChevronDown, Loader2, FileText,
  FlaskConical, Pill, ArrowLeft, CheckCircle, Clock, Download, Activity,
  Stethoscope, Calendar, AlertTriangle, History,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

const BASE_URL = 'http://localhost:5001';

function CaseCard({ c, isOwn, expandedCase, setExpandedCase }) {
  const isExpanded = expandedCase === c._id;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      c.status === 'active'
        ? 'border-teal-200 bg-teal-50/30'
        : 'border-gray-200 bg-white'
    }`}>
      <button
        onClick={() => setExpandedCase(isExpanded ? null : c._id)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            c.status === 'active' ? 'bg-teal-100' : 'bg-green-100'
          }`}>
            {c.status === 'active'
              ? <Activity className="h-5 w-5 text-teal-600" />
              : <CheckCircle className="h-5 w-5 text-green-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900">{c.title}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                c.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
              }`}>{c.status}</span>
              {!isOwn && c.doctor_id?.user_id?.name && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                  Dr. {c.doctor_id.user_id.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              {c.diagnosis && <> &middot; <span className="font-medium text-gray-700">{c.diagnosis}</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {c.status === 'active' && isOwn && (
            <Link to={`/doctor/case/${c._id}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors">
              Manage <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {c.stages && <CaseProgressBar stages={c.stages} compact />}

          {c.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.symptoms.map((s, i) => (
                <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-[11px] rounded-lg font-medium">{s}</span>
              ))}
            </div>
          )}

          {c.diagnosis && (
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-teal-700 mb-1">Diagnosis</p>
              <p className="text-sm text-teal-900">{c.diagnosis}</p>
            </div>
          )}

          {c.lab_tests?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <FlaskConical className="h-3.5 w-3.5" /> Lab Tests ({c.lab_tests.length})
              </p>
              <div className="space-y-1">
                {c.lab_tests.map(t => (
                  <div key={t._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{t.name}</span>
                      {t.report_file && (
                        <a href={`${BASE_URL}${t.report_file}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-0.5 text-teal-600 hover:text-teal-800 font-medium">
                          <Download className="h-3 w-3" /> Report
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      {t.results && <span className="text-gray-600 mr-2">{t.results}</span>}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.prescriptions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
                <Pill className="h-3.5 w-3.5" /> Prescriptions ({c.prescriptions.length})
              </p>
              <div className="space-y-1">
                {c.prescriptions.map(p => (
                  <div key={p._id} className="p-2 bg-green-50 rounded-lg text-xs">
                    <span className="font-medium text-gray-900">{p.medication_name}</span>
                    <span className="text-gray-500 ml-2">{p.dosage} &middot; {p.frequency} &middot; {p.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.billing?.total > 0 && (
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-xs">
              <span className="font-medium text-amber-700">Total Billed</span>
              <span className="font-bold text-amber-900">${c.billing.total.toFixed(2)}</span>
            </div>
          )}

          {c.consultation_document && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Consultation Document
                </p>
                {c.consultation_pdf_path && (
                  <a href={`${BASE_URL}${c.consultation_pdf_path.replace(/.*uploads/, '/uploads')}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium bg-teal-50 px-2 py-1 rounded">
                    <Download className="h-3 w-3" /> Download PDF
                  </a>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 max-h-48 overflow-y-auto prose prose-sm max-w-none">
                <ReactMarkdown>{c.consultation_document}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1">
            <Clock className="h-3 w-3" />
            Created: {new Date(c.createdAt).toLocaleDateString()} &middot;
            Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientDetails() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [otherCases, setOtherCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [expandedCase, setExpandedCase] = useState(null);
  const [showOtherHistory, setShowOtherHistory] = useState(false);

  useEffect(() => {
    API.get(`/doctor/patient/${id}`)
      .then(res => {
        const d = res.data.data;
        setPatient(d.patient);
        setMyCases(d.myCases || []);
        setOtherCases(d.otherDoctorCases || []);
        setAppointments(d.appointments || []);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load patient'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAISummary = async () => {
    setSummarizing(true); setError(''); setAiSummary('');
    try {
      const res = await API.post('/ai/summarize-past-cases', { patient_id: id });
      setAiSummary(res.data.data?.summary || 'No summary available.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to summarize');
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!patient) return <p className="text-center text-gray-500 py-12">Patient not found</p>;

  const myActiveCases = myCases.filter(c => c.status === 'active');
  const myPastCases = myCases.filter(c => c.status !== 'active');
  const allCasesCount = myCases.length + otherCases.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/doctor/patients" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {/* Patient Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center">
              <User className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{patient.user_id?.name || 'Patient'}</h2>
              <p className="text-gray-500 text-sm">
                {patient.user_id?.email} &middot; {patient.gender || 'N/A'} &middot; {patient.blood_group || 'N/A'} &middot; {patient.phone || 'No phone'}
              </p>
            </div>
          </div>
          <button onClick={handleAISummary} disabled={summarizing || allCasesCount === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg shadow-purple-200 text-sm">
            {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {summarizing ? 'Analyzing...' : 'AI Summarize History'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-teal-700">{myCases.length}</p>
            <p className="text-[11px] text-teal-600 font-medium">My Cases</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-teal-700">{myActiveCases.length}</p>
            <p className="text-[11px] text-teal-600 font-medium">Active Now</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{myPastCases.length}</p>
            <p className="text-[11px] text-green-600 font-medium">Completed</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{otherCases.length}</p>
            <p className="text-[11px] text-purple-600 font-medium">Other Doctors</p>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">AI Patient History Summary</h3>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed bg-white/70 rounded-xl p-4 prose prose-sm max-w-none">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* My Active Cases */}
      {myActiveCases.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            My Active Cases ({myActiveCases.length})
          </h3>
          <div className="space-y-3">
            {myActiveCases.map(c => (
              <CaseCard key={c._id} c={c} isOwn expandedCase={expandedCase} setExpandedCase={setExpandedCase} />
            ))}
          </div>
        </div>
      )}

      {/* My Past Cases */}
      {myPastCases.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            My Past Cases &amp; Reports ({myPastCases.length})
          </h3>
          <div className="space-y-3">
            {myPastCases.map(c => (
              <CaseCard key={c._id} c={c} isOwn expandedCase={expandedCase} setExpandedCase={setExpandedCase} />
            ))}
          </div>
        </div>
      )}

      {/* Other Doctor History */}
      {otherCases.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={() => setShowOtherHistory(!showOtherHistory)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Previous History from Other Doctors ({otherCases.length})
            </h3>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showOtherHistory ? 'rotate-180' : ''}`} />
          </button>

          {showOtherHistory && (
            <div className="mt-4 space-y-3">
              {otherCases.map(c => (
                <CaseCard key={c._id} c={c} isOwn={false} expandedCase={expandedCase} setExpandedCase={setExpandedCase} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointments */}
      {appointments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Appointment History ({appointments.length})
          </h3>
          <div className="space-y-2">
            {appointments.slice(0, 10).map(a => (
              <div key={a._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    a.status === 'completed' ? 'bg-green-500' :
                    a.status === 'cancelled' ? 'bg-red-500' :
                    a.status === 'confirmed' ? 'bg-teal-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-gray-700">
                    {new Date(a.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {a.time_slot && <> at {a.time_slot}</>}
                  </span>
                  {a.doctor_id?.user_id?.name && (
                    <span className="text-xs text-gray-400">Dr. {a.doctor_id.user_id.name}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  a.status === 'completed' ? 'bg-green-100 text-green-700' :
                  a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  a.status === 'confirmed' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Cases at All */}
      {allCasesCount === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No cases found for this patient.</p>
        </div>
      )}
    </div>
  );
}
