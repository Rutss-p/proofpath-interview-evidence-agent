import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../db.js';
import { extractClaims } from './extract.js';
import { fetchRepoMeta, cloneRepo } from './evidence.js';
import { scoreClaim } from './scoring.js';
import { generateClaimQuestions, generateCodingQuestions } from './questions.js';

export function logAudit(actor, action, detail) {
  try {
    db.run(
      'INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)',
      [actor, action, detail]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function runPipeline(candidateId) {
  const candidate = db.get('SELECT * FROM candidates WHERE id = ?', [candidateId]);
  if (!candidate) {
    throw new Error('Candidate not found');
  }

  // Idempotency: cleanly replace old generated content
  const oldCodingQs = db.all('SELECT id FROM coding_questions WHERE candidate_id = ?', [candidateId]);
  for (const oc of oldCodingQs) {
    db.run('DELETE FROM converted_solutions WHERE coding_id = ?', [oc.id]);
  }
  db.run('DELETE FROM coding_questions WHERE candidate_id = ?', [candidateId]);
  db.run('DELETE FROM questions WHERE candidate_id = ?', [candidateId]);

  const oldClaims = db.all('SELECT id FROM claims WHERE candidate_id = ?', [candidateId]);
  for (const oc of oldClaims) {
    db.run('DELETE FROM probes WHERE claim_id = ?', [oc.id]);
  }
  db.run('DELETE FROM claims WHERE candidate_id = ?', [candidateId]);
  db.run('DELETE FROM repo_analyses WHERE candidate_id = ?', [candidateId]);
  db.run('DELETE FROM interview_questions WHERE candidate_id = ?', [candidateId]);

  // Set status to processing, clear previous error
  db.run("UPDATE candidates SET status = 'processing', error_message = NULL WHERE id = ?", [candidateId]);
  logAudit('agent', 'pipeline_started', `candidate ${candidateId}`);

  try {
    // Step 3a: Extract claims (skill, years, role) from the resume text with the LLM, validated by schema
    const extracted = await extractClaims(candidate.resume_text);
    if (!extracted || !Array.isArray(extracted.claims) || extracted.claims.length === 0) {
      throw new Error('Could not extract any verifiable claims from the provided resume text.');
    }

    // Step 3b: Fetch GitHub data for each consented repo through the public API
    const sources = db.all('SELECT * FROM evidence_sources WHERE candidate_id = ?', [candidateId]);
    const evidence = [];

    for (const s of sources) {
      const meta = await fetchRepoMeta(s.url);
      if (!meta) {
        throw new Error(`Failed to fetch repository metadata for "${s.url}". Repository is inaccessible or invalid.`);
      }
      db.run('UPDATE evidence_sources SET meta = ? WHERE id = ?', [JSON.stringify(meta), s.id]);
      evidence.push(meta);
    }

    // Step 3c: Verify each claim with deterministic code, not the LLM
    const createdClaims = [];
    for (const item of extracted.claims) {
      const scored = scoreClaim(item, evidence);
      const res = db.run(
        `INSERT INTO claims (candidate_id, text, skill, years, kind, importance, status, confidence, reason, evidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidate.id,
          item.text,
          item.skill,
          item.years !== undefined ? item.years : null,
          item.kind || 'skill',
          item.importance || 3,
          scored.status,
          scored.confidence,
          scored.reason,
          scored.evidence
        ]
      );

      createdClaims.push({
        id: res.lastInsertRowid,
        candidate_id: candidate.id,
        text: item.text,
        skill: item.skill,
        years: item.years,
        role: item.role,
        kind: item.kind,
        importance: item.importance,
        status: scored.status,
        confidence: scored.confidence,
        reason: scored.reason,
        evidence: scored.evidence
      });
    }

    // Step 3d: For each important claim, generate questions at beginner, intermediate and advanced level
    const seenSkills = new Set();
    const claimsToQuestion = [];
    for (const cl of createdClaims) {
      const normSkill = (cl.skill || '').toLowerCase().trim();
      if (!seenSkills.has(normSkill)) {
        seenSkills.add(normSkill);
        claimsToQuestion.push(cl);
      }
    }

    for (const claim of claimsToQuestion) {
      const generated = await generateClaimQuestions(claim, evidence);
      for (const q of generated) {
        db.run(
          `INSERT INTO questions (candidate_id, claim_id, level, text, model_answer, key_points, skill)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            candidate.id,
            claim.id,
            q.level,
            q.text,
            q.model_answer,
            JSON.stringify(q.key_points || []),
            q.skill || claim.skill
          ]
        );
      }
    }

    // Step 3e: Generate 3 coding questions (easy, medium, hard) based on candidate's top skills & repo content
    const topSkills = Array.from(seenSkills).slice(0, 5);
    const codingQuestions = await generateCodingQuestions(topSkills, evidence);

    for (const cq of codingQuestions) {
      db.run(
        `INSERT INTO coding_questions (candidate_id, difficulty, statement, examples, solution, language, complexity, tests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidate.id,
          cq.difficulty || 'medium',
          cq.statement,
          JSON.stringify(cq.examples || []),
          cq.solution,
          cq.language || 'javascript',
          cq.complexity,
          JSON.stringify(cq.tests || [])
        ]
      );
    }

    // Step 4: Set status to 'analyzed' when finished
    db.run("UPDATE candidates SET status = 'analyzed', error_message = NULL WHERE id = ?", [candidate.id]);
    logAudit(
      'agent',
      'pipeline_analyzed',
      `candidate ${candidate.id}: verified ${createdClaims.length} claims, generated ${claimsToQuestion.length * 3} questions, 3 coding questions`
    );

  } catch (err) {
    const errorMsg = err.message || 'Pipeline analysis failed';
    db.run("UPDATE candidates SET status = 'failed', error_message = ? WHERE id = ?", [errorMsg, candidate.id]);
    logAudit('agent', 'pipeline_failed', `candidate ${candidate.id}: ${errorMsg}`);
    console.error(`[Pipeline Error] Candidate ${candidate.id}:`, err);
  }
}
