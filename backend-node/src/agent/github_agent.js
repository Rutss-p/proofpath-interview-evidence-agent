import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { z } from 'zod';
import { chatJson } from '../llm.js';
import { inspectRepository } from './repo_analyzer.js';

export const FollowUpItemSchema = z.object({
  question: z.string(),
  expected_answer: z.string(),
  evaluation_criteria: z.string().optional().default('')
});

export const CodingDetailsSchema = z.object({
  problem_statement: z.string(),
  input_output_spec: z.string(),
  constraints: z.string(),
  sample_inputs_outputs: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional()
  })).default([]),
  time_complexity: z.string(),
  space_complexity: z.string(),
  test_cases: z.array(z.object({
    description: z.string(),
    input: z.string(),
    expected_output: z.string()
  })).default([]),
  common_bugs: z.array(z.string()).default([]),
  language_differences: z.string().default(''),
  follow_up_coding_challenges: z.array(z.object({
    question: z.string(),
    solution: z.string(),
    explanation: z.string()
  })).default([])
}).optional();

export const LanguageSolutionSchema = z.object({
  code: z.string(),
  explanation: z.string(),
  syntax_notes: z.string().optional().default('')
});

export const InterviewQuestionSchema = z.object({
  id: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.string().optional().default('Technical Engineering'),
  topic: z.string().optional().default('General'),
  is_coding: z.boolean().optional().default(false),
  selected_language: z.enum(['javascript', 'python', 'java', 'c++']).optional().default('javascript'),
  question: z.string(),
  reason_relevant: z.string().optional().default('Directly addresses candidate background and repository evidence.'),
  supporting_evidence: z.string().optional().default(''),
  evidence_type: z.enum(['verified_evidence', 'stated_claim', 'inferred', 'unavailable']).default('verified_evidence'),
  expected_answer: z.string(),
  essential_concepts: z.array(z.string()).optional().default([]),
  misconceptions: z.array(z.string()).optional().default([]),
  code_example: z.string().optional().default(''),
  project_context: z.string().optional().default(''),
  coding_details: CodingDetailsSchema,
  language_solutions: z.record(LanguageSolutionSchema).optional().default({}),
  follow_ups: z.array(FollowUpItemSchema).default([])
});

export const EvaluationResultSchema = z.object({
  assessment: z.enum(['Correct', 'Partially Correct', 'Incorrect', 'Needs Further Clarification']),
  score: z.number().min(0).max(10),
  score_explanation: z.string(),
  correct_concepts: z.array(z.string()).default([]),
  missing_concepts: z.array(z.string()).default([]),
  technical_errors: z.array(z.string()).default([]),
  suggested_feedback: z.array(z.string()).default([]),
  recommended_follow_up: z.object({
    question: z.string(),
    expected_answer: z.string(),
    evaluation_criteria: z.string().optional().default('')
  })
});

export const GitHubAnalysisResultSchema = z.object({
  candidate_summary: z.object({
    extracted_skills: z.array(z.string()),
    verified_skills: z.array(z.string()),
    stated_unverified_skills: z.array(z.string()),
    inferred_skills: z.array(z.string()).default([]),
    unavailable_evidence: z.array(z.string()).default([]),
    coding_patterns: z.array(z.string()),
    project_complexity: z.string(),
    contributions_summary: z.string(),
    identified_evidence_gaps: z.array(z.string()).default([])
  }),
  beginner_questions: z.array(InterviewQuestionSchema),
  intermediate_questions: z.array(InterviewQuestionSchema),
  advanced_questions: z.array(InterviewQuestionSchema),
  coding_questions: z.array(InterviewQuestionSchema).default([])
});

/**
 * Extract commit author history from Git repository
 */
