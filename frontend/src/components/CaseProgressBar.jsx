import { Check, Circle, Minus, Clock } from 'lucide-react';

const STAGE_LABELS = {
  appointment: 'Appointment',
  doctor_consultation: 'Doctor',
  surgery: 'Surgery',
  lab: 'Lab',
  doctor_review: 'Review',
  pharmacy: 'Pharmacy',
  billing: 'Billing',
  closed: 'Closed',
};

const STAGE_COLORS = {
  completed: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-700',
    line: 'bg-green-400',
    icon: 'text-white',
  },
  in_progress: {
    bg: 'bg-teal-500',
    border: 'border-teal-500',
    text: 'text-teal-700',
    line: 'bg-gray-200',
    icon: 'text-white',
  },
  pending: {
    bg: 'bg-white',
    border: 'border-gray-300',
    text: 'text-gray-400',
    line: 'bg-gray-200',
    icon: 'text-gray-400',
  },
  skipped: {
    bg: 'bg-gray-100',
    border: 'border-dashed border-gray-300',
    text: 'text-gray-400 line-through',
    line: 'bg-gray-200',
    icon: 'text-gray-400',
  },
};

export default function CaseProgressBar({ stages = [], compact = false }) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex items-start ${compact ? 'gap-0' : 'gap-0'} min-w-max`}>
        {sorted.map((stage, i) => {
          const status = stage.status || 'pending';
          const colors = STAGE_COLORS[status];
          const isLast = i === sorted.length - 1;
          const prevCompleted = i > 0 && sorted[i - 1]?.status === 'completed';

          return (
            <div key={stage._id || stage.name} className="flex items-start">
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center rounded-full border-2 transition-all flex-shrink-0
                  ${compact ? 'w-7 h-7' : 'w-10 h-10'}
                  ${colors.bg} ${colors.border} ${colors.icon}
                  ${status === 'in_progress' ? 'ring-2 ring-teal-200 ring-offset-1' : ''}
                `}>
                  {status === 'completed' && <Check className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} strokeWidth={3} />}
                  {status === 'in_progress' && <Circle className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} fill-current animate-pulse`} />}
                  {status === 'skipped' && <Minus className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />}
                  {status === 'pending' && <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold`}>{i + 1}</span>}
                </div>

                <span className={`
                  mt-1.5 text-center leading-tight font-medium
                  ${compact ? 'text-[9px] max-w-[52px]' : 'text-[11px] max-w-[72px]'}
                  ${colors.text}
                `}>
                  {STAGE_LABELS[stage.name] || stage.name}
                </span>
              </div>

              {!isLast && (
                <div className={`flex items-center ${compact ? 'mt-3.5' : 'mt-5'}`}>
                  <div className={`
                    ${compact ? 'w-5 h-[3px]' : 'w-8 h-[3px]'} rounded-full
                    ${status === 'completed' ? 'bg-green-400' : 'bg-gray-200'}
                    ${status === 'skipped' ? 'bg-gray-200' : ''}
                  `} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
