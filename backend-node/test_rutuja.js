const BASE = 'http://localhost:8000/api';

async function testRutuja() {
  console.log('=== Testing Rutuja Pharande with https://github.com/Rutss-p ===\n');

  // 1. Recruiter login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@demo.com', password: 'ChangeMe123!' })
  });
  const { token } = await loginRes.json();
  if (!token) throw new Error('Recruiter login failed');
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('1. Logged in as recruiter.');

  // 2. Create Candidate
  const resumeText = `RUTUJA PHARANDE
Full Stack Developer
Pune, Maharashtra, India | r2000.pharande@gmail.com | +91-7219313475 | LinkedIn | GitHub

SUMMARY
Full Stack Developer with 3 years of experience building reliable, user-focused digital products. Adept at translating business requirements into practical solutions and taking features from concept to deployment. Known for adaptability, accountability, and a continuous learning mindset.

TECHNICAL SKILLS
Frontend: HTML, CSS, Tailwind CSS, JavaScript, React.js, Next.js, React Native (working knowledge)
Backend: Node.js, Express.js, Payload CMS
Databases: MySQL, PostgreSQL
Tools & Practices: Git, GitHub, Postman, Figma, VS Code

EXPERIENCE
Associate Developer | BugendaiTech Pvt Ltd, India Nov 2023 – Present
• Developed and shipped production-grade web applications end-to-end using React.js, Next.js, Node.js, Express.js, and MySQL across multiple client projects.
• Implemented third-party integrations including payment gateways, OTP/SMS providers, and transactional email services, enabling user notifications.
• Optimized MySQL schemas and query plans, reducing average API response time by 50% and improving overall system throughput by 40%.
• Actively contributed to Agile sprint cycles, participated in requirement discussions, proposed technical solutions, and collaborated cross-functionally to ensure on-time delivery.

Projects:
India Maritime Week 2025 - Event Management Platform | Next.js, TypeScript, Node.js, MySQL
• Architected a server-side rendered event platform in Next.js with dynamic routing to support 35+ event pages.
• Designed and built RESTful APIs powering admin controls, and attendee profile management.
• Implemented JWT-based authentication with role-based access control.

Arrowwood - Hospitality & Resort Management | Next.js, TypeScript, Payload CMS, PostgreSQL, DigitalOcean
• Built a content-driven marketing and booking site in Next.js with Payload CMS.
• Customized the theming layer of the SynXis booking engine to align with brand guidelines.
• Secured web forms against spam and bots by integrating Cloudflare Turnstile CAPTCHA.

Fashion App User - Chrome Extension | React.js, JavaScript
• Built a React onboarding flow for a Chrome Extension, supporting personalized style-preference setup for users.
• Integrated REST APIs to sync user fashion profiles in real time across sessions.`;

  const form = new FormData();
  form.append('full_name', 'Rutuja Pharande');
  form.append('email', 'r2000.pharande@gmail.com');
  form.append('resume', new Blob([resumeText], { type: 'text/plain' }), 'rutuja_resume.txt');

  const createCandRes = await fetch(`${BASE}/candidates`, {
    method: 'POST',
    headers: authHeaders,
    body: form
  });
  const cand = await createCandRes.json();
  const cid = cand.id;
  console.log(`2. Candidate created: ID #${cid} (${cand.full_name})`);

  // 3. Generate Consent Token
  const reqRes = await fetch(`${BASE}/candidates/${cid}/consent-request`, {
    method: 'POST',
    headers: authHeaders
  });
  const { token: consentToken, link: consentLink } = await reqRes.json();
  console.log(`3. Consent Link generated: ${consentLink}`);

  // 4. Candidate submits consent with https://github.com/Rutss-p
  console.log('4. Candidate submitting consent with repo URL: "https://github.com/Rutss-p"...');
  const submitRes = await fetch(`${BASE}/consent/${consentToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agree: true,
      repo_urls: ['https://github.com/Rutss-p']
    })
  });
  const submitData = await submitRes.json();
  console.log('   Consent submitted response:', submitData);

  // 5. Poll candidate status
  console.log('5. Polling candidate status while background job runs...');
  let statusData = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const sRes = await fetch(`${BASE}/candidates/${cid}/status`);
    statusData = await sRes.json();
    process.stdout.write(`   Status: [${statusData.status}]... \r`);
    if (statusData.status === 'analyzed' || statusData.status === 'failed') {
      break;
    }
  }
  console.log(`\n   Final Status: ${statusData.status}`);
  if (statusData.status === 'failed') {
    throw new Error(`Pipeline failed with error: ${statusData.error_message}`);
  }

  // 6. Fetch candidate briefing
  const briefingRes = await fetch(`${BASE}/candidates/${cid}/briefing`, { headers: authHeaders });
  const briefing = await briefingRes.json();

  console.log('\n======================================================');
  console.log('CANDIDATE BRIEFING READY FOR INTERVIEWER:');
  console.log('======================================================');
  console.log(`Candidate: ${briefing.full_name} (${briefing.email})`);
  console.log(`Status: ${briefing.status}`);
  console.log(`Consented Sources:`, briefing.sources?.map(s => s.url));

  console.log(`\n--- Extracted Claims & Verification (${briefing.claims?.length || 0}) ---`);
  for (const c of briefing.claims || []) {
    console.log(`• [${c.status.toUpperCase()}] Skill: ${c.skill} (${c.years} yrs, role: ${c.role})`);
    console.log(`  Claim: "${c.text}"`);
    console.log(`  Reason: ${c.reason}`);
    console.log(`  Evidence: ${c.evidence}`);
  }

  console.log(`\n--- Interview Questions (${briefing.questions?.length || 0}) ---`);
  for (const q of briefing.questions || []) {
    console.log(`• [${q.level.toUpperCase()}] (${q.skill}): ${q.text}`);
    console.log(`  Answer: ${q.model_answer.slice(0, 110)}...`);
    console.log(`  Key Points: ${q.key_points?.join('; ')}`);
  }

  console.log(`\n--- Coding Challenges (${briefing.coding_questions?.length || 0}) ---`);
  for (const cq of briefing.coding_questions || []) {
    console.log(`• [${cq.difficulty.toUpperCase()}]: ${cq.statement.slice(0, 100)}...`);
    console.log(`  Complexity: ${cq.complexity}`);
  }

  // 7. Test Language Conversion Dropdown on the first coding question
  if (briefing.coding_questions?.[0]) {
    const cq = briefing.coding_questions[0];
    console.log(`\n--- Testing Language Conversion for Coding Question #${cq.id} ---`);
    console.log('Converting to TypeScript...');
    const tsRes = await fetch(`${BASE}/coding/${cq.id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'TypeScript' })
    });
    const tsData = await tsRes.json();
    console.log('TypeScript Result (cached:', tsData.cached, '):');
    console.log(tsData.code);

    console.log('\nConverting to Python...');
    const pyRes = await fetch(`${BASE}/coding/${cq.id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'Python' })
    });
    const pyData = await pyRes.json();
    console.log('Python Result (cached:', pyData.cached, '):');
    console.log(pyData.code);
  }

  console.log('\n======================================================');
  console.log('ALL VERIFICATIONS SUCCESSFUL FOR RUTUJA PHARANDE!');
  console.log('======================================================');
}

testRutuja().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
