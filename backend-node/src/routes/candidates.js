import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate, requireRole } from '../deps.js';
import { newConsentToken } from '../security.js';
import { runPipeline, logAudit } from '../agent/pipeline.js';
import { evaluateInterviewerAnswer, generateAdditionalQuestionAgent } from '../agent/github_agent.js';

export const candidatesRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

async function extractResumeText(file) {
  const filename = (file.originalname || '').toLowerCase();
  if (filename.endsWith('.pdf') || file.mimetype === 'application/pdf') {
    try {
      const data = await pdfParse(file.buffer);
      return data.text || '';
    } catch {
      return file.buffer.toString('utf-8');
    }
  }
  return file.buffer.toString('utf-8');
}

// POST /api/candidates
candidatesRouter.post(
  '/',
  requireRole('recruiter', 'admin'),
  upload.single('resume'),
  async (req, res) => {
    try {
      const fullName = (req.body.full_name || '').trim();
      const email = (req.body.email || '').trim();

      if (!fullName) {
        return res.status(400).json({ detail: 'Full name is required' });
      }

      if (!req.file) {
        return res.status(400).json({ detail: 'Resume file is required' });
      }

      const text = await extractResumeText(req.file);

      const deleteAfterDate = new Date();
      deleteAfterDate.setDate(deleteAfterDate.getDate() + 90);

      const ins = db.run(
        `INSERT INTO candidates (full_name, email, resume_text, status, delete_after, created_by)
         VALUES (?, ?, ?, 'new', ?, ?)`,
        [fullName, email || null, text, deleteAfterDate.toISOString(), req.user.id]
      );

      const cid = ins.lastInsertRowid;
      logAudit(req.user.email, 'candidate_created', fullName);

      return res.status(200).json({
        id: cid,
        full_name: fullName,
        status: 'new'
      });
    } catch (err) {
      return res.status(500).json({ detail: err.message });
    }
  }
);

// GET /api/candidates
candidatesRouter.get('/', authenticate, (req, res) => {
  const rows = db.all('SELECT * FROM candidates ORDER BY id DESC');

  const result = rows.map(c => {
    const claimCount = db.get(
      'SELECT count(*) as count FROM claims WHERE candidate_id = ?',
      [c.id]
    )?.count || 0;

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      status: c.status,
      created_at: c.created_at,
      claim_count: claimCount
    };
  });

  return res.json(result);
});

function getCandidateBriefing(cid) {
  const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);
  if (!c) return null;

  const claimRows = db.all('SELECT * FROM claims WHERE candidate_id = ?', [cid]);
  const claims = claimRows.map(cl => {
    const probes = db.all('SELECT * FROM probes WHERE claim_id = ?', [cl.id]).map(p => ({
      id: p.id,
      type: p.type,
      question: p.question,
      rubric: p.rubric,
      verified: p.verified,
      artifact: p.artifact,
      answer: p.answer,
      next_question: p.next_question,
      usefulness: p.usefulness
    }));

    return {
      id: cl.id,
      text: cl.text,
      skill: cl.skill,
      years: cl.years,
      role: cl.role || 'Software Engineer',
      kind: cl.kind,
      importance: cl.importance,
      status: cl.status,
      confidence: cl.confidence,
      reason: cl.reason,
      evidence: cl.evidence,
      probes
    };
  });

  const sourceRows = db.all('SELECT * FROM evidence_sources WHERE candidate_id = ?', [cid]);
  const sources = sourceRows.map(s => ({
    id: s.id,
    kind: s.kind,
    url: s.url,
    meta: s.meta ? JSON.parse(s.meta) : null
  }));

  const consent = db.get('SELECT * FROM consents WHERE candidate_id = ?', [cid]);

  // Questions grouped by level
  const questionRows = db.all('SELECT * FROM questions WHERE candidate_id = ? ORDER BY id ASC', [cid]);
  const questions = questionRows.map(q => ({
    id: q.id,
    candidate_id: q.candidate_id,
    claim_id: q.claim_id,
    level: q.level,
    text: q.text,
    model_answer: q.model_answer,
    key_points: q.key_points ? JSON.parse(q.key_points) : [],
    skill: q.skill,
    created_at: q.created_at
  }));

  // Coding questions with cached converted solutions
  const codingRows = db.all('SELECT * FROM coding_questions WHERE candidate_id = ? ORDER BY id ASC', [cid]);
  const coding_questions = codingRows.map(cq => {
    const converted = db.all('SELECT * FROM converted_solutions WHERE coding_id = ?', [cq.id]);
    const convertedMap = {};
    for (const cv of converted) {
      convertedMap[cv.language.toLowerCase()] = cv.code;
    }

    return {
      id: cq.id,
      candidate_id: cq.candidate_id,
      difficulty: cq.difficulty,
      statement: cq.statement,
      examples: cq.examples ? JSON.parse(cq.examples) : [],
      solution: cq.solution,
      language: cq.language,
      complexity: cq.complexity,
      tests: cq.tests ? JSON.parse(cq.tests) : [],
      converted_solutions: convertedMap,
      created_at: cq.created_at
    };
  });

  return {
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    status: c.status,
    error_message: c.error_message || null,
    interview_at: c.interview_at,
    created_at: c.created_at,
    claims,
    questions,
    coding_questions,
    sources,
    has_consent: Boolean(consent && consent.agreed)
  };
}