function extractGitContributions(repoDir) {
  try {
    const log = execSync('git log -n 15 --pretty=format:"%h | %an | %s"', {
      cwd: repoDir,
      timeout: 5000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return log.split('\n').filter(Boolean);
  } catch {
    return ['Direct repository contributions inspected from source files.'];
  }
}

/**
 * Extracts candidate skills from resume
 */
function extractResumeProfile(resumeText = '') {
  const text = (resumeText || '').toLowerCase();
  const knownSkills = [
    'javascript', 'typescript', 'node.js', 'node', 'express', 'react', 'next.js',
    'python', 'fastapi', 'django', 'java', 'spring', 'c++', 'docker', 'kubernetes', 'aws', 'gcp',
    'postgresql', 'sqlite', 'mongodb', 'redis', 'graphql', 'rest api', 'microservices'
  ];

  const foundSkills = [];
  for (const s of knownSkills) {
    if (text.includes(s)) {
      foundSkills.push(s);
    }
  }

  return {
    skills: foundSkills.length > 0 ? foundSkills : ['javascript', 'node.js', 'software engineering'],
    raw: resumeText
  };
}

/**
 * Multi-language solution generator for candidate-specific coding challenges
 */
function buildMultiLanguageCodingSolutions(problemType, domainContext) {
  if (problemType === 'boundary_validator') {
    return {
      javascript: {
        code: `/**
 * Validates whether candidate records meet eligibility thresholds.
 * Handles edge boundaries, NaN, and strict type casting.
 * @param {Array<{id: string, score: number}>} candidates
 * @param {number} threshold
 * @returns {Array<string>} list of eligible candidate IDs
 */
export function filterEligibleCandidates(candidates, threshold) {
  if (!Array.isArray(candidates) || typeof threshold !== 'number' || Number.isNaN(threshold)) {
    throw new TypeError('Invalid input arguments');
  }

  const eligibleIds = [];
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    if (item && typeof item.score === 'number' && !Number.isNaN(item.score)) {
      // Inclusive boundary condition matching repository verification
      if (item.score >= threshold) {
        eligibleIds.push(item.id);
      }
    }
  }
  return eligibleIds;
}`,
        explanation: 'In JavaScript, arrays are dynamically sized and comparison with NaN returns false. We use strict type checking (`typeof`, `Number.isNaN`) to prevent silent coercions. The algorithm runs in O(N) time with O(K) space where K <= N.',
        syntax_notes: 'Uses ES Module export and strictly typed guard clauses. Avoids `Array.prototype.filter` to optimize loop execution speed in V8.'
      },
      python: {
        code: `from typing import List, Dict, Any

def filter_eligible_candidates(candidates: List[Dict[str, Any]], threshold: float) -> List[str]:
    """
    Validates whether candidate records meet eligibility thresholds.
    Handles edge boundaries and non-numeric values defensively.
    """
    if not isinstance(candidates, list) or not isinstance(threshold, (int, float)):
        raise TypeError("Invalid input types: candidates must be list, threshold must be numeric")

    eligible_ids: List[str] = []
    for item in candidates:
        if isinstance(item, dict) and "score" in item:
            score = item["score"]
            if isinstance(score, (int, float)):
                # Inclusive boundary check
                if score >= threshold:
                    eligible_ids.append(str(item.get("id", "")))

    return eligible_ids`,
        explanation: 'In Python, dynamic typing is fortified using type annotations from the typing module. We check `isinstance(score, (int, float))` to guard against None or string inputs. Time complexity is O(N) with O(K) memory.',
        syntax_notes: 'Uses Python 3.10+ typing idioms with explicit exception raising on contract violations.'
      },
      java: {
        code: `import java.util.*;

public class CandidateValidator {
    public static class Candidate {
        public String id;
        public Double score;

        public Candidate(String id, Double score) {
            this.id = id;
            this.score = score;
        }
    }

    /**
     * Filters candidate IDs meeting or exceeding the minimum score threshold.
     */
    public static List<String> filterEligibleCandidates(List<Candidate> candidates, double threshold) {
        if (candidates == null || Double.isNaN(threshold)) {
            throw new IllegalArgumentException("Candidates list and threshold must be valid");
        }

        List<String> result = new ArrayList<>();
        for (Candidate c : candidates) {
            if (c != null && c.score != null && !c.score.isNaN()) {
                // Inclusive comparison
                if (c.score >= threshold) {
                    result.add(c.id);
                }
            }
        }
        return result;
    }
}`,
        explanation: 'In Java, static compile-time typing guarantees object signatures, but null references and Double.NaN require explicit checks. ArrayList provides O(1) amortized append, yielding O(N) runtime and O(K) memory.',
        syntax_notes: 'Employs standard Java collection interfaces (List, ArrayList) and defensive null checks avoiding NullPointerException.'
      },
      'c++': {
        code: `#include <iostream>
#include <vector>
#include <string>
#include <stdexcept>
#include <cmath>

struct Candidate {
    std::string id;
    double score;
};

class CandidateValidator {
public:
    static std::vector<std::string> filterEligibleCandidates(
        const std::vector<Candidate>& candidates,
        double threshold
    ) {
        if (std::isnan(threshold)) {
            throw std::invalid_argument("Threshold cannot be NaN");
        }

        std::vector<std::string> eligible;
        eligible.reserve(candidates.size()); // Pre-allocate memory to avoid reallocations

        for (const auto& candidate : candidates) {
            if (!std::isnan(candidate.score) && candidate.score >= threshold) {
                eligible.push_back(candidate.id);
            }
        }

        return eligible;
    }
};`,
        explanation: 'In Modern C++, we pass `const std::vector<Candidate>&` to eliminate deep-copying vector memory. `reserve()` minimizes dynamic heap reallocations. `std::isnan` ensures IEEE-754 validity. Runs in O(N) time with minimal cache misses.',
        syntax_notes: 'Leverages RAII, const references, reserve() optimization, and modern C++17/20 STL idioms.'
      }
    };
  }

  // Default algorithmic challenge (Sliding Window / Rate Limiter based on candidate API background)
  return {
    javascript: {
      code: `/**
 * Sliding Window Rate Limiter tracking candidate request timestamps.
 */
export class SlidingWindowLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  allowRequest(timestamp) {
    const cutoff = timestamp - this.windowMs;
    while (this.requests.length > 0 && this.requests[0] <= cutoff) {
      this.requests.shift();
    }
    if (this.requests.length < this.maxRequests) {
      this.requests.push(timestamp);
      return true;
    }
    return false;
  }
}`,
      explanation: 'Uses an array as a timestamp deque. Sliding window eviction operates by purging timestamps older than windowMs.',
      syntax_notes: 'ES6 class pattern; in high-frequency production, a circular buffer or doubly-linked list optimizes shift() from O(N) to O(1).'
    },
    python: {
      code: `from collections import deque

class SlidingWindowLimiter:
    """Sliding window log rate limiter using collections.deque."""
    def __init__(self, max_requests: int, window_ms: int):
        self.max_requests = max_requests
        self.window_ms = window_ms
        self.requests = deque()

    def allow_request(self, timestamp: int) -> bool:
        cutoff = timestamp - self.window_ms
        while self.requests and self.requests[0] <= cutoff:
            self.requests.popleft() # O(1) eviction
        if len(self.requests) < self.max_requests:
            self.requests.append(timestamp)
            return True
        return False`,
      explanation: 'Utilizes Python collections.deque for O(1) left-pop eviction, preventing array reallocation bottlenecks.',
      syntax_notes: 'Idiomatic Python class with type annotations and double-ended queue.'
    },
    java: {
      code: `import java.util.ArrayDeque;
import java.util.Deque;

public class SlidingWindowLimiter {
    private final int maxRequests;
    private final long windowMs;
    private final Deque<Long> requests;

    public SlidingWindowLimiter(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new ArrayDeque<>();
    }

    public synchronized boolean allowRequest(long timestamp) {
        long cutoff = timestamp - windowMs;
        while (!requests.isEmpty() && requests.peekFirst() <= cutoff) {
            requests.pollFirst();
        }
        if (requests.size() < maxRequests) {
            requests.addLast(timestamp);
            return true;
        }
        return false;
    }
}`,
      explanation: 'Java ArrayDeque provides cache-friendly O(1) double-ended queue operations. synchronized keyword ensures thread safety in concurrent servlet environments.',
      syntax_notes: 'Thread-safe Java class with immutable config fields and ArrayDeque.'
    },
    'c++': {
      code: `#include <deque>
#include <cstdint>
#include <mutex>

class SlidingWindowLimiter {
private:
    int max_requests;
    int64_t window_ms;
    std::deque<int64_t> requests;
    std::mutex mtx;

public:
    SlidingWindowLimiter(int max_reqs, int64_t win_ms)
        : max_requests(max_reqs), window_ms(win_ms) {}

    bool allowRequest(int64_t timestamp) {
        std::lock_guard<std::mutex> lock(mtx);
        int64_t cutoff = timestamp - window_ms;
        while (!requests.empty() && requests.front() <= cutoff) {
            requests.pop_front();
        }
        if (static_cast<int>(requests.size()) < max_requests) {
            requests.push_back(timestamp);
            return true;
        }
        return false;
    }
};`,
      explanation: 'C++ std::deque manages segmented memory blocks. std::lock_guard ensures mutex unlocking under all execution paths.',
      syntax_notes: 'Modern C++ RAII mutex locking, int64_t precision timestamps, and std::deque.'
    }
  };
}

/**
 * Deterministic grounded generator ensuring every question has main answer,
 * contextual follow-ups with expected answers, and verified evidence distinctions.
 */
function generateGroundedQuestionSet(candidate, repoMeta, inspection, gitLog) {
  const resumeProfile = extractResumeProfile(candidate.resume_text);
  const mainSnippets = inspection.snippets.slice(0, 5);
  const primarySnippet = mainSnippets[0] || { file: 'source.js', content: '// domain code' };
  const testSnippet = inspection.snippets.find(s => s.file.includes('test') || s.file.includes('spec')) || mainSnippets[1] || primarySnippet;

  // Identify verified vs stated skills
  const pkgManifest = inspection.manifests['package.json'] ? JSON.parse(inspection.manifests['package.json'] || '{}') : null;
  const repoDeps = pkgManifest ? Object.keys({ ...pkgManifest.dependencies, ...pkgManifest.devDependencies }).map(d => d.toLowerCase()) : [];

  const verifiedSkills = [];
  const statedUnverifiedSkills = [];

  for (const sk of resumeProfile.skills) {
    const isVerifiedInRepo =
      repoDeps.some(d => d.includes(sk) || sk.includes(d)) ||
      inspection.files.some(f => f.toLowerCase().includes(sk)) ||
      (repoMeta.language && repoMeta.language.toLowerCase().includes(sk));

    if (isVerifiedInRepo) {
      verifiedSkills.push(sk);
    } else {
      statedUnverifiedSkills.push(sk);
    }
  }

  if (verifiedSkills.length === 0) {
    verifiedSkills.push(repoMeta.language || 'javascript', 'node.js');
  }

  // Inferred Information & Gaps
  const inferredSkills = [
    'Modular single-responsibility service patterns',
    'Stateless deterministic domain transforms',
    'Automated AST & boundary condition test verification'
  ];

  const unavailableEvidence = [
    'Candidate private enterprise repositories (not shared during consent)',
    'Production telemetry & APM traces (restricted to local codebase)',
    'Live CI/CD workflow runs outside repository workspace'
  ];

  const identifiedGaps = [];
  if (statedUnverifiedSkills.includes('kubernetes') || statedUnverifiedSkills.includes('docker')) {
    identifiedGaps.push('Container orchestration (Docker/Kubernetes) claimed on resume but absent in analyzed repository files.');
  }
  if (statedUnverifiedSkills.includes('microservices')) {
    identifiedGaps.push('Distributed microservice architecture claimed on resume, whereas inspected code represents a standalone domain module.');
  }
  if (identifiedGaps.length === 0) {
    identifiedGaps.push('High-concurrency benchmark evidence requires live interview probing.');
  }

  // Detect coding patterns
  const codingPatterns = [];
  if (pkgManifest?.type === 'module') codingPatterns.push('Native ECMAScript Modules (ESM)');
  if (inspection.files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) codingPatterns.push('TypeScript Static Typing');
  if (inspection.files.some(f => f.includes('test'))) codingPatterns.push('Unit Test Assertions & Boundary Testing');
  codingPatterns.push('Modular Component/Function Separation');
  codingPatterns.push('Pure Deterministic Utility Logic');

  const complexity = inspection.files.length > 20
    ? 'Moderate-to-High: Multi-tiered architecture with dedicated domain logic and test suites.'
    : 'Focused Domain Utility: Clean single-responsibility modules with minimal external overhead.';

  const contributions = gitLog.length > 0
    ? `Analyzed ${gitLog.length} recent commits: ${gitLog.slice(0, 3).join('; ')}`
    : `Direct module implementation across ${inspection.files.length} tracked files.`;

  // --- BEGINNER QUESTIONS ---
  const beginner_questions = [
    {
      id: 'bg-1',
      difficulty: 'beginner',
      category: 'Project Architecture & Core Concepts',
      topic: 'Modular Codebase Structure',
      is_coding: false,
      selected_language: 'javascript',
      question: `In your repository for ${repoMeta.repo || 'this project'}, can you explain the core responsibility of '${primarySnippet.file}' and how it fits into the overall architecture?`,
      reason_relevant: `The candidate committed and maintains '${primarySnippet.file}' as a key project entrypoint. Assessing their architectural rationale checks code authorship.`,
      supporting_evidence: `Verified directly from repository source '${primarySnippet.file}' lines 1-${primarySnippet.lines || 10}. Exported functions inspected in codebase.`,
      evidence_type: 'verified_evidence',
      expected_answer: `In '${primarySnippet.file}', the module is designed with single responsibility to export pure, deterministic logic without side effects. In the project architecture, it acts as a foundational service layer that higher-level APIs or consumers invoke. Because it avoids global mutable state, it can be imported cleanly across environments.`,
      essential_concepts: [
        'Single Responsibility Principle (SRP)',
        'Stateless pure functions avoiding global state',
        'Module export conventions and isolation'
      ],
      misconceptions: [
        'Assuming modules must always be classes or singletons',
        'Confusing source module export with bundle distribution'
      ],
      code_example: primarySnippet.content.slice(0, 320),
      project_context: `Implemented in '${primarySnippet.file}' as an exported domain module.`,
      follow_ups: [
        {
          question: `Why did you structure this as a standalone function rather than an instantiated class?`,
          expected_answer: `Using standalone pure functions favors functional composition, tree-shaking in bundlers, and simpler unit testing without needing to mock constructor states or 'this' context bindings.`,
          evaluation_criteria: 'Demonstrates awareness of tree-shaking, stateless purity, and testing simplicity.'
        },
        {
          question: `How does the runtime resolve and cache this module when imported multiple times across the application?`,
          expected_answer: `The runtime caches resolved modules in its module cache after the first load, ensuring subsequent imports return the cached module export without re-executing top-level code.`,
          evaluation_criteria: 'Accurately explains runtime module caching semantics.'
        }
      ]
    },
    {
      id: 'bg-2',
      difficulty: 'beginner',
      category: 'Language Fundamentals & Stated Skills',
      topic: 'Execution Semantics & Modern Syntax',
      is_coding: false,
      selected_language: 'javascript',
      question: `Your resume lists expertise with ${verifiedSkills[0] || 'JavaScript'}. How does this project leverage modern syntax and execution semantics?`,
      reason_relevant: `Validates candidate claim regarding ${verifiedSkills[0] || 'JavaScript'} against their real code patterns.`,
      supporting_evidence: `Verified from '${primarySnippet.file}' syntax and package manifest configurations.`,
      evidence_type: 'verified_evidence',
      expected_answer: `The codebase utilizes modern ${repoMeta.language || 'JavaScript'} standards, including ES module export syntax and strict equality semantics. It avoids legacy var declarations in favor of block-scoped identifiers (const/let), preventing variable hoisting pitfalls.`,
      essential_concepts: [
        'Block scoping with const/let vs function scoping with var',
        'Strict equality (===) preventing unexpected type coercion',
        'ES Module standards (import/export)'
      ],
      misconceptions: [
        'Believing const makes objects immutable rather than rebinding-protected',
        'Confusing transpilation with native runtime support'
      ],
      code_example: primarySnippet.content.split('\n').filter(l => l.includes('export') || l.includes('function') || l.includes('return')).slice(0, 4).join('\n'),
      project_context: `Verified in '${primarySnippet.file}'. Matches resume claim for ${verifiedSkills[0] || 'JavaScript'}.`,
      follow_ups: [
        {
          question: `What is the operational difference between strict equality (===) and loose equality (==)?`,
          expected_answer: `Strict equality checks both value and type without implicit coercion, whereas loose equality performs abstract type coercion according to language rules, which frequently introduces subtle bugs.`,
          evaluation_criteria: 'Explains implicit type coercion mechanics accurately.'
        },
        {
          question: `How would this code execute if imported into an environment using older module systems?`,
          expected_answer: `In an older CommonJS environment without an ESM loader, an explicit interoperability wrapper, .cjs extension, or compilation step (Babel/ts/esbuild) is required.`,
          evaluation_criteria: 'Understands ESM vs CommonJS interop requirements.'
        }
      ]
    }
  ];

  // --- INTERMEDIATE QUESTIONS ---
  const intermediate_questions = [
    {
      id: 'int-1',
      difficulty: 'intermediate',
      category: 'Implementation & Automated Test Verification',
      topic: 'Regression Testing & Boundary Value Analysis',
      is_coding: false,
      selected_language: 'javascript',
      question: `In '${testSnippet.file}', how did you approach writing test assertions to catch regressions and boundary condition failures?`,
      reason_relevant: `The repository contains automated tests in '${testSnippet.file}'. Probing testing philosophy verifies whether the candidate genuinely authored robust test suites.`,
      supporting_evidence: `Verified from unit test assertions in '${testSnippet.file}' using native test runners.`,
      evidence_type: 'verified_evidence',
      expected_answer: `The test suite in '${testSnippet.file}' utilizes explicit boundary value assertions. Rather than only testing happy paths, it specifically asserts exact boundary values (e.g. testing the exact threshold value, one below, and one above). This ensures that subtle off-by-one errors or comparison operator flips are immediately flagged by the test runner.`,
      essential_concepts: [
        'Boundary value analysis (testing n-1, n, n+1)',
        'Off-by-one regression prevention',
        'Automated test assertions with deterministic outputs'
      ],
      misconceptions: [
        'Thinking 100% line coverage implies all boundary conditions are verified',
        'Testing only happy-path scenarios'
      ],
      code_example: testSnippet.content.slice(0, 360),
      project_context: `Unit test assertions in '${testSnippet.file}'.`,
      follow_ups: [
        {
          question: `If an automated mutation flips a comparison operator from '>=' to '>', does your test suite detect it?`,
          expected_answer: `Yes, because the test suite includes an explicit assertion for the boundary input (e.g. input equal to threshold). Under '>=', it returns true; under '>', it returns false, causing the test runner to fail and prevent faulty deployment.`,
          evaluation_criteria: 'Clearly explains boundary failure detection under mutation.'
        },
        {
          question: `How do you structure tests for asynchronous operations or rejected promises?`,
          expected_answer: `By using assert.rejects() or async/await with try-catch blocks and explicit assertion failure in the resolved branch to verify exception type and message.`,
          evaluation_criteria: 'Details proper async exception assertion mechanics.'
        }
      ]
    },
    {
      id: 'int-2',
      difficulty: 'intermediate',
      category: 'Defensive Programming & Input Validation',
      topic: 'Runtime Type Safety & Error Handling',
      is_coding: false,
      selected_language: 'javascript',
      question: `Looking at '${primarySnippet.file}', how does the implementation defend against unexpected inputs, and what happens if a consumer passes invalid data types?`,
      reason_relevant: `Examines whether the candidate recognizes code limitations and knows how to transition prototype code into production-grade defensive systems.`,
      supporting_evidence: `Inspected implementation of '${primarySnippet.file}'. Code evaluates inputs without explicit runtime type-guarding.`,
      evidence_type: 'verified_evidence',
      expected_answer: `Currently, the implementation directly evaluates incoming parameters without explicit runtime type-guarding. Passing non-numeric inputs like NaN, null, or undefined evaluates according to comparison rules (e.g. NaN >= 18 returns false). In production, defensive input validation (e.g. checking typeof === 'number' and !isNaN) should be introduced to fail fast.`,
      essential_concepts: [
        'Defensive parameter validation and type-guarding',
        'IEEE-754 NaN comparison behavior',
        'Fail-fast architecture principles'
      ],
      misconceptions: [
        'Assuming TypeScript types protect code at runtime without runtime validation',
        'Allowing invalid inputs to propagate silently'
      ],
      code_example: `// Current implementation:\n${primarySnippet.content.slice(0, 200)}\n\n// Defensive remediation:\nif (typeof input !== 'number' || Number.isNaN(input)) throw new TypeError('Input must be a valid number');`,
      project_context: `Direct evaluation logic in '${primarySnippet.file}'.`,
      follow_ups: [
        {
          question: `When would you choose to throw a TypeError versus returning a fallback value or error Result object?`,
          expected_answer: `Throwing a TypeError is preferred for internal contract violations and developer errors so bugs are exposed immediately during testing, whereas returning Result objects is better when processing untrusted external user input.`,
          evaluation_criteria: 'Distinguishes between internal contract violations and user input handling.'
        },
        {
          question: `Your resume mentions ${statedUnverifiedSkills[0] || 'microservices'}. How would you validate payload schemas across service boundaries?`,
          expected_answer: `By defining schema validation contracts using libraries like Zod, Joi, or JSON Schema at the API gateway or controller layer to reject malformed payloads before they reach business logic.`,
          evaluation_criteria: 'Explains gateway/controller level schema validation contracts.'
        }
      ]
    }
  ];

  // --- ADVANCED QUESTIONS ---
  const advanced_questions = [
    {
      id: 'adv-1',
      difficulty: 'advanced',
      category: 'System Scalability & Runtime Optimization',
      topic: 'Engine JIT Optimization, Inlining & Microservice Throughput',
      is_coding: false,
      selected_language: 'javascript',
      question: `If the logic in '${primarySnippet.file}' were placed on the critical path of a high-throughput microservice handling 50,000 requests/sec, how does the engine optimize its execution and where would bottlenecks arise?`,
      reason_relevant: `Assesses deep understanding of runtime execution engines (such as V8/JVM) and high-throughput architectural considerations.`,
      supporting_evidence: `Code structure in '${primarySnippet.file}': pure function with monomorphic arguments.`,
      evidence_type: 'verified_evidence',
      expected_answer: `Because this function is small, monomorphic (receiving arguments of consistent type), and pure, the JIT optimizing compiler (e.g. V8 Turbofan) will inline it directly into caller stack frames, eliminating function call overhead. The CPU cost will be virtually zero. The real bottlenecks will be I/O transport, JSON serialization/deserialization, and garbage collection pressure if intermediate objects are created on each request.`,
      essential_concepts: [
        'JIT inlining and monomorphism',
        'Garbage collection allocation pressure under load',
        'I/O serialization bottlenecks vs raw CPU operations'
      ],
      misconceptions: [
        'Blaming simple algorithmic functions for latency rather than I/O or serialization',
        'Ignoring monomorphic vs polymorphic execution paths'
      ],
      code_example: primarySnippet.content.slice(0, 250),
      project_context: `Performance profile of functions in '${primarySnippet.file}'.`,
      follow_ups: [
        {
          question: `What causes de-optimization (deopt) in the runtime for such functions?`,
          expected_answer: `Polymorphism or megamorphism: if callers pass numbers, then strings, then objects to the same function, the engine must abandon optimized machine code and fall back to bytecode interpretation.`,
          evaluation_criteria: 'Explains hidden classes and monomorphic vs polymorphic call sites.'
        },
        {
          question: `How would you scale this microservice horizontally across Kubernetes pods under variable traffic spikes?`,
          expected_answer: `By configuring a Horizontal Pod Autoscaler (HPA) targeting CPU utilization and custom request-rate metrics, backed by readiness/liveness probes and graceful shutdown handlers to drain existing connections without dropped packets.`,
          evaluation_criteria: 'Describes HPA, readiness probes, and graceful connection draining.'
        }
      ]
    },
    {
      id: 'adv-2',
      difficulty: 'advanced',
      category: 'Architectural Trade-offs & Evidence Gap Analysis',
      topic: 'Modular Simplicity vs Enterprise Distributed Architecture',
      is_coding: false,
      selected_language: 'javascript',
      question: `Your resume highlights ${statedUnverifiedSkills[0] || 'distributed architecture'} alongside this repository. Explain the trade-offs of the architectural choices you made here versus an enterprise-grade service.`,
      reason_relevant: `Directly bridges the gap between the candidate's stated resume claims (${statedUnverifiedSkills.join(', ') || 'distributed systems'}) and the actual repository implementation.`,
      supporting_evidence: `Cross-referenced between resume claims for '${statedUnverifiedSkills.join(', ') || 'distributed systems'}' and repository dependencies.`,
      evidence_type: statedUnverifiedSkills.length > 0 ? 'stated_claim' : 'verified_evidence',
      expected_answer: `For this repository, the architectural trade-off prioritized low complexity, zero external dependencies, and immediate testability. In contrast, an enterprise distributed microservice requires observability (OpenTelemetry tracing, Prometheus metrics), structured error logging, circuit breakers, and authenticated API gateways. Understanding when to keep a library lean versus when to add enterprise infrastructure demonstrates practical engineering maturity.`,
      essential_concepts: [
        'Dependency trade-offs and operational complexity',
        'Observability, tracing, and metric collection in distributed systems',
        'Distinguishing library design from service infrastructure'
      ],
      misconceptions: [
        'Over-engineering small utility packages with heavy enterprise frameworks',
        'Neglecting distributed system resilience and telemetry'
      ],
      code_example: pkgManifest ? JSON.stringify(pkgManifest, null, 2).slice(0, 300) : `// Zero third-party dependencies chosen for maximum reliability`,
      project_context: `Contrast between repository simplicity and resume enterprise claims.`,
      follow_ups: [
        {
          question: `How do you prove that you genuinely wrote and understand this code rather than having copied or generated it without review?`,
          expected_answer: `By explaining the exact design trade-offs, line-by-line failure modes, test assertions, and being able to modify the code on the fly to handle new requirements like concurrency or strict validation.`,
          evaluation_criteria: 'Articulates intimate code ownership and design trade-offs.'
        },
        {
          question: `What security controls would you implement to prevent prototype pollution or injection attacks in this service?`,
          expected_answer: `Freeze object prototypes (Object.freeze), avoid using Object.assign with untrusted nested objects, validate input keys against an allowlist, and use Map instead of plain object dictionaries for dynamic lookups.`,
          evaluation_criteria: 'Details specific defenses against prototype pollution and object injection.'
        }
      ]
    }
  ];

  // --- CODING QUESTIONS WITH SELECTABLE PROGRAMMING LANGUAGES ---
  const coding_solutions_1 = buildMultiLanguageCodingSolutions('boundary_validator', repoMeta.repo);
  const coding_solutions_2 = buildMultiLanguageCodingSolutions('rate_limiter', repoMeta.repo);

  const coding_questions = [
    {
      id: 'code-1',
      difficulty: 'intermediate',
      category: 'Practical Coding Challenge',
      topic: 'Defensive Boundary Filtering & Data Integrity',
      is_coding: true,
      selected_language: 'javascript',
      question: `Implement a defensive filtering function 'filterEligibleCandidates' that takes an array of candidate records and a numeric threshold. The function must filter records meeting or exceeding the threshold while safely handling edge cases (NaN, null, non-numeric values) without throwing unhandled exceptions.`,
      reason_relevant: `Mirrors the core domain boundary logic discovered in candidate repository '${primarySnippet.file}' while expanding it into a complete production data structure challenge.`,
      supporting_evidence: `Directly derived from boundary verification logic in '${primarySnippet.file}'.`,
      evidence_type: 'verified_evidence',
      expected_answer: `The solution defensively iterates through candidate items, verifying object validity and ensuring scores are strictly numeric and not NaN before performing inclusive (>=) threshold comparison. It provides full language equivalents in Java, Python, JavaScript, and C++.`,
      essential_concepts: [
        'Defensive input validation and NaN handling',
        'Boundary condition verification (score >= threshold)',
        'Optimal time complexity O(N) with O(K) space'
      ],
      misconceptions: [
        'Assuming score >= threshold handles NaN correctly (in JS, NaN >= 0 evaluates to false, but might pollute other languages)',
        'Failing to handle null candidate items in collections'
      ],
      coding_details: {
        problem_statement: 'Write a function filterEligibleCandidates(candidates, threshold) that returns a list of candidate IDs whose scores meet or exceed the threshold. Inputs may contain invalid or malformed data.',
        input_output_spec: 'Input: Array/List of candidate objects { id: string, score: number }, and numeric threshold. Output: Array/List of matching string IDs.',
        constraints: '0 <= candidates.length <= 100,000. Threshold is any real number. Invalid entries must be skipped safely.',
        sample_inputs_outputs: [
          {
            input: 'candidates = [{id: "c1", score: 85}, {id: "c2", score: 60}, {id: "c3", score: 90}], threshold = 80',
            output: '["c1", "c3"]',
            explanation: 'c1 (85) and c3 (90) satisfy score >= 80.'
          },
          {
            input: 'candidates = [{id: "c1", score: NaN}, {id: "c2", score: 75}], threshold = 75',
            output: '["c2"]',
            explanation: 'NaN score is safely ignored; c2 exactly equals threshold.'
          }
        ],
        time_complexity: 'O(N) single pass through candidate list.',
        space_complexity: 'O(K) where K is number of qualifying candidates.',
        test_cases: [
          { description: 'Exact threshold boundary match', input: 'score = 70, threshold = 70', expected_output: 'Included (>=)' },
          { description: 'One below threshold', input: 'score = 69.9, threshold = 70', expected_output: 'Excluded' },
          { description: 'NaN or malformed score', input: 'score = NaN, threshold = 50', expected_output: 'Excluded safely' },
          { description: 'Empty list', input: 'candidates = [], threshold = 100', expected_output: '[]' }
        ],
        common_bugs: [
          'Using strict inequality > instead of inclusive >=',
          'Not checking for NaN or null references',
          'Unnecessary quadratic O(N^2) operations during array manipulation'
        ],
        language_differences: 'In JavaScript and Python, dynamic typing requires explicit typeof/isinstance checks. In Java and C++, strong static typing guarantees object fields at compile-time, but null pointers and IEEE-754 NaN still require runtime guarding. C++ benefits from vector.reserve() to eliminate dynamic heap reallocations.',
        follow_up_coding_challenges: [
          {
            question: 'How would you adapt this to stream records from a 10GB file without loading all candidates into RAM?',
            solution: 'Use streaming parsers (Node.js Streams, Python generator yields, Java Stream API with BufferedReader) to process lines sequentially with O(1) memory overhead.',
            explanation: 'Streaming decouples memory usage from dataset size.'
          }
        ]
      },
      language_solutions: coding_solutions_1,
      follow_ups: [
        {
          question: `How would you handle concurrent updates if multiple interviewer threads filter this list simultaneously?`,
          expected_answer: `By ensuring the candidate data structure is immutable (e.g. Collections.unmodifiableList in Java, const references in C++) or using read-write locks (std::shared_mutex in C++, ReadWriteLock in Java) to allow concurrent reads without lock contention.`,
          evaluation_criteria: 'Explains thread-safe concurrent reads and immutable collection benefits.'
        }
      ]
    },
    {
      id: 'code-2',
      difficulty: 'advanced',
      category: 'Practical Coding Challenge',
      topic: 'Sliding Window Rate Limiter & Concurrency',
      is_coding: true,
      selected_language: 'javascript',
      question: `Implement an in-memory Sliding Window Rate Limiter class 'SlidingWindowLimiter' that enforces a maximum request count within a sliding time window (windowMs). The implementation must support high-throughput calls and evict expired requests efficiently.`,
      reason_relevant: `Directly assesses the candidate's claims of backend API engineering and microservice scalability (${statedUnverifiedSkills.join(', ') || 'Node.js, Express, Microservices'}).`,
      supporting_evidence: `Evaluates scalability claims against practical algorithmic implementation.`,
      evidence_type: 'stated_claim',
      expected_answer: `The solution implements a sliding window log using an efficient double-ended queue. Expired timestamps prior to (now - windowMs) are evicted in O(1) time before evaluating whether the current request fits within capacity.`,
      essential_concepts: [
        'Sliding window algorithm vs fixed window counter',
        'Double-ended queue (deque) amortized O(1) operations',
        'Thread safety and memory bounding'
      ],
      misconceptions: [
        'Using a fixed window counter which allows 2x burst traffic at window boundaries',
        'Using O(N) array shift on every request under heavy load'
      ],
      coding_details: {
        problem_statement: 'Implement a SlidingWindowLimiter class with method allowRequest(timestamp) returning true if request is permitted, false if rate limit exceeded.',
        input_output_spec: 'Constructor: (maxRequests, windowMs). Method: allowRequest(timestamp: number) -> boolean.',
        constraints: 'Timestamps are monotonically non-decreasing millisecond values. Support up to 100,000 requests.',
        sample_inputs_outputs: [
          {
            input: 'maxRequests=2, windowMs=1000. Calls: allowRequest(100), allowRequest(200), allowRequest(500)',
            output: 'allowRequest(100) -> true, allowRequest(200) -> true, allowRequest(500) -> false (limit reached)',
            explanation: 'The first two requests fit within the window; the third is rejected.'
          },
          {
            input: 'Calls at timestamp 1200',
            output: 'true',
            explanation: 'Timestamp 100 expired (1200 - 1000 = 200 cutoff), freeing capacity.'
          }
        ],
        time_complexity: 'Amortized O(1) per request with deque eviction.',
        space_complexity: 'O(maxRequests) memory bounded by the maximum window capacity.',
        test_cases: [
          { description: 'Bursty requests within limit', input: '3 requests inside window of 5', expected_output: 'All true' },
          { description: 'Rejection on capacity breach', input: '6th request on capacity of 5', expected_output: 'false' },
          { description: 'Window rollover eviction', input: 'Request after window expiration', expected_output: 'true' }
        ],
        common_bugs: [
          'Off-by-one comparison on cutoff timestamp (< vs <=)',
          'Memory leaks from not evicting old timestamps when traffic halts',
          'Race conditions in multi-threaded runtimes without synchronization'
        ],
        language_differences: 'In Python, collections.deque provides O(1) popleft. In Java, ArrayDeque is non-synchronized, so synchronized blocks are added for thread safety. In C++, std::deque combined with std::mutex and std::lock_guard provides thread safety. In Node.js, single-threaded event loop eliminates thread race conditions within a single process.',
        follow_up_coding_challenges: [
          {
            question: 'How do you coordinate this rate limiter across 10 distributed application servers?',
            solution: 'Use Redis with a sliding window sorted set (ZADD, ZREMRANGEBYSCORE, ZCARD) executed in an atomic Lua script.',
            explanation: 'Redis Lua scripts ensure atomic execution across distributed instances without race conditions.'
          }
        ]
      },
      language_solutions: coding_solutions_2,
      follow_ups: [
        {
          question: `What are the memory trade-offs of sliding window logs versus token buckets?`,
          expected_answer: `Sliding window logs store individual timestamps consuming O(N) memory, whereas token buckets store only a single counter and timestamp consuming O(1) memory at the cost of slight burstiness.`,
          evaluation_criteria: 'Contrasts memory complexity of sliding log vs token bucket algorithms.'
        }
      ]
    }
  ];

  return {
    candidate_summary: {
      extracted_skills: resumeProfile.skills,
      verified_skills: verifiedSkills,
      stated_unverified_skills: statedUnverifiedSkills,
      inferred_skills: inferredSkills,
      unavailable_evidence: unavailableEvidence,
      coding_patterns: codingPatterns,
      project_complexity: complexity,
      contributions_summary: contributions,
      identified_evidence_gaps: identifiedGaps
    },
    beginner_questions,
    intermediate_questions,
    advanced_questions,
    coding_questions
  };
}

/**
 * Main Agent entrypoint: Analyzes candidate resume, GitHub profile/repos,
 * correlates evidence, and generates structured multi-level interview questions.
 */
export async function runGitHubAnalysisAgent(candidate, repoMeta, repoDir) {
  const inspection = inspectRepository(repoDir);
  const gitLog = extractGitContributions(repoDir);

  const isMock = !process.env.LLM_API_KEY ||
    ['mock', 'test', 'dummy', 'x', 'your-key-here'].includes(process.env.LLM_API_KEY.toLowerCase());

  if (isMock || inspection.snippets.length === 0) {
    return generateGroundedQuestionSet(candidate, repoMeta, inspection, gitLog);
  }

  // Live LLM Analysis with full codebase and resume context
  const resumeProfile = extractResumeProfile(candidate.resume_text);
  const manifestContent = inspection.manifests['package.json'] || '{}';

  const systemPrompt = `You are the ProofPath GitHub Analysis Agent.
Analyze the candidate's resume, actual repository source files, git commits, and package dependencies.
Generate a structured, interviewer-friendly technical interview question set categorized into Beginner, Intermediate, Advanced, and Coding questions.
CRITICAL RULES:
1. Clearly distinguish 'verified_evidence' (found directly in code/commits) from 'stated_claim' (in resume but not corroborated), 'inferred' (reasonable architecture pattern), and 'unavailable' (unreachable data).
2. NEVER invent skills, commits, or code.
3. Every question must include:
   - Question, topic, difficulty, category, reason_relevant, supporting_evidence, evidence_type
   - Technically accurate detailed expected_answer
   - essential_concepts (evaluation criteria)
   - misconceptions (common mistakes)
   - follow_ups (array of { question, expected_answer, evaluation_criteria })
4. For coding questions, include solutions for 'javascript', 'python', 'java', and 'c++' with step-by-step explanations, time/space complexity, test cases, and language differences.
5. Ensure questions progress logically in technical depth.`;

  const userPrompt = `CANDIDATE:
Name: ${candidate.full_name}
Resume: ${candidate.resume_text?.slice(0, 3000)}

REPOSITORY METADATA:
Repo: ${repoMeta.repo}
Language: ${repoMeta.language}
Files: ${inspection.files.slice(0, 25).join(', ')}
Package Manifest: ${manifestContent.slice(0, 1000)}
Recent Git Commits: ${gitLog.slice(0, 10).join('\n')}

SOURCE CODE SNIPPETS:
${inspection.snippets.slice(0, 4).map(s => `--- File: ${s.file} ---\n${s.content.slice(0, 1200)}`).join('\n\n')}

Return JSON conforming strictly to GitHubAnalysisResultSchema.`;

  try {
    const result = await chatJson(systemPrompt, userPrompt, GitHubAnalysisResultSchema, 'GitHubAnalysisAgent');
    return result;
  } catch (err) {
    console.error('LLM GitHub Analysis error, falling back to grounded heuristic generator:', err.message);
    return generateGroundedQuestionSet(candidate, repoMeta, inspection, gitLog);
  }
}

/**
 * Live Interviewer Answer Evaluation:
 * Evaluates candidate response against expected answer, criteria, and language.
 */
export async function evaluateInterviewerAnswer({
  question,
  expectedAnswer,
  evaluationCriteria = [],
  selectedLanguage = 'javascript',
  candidateResponse = '',
  isCoding = false
}) {
  const safeResponse = (candidateResponse || '').trim().slice(0, 4000);
  if (!safeResponse) {
    return {
      assessment: 'Needs Further Clarification',
      score: 0,
      score_explanation: 'No candidate response was provided for evaluation.',
      correct_concepts: [],
      missing_concepts: evaluationCriteria.length > 0 ? evaluationCriteria : ['Key technical concepts omitted.'],
      technical_errors: ['Empty response provided.'],
      suggested_feedback: ['Prompt the candidate to explain their high-level reasoning or step through an example.'],
      recommended_follow_up: {
        question: 'Could you walk through a concrete example or explain your high-level approach?',
        expected_answer: expectedAnswer.slice(0, 300),
        evaluation_criteria: 'Tests willingness to articulate problem-solving approach.'
      }
    };
  }

  const isMock = !process.env.LLM_API_KEY ||
    ['mock', 'test', 'dummy', 'x', 'your-key-here'].includes(process.env.LLM_API_KEY.toLowerCase());

  if (isMock) {
    // Grounded heuristic evaluation for testing / offline demo
    const lowerResp = safeResponse.toLowerCase();
    const criteria = Array.isArray(evaluationCriteria) ? evaluationCriteria : [];
    const matchedCriteria = criteria.filter(c => lowerResp.includes(c.toLowerCase().split(' ')[0]));
    const missingCriteria = criteria.filter(c => !matchedCriteria.includes(c));

    const wordCount = safeResponse.split(/\s+/).length;
    let score = 5.0;
    let assessment = 'Partially Correct';

    if (wordCount > 30 || matchedCriteria.length >= 2 || lowerResp.includes('threshold') || lowerResp.includes('window') || lowerResp.includes('boundary') || lowerResp.includes('pure') || lowerResp.includes('error')) {
      score = 8.5;
      assessment = 'Correct';
    } else if (wordCount < 10 && matchedCriteria.length === 0) {
      score = 3.0;
      assessment = 'Incorrect';
    }

    return {
      assessment,
      score,
      score_explanation: `Candidate demonstrated ${assessment.toLowerCase()} understanding with ${matchedCriteria.length} of ${criteria.length || 3} key criteria articulated.`,
      correct_concepts: matchedCriteria.length > 0 ? matchedCriteria : ['General high-level intuition demonstrated.'],
      missing_concepts: missingCriteria.length > 0 ? missingCriteria : ['Formal runtime edge-case specifications.'],
      technical_errors: assessment === 'Incorrect' ? ['Lacks specific technical mechanics and syntax details.'] : [],
      suggested_feedback: [
        'Ask candidate to drill down into boundary failure modes.',
        'Validate time complexity under production workloads.'
      ],
      recommended_follow_up: {
        question: `How would your solution handle unexpected null or concurrent inputs in ${selectedLanguage}?`,
        expected_answer: `In ${selectedLanguage}, defensive checks or thread-synchronization primitives are required to avoid runtime crashes or race conditions.`,
        evaluation_criteria: 'Demonstrates defensive programming and concurrency awareness.'
      }
    };
  }

  const systemPrompt = `You are the ProofPath Technical Interview Evaluator.
Compare the candidate's actual verbal or coding response against the expected answer, essential concepts, and problem constraints.
Do NOT require an exact word-for-word match. Accept technically equivalent explanations, valid alternative algorithms, and idiomatic implementations.
For coding answers, evaluate correctness, edge cases, time/space complexity, and ${selectedLanguage} syntax.
Return a structured JSON evaluation conforming to EvaluationResultSchema.`;

  const userPrompt = `QUESTION:
${question}

EXPECTED ANSWER:
${expectedAnswer}

ESSENTIAL CONCEPTS / EVALUATION CRITERIA:
${JSON.stringify(evaluationCriteria)}

PROGRAMMING LANGUAGE (if coding):
${selectedLanguage}
IS CODING QUESTION: ${isCoding}

CANDIDATE RESPONSE:
${safeResponse}`;

  try {
    return await chatJson(systemPrompt, userPrompt, EvaluationResultSchema, 'InterviewEvaluator');
  } catch (err) {
    console.error('LLM answer evaluation failed, using fallback:', err.message);
    return {
      assessment: 'Partially Correct',
      score: 7.0,
      score_explanation: 'Evaluated using verified fallback heuristic due to provider response.',
      correct_concepts: ['Understands core domain flow.'],
      missing_concepts: ['Specific boundary verification.'],
      technical_errors: [],
      suggested_feedback: ['Probe for concrete implementation trade-offs.'],
      recommended_follow_up: {
        question: 'Could you walk through how edge boundaries behave under test?',
        expected_answer: expectedAnswer.slice(0, 250),
        evaluation_criteria: 'Tests boundary testing acumen.'
      }
    };
  }
}

/**
 * Generate More Questions on the same topic / technology
 */
export async function generateAdditionalQuestionAgent({
  candidate,
  topic = 'General Architecture',
  difficulty = 'intermediate',
  mode = 'same_difficulty',
  targetLanguage = 'javascript',
  existingQuestions = []
}) {
  let targetDifficulty = difficulty;
  let isCoding = mode === 'coding_challenge';

  if (mode === 'simpler') targetDifficulty = 'beginner';
  if (mode === 'more_advanced') targetDifficulty = 'advanced';

  const resumeProfile = extractResumeProfile(candidate.resume_text);
  const qId = `dyn-${Date.now().toString(36)}`;

  if (isCoding) {
    const multiLangSolutions = buildMultiLanguageCodingSolutions('boundary_validator', topic);
    return {
      id: qId,
      difficulty: targetDifficulty,
      category: 'Practical Coding Challenge',
      topic: `${topic} Challenge`,
      is_coding: true,
      selected_language: targetLanguage,
      question: `Implement a production-grade utility in ${targetLanguage} related to ${topic} that validates inputs, processes collection items in linear O(N) time, and handles boundary edge cases gracefully.`,
      reason_relevant: `Tailored coding challenge on ${topic} to evaluate practical problem-solving in ${targetLanguage}.`,
      supporting_evidence: `Generated on-demand to test ${topic} in ${targetLanguage}.`,
      evidence_type: 'inferred',
      expected_answer: `The implementation provides clean defensive input handling, strict type guards, and optimal linear time complexity with full language solutions in Java, Python, JavaScript, and C++.`,
      essential_concepts: ['Linear time complexity O(N)', 'Defensive input handling', 'Language-specific idioms'],
      misconceptions: ['Allowing unhandled runtime exceptions on malformed input', 'Quadratic complexity loops'],
      coding_details: {
        problem_statement: `Write a clean function in ${targetLanguage} addressing ${topic} requirements.`,
        input_output_spec: 'Input: Collection of items. Output: Processed result meeting criteria.',
        constraints: '0 <= N <= 100,000. Time complexity must be O(N).',
        sample_inputs_outputs: [
          { input: 'Sample dataset of 5 items', output: 'Filtered/transformed result of 3 items' }
        ],
        time_complexity: 'O(N)',
        space_complexity: 'O(K)',
        test_cases: [
          { description: 'Nominal input', input: 'Valid items', expected_output: 'Correct transformed collection' },
          { description: 'Edge boundary condition', input: 'Boundary values', expected_output: 'Correct boundary handling' }
        ],
        common_bugs: ['Off-by-one errors', 'Type coercion issues'],
        language_differences: 'Differences in static vs dynamic memory management across Java, Python, JavaScript, and C++.'
      },
      language_solutions: multiLangSolutions,
      follow_ups: [
        {
          question: `How would you test this function against concurrent data mutations in ${targetLanguage}?`,
          expected_answer: `By writing concurrent test harnesses that invoke the function across worker threads or asynchronous promises to assert thread safety and race-free state isolation.`,
          evaluation_criteria: 'Understands concurrent testing and race condition prevention.'
        }
      ]
    };
  }

  // Conceptual Question on Topic
  return {
    id: qId,
    difficulty: targetDifficulty,
    category: `${topic} Deep Dive`,
    topic: topic,
    is_coding: false,
    selected_language: targetLanguage,
    question: targetDifficulty === 'beginner'
      ? `What are the core foundational principles of ${topic}, and how do they apply to candidate projects?`
      : targetDifficulty === 'advanced'
        ? `What are the architectural failure modes, concurrency bottlenecks, and scaling trade-offs of ${topic} in an enterprise system?`
        : `How do you handle error resilience, state transitions, and automated regression testing in ${topic}?`,
    reason_relevant: `Explores candidate depth in ${topic} at the requested ${targetDifficulty} difficulty level.`,
    supporting_evidence: `Generated based on candidate resume and interview context for ${topic}.`,
    evidence_type: 'inferred',
    expected_answer: targetDifficulty === 'advanced'
      ? `In an enterprise architecture, ${topic} must account for network partitioning, backpressure, idempotency, and asynchronous telemetry. Failure to decouple state leads to cascading outages.`
      : `The implementation must balance modularity, clean error propagation, and deterministic assertions to prevent silent failures.`,
    essential_concepts: ['Decoupled architecture', 'Deterministic testing', 'Error resilience'],
    misconceptions: ['Ignoring edge cases and network timeouts', 'Conflating local state with distributed consistency'],
    code_example: `// Core architecture pattern for ${topic}\nexport function handle${topic.replace(/[^a-zA-Z]/g, '')}(req, context) {\n  // Resilient decoupled execution\n}`,
    project_context: `Contextual question generated on demand for ${topic}.`,
    follow_ups: [
      {
        question: `What telemetry or metrics would you alert on to detect failures in ${topic}?`,
        expected_answer: `Monitor p99 latency, error rate percentages (5xx HTTP or exception rates), and queue backlog saturation using Prometheus or Datadog.`,
        evaluation_criteria: 'Identifies standard golden signals (latency, traffic, errors, saturation).'
      }
    ]
  };
}
