import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  databaseFile: process.env.DATABASE_FILE || 'proofpath.db',
  jwtSecret: process.env.JWT_SECRET || 'proofpath-jwt-secret-key-super-secure-32-chars-minimum',
  jwtExpireMinutes: parseInt(process.env.JWT_EXPIRE_MINUTES || '60', 10),
  consentSecret: process.env.CONSENT_SECRET || 'proofpath-consent-secret-key-super-secure-32-chars',
  llmBaseUrl: (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
  llmApiKey: process.env.LLM_API_KEY || 'mock',
  llmModel: process.env.LLM_MODEL || 'openai/gpt-oss-120b',
  githubToken: process.env.GITHUB_TOKEN || '',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  sandboxMode: process.env.SANDBOX_MODE || 'local' // 'off' | 'docker' | 'local'
};
