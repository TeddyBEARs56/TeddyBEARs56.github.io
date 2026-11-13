import { createSign } from 'node:crypto';
import { SITE } from '../data/site';

/**
 * Visitor counts from Google Analytics 4, fetched once per build.
 *
 * The build signs in as a read-only service account whose JSON key sits in the
 * GA_SERVICE_ACCOUNT_KEY environment variable (a GitHub Actions secret). The deploy
 * workflow rebuilds every hour, so the numbers on the page are at most about an hour old.
 * Without the key (a local build) the counter is left out; when Google does not answer,
 * the numbers the live page already shows are kept.
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

const API = `https://analyticsdata.googleapis.com/v1beta/properties/${SITE.gaPropertyId}`;
const METRICS = [{ name: 'activeUsers' }];
const SITE_URL = 'https://teddybears56.github.io';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const seoulDay = (date: Date) => date.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);

/** One Data API call: the number in its first row, 0 when the report has no rows */
async function firstValue(token: string, method: 'runReport' | 'runRealtimeReport', body: object, timeoutMs: number) {
	const res = await fetch(`${API}:${method}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(timeoutMs),
	});
	// Status only: the body is not logged
	if (!res.ok) throw new Error(`${method} answered ${res.status}`);
	const report = (await res.json()) as { rows?: { metricValues?: { value: string }[] }[] };
	return Number(report.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

/**
 * The daily report sometimes stalls for tens of seconds and the next try answers in 0.1 s
 * (seen 2026-11-13: 10 s, 31 s, then 107 ms), so each call gets four tries.
 */
async function withRetries<T>(label: string, attempt: () => Promise<T>): Promise<T | null> {
	for (const wait of [0, 2_000, 5_000, 10_000]) {
		if (wait) await sleep(wait);
		const started = Date.now();
		try {
			const value = await attempt();
			console.log(`[visitors] ${label} answered in ${Date.now() - started} ms`);
			return value;
		} catch (error) {
			console.warn(`[visitors] ${label} failed after ${Date.now() - started} ms: ${(error as Error).message}`);
		}
	}
	return null;
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

async function load(): Promise<Visitors | null> {
	const raw = process.env.GA_SERVICE_ACCOUNT_KEY;
	if (!raw || !SITE.gaPropertyId) return null;
	const last = await fromLiveSite().catch(() => null);
	const token = await withRetries('sign-in', () => accessToken(JSON.parse(raw) as ServiceAccountKey));
	const live = token
		? await withRetries('realtime', () => firstValue(token, 'runRealtimeReport', { metrics: METRICS }, 15_000))
		: null;
	const today = token
		? await withRetries('today', () =>
				firstValue(token, 'runReport', { dateRanges: [{ startDate: 'today', endDate: 'today' }], metrics: METRICS }, 30_000),
			)
		: null;
	const total = token
		? await withRetries('total', () =>
				firstValue(token, 'runReport', { dateRanges: [{ startDate: SINCE, endDate: 'today' }], metrics: METRICS }, 30_000),
			)
		: null;
	if (live === null && today === null && total === null) {
		// Keep the last published numbers (their time stays old) rather than dropping the line
		console.warn(last ? '[visitors] nothing answered, kept the last published numbers' : '[visitors] left out');
		return last;
	}
	const now = new Date();
	// GA's daily numbers lag hours behind (longer on a new property). The last 30 minutes from
	// the realtime report, and what this page already showed today, are floors: counts only go up.
	const shownToday = last && seoulDay(last.at) === seoulDay(now) ? last.today : 0;
	const todayCount = Math.max(today ?? 0, live ?? 0, shownToday);
	const totalCount = Math.max(total ?? 0, last?.total ?? 0, todayCount);
	console.log(`[visitors] daily ${today}, total ${total}, last 30 min ${live} -> today ${todayCount}, total ${totalCount}`);
	return { today: todayCount, total: totalCount, at: now };
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