// GET /api/candidates/:cid/status
candidatesRouter.get('/:cid/status', (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  const c = db.get('SELECT id, status, error_message FROM candidates WHERE id = ?', [cid]);

  if (!c) {
    return res.status(404).json({ detail: 'Candidate not found' });
  }

  return res.json({
    id: c.id,
    candidate_id: c.id,
    status: c.status,
    error: c.error_message || null,
    error_message: c.error_message || null
  });
});

// GET /api/candidates/:cid/briefing
candidatesRouter.get('/:cid/briefing', authenticate, (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  const briefing = getCandidateBriefing(cid);

  if (!briefing) {
    return res.status(404).json({ detail: 'Candidate not found' });
  }

  return res.json(briefing);
});

// GET /api/candidates/:cid
candidatesRouter.get('/:cid', authenticate, (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  const briefing = getCandidateBriefing(cid);

  if (!briefing) {
    return res.status(404).json({ detail: 'Candidate not found' });
  }

  return res.json(briefing);
});

// POST /api/candidates/:cid/consent-request
candidatesRouter.post(
  '/:cid/consent-request',
  requireRole('recruiter', 'admin'),
  (req, res) => {
    const cid = parseInt(req.params.cid, 10);
    const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);

    if (!c) {
      return res.status(404).json({ detail: 'Candidate not found' });
    }

    const { token, hashed } = newConsentToken();
    db.run('DELETE FROM consents WHERE candidate_id = ?', [cid]);

    const exp = new Date();
    exp.setDate(exp.getDate() + 7);

    db.run(
      'INSERT INTO consents (candidate_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [cid, hashed, exp.toISOString()]
    );

    db.run("UPDATE candidates SET status = 'consent_pending' WHERE id = ?", [cid]);
    logAudit(req.user.email, 'consent_request_created', `candidate ${cid}`);

    const link = `${config.frontendOrigin}/consent/${token}`;
    return res.json({ link, token });
  }
);

// POST /api/candidates/:cid/analyze
candidatesRouter.post(
  '/:cid/analyze',
  requireRole('recruiter', 'admin'),
  (req, res) => {
    const cid = parseInt(req.params.cid, 10);
    const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);

    if (!c || !['consented', 'analyzed', 'failed'].includes(c.status)) {
      return res.status(409).json({ detail: 'Candidate has not given consent or is currently processing' });
    }

    // Run pipeline asynchronously
    setImmediate(async () => {
      try {
        await runPipeline(cid);
      } catch (err) {
        logAudit('agent', 'pipeline_error', `candidate ${cid}: ${err.message}`);
      }
    });

    return res.json({ started: true, candidate_id: cid });
  }
);

