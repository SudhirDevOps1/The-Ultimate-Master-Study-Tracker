import { neon } from '@neondatabase/serverless';
import { db } from './db';

const isElectron = typeof window !== "undefined" && !!(window as any).electron?.ipcRenderer;
const getIpc = () => isElectron ? (window as any).electron.ipcRenderer : null;

// This function syncs local Dexie data to NeonDB one-way
export async function syncToNeonDB(connectionString: string) {
  if (!connectionString) return;

  try {
    const sql = neon(connectionString);

    // Ensure schema exists
    await sql`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        emoji TEXT,
        weeklyGoalMinutes INTEGER,
        url TEXT,
        createdAt TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        subjectId UUID,
        startTime TIMESTAMP,
        endTime TIMESTAMP,
        plannedMinutes INTEGER,
        actualSeconds INTEGER,
        status TEXT,
        createdAt TIMESTAMP,
        updatedAt TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS app_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appName TEXT NOT NULL,
        title TEXT,
        durationSeconds INTEGER,
        date TEXT,
        hour INTEGER,
        startTime TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS block_rules (
        id UUID PRIMARY KEY,
        appName TEXT NOT NULL,
        blocked BOOLEAN,
        strictLevel TEXT,
        category TEXT,
        ruleType TEXT
      );
    `;

    // Fetch data from local IndexedDB
    const subjects = await db.subjects.toArray();
    const sessions = await db.sessions.toArray();

    // Sync subjects
    for (const sub of subjects) {
      await sql`
        INSERT INTO subjects (id, name, color, emoji, weeklyGoalMinutes, url, createdAt)
        VALUES (${sub.id}, ${sub.name}, ${sub.color}, ${sub.emoji}, ${sub.weeklyGoalMinutes}, ${sub.url}, ${sub.createdAt ? new Date(sub.createdAt) : new Date()})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          color = EXCLUDED.color,
          emoji = EXCLUDED.emoji,
          weeklyGoalMinutes = EXCLUDED.weeklyGoalMinutes,
          url = EXCLUDED.url
      `;
    }

    // Sync sessions
    for (const ses of sessions) {
      await sql`
        INSERT INTO sessions (id, subjectId, startTime, endTime, plannedMinutes, actualSeconds, status, createdAt, updatedAt)
        VALUES (
          ${ses.id}, ${ses.subjectId}, 
          ${ses.startTime ? new Date(ses.startTime) : new Date()}, 
          ${ses.endTime ? new Date(ses.endTime) : new Date()}, 
          ${ses.plannedMinutes}, ${ses.actualSeconds}, ${ses.status}, 
          ${ses.createdAt ? new Date(ses.createdAt) : new Date()}, 
          ${ses.updatedAt ? new Date(ses.updatedAt) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          actualSeconds = EXCLUDED.actualSeconds,
          status = EXCLUDED.status,
          updatedAt = EXCLUDED.updatedAt
      `;
    }

    // Sync app usage
    const ipc = getIpc();
    if (ipc) {
      const today = new Date().toISOString().split("T")[0];
      const activityLog = await ipc.invoke("get-activity-log", { date: today });
      
      // Delete today's existing records to replace them (since they don't have stable IDs)
      await sql`DELETE FROM app_usage WHERE date = ${today}`;
      
      for (const log of activityLog) {
        if (!log.appName) continue;
        await sql`
          INSERT INTO app_usage (appName, title, durationSeconds, date, hour, startTime)
          VALUES (
            ${log.appName}, ${log.title || ''}, ${log.durationSeconds}, 
            ${log.date}, ${log.hour}, ${log.startTime ? new Date(log.startTime) : new Date()}
          )
        `;
      }

      // Sync block rules
      const blockRulesData = await ipc.invoke("get-block-rules");
      if (blockRulesData && blockRulesData.rules) {
        // Clear old rules to completely replace
        await sql`DELETE FROM block_rules`;
        for (const rule of blockRulesData.rules) {
          await sql`
            INSERT INTO block_rules (id, appName, blocked, strictLevel, category, ruleType)
            VALUES (
              ${rule.id || crypto.randomUUID()}, ${rule.appName}, ${!!rule.blocked}, 
              ${rule.strictLevel || 'soft'}, ${rule.category || 'other'}, ${rule.ruleType || 'app'}
            )
          `;
        }
      }
    }

    console.log("NeonDB Sync Complete");
  } catch (error) {
    console.error("NeonDB Sync Failed:", error);
  }
}
