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

/** Users from `startDate` through today; "today" follows the property's time zone (Korea) */
async function activeUsers(token: string, startDate: string): Promise<number> {
	const started = Date.now();
	const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${SITE.gaPropertyId}:runReport`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ dateRanges: [{ startDate, endDate: 'today' }], metrics: [{ name: 'activeUsers' }] }),
		signal: AbortSignal.timeout(45_000),
	});
	if (!res.ok) throw new Error(`report ${startDate} failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
	const report = (await res.json()) as { rows?: { metricValues?: { value: string }[] }[] };
	console.log(`[visitors] report ${startDate} answered in ${Date.now() - started} ms`);
	// A range with no visits has no row
	return Number(report.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

/** Diagnosis only: does the realtime side of the same property answer while the daily report hangs? */
async function realtimeProbe(token: string): Promise<void> {
	const started = Date.now();
	try {
		const res = await fetch(
			`https://analyticsdata.googleapis.com/v1beta/properties/${SITE.gaPropertyId}:runRealtimeReport`,
			{
				method: 'POST',
				headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
				body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
				signal: AbortSignal.timeout(20_000),
			},
		);
		const text = (await res.text()).slice(0, 160);
		console.log(`[visitors] realtime ${res.status} in ${Date.now() - started} ms: ${text}`);
	} catch (error) {
		console.log(`[visitors] realtime failed after ${Date.now() - started} ms: ${(error as Error).message}`);
	}
}

async function fromAnalytics(raw: string): Promise<Visitors> {
	const started = Date.now();
	const token = await accessToken(JSON.parse(raw) as ServiceAccountKey);
	console.log(`[visitors] signed in in ${Date.now() - started} ms`);
	await realtimeProbe(token);
	const today = await activeUsers(token, 'today');
	const total = await activeUsers(token, SINCE);
	return { today, total, at: new Date() };
}

/** The numbers the live site shows now, read back from its own home page */
async function fromLiveSite(): Promise<Visitors | null> {
	const res = await fetch(new URL('/', SITE_URL), { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) return null;
	const html = await res.text();
	const block = html.match(/<div class="visits">([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? '';
	const numbers = [...block.matchAll(/<dd[^>]*>([\d,]+)<\/dd>/g)].map((m) => Number(m[1].replace(/,/g, '')));
	const at = block.match(/datetime="([^"]+)"/)?.[1];
	if (numbers.length < 2 || !at) return null;
	return { today: numbers[0], total: numbers[1], at: new Date(at) };
}

const SITE_URL = 'https://teddybears56.github.io';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function load(): Promise<Visitors | null> {
	const raw = process.env.GA_SERVICE_ACCOUNT_KEY;
	if (!raw || !SITE.gaPropertyId) return null;
	// Google sometimes answers 5xx for a moment: try three times before giving up
	for (const wait of [0, 3_000, 10_000]) {
		if (wait) await sleep(wait);
		const started = Date.now();
		try {
			const counted = await fromAnalytics(raw);
			console.log(`[visitors] today ${counted.today}, total ${counted.total} in ${Date.now() - started} ms`);
			return counted;
		} catch (error) {
			console.warn(`[visitors] try failed after ${Date.now() - started} ms: ${(error as Error).message}`);
		}
	}
	// Keep the last published numbers (their time stays old) rather than dropping the line
	const last = await fromLiveSite().catch(() => null);
	console.warn(last ? '[visitors] kept the last published numbers' : '[visitors] left out');
	return last;
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
