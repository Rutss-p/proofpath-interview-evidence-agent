import express from 'express';
import { db } from '../db.js';
import { requireRole } from '../deps.js';
import { evaluateAnswer } from '../agent/adaptive.js';

export const probesRouter = express.Router();
const staffRole = requireRole('interviewer', 'recruiter', 'admin');

// POST /api/probes/:pid/answer
probesRouter.post('/:pid/answer', staffRole, async (req, res) => {
  const pid = parseInt(req.params.pid, 10);
  const p = db.get('SELECT * FROM probes WHERE id = ?', [pid]);

  if (!p) {
    return res.status(404).json({ detail: 'Probe not found' });
  }

  const { answer_text } = req.body || {};
  if (!answer_text || !String(answer_text).trim()) {
    return res.status(400).json({ detail: 'answer_text is required' });
  }

  const claim = db.get('SELECT * FROM claims WHERE id = ?', [p.claim_id]);

  try {
    const judge = await evaluateAnswer(p, claim, String(answer_text));
    const updatedClaim = claim ? db.get('SELECT * FROM claims WHERE id = ?', [claim.id]) : null;

    return res.json({
      depth: judge.depth,
      gaps: judge.gaps,
      next_question: judge.next_question,
      new_confidence: updatedClaim ? updatedClaim.confidence : null
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/probes/:pid/feedback
probesRouter.post('/:pid/feedback', staffRole, (req, res) => {
  const pid = parseInt(req.params.pid, 10);
  const p = db.get('SELECT * FROM probes WHERE id = ?', [pid]);

  if (!p) {
    return res.status(404).json({ detail: 'Probe not found' });
  }

  const { usefulness } = req.body || {};
  const rating = parseInt(usefulness, 10);

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ detail: 'usefulness must be between 1 and 5' });
  }

  db.run('UPDATE probes SET usefulness = ? WHERE id = ?', [rating, pid]);

  return res.json({
    saved: true,
    probe_id: pid,
    usefulness: rating
  });
});

// GET /api/probes/metrics
probesRouter.get('/metrics', staffRole, (req, res) => {
  const typeRows = db.all(`
    SELECT
      type,
      COUNT(id) as total,
      AVG(usefulness) as avg_usefulness,
      COUNT(usefulness) as rated_count
    FROM probes
    GROUP BY type
  `);

  const stats = typeRows.map(t => ({
    type: t.type,
    total: t.total,
    avg_usefulness: t.avg_usefulness !== null && t.avg_usefulness !== undefined ? Number(Number(t.avg_usefulness).toFixed(2)) : null,
    rated_count: t.rated_count
  }));

  const totalProbes = db.get('SELECT COUNT(*) as count FROM probes')?.count || 0;
  const evaluatedAnswers = db.get('SELECT COUNT(*) as count FROM probes WHERE answer IS NOT NULL')?.count || 0;

  return res.json({
    probe_types: stats,
    total_probes: totalProbes,
    evaluated_answers: evaluatedAnswers
  });
});
