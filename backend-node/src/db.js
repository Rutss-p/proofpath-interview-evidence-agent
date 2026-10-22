import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '..', config.databaseFile);

let sqlInstance = null;
let rawDb = null;

// Initialize SQLite database
export async function initDb() {
  if (rawDb) return rawDb;

  sqlInstance = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    rawDb = new sqlInstance.Database(fileBuffer);
  } else {
    rawDb = new sqlInstance.Database();
  }

  // Create tables if not exist
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT,
      resume_text TEXT,
      status TEXT DEFAULT 'new',
      interview_at TEXT,
      delete_after TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      token_hash TEXT NOT NULL,
      agreed INTEGER DEFAULT 0,
      agreed_at TEXT,
      expires_at TEXT,
      reminders_sent INTEGER DEFAULT 0,
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS evidence_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      kind TEXT DEFAULT 'github_repo',
      url TEXT,
      meta TEXT,
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      text TEXT,
      skill TEXT,
      years REAL,
      kind TEXT,
      importance INTEGER DEFAULT 3,
      status TEXT DEFAULT 'unverifiable',
      confidence REAL DEFAULT 0.5,
      reason TEXT,
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS probes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER,
      type TEXT,
      question TEXT,
      rubric TEXT,
      artifact TEXT,
      verified INTEGER DEFAULT 0,
      answer TEXT,
      next_question TEXT,
      usefulness INTEGER,
      FOREIGN KEY(claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS repo_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      repo_url TEXT,
      analysis_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      repo_url TEXT,
      difficulty TEXT NOT NULL,
      category TEXT,
      topic TEXT,
      is_coding INTEGER DEFAULT 0,
      selected_language TEXT DEFAULT 'javascript',
      question TEXT NOT NULL,
      reason_relevant TEXT,
      supporting_evidence TEXT,
      evidence_type TEXT DEFAULT 'verified_evidence',
      expected_answer TEXT NOT NULL,
      essential_concepts TEXT,
      misconceptions TEXT,
      code_example TEXT,
      project_context TEXT,
      coding_details TEXT,
      language_solutions TEXT,
      follow_ups TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS interview_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      question_id INTEGER,
      selected_language TEXT,
      candidate_response TEXT NOT NULL,
      assessment TEXT NOT NULL,
      score REAL NOT NULL,
      score_explanation TEXT,
      correct_concepts TEXT,
      missing_concepts TEXT,
      technical_errors TEXT,
      suggested_feedback TEXT,
      recommended_follow_up TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT,
      action TEXT,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      claim_id INTEGER,
      level TEXT NOT NULL,
      text TEXT NOT NULL,
      model_answer TEXT NOT NULL,
      key_points TEXT,
      skill TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(id),
      FOREIGN KEY(claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS coding_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      difficulty TEXT DEFAULT 'medium',
      statement TEXT NOT NULL,
      examples TEXT,
      solution TEXT NOT NULL,
      language TEXT DEFAULT 'javascript',
      complexity TEXT,
      tests TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS converted_solutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coding_id INTEGER NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(coding_id) REFERENCES coding_questions(id)
    );
  `);

  try { rawDb.exec('ALTER TABLE claims ADD COLUMN evidence TEXT;'); } catch (_) {}
  try { rawDb.exec('ALTER TABLE candidates ADD COLUMN error_message TEXT;'); } catch (_) {}

  saveDb();
  return rawDb;
}

export function saveDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbFilePath, buffer);
}

// Helper methods mimicking better-sqlite3
export const db = {
  get(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized');
    const stmt = rawDb.prepare(sql);
    try {
      stmt.bind(params);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return null;
    } finally {
      stmt.free();
    }
  },

  all(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized');
    const stmt = rawDb.prepare(sql);
    const results = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  },

  run(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.run(sql, params);
    const lastId = rawDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
    saveDb();
    return { lastInsertRowid: lastId };
  },

  exec(sql) {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.exec(sql);
    saveDb();
  }
};
