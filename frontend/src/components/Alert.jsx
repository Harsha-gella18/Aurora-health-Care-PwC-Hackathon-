import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export default function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;
  const config = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: CheckCircle },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', Icon: XCircle },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', Icon: AlertTriangle },
    info: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800', Icon: CheckCircle },
  };
  const { bg, text, Icon } = config[type] || config.info;
  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${bg} ${text} mb-4`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
