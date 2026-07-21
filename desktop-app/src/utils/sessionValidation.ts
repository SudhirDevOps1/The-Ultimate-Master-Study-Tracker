import { StudySession } from '../types/models';

export interface DuplicateSessionWarning {
  isDuplicate: boolean;
  overlappingSessions: StudySession[];
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Check if a new session overlaps with existing sessions
 * Overlapping means:
 * - New session starts before existing ends AND new session ends after existing starts
 * - This catches partial overlaps, complete overlaps, and exact duplicates
 */
export function checkSessionOverlap(
  newSession: {
    startTime: string | Date;
    endTime: string | Date;
    subjectId?: string;
  },
  existingSessions: StudySession[]
): DuplicateSessionWarning {
  const newStart = new Date(newSession.startTime).getTime();
  const newEnd = new Date(newSession.endTime).getTime();

  const overlappingSessions = existingSessions.filter(session => {
    const existingStart = new Date(session.startTime).getTime();
    const existingEnd = new Date(session.endTime).getTime();

    // Check for overlap: new session starts before existing ends AND ends after existing starts
    const hasOverlap = newStart < existingEnd && newEnd > existingStart;

    // If subject is same, overlap is more likely to be a duplicate
    const isSameSubject = !newSession.subjectId || session.subjectId === newSession.subjectId;

    return hasOverlap && isSameSubject;
  });

  if (overlappingSessions.length === 0) {
    return {
      isDuplicate: false,
      overlappingSessions: [],
      message: 'No overlapping sessions found',
      severity: 'info',
    };
  }

  // Check for exact duplicate (same time, same subject)
  const exactDuplicates = overlappingSessions.filter(
    session =>
      new Date(session.startTime).getTime() === newStart &&
      new Date(session.endTime).getTime() === newEnd
  );

  if (exactDuplicates.length > 0) {
    return {
      isDuplicate: true,
      overlappingSessions: exactDuplicates,
      message: `Found ${exactDuplicates.length} exact duplicate session(s) with same time`,
      severity: 'error',
    };
  }

  // Check for partial overlap
  const partialOverlaps = overlappingSessions.filter(
    session =>
      !(
        new Date(session.startTime).getTime() === newStart &&
        new Date(session.endTime).getTime() === newEnd
      )
  );

  if (partialOverlaps.length > 0) {
    return {
      isDuplicate: false,
      overlappingSessions: partialOverlaps,
      message: `Found ${partialOverlaps.length} overlapping session(s)`,
      severity: 'warning',
    };
  }

  return {
    isDuplicate: false,
    overlappingSessions: [],
    message: 'Session validation passed',
    severity: 'info',
  };
}

/**
 * Calculate overlap duration in minutes between two sessions
 */
export function calculateOverlapMinutes(
  session1: { startTime: string | Date; endTime: string | Date },
  session2: { startTime: string | Date; endTime: string | Date }
): number {
  const s1Start = new Date(session1.startTime).getTime();
  const s1End = new Date(session1.endTime).getTime();
  const s2Start = new Date(session2.startTime).getTime();
  const s2End = new Date(session2.endTime).getTime();

  const overlapStart = Math.max(s1Start, s2Start);
  const overlapEnd = Math.min(s1End, s2End);

  if (overlapStart >= overlapEnd) {
    return 0;
  }

  return (overlapEnd - overlapStart) / (1000 * 60); // Convert ms to minutes
}

/**
 * Find all sessions that overlap with a given time range (excluding a specific session)
 */
export function findOverlappingSessions(
  startTime: string | Date,
  endTime: string | Date,
  allSessions: StudySession[],
  excludeSessionId?: string
): StudySession[] {
  const newStart = new Date(startTime).getTime();
  const newEnd = new Date(endTime).getTime();

  return allSessions.filter(session => {
    if (excludeSessionId && session.id === excludeSessionId) {
      return false;
    }

    const existingStart = new Date(session.startTime).getTime();
    const existingEnd = new Date(session.endTime).getTime();

    return newStart < existingEnd && newEnd > existingStart;
  });
}

/**
 * Get a user-friendly time range string
 */
export function getTimeRangeString(startTime: string | Date, endTime: string | Date): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const timeFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${timeFormat.format(start)} - ${timeFormat.format(end)}`;
}
