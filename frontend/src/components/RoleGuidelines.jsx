import { useState } from 'react';
import { getUserRole } from '../api';

export default function RoleGuidelines({ forcedRole }) {
  const currentRole = getUserRole();
  const [selectedRole, setSelectedRole] = useState(
    forcedRole || (currentRole === 'interviewer' ? 'interviewer' : 'recruiter')
  );

  return (
    <div
      className="card"
      style={{
        marginTop: '28px',
        padding: '24px 28px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '18px',
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              📋
            </span>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              {selectedRole === 'recruiter'
                ? 'Recruiter Operational Workflow & Guidelines'
                : 'Interviewer Technical Evaluation Guidelines'}
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Step-by-step instructions for staff conducting hiring-evidence verifications and technical probes.
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedRole('recruiter')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: selectedRole === 'recruiter' ? '#ffffff' : 'transparent',
              color: selectedRole === 'recruiter' ? '#4f46e5' : '#64748b',
              boxShadow: selectedRole === 'recruiter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            💼 Recruiter View
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('interviewer')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: selectedRole === 'interviewer' ? '#ffffff' : 'transparent',
              color: selectedRole === 'interviewer' ? '#4f46e5' : '#64748b',
              boxShadow: selectedRole === 'interviewer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🔍 Interviewer View
          </button>
        </div>
      </div>

      {/* Guidelines Content */}
      {selectedRole === 'recruiter' ? (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  1
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Candidate Registration</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Upload the candidate's resume (PDF or TXT) in the <strong>Add Candidate</strong> form above, or click{' '}
                <strong>⚡ Preload Demo Candidate</strong> to immediately test with synthetic data.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  2
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Issue Consent Link</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Click <strong>🔗 Create Consent Link</strong> on the candidate entry. Copy the generated unique link and
                share it with the candidate via email or recruitment portal.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  3
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Candidate 1-Click Submit</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                The candidate opens the link, reviews the GDPR data notice, inputs up to 5 public GitHub repository or
                profile links, and submits. <em>No written questions or test taking is required from the candidate.</em>
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  4
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Automated Analysis & Roster</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                The system transitions the candidate from <span className="badge status-processing">Processing</span> to{' '}
                <span className="badge status-analyzed">Analyzed</span> in the background, verifying claims and
                generating interview probes automatically.
              </p>
            </div>

            {/* Step 5 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  5
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>GDPR Right to Erasure</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                To fulfill candidate privacy requests, click <strong>Erase</strong> either from the main roster or
                inside the candidate briefing. This permanently wipes all records, repositories, and questions.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              fontSize: '13px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>💡</span>
            <span>
              <strong>Recruiter Pro-Tip:</strong> Candidates only need to share public GitHub URLs. Once submitted,
              hand over the candidate's link to the technical interview panel for the live briefing.
            </span>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#0ea5e9',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  1
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Review Verified Claims</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Open any candidate briefing to review the <strong>Claims Evidence Table</strong>:
                <br />
                • <strong style={{ color: '#16a34a' }}>Verified</strong>: Supported by real commits and dependencies.
                <br />
                • <strong style={{ color: '#d97706' }}>Unverifiable</strong>: Missing proof (never falsely marked).
                <br />
                • <strong style={{ color: '#dc2626' }}>Contradicted</strong>: Incompatible timeline or code refutation.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#0ea5e9',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  2
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>3-Tier Question Probing</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Every verified skill includes generated questions at three distinct levels: <strong>Beginner</strong>,{' '}
                <strong>Intermediate</strong>, and <strong>Advanced</strong>. Expand any question to inspect the Model
                Answer and Key Evaluation Points.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#0ea5e9',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  3
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Live Key Points Checklist</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                During the live interview, check off the technical criteria in the checklist as the candidate explains
                their reasoning. This creates a standardized, objective evaluation across all interviewers.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#0ea5e9',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  4
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Multilingual Code Conversion</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                In the <strong>Coding Questions</strong> section (Easy, Medium, Hard), use the language dropdown to
                instantly convert solutions into <em>Python, Java, Go, TypeScript, C#, or Node.js</em> to match the
                candidate's primary language.
              </p>
            </div>

            {/* Step 5 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#0ea5e9',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  5
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Immutable Audit Log</strong>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Every action taken by recruiters and interviewers is cryptographically chained in the append-only audit
                log, ensuring auditability and compliance for hiring committee review.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              fontSize: '13px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>💡</span>
            <span>
              <strong>Interviewer Pro-Tip:</strong> Use the <em>Intermediate</em> and <em>Advanced</em> questions to
              probe candidate depth on architectural trade-offs, concurrency models, and production incident debugging.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
