import cron from 'node-cron';
import { db } from './db.js';
import { logAudit } from './agent/pipeline.js';

export function consentReminders() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rows = db.all(
      `SELECT c.id, cs.id as consent_id, cs.reminders_sent
       FROM candidates c
       JOIN consents cs ON cs.candidate_id = c.id
       WHERE c.status = 'consent_pending' AND c.created_at < ?`,
      [cutoff]
    );

    for (const r of rows) {
      if ((r.reminders_sent || 0) < 2) {
        db.run('UPDATE consents SET reminders_sent = reminders_sent + 1 WHERE id = ?', [r.consent_id]);
        logAudit('agent', 'consent_reminder', `candidate ${r.id}`);
      }
    }
  } catch (err) {
    console.error('Error in consentReminders:', err);
  }
}

export function briefingReady() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const rows = db.all(
      `SELECT id, interview_at
       FROM candidates
       WHERE status = 'analyzed'
         AND interview_at IS NOT NULL
         AND interview_at > ?
         AND interview_at < ?`,
      [now.toISOString(), in24h.toISOString()]
    );

    for (const r of rows) {
      const detail = `candidate ${r.id}`;
      const seen = db.get(
        'SELECT id FROM audit_log WHERE action = ? AND detail = ?',
        ['briefing_ready', detail]
      );
      if (!seen) {
        logAudit('agent', 'briefing_ready', detail);
      }
    }
  } catch (err) {
    console.error('Error in briefingReady:', err);
  }
}

export function retention() {
  try {
    const nowIso = new Date().toISOString();
    const oldCandidates = db.all('SELECT id FROM candidates WHERE delete_after < ?', [nowIso]);

    for (const c of oldCandidates) {
      const claims = db.all('SELECT id FROM claims WHERE candidate_id = ?', [c.id]);
      for (const cl of claims) {
        db.run('DELETE FROM probes WHERE claim_id = ?', [cl.id]);
      }
      db.run('DELETE FROM claims WHERE candidate_id = ?', [c.id]);
      db.run('DELETE FROM evidence_sources WHERE candidate_id = ?', [c.id]);
      db.run('DELETE FROM consents WHERE candidate_id = ?', [c.id]);
      db.run('DELETE FROM candidates WHERE id = ?', [c.id]);

      logAudit('agent', 'retention_delete', `id ${c.id}`);
    }
  } catch (err) {
    console.error('Error in retention:', err);
  }
}

export function startScheduler() {
  // Run consent reminders hourly
  cron.schedule('0 * * * *', () => {
    consentReminders();
  });

  // Run briefing notifications hourly
  cron.schedule('0 * * * *', () => {
    briefingReady();
  });

  // Run data retention daily at 02:00
  cron.schedule('0 2 * * *', () => {
    retention();
  });

  console.log('[Scheduler] Background cron jobs scheduled successfully');
}
