import { useState, useEffect } from 'react';
import { Stethoscope, Pill, Building2, FileText, FlaskConical, Download, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

const BASE_URL = 'http://localhost:5001';

export default function MedicalHistory() {
  const [data, setData] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simplifying, setSimplifying] = useState(null);
  const [simplified, setSimplified] = useState({});

  useEffect(() => {
    Promise.all([
      API.get('/patient/medical-history'),
      API.get('/patient/cases'),
    ])
      .then(([histRes, casesRes]) => {
        setData(histRes.data.data);
        setCases(casesRes.data.data || []);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load medical history'))
      .finally(() => setLoading(false));
  }, []);

  const simplifyDoc = async (caseId, doc) => {
    setSimplifying(caseId);
    try {
      const res = await API.post('/ai/simplify-discharge', { discharge_text: doc });
      setSimplified(prev => ({ ...prev, [caseId]: res.data.data?.simple_explanation || 'Could not simplify.' }));
    } catch {
      setSimplified(prev => ({ ...prev, [caseId]: 'Simplification failed.' }));
    } finally { setSimplifying(null); }
  };

  if (loading) return <LoadingSpinner />;

  const records = data?.medical_records || [];
  const prescriptions = data?.active_prescriptions || [];
  const admissions = data?.admissions || [];
  const completedCases = cases.filter(c => c.consultation_document || c.lab_tests?.some(t => t.report_file));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
        <p className="text-gray-500 mt-1">Your complete medical records</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="space-y-6">
        {/* Consultation Documents from Cases */}
        {completedCases.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Consultation Documents
            </h2>
            <div className="space-y-4">
              {completedCases.map(c => (
                <div key={c._id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()} &middot;
                        {c.diagnosis && <span className="text-teal-600"> {c.diagnosis}</span>}
                        {c.doctor_id?.user_id?.name && <span> &middot; Dr. {c.doctor_id.user_id.name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'}`}>
                        {c.status}
                      </span>
                      {c.consultation_pdf_path && (
                        <a href={`${BASE_URL}${c.consultation_pdf_path.replace(/.*uploads/, '/uploads')}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium bg-teal-50 px-2 py-1 rounded">
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {c.consultation_document && (
                    <div className="p-4">
                      <details>
                        <summary className="text-sm text-indigo-600 cursor-pointer font-medium mb-2">View Consultation Document</summary>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border prose prose-sm max-w-none">
                          <ReactMarkdown>{c.consultation_document}</ReactMarkdown>
                        </div>
                      </details>

                      {!simplified[c._id] && (
                        <button disabled={simplifying === c._id} onClick={() => simplifyDoc(c._id, c.consultation_document)}
                          className="mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1">
                          {simplifying === c._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Simplify with AI
                        </button>
                      )}

                      {simplified[c._id] && (
                        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Simplified Explanation
                          </p>
                          <div className="text-sm text-gray-800 prose prose-sm max-w-none">
                            <ReactMarkdown>{simplified[c._id]}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lab Reports */}
                  {c.lab_tests?.some(t => t.report_file || t.results) && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                        <FlaskConical className="h-3.5 w-3.5" /> Lab Reports
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {c.lab_tests.filter(t => t.status === 'completed').map(t => (
                          <div key={t._id} className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                            <span className="font-medium text-gray-900">{t.name}</span>
                            {t.results && <span className="text-gray-500 ml-1">— {t.results.substring(0, 50)}{t.results.length > 50 ? '...' : ''}</span>}
                            {t.report_file && (
                              <a href={`${BASE_URL}${t.report_file}`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium mt-1">
                                <Download className="h-3 w-3" /> Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Medical Records */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            Medical Records
          </h2>
          {records.length === 0 ? (
            <p className="text-gray-400 text-sm">No records found</p>
          ) : (
            <div className="space-y-3">
              {records.map(rec => (
                <div key={rec._id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{rec.diagnosis}</p>
                      <p className="text-sm text-gray-500 mt-1">{rec.notes}</p>
                      {rec.symptoms?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rec.symptoms.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rec.vitals && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200">
                      {rec.vitals.blood_pressure && <div className="text-xs"><span className="text-gray-400">BP:</span> {rec.vitals.blood_pressure}</div>}
                      {rec.vitals.heart_rate && <div className="text-xs"><span className="text-gray-400">HR:</span> {rec.vitals.heart_rate} bpm</div>}
                      {rec.vitals.temperature && <div className="text-xs"><span className="text-gray-400">Temp:</span> {rec.vitals.temperature}°F</div>}
                      {rec.vitals.oxygen_saturation && <div className="text-xs"><span className="text-gray-400">O2:</span> {rec.vitals.oxygen_saturation}%</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prescriptions */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Pill className="h-5 w-5 text-green-600" />
            Prescriptions
          </h2>
          {prescriptions.length === 0 ? (
            <p className="text-gray-400 text-sm">No prescriptions found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prescriptions.map(p => (
                <div key={p._id} className={`p-4 rounded-xl border ${p.is_active ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{p.medication_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.is_active ? 'Active' : 'Completed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{p.dosage} &middot; {p.frequency}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.duration} &middot; {p.instructions}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admissions */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Admissions
          </h2>
          {admissions.length === 0 ? (
            <p className="text-gray-400 text-sm">No admissions found</p>
          ) : (
            <div className="space-y-3">
              {admissions.map(a => (
                <div key={a._id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{a.reason_for_admission}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'admitted' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Ward: {a.ward || 'N/A'} &middot; Admitted: {new Date(a.admission_date).toLocaleDateString()}
                    {a.discharge_date && ` · Discharged: ${new Date(a.discharge_date).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