// POST /api/candidates/:cid/evaluate-answer
candidatesRouter.post(
  '/:cid/evaluate-answer',
  requireRole('interviewer', 'recruiter', 'admin'),
  async (req, res) => {
    try {
      const cid = parseInt(req.params.cid, 10);
      const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);
      if (!c) {
        return res.status(404).json({ detail: 'Candidate not found' });
      }

      const {
        question_id,
        question,
        expected_answer,
        evaluation_criteria = [],
        selected_language = 'javascript',
        candidate_response = '',
        is_coding = false
      } = req.body || {};

      if (!candidate_response || !String(candidate_response).trim()) {
        return res.status(400).json({ detail: 'candidate_response is required' });
      }

      const evaluation = await evaluateInterviewerAnswer({
        question: question || 'Technical Interview Question',
        expectedAnswer: expected_answer || '',
        evaluationCriteria: Array.isArray(evaluation_criteria) ? evaluation_criteria : [],
        selectedLanguage: selected_language,
        candidateResponse: String(candidate_response),
        isCoding: Boolean(is_coding)
      });

      // Persist evaluation result into SQLite
      const ins = db.run(
        `INSERT INTO interview_evaluations (
          candidate_id, question_id, selected_language, candidate_response,
          assessment, score, score_explanation, correct_concepts, missing_concepts,
          technical_errors, suggested_feedback, recommended_follow_up
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cid,
          question_id ? parseInt(question_id, 10) : null,
          selected_language,
          String(candidate_response),
          evaluation.assessment,
          evaluation.score,
          evaluation.score_explanation,
          JSON.stringify(evaluation.correct_concepts || []),
          JSON.stringify(evaluation.missing_concepts || []),
          JSON.stringify(evaluation.technical_errors || []),
          JSON.stringify(evaluation.suggested_feedback || []),
          JSON.stringify(evaluation.recommended_follow_up || {})
        ]
      );

      logAudit(req.user.email, 'candidate_answer_evaluated', `candidate ${cid}, score ${evaluation.score}`);

      return res.json({
        id: ins.lastInsertRowid,
        ...evaluation
      });
    } catch (err) {
      return res.status(500).json({ detail: err.message });
    }
  }
);

// POST /api/candidates/:cid/questions/generate-more
candidatesRouter.post(
  '/:cid/questions/generate-more',
  requireRole('interviewer', 'recruiter', 'admin'),
  async (req, res) => {
    try {
      const cid = parseInt(req.params.cid, 10);
      const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);
      if (!c) {
        return res.status(404).json({ detail: 'Candidate not found' });
      }

      const {
        topic = 'Architecture',
        difficulty = 'intermediate',
        mode = 'same_difficulty',
        target_language = 'javascript',
        previous_answer = ''
      } = req.body || {};

      const existingRows = db.all('SELECT question FROM interview_questions WHERE candidate_id = ?', [cid]);
      const existingQuestions = existingRows.map(r => r.question);

      const newQ = await generateAdditionalQuestionAgent({
        candidate: c,
        topic,
        difficulty,
        mode,
        targetLanguage: target_language,
        existingQuestions
      });

      const ins = db.run(
        `INSERT INTO interview_questions (
          candidate_id, repo_url, difficulty, category, topic, is_coding,
          selected_language, question, reason_relevant, supporting_evidence,
          evidence_type, expected_answer, essential_concepts, misconceptions,
          code_example, project_context, coding_details, language_solutions, follow_ups
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cid,
          null,
          newQ.difficulty || difficulty,
          newQ.category || topic,
          newQ.topic || topic,
          newQ.is_coding ? 1 : 0,
          newQ.selected_language || target_language,
          newQ.question,
          newQ.reason_relevant || '',
          newQ.supporting_evidence || '',
          newQ.evidence_type || 'inferred',
          newQ.expected_answer || '',
          JSON.stringify(newQ.essential_concepts || []),
          JSON.stringify(newQ.misconceptions || []),
          newQ.code_example || '',
          newQ.project_context || '',
          newQ.coding_details ? JSON.stringify(newQ.coding_details) : null,
          newQ.language_solutions ? JSON.stringify(newQ.language_solutions) : null,
          JSON.stringify(newQ.follow_ups || [])
        ]
      );

      logAudit(req.user.email, 'additional_question_generated', `candidate ${cid}, topic ${topic}`);

      return res.json({
        id: ins.lastInsertRowid,
        ...newQ
      });
    } catch (err) {
      return res.status(500).json({ detail: err.message });
    }
  }
);

// POST /api/candidates/:cid/questions/:qid/switch-language
candidatesRouter.post(
  '/:cid/questions/:qid/switch-language',
  requireRole('interviewer', 'recruiter', 'admin'),
  (req, res) => {
    const cid = parseInt(req.params.cid, 10);
    const qid = parseInt(req.params.qid, 10);
    const { language } = req.body || {};

    const allowed = ['javascript', 'python', 'java', 'c++'];
    if (!language || !allowed.includes(language.toLowerCase())) {
      return res.status(400).json({ detail: `Language must be one of: ${allowed.join(', ')}` });
    }

    const q = db.get('SELECT * FROM interview_questions WHERE id = ? AND candidate_id = ?', [qid, cid]);
    if (!q) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    const selectedLang = language.toLowerCase();
    db.run('UPDATE interview_questions SET selected_language = ? WHERE id = ?', [selectedLang, qid]);

    const solutions = q.language_solutions ? JSON.parse(q.language_solutions) : {};
    const solution = solutions[selectedLang] || null;

    return res.json({
      question_id: qid,
      selected_language: selectedLang,
      solution
    });
  }
);

// DELETE /api/candidates/:cid
candidatesRouter.delete(
  '/:cid',
  requireRole('recruiter', 'admin'),
  (req, res) => {
    const cid = parseInt(req.params.cid, 10);
    const c = db.get('SELECT * FROM candidates WHERE id = ?', [cid]);

    if (c) {
      const codingQs = db.all('SELECT id FROM coding_questions WHERE candidate_id = ?', [cid]);
      for (const cq of codingQs) {
        db.run('DELETE FROM converted_solutions WHERE coding_id = ?', [cq.id]);
      }
      db.run('DELETE FROM coding_questions WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM questions WHERE candidate_id = ?', [cid]);

      const claims = db.all('SELECT id FROM claims WHERE candidate_id = ?', [cid]);
      for (const cl of claims) {
        db.run('DELETE FROM probes WHERE claim_id = ?', [cl.id]);
      }
      db.run('DELETE FROM claims WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM evidence_sources WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM consents WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM repo_analyses WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM interview_questions WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM interview_evaluations WHERE candidate_id = ?', [cid]);
      db.run('DELETE FROM candidates WHERE id = ?', [cid]);

      logAudit(req.user.email, 'candidate_erased', `id ${cid}`);
    }

    return res.json({ deleted: true });
  }
);
