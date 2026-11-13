import { createSign } from 'node:crypto';
import { SITE } from '../data/site';

/**
 * Visitor counts from Google Analytics 4, fetched once per build.
 *
 * The build signs in as a read-only service account whose JSON key sits in the
 * GA_SERVICE_ACCOUNT_KEY environment variable (a GitHub Actions secret). The deploy
 * workflow rebuilds every hour, so the numbers on the page are at most about an hour old.
 * Without the key (a local build) or on any error, the counter is simply left out.
 */
export interface Visitors {
	today: number;
	total: number;
	/** When the numbers were fetched */
	at: Date;
}

/** The day the blog's GA4 property started counting */
const SINCE = '2026-11-13';

interface ServiceAccountKey {
	client_email: string;
	private_key: string;
}

async function accessToken(key: ServiceAccountKey): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
	const unsigned = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({
		iss: key.client_email,
		scope: 'https://www.googleapis.com/auth/analytics.readonly',
		aud: 'https://oauth2.googleapis.com/token',
		iat: now,
		exp: now + 600,
	})}`;
	const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: `${unsigned}.${signature}`,
		}),
	});
	if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
	return ((await res.json()) as { access_token: string }).access_token;
}

async function load(): Promise<Visitors | null> {
	const raw = process.env.GA_SERVICE_ACCOUNT_KEY;
	if (!raw || !SITE.gaPropertyId) return null;
	try {
		const token = await accessToken(JSON.parse(raw) as ServiceAccountKey);
		const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${SITE.gaPropertyId}:runReport`, {
			method: 'POST',
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				// "today" follows the property's time zone (Korea)
				dateRanges: [
					{ startDate: 'today', endDate: 'today', name: 'today' },
					{ startDate: SINCE, endDate: 'today', name: 'total' },
				],
				metrics: [{ name: 'activeUsers' }],
			}),
		});
		if (!res.ok) throw new Error(`report request failed: ${res.status} ${await res.text()}`);
		const report = (await res.json()) as {
			rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
		};
		// With two date ranges GA adds a "dateRange" column; a range with no visits has no row
		const count = (name: string) =>
			Number(report.rows?.find((r) => r.dimensionValues?.[0]?.value === name)?.metricValues?.[0]?.value ?? 0);
		return { today: count('today'), total: count('total'), at: new Date() };
	} catch (error) {
		console.warn(`[visitors] left out: ${(error as Error).message}`);
		return null;
	}
}

let cached: Promise<Visitors | null> | undefined;

/** Every page shares one request per build */
export function getVisitors(): Promise<Visitors | null> {
	cached ??= load();
	return cached;
}

/** "11-13 14:07" in Korean time */
export function seoulTime(date: Date): string {
	return date.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16);
}
