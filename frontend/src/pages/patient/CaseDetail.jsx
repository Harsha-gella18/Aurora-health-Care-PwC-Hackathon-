import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Stethoscope, FlaskConical, Pill,
  Receipt, CheckCircle, Clock, FileText, Search, Download, MapPin, Scissors,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import CaseProgressBar from '../../components/CaseProgressBar';

const STAGE_LABELS = {
  appointment: 'Appointment', doctor_consultation: 'Doctor Consultation',
  surgery: 'Surgery', lab: 'Lab Tests', doctor_review: 'Doctor Review',
  pharmacy: 'Pharmacy', billing: 'Billing', closed: 'Closed',
};

const STAGE_ICONS = {
  appointment: Calendar, doctor_consultation: Stethoscope, surgery: Scissors,
  lab: FlaskConical, doctor_review: Search, pharmacy: Pill, billing: Receipt, closed: CheckCircle,
};

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get(`/patient/case/${id}`)
      .then(res => setCaseData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load case'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!caseData) return <p className="text-center text-gray-500 py-12">Case not found</p>;

  const sorted = [...(caseData.stages || [])].sort((a, b) => a.order - b.order);
  const statusCls = caseData.status === 'active' ? 'bg-teal-100 text-teal-700' :
    caseData.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/patient/cases" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>
              {caseData.status}
            </span>
            {caseData.pathway_label && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {caseData.pathway_label}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {caseData.doctor_id?.user_id?.name ? `Dr. ${caseData.doctor_id.user_id.name}` : ''}
            {' · '}{new Date(caseData.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {caseData.patient_next_step && caseData.status === 'active' && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 p-5 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-0.5">What happens next</p>
            <p className="text-sm text-teal-900 font-medium leading-relaxed">{caseData.patient_next_step}</p>
          </div>
        </div>
      )}

      <Alert type="error" message={error} onClose={() => setError('')} />

      {caseData.diagnosis && (
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5">
          <p className="text-sm font-medium text-teal-800">Diagnosis: <span className="font-semibold">{caseData.diagnosis}</span></p>
          {caseData.symptoms?.length > 0 && (
            <p className="text-sm text-teal-700 mt-1">Symptoms: {caseData.symptoms.join(', ')}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Your visit progress</h3>
        <p className="text-xs text-gray-400 mb-4">Steps that do not apply to your visit are hidden.</p>
        <CaseProgressBar stages={caseData.stages} hideSkipped />
      </div>

      {caseData.consultation_document && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" /> Consultation Document
            </h3>
            <button
              onClick={() => {
                const content = [
                  `CONSULTATION DOCUMENT — ${caseData.title}`,
                  `Date: ${new Date(caseData.updatedAt || caseData.createdAt).toLocaleDateString()}`,
                  caseData.diagnosis ? `Diagnosis: ${caseData.diagnosis}` : '',
                  caseData.symptoms?.length ? `Symptoms: ${caseData.symptoms.join(', ')}` : '',
                  '',
                  caseData.consultation_document,
                  '',
                  caseData.prescriptions?.length ? 'PRESCRIPTIONS:' : '',
                  ...(caseData.prescriptions || []).map(p => `  - ${p.medication_name} | ${p.dosage} | ${p.frequency} | ${p.duration}`),
                  '',
                  caseData.billing?.total ? `TOTAL BILLED: $${caseData.billing.total.toFixed(2)}` : '',
                ].filter(Boolean).join('\n');
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consultation-${caseData.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700">
            <ReactMarkdown>{caseData.consultation_document}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sorted.filter(s => s.status !== 'pending' && s.status !== 'skipped').map(stage => {
          const Icon = STAGE_ICONS[stage.name] || FileText;
          const isActive = stage.status === 'in_progress';
          const isCompleted = stage.status === 'completed';

          return (
            <div key={stage._id || stage.name} className={`bg-white rounded-2xl shadow-sm border p-6 ${
              isActive ? 'border-teal-300 ring-1 ring-teal-100' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCompleted ? 'bg-green-100' : isActive ? 'bg-teal-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    isCompleted ? 'text-green-600' : isActive ? 'text-teal-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{STAGE_LABELS[stage.name]}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {stage.started_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(stage.started_at).toLocaleDateString()}
                      </span>
                    )}
                    {stage.completed_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" /> {new Date(stage.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isCompleted ? 'bg-green-100 text-green-700' :
                  isActive ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isActive ? 'In Progress' : isCompleted ? 'Done' : stage.status}
                </span>
              </div>

              {stage.notes && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mt-2">{stage.notes}</p>
              )}

              {/* Lab details */}
              {stage.name === 'lab' && caseData.lab_tests?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {caseData.lab_tests.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                        {t.results && <p className="text-xs text-gray-500 mt-0.5">{t.results}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'completed' ? 'bg-green-100 text-green-700' :
                        t.status === 'in_progress' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
                      }`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pharmacy prescriptions */}
              {stage.name === 'pharmacy' && caseData.prescriptions?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {caseData.prescriptions.map(p => (
                    <div key={p._id} className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">{p.medication_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === 'prepared' ? 'bg-green-100 text-green-700' :
                          p.status === 'dispensed' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                        }`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.dosage} · {p.frequency} {p.duration ? `· ${p.duration}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Billing */}
              {stage.name === 'billing' && caseData.billing?.items?.length > 0 && (
                <div className="mt-3">
                  <div className="space-y-1">
                    {caseData.billing.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-700">{item.description}</span>
                        <span className="font-semibold text-gray-900">${item.amount?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">${caseData.billing.total?.toFixed(2)}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      caseData.billing.status === 'paid' ? 'bg-green-100 text-green-700' :
                      caseData.billing.status === 'generated' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>{caseData.billing.status === 'paid' ? 'Paid' :
                      caseData.billing.status === 'generated' ? 'Invoice Ready' : 'Pending'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
