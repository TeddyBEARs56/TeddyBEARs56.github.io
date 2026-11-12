// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://teddybears56.github.io',
	integrations: [mdx(), sitemap()],
	markdown: {
		// Code colours come from the --astro-code-* tokens in src/styles/tokens.css
		shikiConfig: { theme: 'css-variables' },
	},
});
