import { ReactNode } from 'react';

interface InfoTipProps {
  icon?: string;
  title?: string;
  message: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export function InfoTip({ 
  icon = 'ℹ️', 
  title, 
  message, 
  type = 'info',
  className = ''
}: InfoTipProps) {
  const typeStyles = {
    info: 'bg-blue-950/20 border-blue-900/20 text-blue-200',
    success: 'bg-emerald-950/20 border-emerald-900/20 text-emerald-200',
    warning: 'bg-amber-950/20 border-amber-900/20 text-amber-200',
    error: 'bg-red-950/20 border-red-900/20 text-red-200',
  };

  const typeIcon = {
    info: icon || 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`rounded-lg border ${typeStyles[type]} p-3 space-y-1 ${className}`}>
      {title && (
        <p className="text-xs font-semibold flex items-center gap-2">
          <span>{typeIcon[type]}</span>
          {title}
        </p>
      )}
      <p className="text-xs leading-relaxed">
        {message}
      </p>
    </div>
  );
}
