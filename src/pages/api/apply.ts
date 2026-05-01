import { BrevoClient, BrevoError } from '@getbrevo/brevo';
import { verifySolution } from 'altcha-lib/v1';
import type { APIRoute } from 'astro';

export const prerender = false;

const SUPPORT_TYPES = ['discovery', 'design', 'post-release'] as const;
type SupportType = (typeof SUPPORT_TYPES)[number];

const SUPPORT_LABELS: Record<SupportType, string> = {
	discovery: 'User discovery',
	design: 'Design support',
	'post-release': 'Post-release support',
};

const FIELD_LIMITS = {
	name: 120,
	email: 200,
	projectName: 160,
	projectLink: 500,
	oneLiner: 280,
	alignment: 2000,
	notes: 2000,
};

const isValidEmail = (email: string) =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const escapeHtml = (s: string) =>
	s.replace(
		/[<>&"]/g,
		(c) =>
			({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string
	);

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

interface Payload {
	name?: string;
	email?: string;
	projectName?: string;
	projectLink?: string;
	oneLiner?: string;
	alignment?: string;
	supportTypes?: string[];
	notes?: string;
	website?: string; // honeypot
	altcha?: string;
}

export const POST: APIRoute = async ({ request }) => {
	const apiKey = import.meta.env.BREVO_API_KEY;
	const listId = Number(import.meta.env.BREVO_APPLICATIONS_LIST_ID ?? '0');
	const notifyTo = import.meta.env.BREVO_NOTIFY_TO;
	const notifyFrom = import.meta.env.BREVO_NOTIFY_FROM;
	const notifyFromName =
		import.meta.env.BREVO_NOTIFY_FROM_NAME ?? 'Draftlab';
	const altchaHmacKey = import.meta.env.ALTCHA_HMAC_KEY;

	if (!apiKey || !notifyTo || !notifyFrom || !altchaHmacKey) {
		return json({ error: 'Form is not configured' }, 500);
	}

	let payload: Payload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, 400);
	}

	// Honeypot — silently succeed
	if (payload.website && payload.website.trim() !== '') {
		return json({ ok: true });
	}

	if (!payload.altcha) {
		return json({ error: 'Verification required.' }, 400);
	}

	try {
		const verified = await verifySolution(payload.altcha, altchaHmacKey);
		if (!verified) {
			return json({ error: 'Verification failed. Please try again.' }, 400);
		}
	} catch (err) {
		console.error('ALTCHA verification error', err);
		return json({ error: 'Verification failed. Please try again.' }, 400);
	}

	const name = (payload.name ?? '').trim();
	const email = (payload.email ?? '').trim();
	const projectName = (payload.projectName ?? '').trim();
	const projectLink = (payload.projectLink ?? '').trim();
	const oneLiner = (payload.oneLiner ?? '').trim();
	const alignment = (payload.alignment ?? '').trim();
	const notes = (payload.notes ?? '').trim();

	const supportTypes = (Array.isArray(payload.supportTypes) ? payload.supportTypes : [])
		.filter((s): s is SupportType => SUPPORT_TYPES.includes(s as SupportType));

	if (name.length > FIELD_LIMITS.name) {
		return json({ error: 'Name is too long.' }, 400);
	}
	if (!isValidEmail(email) || email.length > FIELD_LIMITS.email) {
		return json({ error: 'A valid email address is required.' }, 400);
	}
	if (!projectName || projectName.length > FIELD_LIMITS.projectName) {
		return json({ error: 'Please share a project or organisation name.' }, 400);
	}
	if (projectLink.length > FIELD_LIMITS.projectLink) {
		return json({ error: 'Project link is too long.' }, 400);
	}
	if (!oneLiner || oneLiner.length > FIELD_LIMITS.oneLiner) {
		return json({ error: 'Please describe what your project does.' }, 400);
	}
	if (!alignment || alignment.length > FIELD_LIMITS.alignment) {
		return json({ error: 'Please tell us how your project relates to internet freedom.' }, 400);
	}
	if (notes.length > FIELD_LIMITS.notes) {
		return json({ error: 'Notes field is too long.' }, 400);
	}
	if (supportTypes.length === 0) {
		return json({ error: 'Please select at least one type of support.' }, 400);
	}

	const brevo = new BrevoClient({ apiKey });

	// Optional: stash applicant in a Brevo list (best-effort).
	// updateEnabled is intentionally false — second applications must NOT
	// overwrite a previous submission's attributes. Duplicate-contact errors
	// are expected on resubmissions and are logged but ignored; the full
	// payload of every submission is always captured in the transactional
	// email below.
	if (Number.isFinite(listId) && listId > 0) {
		try {
			await brevo.contacts.createContact({
				email,
				listIds: [listId],
				updateEnabled: false,
				attributes: {
					FIRSTNAME: name,
					PROJECT: projectName,
					PROJECT_LINK: projectLink,
					ONE_LINER: oneLiner,
					ALIGNMENT: alignment,
					SUPPORT_TYPES: supportTypes
						.map((s) => SUPPORT_LABELS[s])
						.join(', '),
					NOTES: notes,
					APPLICATION_DATE: new Date().toISOString().slice(0, 10),
				},
			});
		} catch (err) {
			if (err instanceof BrevoError) {
				console.error('Brevo contacts error', err.statusCode, err.body);
			} else {
				console.error('Brevo contacts error', err);
			}
		}
	}

	const supportList = supportTypes
		.map((s) => `<li>${escapeHtml(SUPPORT_LABELS[s])}</li>`)
		.join('');

	const linkLine = projectLink
		? `<p><strong>Link:</strong> <a href="${escapeHtml(projectLink)}">${escapeHtml(projectLink)}</a></p>`
		: '';

	const notesBlock = notes
		? `<h3>Anything else</h3><p>${escapeHtml(notes).replace(/\n/g, '<br>')}</p>`
		: '';

	const htmlContent = `
		<h2>New UXD application</h2>
		<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
		<p><strong>Project / org:</strong> ${escapeHtml(projectName)}</p>
		${linkLine}
		<h3>What does the project do?</h3>
		<p>${escapeHtml(oneLiner)}</p>
		<h3>Internet freedom alignment</h3>
		<p>${escapeHtml(alignment).replace(/\n/g, '<br>')}</p>
		<h3>Support requested</h3>
		<ul>${supportList}</ul>
		${notesBlock}
	`.trim();

	try {
		await brevo.transactionalEmails.sendTransacEmail({
			sender: { email: notifyFrom, name: notifyFromName },
			to: [{ email: notifyTo }],
			replyTo: { email, name },
			subject: `UXD application: ${projectName}`,
			htmlContent,
		});
	} catch (err) {
		if (err instanceof BrevoError) {
			console.error('Brevo email error', err.statusCode, err.body);
		} else {
			console.error('Brevo email error', err);
		}
		return json(
			{ error: 'Could not submit your application. Please try again.' },
			502
		);
	}

	return json({ ok: true });
};
