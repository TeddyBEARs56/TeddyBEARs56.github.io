import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Bug = CollectionEntry<'bugs'>;

/** Published posts, newest first; posts from the same day go by stage, later stage first. */
export async function getPosts(): Promise<Post[]> {
	return (await getCollection('posts')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || (b.data.stage ?? -1) - (a.data.stage ?? -1),
	);
}

/** Bug reports, newest first */
export async function getBugs(): Promise<Bug[]> {
	return (await getCollection('bugs')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export const postUrl = (post: Post) => `/posts/${post.id}/`;
export const bugUrl = (bug: Bug) => `/bugs/${bug.id}/`;

export const BUG_STATUS: Record<Bug['data']['status'], string> = { open: '미해결', workaround: '우회', fixed: '해결됨' };

const MINUTES_PER_HANGUL = 1 / 500;
const MINUTES_PER_LATIN_WORD = 1 / 220;

/** Rough reading time for Korean prose with some English and code. */
export function readingMinutes(body = ''): number {
	const hangul = body.match(/[가-힣]/g)?.length ?? 0;
	const latin = body.match(/[A-Za-z]+/g)?.length ?? 0;
	return Math.max(1, Math.round(hangul * MINUTES_PER_HANGUL + latin * MINUTES_PER_LATIN_WORD));
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const shortDate = (d: Date) => `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
