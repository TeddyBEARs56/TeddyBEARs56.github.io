import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** Published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
	return (await getCollection('posts')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export const postUrl = (post: Post) => `/posts/${post.id}/`;

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
