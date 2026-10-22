const TECH_RELEASE = {
  kubernetes: 2014,
  docker: 2013,
  react: 2013,
  'react.js': 2013,
  'react native': 2015,
  angular: 2016,
  vue: 2014,
  flutter: 2017,
  terraform: 2014,
  aws: 2006,
  azure: 2010,
  gcp: 2011,
  fastapi: 2018,
  pytorch: 2016,
  tensorflow: 2015,
  'spring boot': 2014,
  nodejs: 2009,
  node: 2009,
  'node.js': 2009,
  express: 2010,
  'express.js': 2010,
  typescript: 2012,
  nextjs: 2016,
  'next.js': 2016,
  rust: 2015,
  go: 2009,
  golang: 2009,
  graphql: 2015,
  tailwind: 2017,
  'tailwind css': 2017,
  'payload cms': 2021
};

function matchesSkill(skill, targetText) {
  if (!skill || !targetText) return false;
  const s = skill.toLowerCase().trim();
  const t = targetText.toLowerCase();

  // Direct substring
  if (t.includes(s) || s.includes(t)) return true;

  // Normalized alphanumeric (e.g. "next.js" -> "nextjs")
  const sClean = s.replace(/[\.\-\s_]/g, '');
  const tClean = t.replace(/[\.\-\s_]/g, '');
  if (tClean.includes(sClean) || sClean.includes(tClean)) return true;

  // Domain associations
  if (s.includes('next') && (t.includes('next') || t.includes('ssr'))) return true;
  if (s.includes('react native') && (t.includes('native') || t.includes('fitness'))) return true;
  if (s.includes('react') && (t.includes('react') || t.includes('redux') || t.includes('hook') || t.includes('jsx'))) return true;
  if (s.includes('express') && (t.includes('express') || t.includes('multer'))) return true;
  if (s.includes('node') && (t.includes('node') || t.includes('javascript') || t.includes('express') || t.includes('sequelize'))) return true;
  if ((s.includes('mysql') || s.includes('postgres') || s.includes('database')) && (t.includes('sequelize') || t.includes('sql') || t.includes('crud') || t.includes('database'))) return true;

  return false;
}

export function scoreClaim(claim, evidence = []) {
  const skill = (claim.skill || '').toLowerCase().trim();
  const thisYear = new Date().getUTCFullYear();

  // 1. Contradicted check: impossible years vs technology release date
  const cleanTech = skill.replace(/[\.\s_]/g, '');
  for (const [tech, year] of Object.entries(TECH_RELEASE)) {
    if (tech.replace(/[\.\s_]/g, '') === cleanTech || skill === tech) {
      const possible = thisYear - year;
      if (claim.years && claim.years > possible + 1) {
        const why = `${skill} was released in ${year}, so ${claim.years} years of experience is not possible (technology is only ~${possible} years old).`;
        return {
          status: 'contradicted',
          confidence: 0.95,
          reason: why,
          evidence: `Technology timeline violation: ${skill} public release in ${year}`
        };
      }
    }
  }

  // 2. Supported check: inspect repository evidence
  const matchedEvidence = [];
  for (const e of evidence) {
    const matchedParts = [];

    // Check languages
    const langObj = e.languages || {};
    const langKeys = Object.keys(langObj);
    if (e.language) langKeys.push(e.language);

    if (langKeys.some(l => matchesSkill(skill, l))) {
      matchedParts.push(`Language match (${e.language || Object.keys(langObj).slice(0, 3).join(', ')})`);
    }

    // Check topics
    const topics = e.topics || [];
    if (topics.some(t => matchesSkill(skill, String(t)))) {
      matchedParts.push(`Topics: [${topics.filter(t => matchesSkill(skill, String(t))).join(', ')}]`);
    }

    // Check description
    const desc = e.description || '';
    if (matchesSkill(skill, desc)) {
      matchedParts.push(`Repositories description match`);
    }

    // Check dependency files
    const deps = e.dependency_files || {};
    for (const [depFile, content] of Object.entries(deps)) {
      if (content && matchesSkill(skill, content)) {
        matchedParts.push(`Found in ${depFile}`);
      }
    }

    // Check file tree (including repository names in a profile)
    const fileTree = e.file_tree || [];
    const matchedFiles = fileTree.filter(f => matchesSkill(skill, f));
    if (matchedFiles.length > 0) {
      matchedParts.push(`Files/Repos: ${matchedFiles.slice(0, 3).join(', ')}`);
    }

    // Check README
    const readme = e.readme || '';
    if (matchesSkill(skill, readme)) {
      matchedParts.push(`README reference`);
    }

    if (matchedParts.length > 0) {
      matchedEvidence.push(`${e.repo || e.url}: ${matchedParts.join('; ')}`);
    }
  }

  if (matchedEvidence.length > 0) {
    const conf = Math.min(0.7 + 0.1 * matchedEvidence.length, 0.95);
    return {
      status: 'supported',
      confidence: conf,
      reason: `Claim is supported by evidence in ${matchedEvidence.length} repository source(s).`,
      evidence: matchedEvidence.join(' | ')
    };
  }

  // 3. Unverifiable check: no evidence found in shared repositories
  return {
    status: 'unverifiable',
    confidence: 0.5,
    reason: 'No evidence found in shared repositories. Missing evidence is never treated as false.',
    evidence: 'None'
  };
}
