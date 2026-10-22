import express from 'express';
import { db } from '../db.js';
import { hashToken } from '../security.js';
import { parseRepo } from '../agent/evidence.js';
import { runPipeline, logAudit } from '../agent/pipeline.js';

export const consentRouter = express.Router();

const SCOPE =
  'We will read your resume and the public GitHub repositories you list. ' +
  'We will use them only to prepare personalized, execution-verified interview questions. ' +
  'A human interviewer makes every hiring decision. ' +
  'You can withdraw consent at any time and your data will be permanently deleted.';

function findConsent(token) {
  const hashed = hashToken(token);
  const row = db.get('SELECT * FROM consents WHERE token_hash = ?', [hashed]);

  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null;
  }
  return row;
}

// GET /api/consent/:token
consentRouter.get('/:token', (req, res) => {
  const { token } = req.params;
  const row = findConsent(token);

  if (!row) {
    return res.status(404).json({ detail: 'This link is invalid or has expired' });
  }

  const cand = db.get('SELECT * FROM candidates WHERE id = ?', [row.candidate_id]);

  return res.json({
    scope: SCOPE,
    already_agreed: Boolean(row.agreed),
    candidate_name: cand ? cand.full_name : '',
    expires_at: row.expires_at
  });
});

// POST /api/consent/:token
consentRouter.post('/:token', (req, res) => {
  const { token } = req.params;
  const row = findConsent(token);

  if (!row) {
    return res.status(404).json({ detail: 'This link is invalid or has expired' });
  }

  const cand = db.get('SELECT * FROM candidates WHERE id = ?', [row.candidate_id]);
  if (!cand) {
    return res.status(404).json({ detail: 'Candidate not found' });
  }

  const { agree, repo_urls = [] } = req.body || {};

  if (!agree) {
    db.run("UPDATE candidates SET status = 'declined' WHERE id = ?", [cand.id]);
    logAudit('candidate', 'consent_declined', `id ${cand.id}`);
    return res.json({ status: 'declined' });
  }

  const urls = (Array.isArray(repo_urls) ? repo_urls : [])
    .map(u => String(u).trim())
    .filter(Boolean)
    .slice(0, 5);

  // Clean old sources
  db.run('DELETE FROM evidence_sources WHERE candidate_id = ?', [cand.id]);

  // Insert repo sources
  for (const u of urls) {
    db.run(
      'INSERT INTO evidence_sources (candidate_id, kind, url) VALUES (?, ?, ?)',
      [cand.id, 'github_repo', u]
    );
  }

  const now = new Date().toISOString();
  db.run(
    'UPDATE consents SET agreed = 1, agreed_at = ? WHERE id = ?',
    [now, row.id]
  );

  db.run("UPDATE candidates SET status = 'processing', error_message = NULL WHERE id = ?", [cand.id]);
  logAudit('candidate', 'consent_given', `id ${cand.id}, repos=${urls.length}`);

  // Trigger background job asynchronously and return immediately
  setImmediate(async () => {
    try {
      await runPipeline(cand.id);
    } catch (err) {
      logAudit('agent', 'pipeline_error', `candidate ${cand.id}: ${err.message}`);
    }
  });

  return res.json({ status: 'processing', repos_accepted: urls.length });
});

// POST /api/consent/:token/withdraw
consentRouter.post('/:token/withdraw', (req, res) => {
  const { token } = req.params;
  const row = findConsent(token);

  if (!row) {
    return res.status(404).json({ detail: 'This link is invalid or has expired' });
  }

  const cand = db.get('SELECT * FROM candidates WHERE id = ?', [row.candidate_id]);
  if (cand) {
    logAudit('candidate', 'consent_withdrawn', `id ${cand.id}`);

    // Cascade delete all generated content
    const codingQs = db.all('SELECT id FROM coding_questions WHERE candidate_id = ?', [cand.id]);
    for (const cq of codingQs) {
      db.run('DELETE FROM converted_solutions WHERE coding_id = ?', [cq.id]);
    }
    db.run('DELETE FROM coding_questions WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM questions WHERE candidate_id = ?', [cand.id]);

    const claims = db.all('SELECT id FROM claims WHERE candidate_id = ?', [cand.id]);
    for (const cl of claims) {
      db.run('DELETE FROM probes WHERE claim_id = ?', [cl.id]);
    }
    db.run('DELETE FROM claims WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM evidence_sources WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM repo_analyses WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM interview_questions WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM interview_evaluations WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM consents WHERE candidate_id = ?', [cand.id]);
    db.run('DELETE FROM candidates WHERE id = ?', [cand.id]);
  }

  return res.json({ deleted: true });
});
