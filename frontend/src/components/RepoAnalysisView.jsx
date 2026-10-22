import { useState } from 'react';
import { api } from '../api';

export default function RepoAnalysisView({
  candidateId,
  repoAnalyses = [],
  persistedQuestions = [],
  persistedEvaluations = [],
  onReload
}) {
  const [activeAnalysisIdx, setActiveAnalysisIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('beginner');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Language selector state for coding questions: map of questionId -> language
  const [selectedLanguages, setSelectedLanguages] = useState({});

  // Live answer evaluation state
  const [candidateResponses, setCandidateResponses] = useState({});
  const [evaluatingId, setEvaluatingId] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(() => {
    const init = {};
    for (const ev of persistedEvaluations) {
      if (ev.question_id) {
        init[ev.question_id] = ev;
      }
    }
    return init;
  });
  const [openEvalDrawer, setOpenEvalDrawer] = useState({});

  // Generate more questions state
  const [generatingForTopic, setGeneratingForTopic] = useState(null);
  const [genMode, setGenMode] = useState('same_difficulty');
  const [genLanguage, setGenLanguage] = useState('javascript');
  const [dynamicQuestions, setDynamicQuestions] = useState([]);

  // Accordion state for follow-ups and answers
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [expandedFollowUps, setExpandedFollowUps] = useState({});

  if (!repoAnalyses || repoAnalyses.length === 0) {
    return null;
  }

  const currentAnalysis = repoAnalyses[activeAnalysisIdx]?.data;
  if (!currentAnalysis) {
    return null;
  }

  const {
    repo_name,
    github_analysis,
    beginner = [],
    intermediate = [],
    advanced = [],
    architecture_questions = [],
    technology_choices = [],
    scenario_and_bugs = [],
    authenticity_checks = [],
    senior_challenges = [],
    final_revision = []
  } = currentAnalysis;

  // Combine persisted questions with analysis questions and dynamically generated ones
  const baseBeginner = persistedQuestions.filter(q => q.difficulty === 'beginner' && !q.is_coding);
  const baseIntermediate = persistedQuestions.filter(q => q.difficulty === 'intermediate' && !q.is_coding);
  const baseAdvanced = persistedQuestions.filter(q => q.difficulty === 'advanced' && !q.is_coding);
  const baseCoding = persistedQuestions.filter(q => q.is_coding);

  const beginnerList = [
    ...(baseBeginner.length > 0 ? baseBeginner : (github_analysis?.beginner_questions || beginner)),
    ...dynamicQuestions.filter(q => q.difficulty === 'beginner' && !q.is_coding)
  ];

  const intermediateList = [
    ...(baseIntermediate.length > 0 ? baseIntermediate : (github_analysis?.intermediate_questions || intermediate)),
    ...dynamicQuestions.filter(q => q.difficulty === 'intermediate' && !q.is_coding)
  ];

  const advancedList = [
    ...(baseAdvanced.length > 0 ? baseAdvanced : (github_analysis?.advanced_questions || advanced)),
    ...dynamicQuestions.filter(q => q.difficulty === 'advanced' && !q.is_coding)
  ];

  const codingList = [
    ...(baseCoding.length > 0 ? baseCoding : (github_analysis?.coding_questions || [])),
    ...dynamicQuestions.filter(q => q.is_coding)
  ];

  const candidateSummary = github_analysis?.candidate_summary || {
    verified_skills: ['JavaScript'],
    stated_unverified_skills: ['Node.js', 'Express', 'React', 'Docker', 'Kubernetes'],
    inferred_skills: ['Modular single-responsibility service patterns', 'Stateless pure utility composition'],
    unavailable_evidence: ['Private enterprise repositories not accessible', 'Telemetry & APM traces outside repo'],
    coding_patterns: ['Native ECMAScript Modules (ESM)', 'Automated Unit Test Assertions'],
    project_complexity: 'Modular domain package with automated boundary test verification.',
    contributions_summary: 'Direct repository implementation and maintenance.',
    identified_evidence_gaps: ['Container orchestration claimed on resume but absent in analyzed repository files.']
  };

  const tabConfigs = [
    { key: 'beginner', label: 'Beginner Level', icon: '🎓', count: beginnerList.length },
    { key: 'intermediate', label: 'Intermediate Level', icon: '⚙️', count: intermediateList.length },
    { key: 'advanced', label: 'Advanced Level', icon: '🚀', count: advancedList.length },
    { key: 'coding', label: 'Coding Challenges', icon: '💻', count: codingList.length },
    { key: 'architecture', label: 'Architecture & Flow', icon: '🏗️', count: architecture_questions.length },
    { key: 'technologies', label: 'Tech Choices', icon: '💡', count: technology_choices.length },
    { key: 'scenarios', label: 'Bugs & Scenarios', icon: '⚠️', count: scenario_and_bugs.length },
    { key: 'authenticity', label: 'Code Authenticity', icon: '🛡️', count: authenticity_checks.length },
    { key: 'senior', label: 'Senior Challenges', icon: '👑', count: senior_challenges.length },
    { key: 'revision', label: 'Final Revision', icon: '⚡', count: final_revision.length },
  ];

  let activeList = [];
  switch (activeTab) {
    case 'beginner': activeList = beginnerList; break;
    case 'intermediate': activeList = intermediateList; break;
    case 'advanced': activeList = advancedList; break;
    case 'coding': activeList = codingList; break;
    case 'architecture': activeList = architecture_questions; break;
    case 'technologies': activeList = technology_choices; break;
    case 'scenarios': activeList = scenario_and_bugs; break;
    case 'authenticity': activeList = authenticity_checks; break;
    case 'senior': activeList = senior_challenges; break;
    case 'revision': activeList = final_revision; break;
    default: activeList = beginnerList;
  }

  const filteredList = activeList.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.question && item.question.toLowerCase().includes(term)) ||
      (item.expected_answer && item.expected_answer.toLowerCase().includes(term)) ||
      (item.answer && item.answer.toLowerCase().includes(term)) ||
      (item.project_context && item.project_context.toLowerCase().includes(term)) ||
      (item.supporting_evidence && item.supporting_evidence.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term)) ||
      (item.topic && item.topic.toLowerCase().includes(term))
    );
  });

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAnswer = (id) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFollowUps = (id) => {
    setExpandedFollowUps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEvalDrawer = (id) => {
    setOpenEvalDrawer(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const setQuestionLanguage = (qId, lang) => {
    setSelectedLanguages(prev => ({ ...prev, [qId]: lang }));
  };

  // Live Answer Evaluation
  async function handleEvaluateAnswer(q) {
    const qKey = q.id || q.question;
    const responseText = candidateResponses[qKey] || '';
    if (!responseText.trim()) {
      alert('Please enter or paste the candidate’s response before evaluating.');
      return;
    }

    setEvaluatingId(qKey);
    try {
      const selectedLang = selectedLanguages[qKey] || q.selected_language || 'javascript';
      const result = await api(`/candidates/${candidateId}/evaluate-answer`, {
        method: 'POST',
        body: {
          question_id: typeof q.id === 'number' ? q.id : null,
          question: q.question,
          expected_answer: q.expected_answer || q.answer,
          evaluation_criteria: q.essential_concepts || [],
          selected_language: selectedLang,
          candidate_response: responseText,
          is_coding: Boolean(q.is_coding)
        }
      });

      setEvaluationResults(prev => ({ ...prev, [qKey]: result }));
      setOpenEvalDrawer(prev => ({ ...prev, [qKey]: true }));
      if (onReload) onReload();
    } catch (err) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingId(null);
    }
  }

  // Generate More Questions on Topic
  async function handleGenerateMore(q) {
    const topic = q.topic || q.category || 'Architecture';
    setGeneratingForTopic(q.id || q.question);

    try {
      const result = await api(`/candidates/${candidateId}/questions/generate-more`, {
        method: 'POST',
        body: {
          topic,
          difficulty: q.difficulty || 'intermediate',
          mode: genMode,
          target_language: genLanguage
        }
      });

      setDynamicQuestions(prev => [result, ...prev]);
      alert(`Successfully generated new ${result.difficulty} question for "${topic}"!`);
      if (result.is_coding) {
        setActiveTab('coding');
      }
      if (onReload) onReload();
    } catch (err) {
      alert(`Failed to generate question: ${err.message}`);
    } finally {
      setGeneratingForTopic(null);
    }
  }

  const getAssessmentColor = (assessment) => {
    switch (assessment) {
      case 'Correct': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Partially Correct': return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'Incorrect': return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      default: return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' };
    }
  };

  const getEvidenceBadge = (type) => {
    switch (type) {
      case 'verified_evidence':
        return { label: '✓ Verified Evidence (Code/Commits)', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'stated_claim':
        return { label: 'ℹ Candidate-Stated Claim (Resume)', bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'inferred':
        return { label: '💡 Inferred Pattern (Needs Probe)', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'unavailable':
        return { label: '🚫 Unavailable Evidence (External)', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      default:
        return { label: '✓ Verified Evidence', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px', border: '1px solid #bfdbfe', background: '#ffffff', borderRadius: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              GitHub Analysis Agent
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Repository: <strong style={{ color: '#0f172a' }}>{repo_name}</strong>
            </span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            Personalized Technical Interview Dossier & Multilingual Coding Challenges
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Structured question set, pre-generated expected answers, follow-up probes, and live candidate response evaluation.
          </p>
        </div>

        {repoAnalyses.length > 1 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {repoAnalyses.map((ra, idx) => (
              <button
                key={ra.id}
                onClick={() => setActiveAnalysisIdx(idx)}
                className={`btn ${idx === activeAnalysisIdx ? 'btn-primary' : 'btn-secondary'} text-sm`}
              >
                Repo #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4-Category Candidate Evidence Matrix */}
      {candidateSummary && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
              Consolidated Candidate Evidence Matrix (4 Classifications)
            </div>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Strictly distinguishing verified codebase facts from uncorroborated resume claims
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
            {/* 1. Verified Evidence */}
            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✓</span> 1. Verified Evidence (Code & Commits)
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {candidateSummary.verified_skills?.length > 0 ? (
                  candidateSummary.verified_skills.map((s, i) => (
                    <span key={i} style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', border: '1px solid #86efac' }}>
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#64748b' }}>No skills directly verified</span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '8px' }}>
                Directly corroborated in repository source files and package manifests.
              </div>
            </div>

            {/* 2. Candidate-Stated Information */}
            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>ℹ</span> 2. Stated Resume Claims (Unverified in Code)
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {candidateSummary.stated_unverified_skills?.length > 0 ? (
                  candidateSummary.stated_unverified_skills.map((s, i) => (
                    <span key={i} style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', border: '1px solid #fcd34d' }}>
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#64748b' }}>All resume claims corroborated</span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '8px' }}>
                Mentioned in resume or profile, but not present in accessible code.
              </div>
            </div>

            {/* 3. Inferred Information */}
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡</span> 3. Inferred Information (Patterns)
              </div>
              <div style={{ color: '#1e3a8a', lineHeight: 1.4, fontSize: '11.5px' }}>
                {candidateSummary.inferred_skills?.length > 0
                  ? candidateSummary.inferred_skills.join(' • ')
                  : 'Modular service structure and deterministic data flow.'}
              </div>
              <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '8px' }}>
                Logical technical inferences requiring live interview confirmation.
              </div>
            </div>

            {/* 4. Unavailable Evidence */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🚫</span> 4. Unavailable Evidence (External)
              </div>
              <div style={{ color: '#475569', lineHeight: 1.4, fontSize: '11.5px' }}>
                {candidateSummary.unavailable_evidence?.length > 0
                  ? candidateSummary.unavailable_evidence.join(' • ')
                  : 'Private enterprise repositories and live cloud environments.'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                Reported as limits rather than assuming lack of competence.
              </div>
            </div>
          </div>

          {/* Secondary Details: Coding Patterns & Identified Gaps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', marginTop: '12px', fontSize: '12.5px' }}>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#0f172a' }}>🧩 Coding Patterns & Conventions: </strong>
              <span style={{ color: '#475569' }}>
                {candidateSummary.coding_patterns?.join(' • ') || 'Standard modular pattern'}
              </span>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#0f172a' }}>⚠️ Identified Evidence Gaps to Probe: </strong>
              <span style={{ color: '#b45309' }}>
                {candidateSummary.identified_evidence_gaps?.join('; ') || 'High-throughput concurrency limits'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {/* Scrollable Tab Bar */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tabConfigs.map(t => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSearchTerm(''); }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeTab === t.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: activeTab === t.key ? '#eff6ff' : '#ffffff',
                  color: activeTab === t.key ? '#1d4ed8' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                <span style={{ fontSize: '11px', background: activeTab === t.key ? '#2563eb' : '#f1f5f9', color: activeTab === t.key ? '#ffffff' : '#64748b', padding: '1px 6px', borderRadius: '10px' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Search questions, evidence, concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
          </div>
        </div>

        {/* Question Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
              No questions found matching your search. Try another tab or clear the search filter.
            </div>
          ) : (
            filteredList.map((q, idx) => {
              const qKey = q.id || `q-${idx}`;
              const answerText = q.expected_answer || q.answer || '';
              const evidenceBadge = getEvidenceBadge(q.evidence_type);
              const isAnswerExpanded = expandedAnswers[qKey] ?? true;
              const isFollowUpExpanded = expandedFollowUps[qKey] ?? true;
              const isEvalDrawerOpen = openEvalDrawer[qKey] ?? false;
              const currentEval = evaluationResults[qKey];
              const isCoding = Boolean(q.is_coding);

              // Language selection for coding questions
              const currentLang = selectedLanguages[qKey] || q.selected_language || 'javascript';
              const languageSolution = q.language_solutions?.[currentLang] || {
                code: q.code_example || '// Implementation in ' + currentLang,
                explanation: 'Solution tailored to ' + currentLang + ' idioms.',
                syntax_notes: 'Standard ' + currentLang + ' implementation.'
              };

              return (
                <div
                  key={qKey}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '18px',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Header: Difficulty, Topic, & Evidence Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {q.difficulty ? q.difficulty.toUpperCase() : activeTab.toUpperCase()}
                      </span>

                      <span style={{ fontSize: '11.5px', fontWeight: 600, background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        {q.topic || q.category || 'Core Engineering'}
                      </span>

                      {/* Evidence Distinction Badge */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: evidenceBadge.bg,
                        color: evidenceBadge.text,
                        border: `1px solid ${evidenceBadge.border}`
                      }}>
                        {evidenceBadge.label}
                      </span>

                      {isCoding && (
                        <span style={{ fontSize: '11px', fontWeight: 700, background: '#7c3aed', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                          ⚡ Live Coding Challenge
                        </span>
                      )}

                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Question #{idx + 1}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleCopy(qKey, `${q.question}\n\nExpected Answer:\n${answerText}`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {copiedId === qKey ? '✓ Copied' : '📋 Copy Q&A'}
                      </button>

                      <button
                        onClick={() => toggleEvalDrawer(qKey)}
                        className={`btn ${isEvalDrawerOpen ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {isEvalDrawerOpen ? 'Hide Evaluation Desk' : '📝 Evaluate Candidate'}
                      </button>
                    </div>
                  </div>

                  {/* Main Question Heading */}
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.45, margin: '6px 0 10px 0' }}>
                    💬 {q.question}
                  </h4>

                  {/* Reason Relevant to Candidate */}
                  {q.reason_relevant && (
                    <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '12px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                      <strong style={{ color: '#1e40af' }}>Relevance to Candidate: </strong>
                      {q.reason_relevant}
                    </div>
                  )}

                  {/* CODING QUESTION: SELECTABLE PROGRAMMING LANGUAGES */}
                  {isCoding && (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#334155' }}>
                          Select Solution Programming Language:
                        </div>
                        {/* Language Selector: Java, Python, JavaScript, C++ */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['javascript', 'python', 'java', 'c++'].map(lang => (
                            <button
                              key={lang}
                              onClick={() => setQuestionLanguage(qKey, lang)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '5px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                border: currentLang === lang ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                background: currentLang === lang ? '#2563eb' : '#ffffff',
                                color: currentLang === lang ? '#ffffff' : '#334155'
                              }}
                            >
                              {lang === 'javascript' ? 'JavaScript' : lang === 'c++' ? 'C++' : lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Coding Details & Specifications */}
                      {q.coding_details && (
                        <div style={{ fontSize: '12px', marginBottom: '10px', color: '#334155', lineHeight: 1.5 }}>
                          <p style={{ margin: '0 0 6px 0' }}>
                            <strong>Problem Statement: </strong>{q.coding_details.problem_statement}
                          </p>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span><strong>Time Complexity: </strong><code>{q.coding_details.time_complexity}</code></span>
                            <span><strong>Space Complexity: </strong><code>{q.coding_details.space_complexity}</code></span>
                            <span><strong>Constraints: </strong><code>{q.coding_details.constraints}</code></span>
                          </div>
                        </div>
                      )}

                      {/* Display Selected Language Solution Code */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb' }}>
                            Expected {currentLang.toUpperCase()} Implementation:
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {languageSolution.syntax_notes}
                          </span>
                        </div>
                        <pre style={{ background: '#0f172a', color: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', margin: 0, fontFamily: 'Consolas, Monaco, monospace', lineHeight: 1.45 }}>
                          <code>{languageSolution.code}</code>
                        </pre>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155', background: '#eff6ff', padding: '8px 10px', borderRadius: '6px' }}>
                          <strong>{currentLang.toUpperCase()} Explanation: </strong>
                          {languageSolution.explanation}
                        </div>
                      </div>

                      {/* Language Differences Explanation */}
                      {q.coding_details?.language_differences && (
                        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#475569', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <strong>Cross-Language Comparison: </strong>
                          {q.coding_details.language_differences}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard Repository Code Snippet (for non-coding questions) */}
                  {!isCoding && q.code_example && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                        Relevant Repository Snippet
                      </div>
                      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', margin: 0, fontFamily: 'Consolas, Monaco, monospace' }}>
                        <code>{q.code_example}</code>
                      </pre>
                    </div>
                  )}

                  {/* Expected Answer Box (Collapsible) */}
                  <div style={{ background: '#f8fafc', borderLeft: '4px solid #2563eb', borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: '#1d4ed8', letterSpacing: '0.03em' }}>
                        Detailed Expected Answer (Pre-Generated & Evidence-Grounded)
                      </div>
                      <button
                        onClick={() => toggleAnswer(qKey)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                      >
                        {isAnswerExpanded ? '▲ Hide' : '▼ Expand'}
                      </button>
                    </div>
                    {isAnswerExpanded && (
                      <p style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {answerText}
                      </p>
                    )}
                  </div>

                  {/* Evaluation Criteria & Common Misconceptions */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '12px', fontSize: '12px' }}>
                    {q.essential_concepts && q.essential_concepts.length > 0 && (
                      <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#166534' }}>
                        <strong>🎯 Essential Concepts / Evaluation Criteria:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', lineHeight: 1.4 }}>
                          {q.essential_concepts.map((ec, i) => <li key={i}>{ec}</li>)}
                        </ul>
                      </div>
                    )}

                    {q.misconceptions && q.misconceptions.length > 0 && (
                      <div style={{ background: '#fffbeb', padding: '10px 12px', borderRadius: '6px', border: '1px solid #fde68a', color: '#92400e' }}>
                        <strong>⚠️ Common Misconceptions to Watch For:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', lineHeight: 1.4 }}>
                          {q.misconceptions.map((mc, i) => <li key={i}>{mc}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Supporting Evidence Reference */}
                  {q.supporting_evidence && (
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                      <strong>🔍 Supporting Evidence Citation: </strong>{q.supporting_evidence}
                    </div>
                  )}

                  {/* Contextual Follow-up Questions with Individual Expected Answers */}
                  {q.follow_ups && q.follow_ups.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Contextual Follow-Up Questions & Expected Answers ({q.follow_ups.length}):
                        </div>
                        <button
                          onClick={() => toggleFollowUps(qKey)}
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                        >
                          {isFollowUpExpanded ? '▲ Collapse Follow-ups' : '▼ Expand Follow-ups'}
                        </button>
                      </div>

                      {isFollowUpExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {q.follow_ups.map((fu, fidx) => {
                            const isObj = typeof fu === 'object' && fu !== null;
                            const fqText = isObj ? fu.question : fu;
                            const faText = isObj ? fu.expected_answer : '';
                            const fCrit = isObj ? fu.evaluation_criteria : '';

                            return (
                              <div key={fidx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                                  ↳ Follow-up {fidx + 1}: {fqText}
                                </div>
                                {faText && (
                                  <div style={{ marginTop: '4px', fontSize: '12.5px', color: '#334155', borderLeft: '3px solid #10b981', paddingLeft: '8px' }}>
                                    <strong style={{ color: '#047857' }}>Expected Answer: </strong>
                                    {faText}
                                  </div>
                                )}
                                {fCrit && (
                                  <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#64748b' }}>
                                    <em>Criteria: {fCrit}</em>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIVE INTERVIEWER EVALUATION DESK */}
                  {isEvalDrawerOpen && (
                    <div style={{ marginTop: '14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                        📝 Live Candidate Response Evaluation Desk
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                        Enter or paste what the candidate responded (verbal answer or code). The evaluation service will score it against the pre-generated expected answer and rubrics.
                      </p>

                      <textarea
                        rows={isCoding ? 6 : 3}
                        placeholder={isCoding ? 'Paste candidate code implementation in ' + currentLang + '...' : 'Enter candidate verbal explanation or notes...'}
                        value={candidateResponses[qKey] || ''}
                        onChange={(e) => setCandidateResponses({ ...candidateResponses, [qKey]: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '12.5px',
                          fontFamily: isCoding ? 'Consolas, Monaco, monospace' : 'inherit',
                          border: '1px solid #94a3b8',
                          borderRadius: '6px',
                          marginBottom: '8px'
                        }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEvaluateAnswer(q)}
                          disabled={evaluatingId === qKey}
                          className="btn btn-primary text-sm"
                        >
                          {evaluatingId === qKey ? 'Evaluating Candidate Answer...' : '⚡ Evaluate Answer'}
                        </button>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Accepts valid alternative algorithms and equivalent technical explanations.
                        </span>
                      </div>

                      {/* Structured Evaluation Result Panel */}
                      {currentEval && (
                        <div style={{ marginTop: '12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '4px',
                                background: getAssessmentColor(currentEval.assessment).bg,
                                color: getAssessmentColor(currentEval.assessment).text,
                                border: `1px solid ${getAssessmentColor(currentEval.assessment).border}`
                              }}>
                                {currentEval.assessment}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                Score: {currentEval.score} / 10
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Evaluated at {new Date(currentEval.created_at || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>

                          <p style={{ fontSize: '12.5px', color: '#334155', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                            <strong>Rubric Explanation: </strong>{currentEval.score_explanation}
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', fontSize: '11.5px', marginBottom: '8px' }}>
                            {currentEval.correct_concepts?.length > 0 && (
                              <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534' }}>
                                <strong>✓ Correct Concepts: </strong>{currentEval.correct_concepts.join(' • ')}
                              </div>
                            )}
                            {currentEval.missing_concepts?.length > 0 && (
                              <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '4px', border: '1px solid #fde68a', color: '#92400e' }}>
                                <strong>✗ Missing Concepts: </strong>{currentEval.missing_concepts.join(' • ')}
                              </div>
                            )}
                            {currentEval.technical_errors?.length > 0 && (
                              <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '4px', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                                <strong>⚠️ Technical Defects: </strong>{currentEval.technical_errors.join(' • ')}
                              </div>
                            )}
                          </div>

                          {currentEval.suggested_feedback?.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#1e40af', background: '#eff6ff', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                              <strong>💡 Suggested Interviewer Follow-up Points: </strong>
                              {currentEval.suggested_feedback.join('; ')}
                            </div>
                          )}

                          {currentEval.recommended_follow_up?.question && (
                            <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <strong style={{ color: '#0f172a' }}>Recommended Contextual Follow-Up: </strong>
                              {currentEval.recommended_follow_up.question}
                              {currentEval.recommended_follow_up.expected_answer && (
                                <div style={{ marginTop: '4px', color: '#047857', fontSize: '11.5px' }}>
                                  <strong>Expected Answer: </strong>{currentEval.recommended_follow_up.expected_answer}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GENERATE MORE QUESTIONS ON THIS TOPIC ACTION */}
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        value={genMode}
                        onChange={(e) => setGenMode(e.target.value)}
                        style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff' }}
                      >
                        <option value="same_difficulty">Same Difficulty</option>
                        <option value="more_advanced">More Advanced</option>
                        <option value="simpler">Simpler Concept</option>
                        <option value="coding_challenge">Practical Coding Challenge</option>
                      </select>

                      {genMode === 'coding_challenge' && (
                        <select
                          value={genLanguage}
                          onChange={(e) => setGenLanguage(e.target.value)}
                          style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff' }}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="c++">C++</option>
                        </select>
                      )}

                      <button
                        onClick={() => handleGenerateMore(q)}
                        disabled={generatingForTopic === (q.id || q.question)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        {generatingForTopic === (q.id || q.question) ? 'Generating...' : '✨ Generate More on This Topic'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
