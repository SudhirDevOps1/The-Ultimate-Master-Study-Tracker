import React from 'react';
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { DuplicateSessionWarning as DuplicateWarningType, getTimeRangeString, calculateOverlapMinutes } from '../../utils/sessionValidation';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  warning: DuplicateWarningType;
  newSessionTime: { startTime: string | Date; endTime: string | Date };
  onIgnore: () => void;
  onMerge?: () => void;
}

export function DuplicateSessionWarning({ warning, newSessionTime, onIgnore, onMerge: _onMerge }: Props) {
  const deleteSession = useAppStore(state => state.deleteSession);
  const [showDetails, setShowDetails] = React.useState(false);

  if (!warning.isDuplicate && warning.overlappingSessions.length === 0) {
    return null;
  }

  const getIcon = () => {
    if (warning.severity === 'error') return <AlertCircle className="w-5 h-5" />;
    if (warning.severity === 'warning') return <AlertTriangle className="w-5 h-5" />;
    return <Info className="w-5 h-5" />;
  };

  const getBackgroundColor = () => {
    if (warning.severity === 'error') return 'bg-red-50 border-red-200';
    if (warning.severity === 'warning') return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getTextColor = () => {
    if (warning.severity === 'error') return 'text-red-800';
    if (warning.severity === 'warning') return 'text-yellow-800';
    return 'text-blue-800';
  };

  const getIconColor = () => {
    if (warning.severity === 'error') return 'text-red-400';
    if (warning.severity === 'warning') return 'text-yellow-400';
    return 'text-blue-400';
  };

  return (
    <div className={`border rounded-lg p-4 ${getBackgroundColor()}`}>
      <div className="flex items-start gap-3">
        <div className={getIconColor()}>{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${getTextColor()}`}>
            {warning.isDuplicate ? 'Duplicate Session Detected' : 'Overlapping Sessions'}
          </p>
          <p className={`text-sm ${getTextColor()} mt-1`}>{warning.message}</p>

          {showDetails && warning.overlappingSessions.length > 0 && (
            <div className="mt-3 space-y-2 text-sm">
              {warning.overlappingSessions.map((session, idx) => {
                const overlapMinutes = calculateOverlapMinutes(newSessionTime, session);
                const subject = useAppStore.getState().subjects.find(s => s.id === session.subjectId);
                
                return (
                  <div key={idx} className={`p-2 rounded ${warning.severity === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{subject?.name || 'Unknown Subject'}</p>
                        <p className="text-xs opacity-75">{getTimeRangeString(session.startTime, session.endTime)}</p>
                        {overlapMinutes > 0 && (
                          <p className="text-xs opacity-75">Overlap: {Math.round(overlapMinutes)} min</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className={`p-1.5 rounded hover:bg-opacity-50 transition flex-shrink-0 ${
                          warning.severity === 'error' ? 'hover:bg-red-200' : 'hover:bg-yellow-200'
                        }`}
                        title="Delete this session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {warning.overlappingSessions.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-sm px-3 py-1.5 rounded font-medium transition ${
                  warning.severity === 'error'
                    ? 'bg-red-200 text-red-800 hover:bg-red-300'
                    : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                }`}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}

            {warning.isDuplicate ? (
              <button
                onClick={onIgnore}
                className="text-sm px-3 py-1.5 rounded font-medium bg-gray-300 text-gray-800 hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={onIgnore}
                className={`text-sm px-3 py-1.5 rounded font-medium transition ${
                  warning.severity === 'error'
                    ? 'bg-red-200 text-red-800 hover:bg-red-300'
                    : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                }`}
              >
                Continue Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
