import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck } from 'lucide-react';

export default function Badge({ type, label, size = 14 }) {
  const normalized = (type || label || '').toUpperCase();

  if (normalized === 'APPROVE' || normalized === 'PASS' || normalized === 'VERIFIED') {
    return (
      <span className="badge badge-approve">
        <CheckCircle2 size={size} />
        {label || 'APPROVE'}
      </span>
    );
  }

  if (normalized === 'REVIEW') {
    return (
      <span className="badge badge-review">
        <AlertTriangle size={size} />
        {label || 'REVIEW'}
      </span>
    );
  }

  if (normalized === 'REJECT' || normalized === 'FAIL') {
    return (
      <span className="badge badge-reject">
        <XCircle size={size} />
        {label || 'REJECT'}
      </span>
    );
  }

  return (
    <span className="badge badge-pending">
      <Clock size={size} />
      {label || 'PENDING'}
    </span>
  );
}
