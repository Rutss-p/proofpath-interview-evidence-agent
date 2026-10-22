import express from 'express';
import { db } from '../db.js';
import { convertCodingSolution } from '../agent/questions.js';
import { logAudit } from '../agent/pipeline.js';

export const codingRouter = express.Router();

const ALLOWED_LANGUAGES = [
  'javascript',
  'node.js',
  'python',
  'java',
  'typescript',
  'c#',
  'go'
];

// POST /coding/:id/convert or /api/coding/:id/convert
codingRouter.post('/:id/convert', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { language } = req.body || {};

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ detail: 'Language is required in request body' });
    }

    const normTarget = language.trim().toLowerCase();
    const matched = ALLOWED_LANGUAGES.find(l => l.toLowerCase() === normTarget);
    if (!matched) {
      return res.status(400).json({
        detail: `Unsupported language "${language}". Supported languages: JavaScript, Node.js, Python, Java, TypeScript, C#, Go`
      });
    }

    const question = db.get('SELECT * FROM coding_questions WHERE id = ?', [id]);
    if (!question) {
      return res.status(404).json({ detail: 'Coding question not found' });
    }

    const baseLang = (question.language || 'javascript').toLowerCase();
    // If target matches base language, return default solution
    if (normTarget === baseLang || (normTarget === 'node.js' && baseLang === 'javascript') || (normTarget === 'javascript' && baseLang === 'node.js')) {
      return res.json({
        coding_id: question.id,
        language: matched,
        code: question.solution,
        cached: true
      });
    }

    // Check cache in converted_solutions table
    const cachedRow = db.get(
      'SELECT * FROM converted_solutions WHERE coding_id = ? AND lower(language) = ?',
      [id, normTarget]
    );

    if (cachedRow) {
      return res.json({
        coding_id: question.id,
        language: cachedRow.language,
        code: cachedRow.code,
        cached: true
      });
    }

    // Convert via LLM
    const convertedCode = await convertCodingSolution(question.solution, question.language, matched);

    // Save into cache
    db.run(
      'INSERT INTO converted_solutions (coding_id, language, code) VALUES (?, ?, ?)',
      [id, matched, convertedCode]
    );

    logAudit('agent', 'solution_converted', `question ${id} to ${matched}`);

    return res.json({
      coding_id: question.id,
      language: matched,
      code: convertedCode,
      cached: false
    });
  } catch (err) {
    return res.status(500).json({ detail: `Conversion failed: ${err.message}` });
  }
});
