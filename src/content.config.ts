import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hand = z.enum(['person', 'claude']);

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		stage: z.number().int().min(0),
		title: z.string(),
		description: z.string(),
		// Two short sentences for the home card
		excerpt: z.string(),
		// The opening paragraph under the post title; falls back to the excerpt
		lead: z.string().optional(),
		pubDate: z.coerce.date(),
		hands: z.array(hand).default([]),
		// The one line of the log the home page shows beside the post
		reading: z
			.object({
				was: z.string(),
				now: z.string(),
				setting: z.string(),
				decided: hand,
				loggedBy: z.string(),
				time: z.string(),
				datetime: z.string(),
				why: z.string(),
			})
			.optional(),
	}),
});

export const collections = { posts };
