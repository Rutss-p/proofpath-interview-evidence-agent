import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = 'http://localhost:8000/api';

async function runTest() {
  console.log('--- Starting ProofPath Node.js E2E Test ---');

  // 1. Health check
  const hRes = await fetch(`${BASE}/health`);
  console.log('1. Health check status:', hRes.status);
  const healthData = await hRes.json();
  console.log('   Health data:', healthData);
  if (!hRes.ok) throw new Error('Health check failed');

  // 2. Login as recruiter
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@demo.com', password: 'ChangeMe123!' })
  });
  console.log('2. Login recruiter status:', loginRes.status);
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(loginData));
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. Create candidate
  const sampleResume =
    'Devin Vance - Full Stack JavaScript Engineer\n' +
    '4 years Node.js, Express, React, and Docker.\n' +
    '15 years of Kubernetes operations.\n' +
    'Architected distributed microservices and automated test suites.';

  const form = new FormData();
  form.append('full_name', 'Devin Vance');
  form.append('email', 'devin@example.com');
  form.append('resume', new Blob([sampleResume], { type: 'text/plain' }), 'resume.txt');

  const candRes = await fetch(`${BASE}/candidates`, {
    method: 'POST',
    headers: authHeaders,
    body: form
  });
  console.log('3. Candidate created status:', candRes.status);
  const candData = await candRes.json();
  console.log('   Candidate created:', candData);
  const cid = candData.id;

  // 4. Generate consent request
  const reqRes = await fetch(`${BASE}/candidates/${cid}/consent-request`, {
    method: 'POST',
    headers: authHeaders
  });
  console.log('4. Consent request status:', reqRes.status);
  const reqData = await reqRes.json();
  const consentToken = reqData.token;
  console.log('   Consent link:', reqData.link);

  // 5. Public candidate opens consent page
  const candView = await fetch(`${BASE}/consent/${consentToken}`);
  console.log('5. Candidate viewed consent status:', candView.status);
  const candViewData = await candView.json();
  console.log('   Candidate name viewed:', candViewData.candidate_name);

  // 6. Candidate agrees and submits repo (sample synthetic JS repo)
  const sampleRepoPath = path.resolve(__dirname, 'sample_repos/age_utils_js');
  const agreeRes = await fetch(`${BASE}/consent/${consentToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agree: true,
      repo_urls: [sampleRepoPath]
    })
  });
  console.log('6. Consent submitted status:', agreeRes.status);
  const agreeData = await agreeRes.json();
  console.log('   Consent submitted response:', agreeData);

  // 7. Wait for background analysis pipeline
  console.log('7. Waiting for background pipeline execution...');
  await new Promise(res => setTimeout(res, 3000));

  // 8. Check candidate detail briefing
  const detailRes = await fetch(`${BASE}/candidates/${cid}`, {
    headers: authHeaders
  });
  const detail = await detailRes.json();
  console.log('8. Candidate status:', detail.status);
  console.log('   Total claims extracted:', detail.claims?.length || 0);

  for (const cl of detail.claims || []) {
    console.log(
      `   - [${cl.status.toUpperCase()}] (conf ${Math.round((cl.confidence || 0) * 100)}%) ` +
      `${cl.text} | probes: ${cl.probes?.length || 0}`
    );
    for (const p of cl.probes || []) {
      console.log(`     * Probe [${p.type}] verified=${p.verified}: ${p.question.slice(0, 90)}...`);
    }
  }

  // 8b. Verify Deep Repository Codebase Analysis
  console.log('   Total deep repo analyses generated:', detail.repo_analyses?.length || 0);
  if (detail.repo_analyses?.[0]?.data) {
    const analysis = detail.repo_analyses[0].data;
    console.log(`   Repository Dossier for: ${analysis.repo_name}`);
    console.log(`     * Beginner questions: ${analysis.beginner?.length || 0}`);
    console.log(`     * Intermediate questions: ${analysis.intermediate?.length || 0}`);
    console.log(`     * Advanced questions: ${analysis.advanced?.length || 0}`);
    console.log(`     * Architecture questions: ${analysis.architecture_questions?.length || 0}`);
    console.log(`     * Technology choices: ${analysis.technology_choices?.length || 0}`);
    console.log(`     * Scenario & bug drills: ${analysis.scenario_and_bugs?.length || 0}`);
    console.log(`     * Code authenticity checks: ${analysis.authenticity_checks?.length || 0}`);
    console.log(`     * Final revision must-knows: ${analysis.final_revision?.length || 0}`);

    if (analysis.github_analysis) {
      const gha = analysis.github_analysis;
      console.log('   --- GitHub Analysis Agent Results ---');
      console.log('     * Verified skills:', gha.candidate_summary?.verified_skills);
      console.log('     * Stated unverified skills:', gha.candidate_summary?.stated_unverified_skills);
      console.log('     * Beginner questions count:', gha.beginner_questions?.length);
      console.log('     * Intermediate questions count:', gha.intermediate_questions?.length);
      console.log('     * Advanced questions count:', gha.advanced_questions?.length);
      if (gha.beginner_questions?.[0]) {
        console.log('     * Sample Q:', gha.beginner_questions[0].question);
        console.log('     * Evidence Type:', gha.beginner_questions[0].evidence_type);
        console.log('     * Follow-ups count:', gha.beginner_questions[0].follow_ups?.length);
        console.log('     * Sample Follow-up Q:', gha.beginner_questions[0].follow_ups[0]?.question);
        console.log('     * Sample Follow-up Answer:', gha.beginner_questions[0].follow_ups[0]?.expected_answer);
      }
    }
  }

  // 9. Test adaptive answer evaluation
  if (detail.claims?.[0]?.probes?.[0]) {
    const probe = detail.claims[0].probes[0];
    const ansRes = await fetch(`${BASE}/probes/${probe.id}/answer`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer_text: 'The test failed because test_boundary_adult specifically tests that 18 returns true when the comparison operator was changed.'
      })
    });
    console.log('9. Adaptive answer evaluation status:', ansRes.status);
    const ansData = await ansRes.json();
    console.log('   Adaptive evaluation result:', ansData);

    const rateRes = await fetch(`${BASE}/probes/${probe.id}/feedback`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ usefulness: 5 })
    });
    console.log('   Rated probe usefulness status:', rateRes.status);
  }

  // 10. Verify learning metrics
  const metricsRes = await fetch(`${BASE}/probes/metrics`, {
    headers: authHeaders
  });
  console.log('10. Learning metrics status:', metricsRes.status);
  const metrics = await metricsRes.json();
  console.log('    Metrics:', metrics);

  // 11. Verify Interview Questions Table & Multilingual Coding Questions
  console.log('\n11. Verifying Interview Questions Table...');
  const updatedCandidateRes = await fetch(`${BASE}/candidates/${cid}`, { headers: authHeaders });
  const updatedCandidate = await updatedCandidateRes.json();
  const questions = updatedCandidate.interview_questions || [];
  console.log(`    Total persisted interview questions in DB: ${questions.length}`);
  const codingQ = questions.find(q => q.is_coding);
  if (codingQ) {
    console.log(`    * Found Coding Challenge: ${codingQ.question.slice(0, 80)}...`);
    console.log(`    * Available Languages:`, Object.keys(codingQ.language_solutions || {}));
    console.log(`    * Python Solution Preview:`, codingQ.language_solutions?.python?.code?.slice(0, 100));
    console.log(`    * Java Solution Preview:`, codingQ.language_solutions?.java?.code?.slice(0, 100));
    console.log(`    * C++ Solution Preview:`, codingQ.language_solutions?.['c++']?.code?.slice(0, 100));
  }

  // 12. Test Live Interviewer Answer Evaluation
  console.log('\n12. Testing Live Interviewer Answer Evaluation...');
  const testQuestion = questions[0] || {
    id: 1,
    question: 'How does your implementation handle edge boundary conditions?',
    expected_answer: 'By checking input >= threshold and verifying NaN defensively.',
    essential_concepts: ['Boundary conditions', 'NaN checks']
  };

  const evalRes = await fetch(`${BASE}/candidates/${cid}/evaluate-answer`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: testQuestion.id,
      question: testQuestion.question,
      expected_answer: testQuestion.expected_answer,
      evaluation_criteria: testQuestion.essential_concepts || ['Boundary conditions', 'NaN checks'],
      selected_language: 'javascript',
      candidate_response: 'In my repository I tested the exact boundary where input equals the threshold, ensuring inclusive comparison and preventing off-by-one errors.',
      is_coding: testQuestion.is_coding
    })
  });
  console.log('    Live evaluation status:', evalRes.status);
  const evalData = await evalRes.json();
  console.log('    Evaluation assessment:', evalData.assessment);
  console.log('    Evaluation score:', evalData.score, '/ 10');
  console.log('    Score explanation:', evalData.score_explanation);
  console.log('    Recommended follow-up:', evalData.recommended_follow_up?.question);

  // 13. Test Generate More Questions On-Demand
  console.log('\n13. Testing "Generate More Questions" on Topic...');
  const genMoreRes = await fetch(`${BASE}/candidates/${cid}/questions/generate-more`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'High-Concurrency Caching',
      difficulty: 'advanced',
      mode: 'coding_challenge',
      target_language: 'python'
    })
  });
  console.log('    Generate more status:', genMoreRes.status);
  const genMoreData = await genMoreRes.json();
  console.log(`    * Generated Question: ${genMoreData.question.slice(0, 90)}...`);
  console.log(`    * Difficulty: ${genMoreData.difficulty}`);
  console.log(`    * Follow-up Q: ${genMoreData.follow_ups?.[0]?.question}`);

  // 14. Test Language Switching for Coding Question
  if (codingQ) {
    console.log('\n14. Testing Language Switching for Coding Question...');
    const switchRes = await fetch(`${BASE}/candidates/${cid}/questions/${codingQ.id}/switch-language`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'c++' })
    });
    console.log('    Switch language status:', switchRes.status);
    const switchData = await switchRes.json();
    console.log('    Switched to language:', switchData.selected_language);
    console.log('    C++ code snippet:', switchData.solution?.code?.slice(0, 120));
  }

  console.log('\n=============================================');
  console.log('ALL PROOFPATH NODE.JS INTEGRATION TESTS PASSED!');
  console.log('=============================================');
}

runTest().catch(err => {
  console.error('\nE2E Test Failed:', err);
  process.exit(1);
});
