import 'altcha';
import 'altcha/altcha.css';
import Eyebrow from '@components/atoms/Eyebrow';
import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

type SupportSlug = 'discovery' | 'design' | 'post-release';

interface SupportOption {
  slug: SupportSlug;
  phase: 'understand' | 'define' | 'deliver' | 'sustain';
  name: string;
  tagline: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    slug: 'discovery',
    phase: 'understand',
    name: 'User discovery',
    tagline: 'Research, needs assessment, audience mapping',
  },
  {
    slug: 'design',
    phase: 'define',
    name: 'Design support',
    tagline: 'Wireframes, prototyping, visual identity, UX coaching',
  },
  {
    slug: 'post-release',
    phase: 'sustain',
    name: 'Post-release',
    tagline: 'Usability testing, audits, ongoing support after ship',
  },
];

const labelClass = 'block  font-mono text-sm text-ink-muted ';

const inputClass =
  'gradient-underline block w-full border-1 border-ink/5 bg-transparent px-2 pt-2.5 pb-3 font-sans text-base text-ink placeholder:text-ink-muted disabled:opacity-60';

const legendClass = 'mb-6';

const helperClass = 'mt-2 italic text-xs text-ink/70';

interface Props {
  formId?: string;
}

export default function UxdApplicationForm({ formId = 'uxd-apply' }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [alignment, setAlignment] = useState('');
  const [supportTypes, setSupportTypes] = useState<SupportSlug[]>([]);
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submitting = status === 'submitting';

  useEffect(() => {
    if (status !== 'success') return;
    const widget = document.querySelector('altcha-widget') as
      | (HTMLElement & { reset?: () => void })
      | null;
    widget?.reset?.();
  }, [status]);

  const toggleSupport = (slug: SupportSlug) => {
    setSupportTypes((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const isEmailLike = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const canSubmit =
    !submitting &&
    isEmailLike(email) &&
    projectName.trim() !== '' &&
    oneLiner.trim() !== '' &&
    alignment.trim() !== '' &&
    supportTypes.length > 0;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const data = new FormData(e.currentTarget);
    const altcha = (data.get('altcha') as string | null) ?? '';

    if (!altcha) {
      setError(
        'Please wait a moment for the spam check to finish, then try again.'
      );
      setStatus('error');
      return;
    }

    if (supportTypes.length === 0) {
      setError('Please pick at least one kind of support.');
      setStatus('error');
      return;
    }

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          projectName,
          projectLink,
          oneLiner,
          alignment,
          supportTypes,
          notes,
          website,
          altcha,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? 'Something went wrong.');
      }
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <output
        aria-live="polite"
        className="block border-2 border-ink bg-white p-8 md:p-10"
      >
        <Eyebrow as="p">Application received</Eyebrow>
        <h3 className="mt-4 font-serif text-2xl font-medium text-ink md:text-3xl">
          Thanks — we'll be in touch.
        </h3>
        <p className="mt-4 max-w-prose font-sans text-base leading-relaxed text-ink-soft">
          We read every application and respond within two weeks. If your
          project is a fit for our practice, we'll set up a call to dig into
          what you need. If it's a better fit for one of our partner studios in
          the OTF UXD network, we'll route you their way.
        </p>
      </output>
    );
  }

  return (
    <form
      ref={formRef}
      id={formId}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-12"
    >
      {/* Section: About you */}
      <fieldset className="flex flex-col gap-7 border-0 p-0">
        <Eyebrow rule as="legend" className={legendClass}>
          About you
        </Eyebrow>

        <div>
          <label htmlFor={`${formId}-name`} className={labelClass}>
            Name <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            maxLength={120}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className={labelClass}>
            Email <RequiredMark />
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            maxLength={200}
            className={inputClass}
          />
        </div>
      </fieldset>

      {/* Section: About the project */}
      <fieldset className="flex flex-col gap-7 border-0 p-0">
        <Eyebrow rule as="legend" className={legendClass}>
          About the project
        </Eyebrow>

        <div>
          <label htmlFor={`${formId}-project`} className={labelClass}>
            Project or organisation name <RequiredMark />
          </label>
          <input
            id={`${formId}-project`}
            name="projectName"
            type="text"
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={submitting}
            maxLength={160}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-link`} className={labelClass}>
            Project link <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id={`${formId}-link`}
            name="projectLink"
            type="url"
            value={projectLink}
            onChange={(e) => setProjectLink(e.target.value)}
            disabled={submitting}
            maxLength={500}
            placeholder="https://"
            className={inputClass}
          />
          <p className={helperClass}>
            Site, repo, or write-up — whatever's most useful
          </p>
        </div>

        <div>
          <label htmlFor={`${formId}-oneliner`} className={labelClass}>
            In one sentence, what does it do? <RequiredMark />
          </label>
          <input
            id={`${formId}-oneliner`}
            name="oneLiner"
            type="text"
            required
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            disabled={submitting}
            maxLength={280}
            className={inputClass}
          />
          <p className={helperClass}>{280 - oneLiner.length} characters left</p>
        </div>

        <div>
          <label htmlFor={`${formId}-alignment`} className={labelClass}>
            How does it relate to internet freedom or privacy? <RequiredMark />
          </label>
          <textarea
            id={`${formId}-alignment`}
            name="alignment"
            required
            rows={5}
            value={alignment}
            onChange={(e) => setAlignment(e.target.value)}
            disabled={submitting}
            maxLength={2000}
            className={`${inputClass} resize-y`}
          />
          <p className={helperClass}>
            A paragraph is plenty. We are looking to make sure we can fit you in
            the support requirements.
          </p>
        </div>
      </fieldset>

      {/* Section: Support requested */}
      <fieldset className="flex flex-col gap-5 border-0 p-0">
        <Eyebrow rule as="legend" className={legendClass}>
          Support requested
        </Eyebrow>

        <p className={labelClass}>
          Pick one or more <RequiredMark />
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUPPORT_OPTIONS.map((opt) => {
            const checked = supportTypes.includes(opt.slug);
            const phaseColor = `var(--color-phase-${opt.phase})`;
            const phaseDark = `var(--color-phase-${opt.phase}-dark)`;
            const phaseLight = `var(--color-phase-${opt.phase}-light)`;
            const baseStyle: React.CSSProperties = checked
              ? {
                  background: `linear-gradient(to right, ${phaseLight}, var(--color-white))`,
                  borderColor: phaseDark,
                }
              : {
                  background: 'var(--color-white)',
                  borderColor: phaseColor,
                };
            return (
              <label
                key={opt.slug}
                className="group relative flex cursor-pointer items-start gap-3 border-2 p-4 transition-shadow duration-150 hover:shadow-md has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                style={baseStyle}
              >
                <input
                  type="checkbox"
                  name="supportTypes"
                  value={opt.slug}
                  checked={checked}
                  onChange={() => toggleSupport(opt.slug)}
                  disabled={submitting}
                  className="sr-only"
                />
                <span
                  className="relative mt-1 block h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150 group-has-checked:scale-110"
                  style={{
                    background: `var(--color-phase-${opt.phase}-dark)`,
                  }}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className="font-mono text-[0.7rem] tracking-[0.22em] uppercase"
                    style={{
                      color: `var(--color-phase-${opt.phase}-dark)`,
                    }}
                  >
                    {opt.name}
                  </span>
                  <span className="font-sans text-sm leading-snug text-ink-soft">
                    {opt.tagline}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 ml-2 flex h-4 w-4 shrink-0 items-center justify-center border border-ink-muted/40 transition-colors duration-150 group-has-checked:border-ink group-has-checked:bg-ink"
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-white opacity-0 group-has-checked:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <title>Selected</title>
                    <path d="M2 6l3 3 5-6" />
                  </svg>
                </span>
              </label>
            );
          })}
        </div>

        <div>
          <label htmlFor={`${formId}-notes`} className={labelClass}>
            Anything else we should know?{' '}
            <span className="text-ink-muted">(optional)</span>
          </label>
          <textarea
            id={`${formId}-notes`}
            name="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            maxLength={2000}
            className={`${inputClass} resize-y`}
          />
          <p className={helperClass}>
            Timing, constraints, prior work, threat model, partners — anything
            that helps us assess fit.
          </p>
        </div>
      </fieldset>

      {/* Spam check */}
      <div className="flex flex-col gap-3">
        <Eyebrow as="p">
          Privacy-friendly spam check by{' '}
          <a
            href="https://altcha.org"
            className="underline decoration-dotted underline-offset-[0.32em]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Altcha
          </a>
        </Eyebrow>
        <altcha-widget
          challenge="/api/altcha/challenge"
          auto="onload"
          suppressHydrationWarning
          style={{
            '--altcha-max-width': '100%',
            '--altcha-color-base': 'var(--color-white)',
            '--altcha-color-base-content': 'var(--color-ink-soft)',
            '--altcha-border-color': 'var(--color-ink-muted)',
            '--altcha-border-width': '1px',
            '--altcha-border-radius': '0',
            '--altcha-padding': '1rem',
          }}
        />
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p role="alert" className="font-sans text-sm text-secondary-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            data-umami-event="uxd-application-submit"
            className="button-base button-primary button-size-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send application'}
          </button>
        </div>
        <p className="font-mono text-[0.6rem] tracking-[0.16em] text-ink-muted uppercase">
          Submissions go to the Draftlab team via{' '}
          <a
            href="https://www.brevo.com/legal/privacypolicy/"
            className="underline decoration-dotted underline-offset-[0.32em]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Brevo
          </a>
          , a GDPR-compliant email service. We don't pass your data to third
          parties.
        </p>
      </div>
    </form>
  );
}

function RequiredMark() {
  return (
    <span
      className="ml-0.5"
      style={{ color: 'var(--color-phase-deliver-dark)' }}
      aria-hidden="true"
    >
      *
    </span>
  );
}
