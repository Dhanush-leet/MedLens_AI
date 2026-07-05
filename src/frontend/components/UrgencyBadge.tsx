import React from 'react';
import { UrgencyLevel } from '../types';

interface Props {
  level: UrgencyLevel;
}

export const UrgencyBadge: React.FC<Props> = ({ level }) => {
  const config = {
    Emergency: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500 animate-pulse',
      label: 'Emergency (Seek Help Now)'
    },
    Urgent: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Urgent Care Recommended'
    },
    Routine: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Routine Consultation'
    },
    'Self-care': {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-500',
      label: 'Symptom Management / Self-care'
    }
  };

  const current = config[level] || config.Routine;

  return (
    <span
      id={`urgency-badge-${level.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${current.bg}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};
