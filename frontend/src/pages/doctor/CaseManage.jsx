import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Stethoscope, FlaskConical, Pill, Plus, Loader2, CheckCircle,
  Send, ClipboardList, Sparkles, FileText, Save, Download, History,
  Pencil, Trash2, X, Check, Eye, EyeOff, Clock, CreditCard, AlertTriangle,
  Activity, RefreshCw, Scissors,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

const LAB_TESTS = [
  'Complete Blood Count', 'Blood Sugar', 'Lipid Profile', 'Thyroid Panel',
  'Liver Function', 'Kidney Function', 'Urinalysis', 'ECG', 'X-Ray', 'Ultrasound',
];

/** Quick-add diagnoses — any specialty; doctors can add custom tags too. */
const DIAGNOSIS_PRESETS = [
  'Hypertension', 'Type 2 Diabetes', 'Acute bronchitis', 'Migraine',
  'Gastroenteritis', 'Anxiety disorder', 'Osteoarthritis', 'Hypothyroidism',
  'Atrial fibrillation', 'COPD exacerbation', 'Cellulitis', 'Renal colic',
  'Vertigo', 'Depression', 'Asthma exacerbation', 'Anemia',
];

const BASE_URL = 'http://localhost:5001';

function MarkdownPreview({ content }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700 prose-table:text-sm prose-td:p-2 prose-th:p-2 prose-th:bg-gray-100 prose-td:border prose-th:border">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

const STAGE_STATUS_MSG = {
  surgery: { icon: Scissors, color: 'rose', label: 'In Surgery', msg: 'Surgery is scheduled/in progress. The case will return to you for post-surgery review once completed.' },
  lab: { icon: FlaskConical, color: 'purple', label: 'In Lab', msg: 'Lab tests are being processed. This case will return to you for review once all tests are completed.' },
  pharmacy: { icon: Pill, color: 'green', label: 'In Pharmacy', msg: 'Pharmacy is processing the prescriptions. After completion, the case will move to billing.' },
  billing: { icon: CreditCard, color: 'cyan', label: 'In Billing', msg: 'The billing team is generating the invoice. No further doctor action is needed.' },
};

export default function CaseManage() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosesList, setDiagnosesList] = useState([]);
  const [dxInput, setDxInput] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [plannedLab, setPlannedLab] = useState(false);
  const [plannedSurgery, setPlannedSurgery] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [prescription, setPrescription] = useState({ medication_name: '', dosage: '', frequency: '', duration: '' });
  const [consultDoc, setConsultDoc] = useState('');
  const [previewDoc, setPreviewDoc] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [aiDiagnoses, setAiDiagnoses] = useState([]);

  const [editingPresc, setEditingPresc] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [surgeryType, setSurgeryType] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [surgeryNotes, setSurgeryNotes] = useState('');
  const [preOpInstructions, setPreOpInstructions] = useState('');
  const [postOpNotes, setPostOpNotes] = useState('');

  const [patientHistory, setPatientHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const fetchCase = async () => {
    try {
      const res = await API.get(`/doctor/case/${caseId}`);
      const c = res.data.data;
      setCaseData(c);
      if (c.diagnoses?.length) setDiagnosesList([...c.diagnoses]);
      else if (c.diagnosis) setDiagnosesList(c.diagnosis.split(';').map((s) => s.trim()).filter(Boolean));
      else setDiagnosesList([]);
      setChiefComplaint(c.chief_complaint || '');
      if (c.symptoms?.length) setSymptoms(c.symptoms.join(', '));
      if (c.consultation_document) setConsultDoc(c.consultation_document);
      setPlannedLab(!!c.planned_lab);
      setPlannedSurgery(!!c.planned_surgery);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCase(); }, [caseId]);

  const doAction = async (url, body = {}, method = 'post') => {
    setActing(true); setError(''); setSuccess('');
    try {
      const res = method === 'delete'
        ? await API.delete(url)
        : method === 'put'
          ? await API.put(url, body)
          : await API.post(url, body);
      setSuccess(res.data.message || 'Done');
      await fetchCase();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const deletePresc = async (prescId) => {
    setActing(true); setError(''); setSuccess('');
    try {
      await API.delete(`/doctor/case/${caseId}/remove-prescription/${prescId}`);
      setSuccess('Medicine removed');
      await fetchCase();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally { setActing(false); }
  };

  const saveEditPresc = async (prescId) => {
    setActing(true); setError(''); setSuccess('');
    try {
      await API.put(`/doctor/case/${caseId}/update-prescription/${prescId}`, editForm);
      setSuccess('Medicine updated');
      setEditingPresc(null);
      setEditForm({});
      await fetchCase();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setActing(false); }
  };

  const aiSuggestDiagnosis = async () => {
    setAiLoading('diag'); setAiDiagnoses([]);
    try {
      const res = await API.post('/ai/suggest-diagnosis', {
        symptoms: symptoms || undefined,
        chief_complaint: chiefComplaint || undefined,
      });
      const data = res.data.data?.suggestion;
      if (data?.diagnoses?.length) setAiDiagnoses(data.diagnoses);
    } catch (err) {
      setError(err.response?.data?.message || 'AI diagnosis failed');
    } finally { setAiLoading(null); }
  };

  const addDiagnosisTag = (name) => {
    const t = String(name).trim();
    if (!t || diagnosesList.includes(t)) return;
    setDiagnosesList((prev) => [...prev, t]);
  };

  const removeDiagnosisTag = (name) => {
    setDiagnosesList((prev) => prev.filter((x) => x !== name));
  };

  const saveAssessment = async () => {
    if (diagnosesList.length === 0) {
      setError('Add at least one diagnosis (use quick picks, AI, or type your own).');
      return;
    }
    setActing(true); setError(''); setSuccess('');
    try {
      await API.post(`/doctor/case/${caseId}/diagnose`, {
        diagnoses: diagnosesList,
        chief_complaint: chiefComplaint,
        symptoms,
        notes,
        planned_lab: plannedLab,
        planned_surgery: plannedSurgery,
      });
      setSuccess('Assessment saved');
      await fetchCase();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setActing(false); }
  };

  const aiSuggestMedicines = async (extraContext) => {
    setAiLoading('presc'); setError('');
    try {
      const dx = caseData.diagnoses?.length ? caseData.diagnoses.join('; ') : (caseData.diagnosis || caseData.title);
      const res = await API.post('/ai/suggest-prescription', {
        diagnosis: dx,
        symptoms: extraContext || caseData.symptoms?.join(', '),
      });
      const data = res.data.data?.suggestion;
      if (data?.medicines?.length) {
        let addedCount = 0;
        for (const med of data.medicines) {
          try {
            await API.post(`/doctor/case/${caseId}/add-prescription`, {
              medication_name: med.medication_name, dosage: med.dosage || '',
              frequency: med.frequency || '', duration: med.duration || '',
            });
            addedCount++;
          } catch { /* skip */ }
        }
        setSuccess(`AI added ${addedCount} medicine(s)`);
        await fetchCase();
      } else {
        setError('AI could not suggest medicines. Please add manually.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'AI prescription failed');
    } finally { setAiLoading(null); }
  };

  const aiGenerateDoc = async (key) => {
    setAiLoading(key);
    try {
      const res = await API.post('/ai/generate-consultation-doc', { case_id: caseId });
      const doc = res.data.data?.document || '';
      if (doc) setConsultDoc(doc);
    } catch (err) {
      setError(err.response?.data?.message || 'AI doc generation failed');
    } finally { setAiLoading(null); }
  };

  const fetchPatientHistory = async () => {
    if (!caseData?.patient_id?._id) return;
    setHistoryLoading(true);
    try {
      const res = await API.get(`/doctor/patient/${caseData.patient_id._id}`);
      setPatientHistory(res.data.data);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  };

  const fetchAiSummary = async () => {
    if (!caseData?.patient_id?._id) return;
    setAiLoading('summary');
    try {
      const res = await API.post('/ai/summarize-past-cases', { patient_id: caseData.patient_id._id });
      setAiSummary(res.data.data?.summary || 'No summary available.');
    } catch { setAiSummary('Failed to generate summary.'); }
    finally { setAiLoading(null); }
  };

  if (loading) return <LoadingSpinner />;
  if (!caseData) return <Alert type="error" message="Case not found" />;

  const stage = caseData.current_stage;
  const isConsultation = stage === 'doctor_consultation';
  const isReview = stage === 'doctor_review';
  const isSurgery = stage === 'surgery';
  const isActive = caseData.status === 'active';
  const isCompleted = caseData.status === 'completed';
  const isDoctorStage = isConsultation || isReview;
  const isWaiting = isActive && !isDoctorStage && !isSurgery;
  const hasDiagnosis = !!(caseData.diagnoses?.length || caseData.diagnosis);
  const workupBlocksMeds =
    plannedLab || plannedSurgery || caseData.planned_lab || caseData.planned_surgery;
  const canMedsInConsult = isConsultation && !workupBlocksMeds;
  const showDocAndPharmacyInConsult = canMedsInConsult;
  const hasPrescriptions = caseData.prescriptions?.length > 0;
  const hasConsultDoc = !!caseData.consultation_document;

  const renderPrescriptionRow = (p, i, editable = true) => {
    if (editable && editingPresc === p._id) {
      return (
        <div key={p._id || i} className="p-3 bg-teal-50 rounded-lg border border-teal-200 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input value={editForm.medication_name ?? ''} onChange={e => setEditForm({ ...editForm, medication_name: e.target.value })}
              className="px-2.5 py-1.5 border border-teal-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white" placeholder="Medicine" />
            <input value={editForm.dosage ?? ''} onChange={e => setEditForm({ ...editForm, dosage: e.target.value })}
              className="px-2.5 py-1.5 border border-teal-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white" placeholder="Dosage" />
            <input value={editForm.frequency ?? ''} onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}
              className="px-2.5 py-1.5 border border-teal-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white" placeholder="Frequency" />
            <input value={editForm.duration ?? ''} onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
              className="px-2.5 py-1.5 border border-teal-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white" placeholder="Duration" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditingPresc(null); setEditForm({}); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 flex items-center gap-1">
              <X className="h-3 w-3" /> Cancel
            </button>
            <button disabled={acting} onClick={() => saveEditPresc(p._id)}
              className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1">
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={p._id || i} className="flex items-center gap-2 p-2.5 bg-white rounded-lg text-xs border border-green-200">
        <Pill className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <span className="font-medium text-gray-900">{p.medication_name}</span>
        <span className="text-gray-400 flex-1">{p.dosage} · {p.frequency} · {p.duration}</span>
        {p.status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            p.status === 'dispensed' ? 'bg-green-100 text-green-700' :
            p.status === 'prepared' ? 'bg-teal-100 text-teal-700' :
            'bg-gray-100 text-gray-600'
          }`}>{p.status}</span>
        )}
        {editable && (
          <div className="flex gap-1">
            <button onClick={() => { setEditingPresc(p._id); setEditForm({ medication_name: p.medication_name, dosage: p.dosage, frequency: p.frequency, duration: p.duration }); }}
              className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-md border border-teal-200" title="Edit">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={() => deletePresc(p._id)}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md border border-red-200" title="Delete">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderReadOnlySummary = () => (
    <div className="space-y-4">
      {hasDiagnosis && (
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
          <p className="text-xs font-semibold text-teal-700 mb-1">Diagnosis</p>
          <p className="text-sm font-medium text-teal-900">
            {caseData.diagnoses?.length ? caseData.diagnoses.join('; ') : caseData.diagnosis}
          </p>
          {caseData.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {caseData.symptoms.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[11px] rounded-lg font-medium">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {caseData.lab_tests?.length > 0 && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
            <FlaskConical className="h-3.5 w-3.5" /> Lab Tests ({caseData.lab_tests.length})
          </p>
          <div className="space-y-1.5">
            {caseData.lab_tests.map(t => (
              <div key={t._id} className="flex items-center justify-between p-2 bg-white rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{t.name}</span>
                  {t.report_file && (
                    <a href={`${BASE_URL}${t.report_file}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-0.5 text-teal-600 hover:text-teal-800 font-medium">
                      <Download className="h-3 w-3" /> Report
                    </a>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  t.status === 'completed' ? 'bg-green-100 text-green-700' :
                  t.status === 'in_progress' ? 'bg-teal-100 text-teal-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {caseData.surgery && (
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
          <p className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1">
            <Scissors className="h-3.5 w-3.5" /> Surgery — {caseData.surgery.type}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-500">Status:</span> <span className={`font-semibold ${caseData.surgery.status === 'completed' ? 'text-green-700' : 'text-rose-700'}`}>{caseData.surgery.status}</span></div>
            {caseData.surgery.scheduled_date && <div><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-700">{new Date(caseData.surgery.scheduled_date).toLocaleDateString()}</span></div>}
            {caseData.surgery.estimated_cost > 0 && <div><span className="text-gray-500">Est. Cost:</span> <span className="font-medium text-gray-700">${caseData.surgery.estimated_cost}</span></div>}
          </div>
          {caseData.surgery.notes && <p className="text-xs text-gray-600 mt-2">{caseData.surgery.notes}</p>}
          {caseData.surgery.post_op_notes && <p className="text-xs text-gray-600 mt-1"><span className="font-semibold">Post-Op:</span> {caseData.surgery.post_op_notes}</p>}
        </div>
      )}

      {hasPrescriptions && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
            <Pill className="h-3.5 w-3.5" /> Prescriptions ({caseData.prescriptions.length})
          </p>
          <div className="space-y-1.5">
            {caseData.prescriptions.map((p, i) => renderPrescriptionRow(p, i, false))}
          </div>
        </div>
      )}

      {hasConsultDoc && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Consultation Document
            </p>
            {caseData.consultation_pdf_path && (
              <a href={`${BASE_URL}${caseData.consultation_pdf_path.replace(/.*uploads/, '/uploads')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium bg-teal-50 px-2 py-1 rounded">
                <Download className="h-3 w-3" /> Download PDF
              </a>
            )}
          </div>
          <div className="bg-white rounded-lg p-3 text-xs max-h-48 overflow-y-auto">
            <MarkdownPreview content={caseData.consultation_document} />
          </div>
        </div>
      )}

      {caseData.billing?.total > 0 && (
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
          <p className="text-xs font-semibold text-teal-700 mb-1 flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-teal-800">Total: <span className="font-bold">${caseData.billing.total.toFixed(2)}</span></span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              caseData.billing.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>{caseData.billing.status}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/doctor" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            {caseData.pathway_label && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
                {caseData.pathway_label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {caseData.patient_id?.user_id?.name || 'Patient'} &middot;
            Step: <span className="font-semibold text-teal-600">{stage?.replace(/_/g, ' ')}</span>
            {caseData.patient_next_step && (
              <span className="block sm:inline sm:before:content-['_·_'] text-gray-600 mt-0.5 sm:mt-0 text-xs sm:text-sm">
                Patient sees: {caseData.patient_next_step}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Closed</span>
          )}
          {isWaiting && (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Waiting
            </span>
          )}
          {isDoctorStage && (
            <span className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold flex items-center gap-1 animate-pulse">
              <Activity className="h-3.5 w-3.5" /> Your Action
            </span>
          )}
          <button onClick={fetchCase} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <CaseProgressBar stages={caseData.stages} />
      </div>

      {/* ============ WAITING STATE (lab / pharmacy / billing) ============ */}
      {isWaiting && (() => {
        const info = STAGE_STATUS_MSG[stage];
        if (!info) return null;
        const Icon = info.icon;
        const colors = {
          rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-700' },
          purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
          green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800', badge: 'bg-green-100 text-green-700' },
          cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-600', text: 'text-cyan-800', badge: 'bg-cyan-100 text-cyan-700' },
        }[info.color];

        return (
          <div className={`${colors.bg} rounded-2xl border ${colors.border} p-6`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900">{info.label}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>{info.label}</span>
                </div>
                <p className={`text-sm ${colors.text}`}>{info.msg}</p>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Case will return to you automatically when this stage completes
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Read-only summary for waiting/completed cases */}
      {(isWaiting || isCompleted) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-600" /> Case Summary
          </h3>
          {renderReadOnlySummary()}
        </div>
      )}

      {/* ============ SURGERY STAGE — Doctor can complete surgery ============ */}
      {isActive && isSurgery && (
        <div className="space-y-6">
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scissors className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  Surgery In Progress
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">{caseData.surgery?.status}</span>
                </h3>
                <p className="text-sm text-rose-800 mt-1">{caseData.surgery?.type}</p>
                {caseData.surgery?.scheduled_date && (
                  <p className="text-xs text-gray-500 mt-1">Scheduled: {new Date(caseData.surgery.scheduled_date).toLocaleDateString()}</p>
                )}
                {caseData.surgery?.notes && <p className="text-xs text-gray-600 mt-2">{caseData.surgery.notes}</p>}
              </div>
            </div>
          </div>

          {hasDiagnosis && (
            <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5">
              <p className="text-xs font-semibold text-teal-700 mb-1">Diagnosis</p>
              <p className="text-sm font-medium text-teal-900">
                {caseData.diagnoses?.length ? caseData.diagnoses.join('; ') : caseData.diagnosis}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-rose-600" /> Complete Surgery
            </h3>
            <p className="text-xs text-gray-500">
              After surgery is completed, add post-operative notes. The case will move to doctor review where you can order lab tests, prescribe medicines, and generate the consultation report.
            </p>
            <textarea value={postOpNotes} onChange={e => setPostOpNotes(e.target.value)} rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              placeholder="Post-operative notes, surgeon observations..." />
            <button disabled={acting}
              onClick={() => doAction(`/doctor/case/${caseId}/complete-surgery`, { post_op_notes: postOpNotes, surgeon_notes: postOpNotes })}
              className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-rose-200 text-base">
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle className="h-5 w-5" /> Mark Surgery Complete &amp; Send to Review</>}
            </button>
          </div>
        </div>
      )}

      {/* ============ CONSULTATION STAGE ============ */}
      {isActive && isConsultation && (
        <>
          {/* STEP 1: Clinical assessment */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <Stethoscope className="h-5 w-5 text-teal-600" /> Clinical assessment
              {hasDiagnosis && <CheckCircle className="h-4 w-4 text-green-500" />}
            </h3>
            <p className="text-sm text-gray-500">
              Record reason for visit, symptoms (anything — not only fever), and one or more working diagnoses. AI can suggest options; add your own anytime.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for visit / chief complaint</label>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="What brought the patient in? (e.g. chest tightness for 2 days, wound check, routine follow-up...)" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Symptoms &amp; clinical findings</label>
              <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Comma-separated or short paragraphs — any presentation." />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Working diagnoses (add multiple)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DIAGNOSIS_PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => addDiagnosisTag(p)}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-300 hover:bg-teal-50">
                    + {p}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 rounded-xl border border-gray-200 bg-gray-50/50">
                {diagnosesList.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 text-xs font-medium">
                    {d}
                    <button type="button" onClick={() => removeDiagnosisTag(d)} className="hover:text-red-600" aria-label="Remove">×</button>
                  </span>
                ))}
                {diagnosesList.length === 0 && <span className="text-xs text-gray-400">Use quick picks, AI, or type below and press Enter.</span>}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={dxInput} onChange={(e) => setDxInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addDiagnosisTag(dxInput); setDxInput(''); }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Type a diagnosis and press Enter" />
                <button type="button" onClick={() => { addDiagnosisTag(dxInput); setDxInput(''); }}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700">Add</button>
                <button disabled={aiLoading === 'diag' || (!symptoms.trim() && !chiefComplaint.trim())} onClick={aiSuggestDiagnosis}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap">
                  {aiLoading === 'diag' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI suggest
                </button>
              </div>
            </div>

            {aiDiagnoses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI suggestions — click to add
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {aiDiagnoses.map((d, i) => (
                    <button key={i} type="button"
                      onClick={() => addDiagnosisTag(d.name)}
                      className="text-left p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm">
                      <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                      {d.reason && <p className="text-xs text-gray-500 mt-0.5">{d.reason}</p>}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => {
                  setDiagnosesList((prev) => {
                    const next = [...prev];
                    aiDiagnoses.forEach((d) => {
                      const n = String(d.name).trim();
                      if (n && !next.includes(n)) next.push(n);
                    });
                    return next;
                  });
                  setAiDiagnoses([]);
                }} className="text-xs font-medium text-purple-700 hover:underline">Add all to list</button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Consultation notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Examination, history, differentials, counselling..." />
            </div>

            <button disabled={acting || diagnosesList.length === 0}
              onClick={saveAssessment}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ClipboardList className="h-4 w-4" /> Save assessment</>}
            </button>
          </div>

          {/* STEP 2: Workup — checkboxes + lab / surgery only (no medicines until review if checked) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                Lab or surgery needed?
              </h3>
              <p className="text-sm text-gray-500 mt-2 ml-9">
                Tick only what applies. If <span className="font-medium text-gray-800">either</span> is checked, medicines wait until results / surgery are done and the case returns to you in <span className="font-medium">Doctor review</span>.
                Leave both unchecked for a simple visit with prescriptions only.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  checked={plannedLab} onChange={(e) => setPlannedLab(e.target.checked)} />
                <span>
                  <span className="font-semibold text-gray-900">Lab tests required</span>
                  <span className="block text-xs text-gray-600">Patient must complete tests before medicines. You will review results next.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  checked={plannedSurgery} onChange={(e) => setPlannedSurgery(e.target.checked)} />
                <span>
                  <span className="font-semibold text-gray-900">Surgery / procedure required</span>
                  <span className="block text-xs text-gray-600">Case moves to surgery first; medicines after recovery review.</span>
                </span>
              </label>
            </div>

            {plannedLab && (
              <div className="border border-amber-200 rounded-2xl p-5 space-y-3 bg-amber-50/40">
                <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" /> Select tests &amp; send to lab
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {LAB_TESTS.map((t) => (
                    <button key={t} type="button"
                      onClick={() => setSelectedTests((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        selectedTests.includes(t) ? 'bg-amber-200 border-amber-400 text-amber-900' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800">Save step 1 (assessment) first if you have not — lab needs a recorded diagnosis.</p>
                <button disabled={acting || selectedTests.length === 0 || !hasDiagnosis}
                  onClick={() => doAction(`/doctor/case/${caseId}/request-lab`, { tests: selectedTests.map((name) => ({ name })) })}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 flex items-center justify-center gap-2">
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FlaskConical className="h-4 w-4" /> Send to lab</>}
                </button>
              </div>
            )}

            {plannedSurgery && (
              <div className="border border-rose-200 rounded-2xl p-5 space-y-3 bg-rose-50/30">
                <h4 className="font-semibold text-rose-900 flex items-center gap-2">
                  <Scissors className="h-4 w-4" /> Schedule surgery
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white" placeholder="Procedure / surgery type *" />
                  <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white" />
                </div>
                <textarea value={surgeryNotes} onChange={(e) => setSurgeryNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none bg-white"
                  placeholder="Pre-op notes / instructions..." />
                <button disabled={acting || !surgeryType || !hasDiagnosis}
                  onClick={() => doAction(`/doctor/case/${caseId}/schedule-surgery`, {
                    surgery_type: surgeryType,
                    scheduled_date: surgeryDate || undefined,
                    notes: surgeryNotes,
                    pre_op_instructions: surgeryNotes,
                  })}
                  className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 flex items-center justify-center gap-2">
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Scissors className="h-4 w-4" /> Schedule surgery</>}
                </button>
              </div>
            )}

            {(plannedLab || plannedSurgery) && (
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-950">
                <p className="font-semibold text-sky-900 mb-1">Medicines &amp; pharmacy</p>
                <p className="text-sky-800 text-xs leading-relaxed">
                  Prescriptions and &quot;Move to pharmacy&quot; are hidden here until lab/surgery work is finished. After results (or post-op review), you will continue in <strong>Doctor review</strong> to prescribe, generate the consultation document, and send to pharmacy.
                </p>
              </div>
            )}
          </div>

          {/* STEP 3–4: Prescriptions + document — only for simple (no lab/surgery) visits */}
          {showDocAndPharmacyInConsult && (
          <>
          {/* STEP 3: Prescriptions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <Pill className="h-5 w-5 text-green-600" /> Prescriptions
              {hasPrescriptions && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{caseData.prescriptions.length} added</span>}
            </h3>
            <p className="text-xs text-gray-500">For visits without lab or surgery workup. Use AI from your saved diagnoses and symptoms.</p>

            <button disabled={aiLoading === 'presc'} onClick={() => aiSuggestMedicines()}
              className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {aiLoading === 'presc' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI adding...</> : <><Sparkles className="h-3.5 w-3.5" /> AI suggest medicines</>}
            </button>

            {hasPrescriptions && (
              <div className="space-y-1.5 p-3 bg-green-50 rounded-xl border border-green-200">
                {caseData.prescriptions.map((p, i) => renderPrescriptionRow(p, i, true))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input value={prescription.medication_name} onChange={(e) => setPrescription({ ...prescription, medication_name: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Medicine name *" />
              <input value={prescription.dosage} onChange={(e) => setPrescription({ ...prescription, dosage: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Dosage" />
              <input value={prescription.frequency} onChange={(e) => setPrescription({ ...prescription, frequency: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Frequency" />
              <input value={prescription.duration} onChange={(e) => setPrescription({ ...prescription, duration: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Duration" />
            </div>
            <button disabled={acting || !prescription.medication_name}
              onClick={async () => {
                await doAction(`/doctor/case/${caseId}/add-prescription`, prescription);
                setPrescription({ medication_name: '', dosage: '', frequency: '', duration: '' });
              }}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Add medicine</>}
            </button>
          </div>

          {/* STEP 4: Consultation Document */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <FileText className="h-5 w-5 text-green-600" /> Consultation document
              {hasConsultDoc && <CheckCircle className="h-4 w-4 text-green-500" />}
              {!hasConsultDoc && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Required</span>}
            </h3>

            <div className="flex gap-2">
              <button disabled={aiLoading === 'doc'} onClick={() => aiGenerateDoc('doc')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
                {aiLoading === 'doc' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Auto-Generate with AI
              </button>
              {consultDoc && (
                <button onClick={() => setPreviewDoc(!previewDoc)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 flex items-center gap-1.5">
                  {previewDoc ? <><EyeOff className="h-3.5 w-3.5" /> Edit</> : <><Eye className="h-3.5 w-3.5" /> Preview</>}
                </button>
              )}
            </div>

            {previewDoc && consultDoc ? (
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <MarkdownPreview content={consultDoc} />
              </div>
            ) : (
              <textarea value={consultDoc} onChange={e => setConsultDoc(e.target.value)} rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono"
                placeholder="Draft consultation notes here (supports Markdown)..." />
            )}

            <p className="text-xs text-gray-500">
              Auto-generate uses chief complaint, symptoms, diagnoses, notes, and medicines from this case.
            </p>

            <button disabled={acting || !consultDoc}
              onClick={() => doAction(`/doctor/case/${caseId}/save-document`, { document: consultDoc })}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save document</>}
            </button>
          </div>

          <div className="rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 via-white to-teal-50/50 p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-teal-900 uppercase tracking-wide mb-1">Move to pharmacy</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this only when prescriptions are complete and the consultation document is saved. This sends the case to pharmacy and emails the patient when configured.
            </p>
            {!hasPrescriptions && (
              <p className="text-xs text-amber-800 mb-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Add at least one prescription in step 3.</p>
            )}
            {hasPrescriptions && !hasConsultDoc && (
              <p className="text-xs text-amber-800 mb-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Save the consultation document in step 4 first.</p>
            )}
            <button
              disabled={acting || !hasPrescriptions || !hasConsultDoc}
              onClick={() => doAction(`/doctor/case/${caseId}/send-to-pharmacy`)}
              className="w-full py-4 bg-teal-600 text-white rounded-xl text-base font-bold hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-teal-200">
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /> Move to pharmacy</>}
            </button>
          </div>
        </>
      )}
        </>
      )}

      {/* ============ DOCTOR REVIEW STAGE (after lab) ============ */}
      {isActive && isReview && (
        <div className="space-y-6">
          {/* Previously saved diagnosis */}
          {hasDiagnosis && (
            <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5">
              <p className="text-xs font-semibold text-teal-700 mb-1">Diagnosis</p>
              <p className="text-sm font-medium text-teal-900">
                {caseData.diagnoses?.length ? caseData.diagnoses.join('; ') : caseData.diagnosis}
              </p>
              {caseData.chief_complaint && (
                <p className="text-xs text-teal-700 mt-2"><span className="font-semibold">Chief complaint:</span> {caseData.chief_complaint}</p>
              )}
              {caseData.symptoms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {caseData.symptoms.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[11px] rounded-lg font-medium">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lab Results */}
          {caseData.lab_tests?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-amber-600" /> Lab Results
              </h3>
              <div className="space-y-3">
                {caseData.lab_tests.map(t => (
                  <div key={t._id} className={`p-4 rounded-xl border ${t.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>{t.status}</span>
                        {t.report_file && (
                          <a href={`${BASE_URL}${t.report_file}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium">
                            <Download className="h-3.5 w-3.5" /> Report
                          </a>
                        )}
                      </div>
                    </div>
                    {t.results && <p className="text-sm text-gray-700 mt-1">{t.results}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="h-5 w-5 text-green-600" /> Prescriptions
              {hasPrescriptions && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{caseData.prescriptions.length} added</span>}
            </h3>

            {hasPrescriptions && (
              <div className="space-y-2">
                {caseData.prescriptions.map((p, i) => renderPrescriptionRow(p, i, true))}
              </div>
            )}

            <button disabled={aiLoading === 'presc'}
              onClick={() => {
                const labInfo = caseData.lab_tests?.map(t => `${t.name}: ${t.results || 'pending'}`).join(', ');
                aiSuggestMedicines(labInfo);
              }}
              className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {aiLoading === 'presc' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI adding...</> : <><Sparkles className="h-3.5 w-3.5" /> AI Suggest Medicines (based on lab results)</>}
            </button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input value={prescription.medication_name} onChange={e => setPrescription({ ...prescription, medication_name: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white" placeholder="Medicine *" />
              <input value={prescription.dosage} onChange={e => setPrescription({ ...prescription, dosage: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white" placeholder="Dosage" />
              <input value={prescription.frequency} onChange={e => setPrescription({ ...prescription, frequency: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white" placeholder="Frequency" />
              <input value={prescription.duration} onChange={e => setPrescription({ ...prescription, duration: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white" placeholder="Duration" />
            </div>
            <button disabled={acting || !prescription.medication_name}
              onClick={async () => {
                await doAction(`/doctor/case/${caseId}/add-prescription`, prescription);
                setPrescription({ medication_name: '', dosage: '', frequency: '', duration: '' });
              }}
              className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add Medicine</>}
            </button>
          </div>

          {/* Consultation Report */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" /> Consultation Report
              {hasConsultDoc && <CheckCircle className="h-4 w-4 text-green-500" />}
              {!hasConsultDoc && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Required</span>}
            </h3>

            <p className="text-xs text-gray-500">
              Generate a consultation report based on diagnosis, lab results, and prescriptions. This report will be saved as PDF and emailed to the patient when you send to pharmacy.
            </p>

            <div className="flex gap-2">
              <button disabled={aiLoading === 'doc2'} onClick={() => aiGenerateDoc('doc2')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
                {aiLoading === 'doc2' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Auto-Generate with AI
              </button>
              {consultDoc && (
                <button onClick={() => setPreviewDoc(!previewDoc)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 flex items-center gap-1.5">
                  {previewDoc ? <><EyeOff className="h-3.5 w-3.5" /> Edit</> : <><Eye className="h-3.5 w-3.5" /> Preview</>}
                </button>
              )}
            </div>

            {previewDoc && consultDoc ? (
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <MarkdownPreview content={consultDoc} />
              </div>
            ) : (
              <textarea value={consultDoc} onChange={e => setConsultDoc(e.target.value)} rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none font-mono"
                placeholder="Write consultation report or click AI to auto-generate (supports Markdown)..." />
            )}

            <button disabled={acting || !consultDoc}
              onClick={() => doAction(`/doctor/case/${caseId}/save-document`, { document: consultDoc })}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Report</>}
            </button>
          </div>

          {/* Patient History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" /> Patient History
              </h3>
              <div className="flex gap-2">
                <button onClick={() => { setShowHistory(!showHistory); if (!patientHistory) fetchPatientHistory(); }}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200">
                  {showHistory ? 'Hide' : 'Show'} History
                </button>
                <button disabled={aiLoading === 'summary'} onClick={fetchAiSummary}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                  {aiLoading === 'summary' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Summary
                </button>
              </div>
            </div>

            {aiSummary && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</p>
                <div className="text-sm text-gray-800">
                  <MarkdownPreview content={aiSummary} />
                </div>
              </div>
            )}

            {showHistory && historyLoading && (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
            )}

            {showHistory && patientHistory && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(patientHistory.myCases || patientHistory.cases || []).filter(c => c._id !== caseId).map(c => (
                  <div key={c._id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">{c.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()} &middot; {c.doctor_id?.user_id?.name ? `Dr. ${c.doctor_id.user_id.name}` : ''}
                    </p>
                    {c.diagnosis && <p className="text-xs text-teal-700 mt-1">Diagnosis: {c.diagnosis}</p>}
                    {c.consultation_document && (
                      <details className="mt-2">
                        <summary className="text-xs text-indigo-600 cursor-pointer font-medium">View Consultation Document</summary>
                        <div className="mt-1 bg-white p-3 rounded-lg border text-sm">
                          <MarkdownPreview content={c.consultation_document} />
                        </div>
                      </details>
                    )}
                    {c.lab_tests?.some(t => t.report_file) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.lab_tests.filter(t => t.report_file).map(t => (
                          <a key={t._id} href={`${BASE_URL}${t.report_file}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded">
                            <Download className="h-3 w-3" /> {t.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Move to pharmacy — last action in review */}
          <div className="rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 via-white to-teal-50/50 p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-teal-900 uppercase tracking-wide mb-1">Move to pharmacy</h3>
            <p className="text-sm text-gray-600 mb-4">
              Generates a PDF when possible, emails the patient if configured, and sends the case to pharmacy. Use only after prescriptions and the consultation report are saved.
            </p>
            {!hasPrescriptions && (
              <p className="text-xs text-amber-800 mb-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Add at least one medicine in the prescriptions section above.</p>
            )}
            {hasPrescriptions && !hasConsultDoc && (
              <p className="text-xs text-amber-800 mb-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Save the consultation report first.</p>
            )}
            <button disabled={acting || !hasPrescriptions || !hasConsultDoc}
              onClick={() => doAction(`/doctor/case/${caseId}/send-to-pharmacy`)}
              className="w-full py-4 bg-teal-600 text-white rounded-xl text-base font-bold hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-teal-200">
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /> Move to pharmacy</>}
            </button>
          </div>
        </div>
      )}

      {/* ============ COMPLETED ============ */}
      {isCompleted && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">This case has been completed and closed.</p>
        </div>
      )}
    </div>
  );
}
