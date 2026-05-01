import { createChallenge } from 'altcha-lib/v1';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
	const hmacKey = import.meta.env.ALTCHA_HMAC_KEY;
	if (!hmacKey) {
		return new Response(
			JSON.stringify({ error: 'ALTCHA is not configured' }),
			{ status: 500, headers: { 'content-type': 'application/json' } }
		);
	}

	const challenge = await createChallenge({
		hmacKey,
		maxNumber: 100_000,
		expires: new Date(Date.now() + 10 * 60 * 1000),
	});

	return new Response(JSON.stringify(challenge), {
		status: 200,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store',
		},
	});
};
