import rss from '@astrojs/rss';
import { SITE } from '../data/site';
import { getPosts, postUrl } from '../lib/posts';

export async function GET(context) {
	const posts = await getPosts();
	return rss({
		title: SITE.title,
		description: SITE.description,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: postUrl(post),
		})),
		customData: '<language>ko</language>',
	});
}
