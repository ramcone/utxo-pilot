import { useState } from 'react';
import { GITHUB_ISSUES_URL, GITHUB_NEW_ISSUE_URL, GITHUB_REPO } from '../config';

type IssueType = 'bug' | 'feature' | 'question';

const TYPES: { value: IssueType; label: string; icon: string; description: string; label_tag: string }[] = [
  { value: 'bug',     icon: '🐛', label: 'Bug report',       description: 'Something is broken or not working as expected.', label_tag: 'bug' },
  { value: 'feature', icon: '💡', label: 'Feature request',  description: 'An idea for a new feature or improvement.',       label_tag: 'enhancement' },
  { value: 'question',icon: '❓', label: 'Question',         description: 'Not sure how something works? Ask here.',         label_tag: 'question' },
];

const BUG_TEMPLATE = `**Describe the bug**
A clear description of what went wrong.

**Steps to reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behaviour**
What you expected to happen.

**Actual behaviour**
What actually happened.

**Environment**
- OS: Windows / macOS / Linux
- Browser:
- UTXO Pilot version: 0.1.0`;

const FEATURE_TEMPLATE = `**What problem does this solve?**
Describe the pain point or workflow gap.

**Proposed solution**
How you imagine it working.

**Alternatives considered**
Any other approaches you thought of.`;

const QUESTION_TEMPLATE = `**Your question**


**What have you tried so far?**
`;

const TEMPLATES: Record<IssueType, string> = {
  bug:     BUG_TEMPLATE,
  feature: FEATURE_TEMPLATE,
  question: QUESTION_TEMPLATE,
};

export default function Feedback() {
  const [type, setType]         = useState<IssueType>('bug');
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState(BUG_TEMPLATE);
  const [submitted, setSubmitted] = useState(false);

  const handleTypeChange = (t: IssueType) => {
    setType(t);
    setBody(TEMPLATES[t]);
    setTitle('');
  };

  const handleOpen = () => {
    if (!title.trim()) return;
    const label = TYPES.find(t => t.value === type)!.label_tag;
    const params = new URLSearchParams({
      title: title.trim(),
      body:  body.trim(),
      labels: label,
    });
    window.open(`${GITHUB_NEW_ISSUE_URL}?${params.toString()}`, '_blank', 'noopener');
    setSubmitted(true);
  };

  const isPlaceholder = GITHUB_REPO.startsWith('YOUR-USERNAME');

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h2>🐛 Feedback & Bug Reports</h2>
        <p>Report a bug, suggest a feature, or ask a question via GitHub Issues.</p>
      </div>

      {isPlaceholder && (
        <div className="alert alert-warn mb-6">
          <span>⚠</span>
          <div>
            <strong>Repo not configured yet.</strong> Open{' '}
            <code className="mono" style={{ fontSize: '0.8rem' }}>src/config.ts</code>{' '}
            and replace <code className="mono" style={{ fontSize: '0.8rem' }}>YOUR-USERNAME/utxo-pilot</code>{' '}
            with your actual GitHub repo name. Until then the submit button will open a placeholder URL.
          </div>
        </div>
      )}

      {submitted && (
        <div className="alert alert-success mb-6">
          <span>✓</span>
          <div>
            GitHub opened in a new tab. Complete the issue there and hit <strong>Submit new issue</strong>.
            You'll get an email confirmation once it's filed.{' '}
            <button
              onClick={() => setSubmitted(false)}
              style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Submit another
            </button>
          </div>
        </div>
      )}

      {/* Issue type picker */}
      <div className="card mb-4">
        <div className="card-title mb-3">What kind of feedback is this?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={`btn ${type === t.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, flexDirection: 'column', gap: 4, padding: '12px 8px', alignItems: 'center' }}
            >
              <span style={{ fontSize: '1.3rem' }}>{t.icon}</span>
              <span style={{ fontSize: '0.8rem' }}>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 10 }}>
          {TYPES.find(t => t.value === type)?.description}
        </p>
      </div>

      {/* Form */}
      <div className="card space-y-4">
        <div className="field">
          <label className="label">Title — one line summary</label>
          <input
            className="input"
            type="text"
            placeholder={
              type === 'bug'     ? 'e.g. Spend planner crashes when amount is 0' :
              type === 'feature' ? 'e.g. Add dark / light mode toggle' :
                                   'e.g. How do I import a zpub from Coldcard?'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label">Details</label>
          <textarea
            className="input"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
          />
          <span className="text-sm text-muted">
            Fill in the template above — the more detail, the faster it gets fixed.
          </span>
        </div>

        <button
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center', padding: '11px' }}
          onClick={handleOpen}
          disabled={!title.trim()}
        >
          🚀 Open as GitHub Issue
        </button>

        <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
          This will open GitHub in a new tab. You'll need a free GitHub account to submit.
        </p>
      </div>

      {/* Direct links */}
      <div className="card mt-4" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span className="text-sm text-muted">Prefer to browse existing issues first?</span>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            View all issues on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
