import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = 'http://localhost:8000/api';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('Starting ProofPath Acceptance Test Suite');
  console.log('====================================================\n');

  // Login as recruiter
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@demo.com', password: 'ChangeMe123!' })
  });
  const { token } = await loginRes.json();
  assert(token, 'Recruiter login succeeded and returned JWT');
  const authHeaders = { Authorization: `Bearer ${token}` };

  // ================================================================
  // ACCEPTANCE TEST 1 & 2 & 3:
  // 1. Submitting consent with one repo link produces questions at all
  //    three levels and 3 coding questions with no further candidate input.
  // 2. A resume with four different skills yields four distinct sets of questions.
  // 3. A claim with an impossible duration shows as contradicted, and a claim
  //    with no evidence shows as unverifiable.
  // ================================================================
  console.log('>>> TESTING ACCEPTANCE TESTS 1, 2, and 3...');

  const resumeText =
    'Alex Morgan - Senior Polyglot Engineer\n' +
    '4 years of JavaScript and Node.js backend architecture.\n' +
    '3 years of React frontend development.\n' +
    '2 years of Docker containerization.\n' +
    '15 years of Kubernetes cluster operations (started in 2011).\n' +
    'Experience with distributed systems and automated testing.';

  const form = new FormData();
  form.append('full_name', 'Alex Morgan');
  form.append('email', 'alex.morgan@example.com');
  form.append('resume', new Blob([resumeText], { type: 'text/plain' }), 'alex_resume.txt');

  const createCandRes = await fetch(`${BASE}/candidates`, {
    method: 'POST',
    headers: authHeaders,
    body: form
  });
  const candData = await createCandRes.json();
  const cid = candData.id;
  assert(cid, 'Candidate created with ID: ' + cid);

  // Generate consent request
  const consentReqRes = await fetch(`${BASE}/candidates/${cid}/consent-request`, {
    method: 'POST',
    headers: authHeaders
  });
  const { token: consentToken } = await consentReqRes.json();
  assert(consentToken, 'Consent request link/token created');

  // Candidate opens consent link (Acceptance Test 6: only confirmation)
  const consentViewRes = await fetch(`${BASE}/consent/${consentToken}`);
  const consentView = await consentViewRes.json();
  assert(consentView.candidate_name === 'Alex Morgan', 'Candidate name is displayed on consent page');

  // Candidate submits consent with 1 repo link
  const sampleRepoPath = path.resolve(__dirname, 'sample_repos/age_utils_js');
  const submitConsentRes = await fetch(`${BASE}/consent/${consentToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agree: true,
      repo_urls: [sampleRepoPath]
    })
  });
  const consentResult = await submitConsentRes.json();

  // Acceptance Test 6: Candidate response is immediate processing confirmation
  assert(
    consentResult.status === 'processing',
    `Acceptance Test 6: Immediate return with status "processing" (got: ${consentResult.status})`
  );
  console.log('   ✓ Acceptance Test 6 Passed: Candidate submit returns immediate status="processing"');

  // Wait for background job to finish
  console.log('   Waiting for background pipeline analysis...');
  let detail = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`${BASE}/candidates/${cid}/status`);
    const statusData = await statusRes.json();
    if (statusData.status === 'analyzed' || statusData.status === 'failed') {
      break;
    }
  }

  // Fetch candidate briefing via GET candidate briefing
  const briefingRes = await fetch(`${BASE}/candidates/${cid}/briefing`, { headers: authHeaders });
  detail = await briefingRes.json();
  assert(detail.status === 'analyzed', `Candidate status is "analyzed" (was: ${detail.status}, error: ${detail.error_message})`);

  // Verify Acceptance Test 1: Questions at all 3 levels + 3 coding questions
  const questions = detail.questions || [];
  const beginnerQs = questions.filter(q => q.level === 'beginner');
  const intermediateQs = questions.filter(q => q.level === 'intermediate');
  const advancedQs = questions.filter(q => q.level === 'advanced');

  assert(beginnerQs.length >= 1, `Found ${beginnerQs.length} beginner questions`);
  assert(intermediateQs.length >= 1, `Found ${intermediateQs.length} intermediate questions`);
  assert(advancedQs.length >= 1, `Found ${advancedQs.length} advanced questions`);

  const codingQs = detail.coding_questions || [];
  assert(codingQs.length === 3, `Expected exactly 3 coding questions, found ${codingQs.length}`);
  const difficulties = codingQs.map(c => c.difficulty.toLowerCase());
  assert(difficulties.includes('easy') && difficulties.includes('medium') && difficulties.includes('hard'),
    `Coding questions contain easy, medium, and hard (got: ${difficulties.join(', ')})`);

  console.log('   ✓ Acceptance Test 1 Passed: Generated questions at all 3 levels and 3 coding questions with no further candidate input.');

  // Verify Acceptance Test 2: 4 different skills yield 4 distinct sets of questions
  const skillsWithQuestions = [...new Set(questions.map(q => q.skill.toLowerCase()))];
  console.log('   Skills with generated questions:', skillsWithQuestions);
  assert(
    skillsWithQuestions.length >= 4,
    `Acceptance Test 2: Expected at least 4 distinct skill sets, found ${skillsWithQuestions.length}`
  );
  // Ensure wording across different skills is distinct
  const questionTexts = new Set(questions.map(q => q.text));
  assert(
    questionTexts.size === questions.length,
    `All ${questions.length} generated questions have unique wording.`
  );
  console.log(`   ✓ Acceptance Test 2 Passed: ${skillsWithQuestions.length} skills yielded ${questions.length} distinct questions.`);

  // Verify Acceptance Test 3: Contradicted & Unverifiable claims
  const claims = detail.claims || [];
  const k8sClaim = claims.find(c => c.skill === 'kubernetes' || c.text.toLowerCase().includes('kubernetes'));
  const unverifiableClaim = claims.find(c => c.status === 'unverifiable');
  const supportedClaim = claims.find(c => c.status === 'supported');

  assert(k8sClaim, 'Found Kubernetes claim');
  assert(
    k8sClaim.status === 'contradicted',
    `Kubernetes claim status must be 'contradicted' (got: ${k8sClaim.status}, reason: ${k8sClaim.reason})`
  );
  assert(k8sClaim.evidence, 'Kubernetes claim has evidence/reason recorded');

  assert(unverifiableClaim, 'Found at least one unverifiable claim');
  assert(
    unverifiableClaim.reason.includes('Missing evidence is never treated as false') ||
    unverifiableClaim.reason.includes('No evidence found'),
    `Unverifiable reason states missing evidence is not false (got: "${unverifiableClaim.reason}")`
  );

  assert(supportedClaim, 'Found supported claim (JavaScript / Node.js matching sample repo)');
  assert(supportedClaim.evidence && supportedClaim.evidence !== 'None', 'Supported claim has repository evidence recorded');

  console.log('   ✓ Acceptance Test 3 Passed: 15-year Kubernetes claim is contradicted, missing evidence is unverifiable (never false), supported claim verified.');

  // ================================================================
  // ACCEPTANCE TEST 4:
  // Changing the dropdown converts the solution, and the same selection
  // is returned from cache the second time.
  // ================================================================
  console.log('\n>>> TESTING ACCEPTANCE TEST 4: Multilingual Conversion & Caching...');
  const firstCodingQ = codingQs[0];
  assert(firstCodingQ, 'Found coding question to test conversion');

  // Convert to Python first time (cache miss)
  const conv1Res = await fetch(`${BASE}/coding/${firstCodingQ.id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'Python' })
  });
  const conv1Data = await conv1Res.json();
  assert(conv1Data.code, 'Conversion to Python returned code');
  assert(conv1Data.cached === false, 'First conversion was computed via LLM (cached: false)');

  // Convert to Python second time (cache hit)
  const conv2Res = await fetch(`${BASE}/coding/${firstCodingQ.id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'Python' })
  });
  const conv2Data = await conv2Res.json();
  assert(conv2Data.code === conv1Data.code, 'Second conversion returned identical code');
  assert(conv2Data.cached === true, 'Second conversion was retrieved from DB cache (cached: true)');

  console.log('   ✓ Acceptance Test 4 Passed: Converted to Python on first call, returned from cache on second call.');

  // ================================================================
  // ACCEPTANCE TEST 5:
  // An invalid repo URL or an LLM failure shows 'failed' with a readable
  // message and does not crash the app.
  // ================================================================
  console.log('\n>>> TESTING ACCEPTANCE TEST 5: Invalid Repo URL Error Handling...');

  const badForm = new FormData();
  badForm.append('full_name', 'Bad Repo Candidate');
  badForm.append('email', 'bad@example.com');
  badForm.append('resume', new Blob(['2 years JavaScript developer'], { type: 'text/plain' }), 'bad_resume.txt');

  const badCandRes = await fetch(`${BASE}/candidates`, {
    method: 'POST',
    headers: authHeaders,
    body: badForm
  });
  const badCandData = await badCandRes.json();
  const badCid = badCandData.id;

  const badConsentReq = await fetch(`${BASE}/candidates/${badCid}/consent-request`, {
    method: 'POST',
    headers: authHeaders
  });
  const { token: badToken } = await badConsentReq.json();

  // Submit completely invalid / inaccessible repository URL
  await fetch(`${BASE}/consent/${badToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agree: true,
      repo_urls: ['https://github.com/definitely-non-existent-user-1234567/fake-repo-9999']
    })
  });

  // Wait for background job to catch the error and record failed status
  console.log('   Waiting for pipeline to handle invalid repo URL...');
  let badStatusData = null;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const sRes = await fetch(`${BASE}/candidates/${badCid}/status`);
    badStatusData = await sRes.json();
    if (badStatusData.status === 'failed') break;
  }

  assert(badStatusData.status === 'failed', `Status is 'failed' for invalid repo URL (got: ${badStatusData.status})`);
  assert(
    badStatusData.error_message && badStatusData.error_message.length > 5,
    `Readable error message is saved: "${badStatusData.error_message}"`
  );

  // App is still alive and operational
  const healthRes = await fetch(`${BASE}/health`);
  assert(healthRes.ok, 'Application did not crash and is healthy');

  console.log('   ✓ Acceptance Test 5 Passed: Invalid repo URL shows status="failed" with readable message and app did not crash.');

  console.log('\n====================================================');
  console.log('ALL ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runAcceptanceTests().catch(err => {
  console.error('\n❌ Acceptance Test Failed:', err);
  process.exit(1);
});
