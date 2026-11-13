import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hand = z.enum(['person', 'claude']);

// Files whose name starts with "_" (templates, drafts) are never published
const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/[^_]*.{md,mdx}' }),
	schema: z.object({
		// The series this post belongs to (an id from src/data/series.ts); leave out for a standalone post
		series: z.string().optional(),
		// Its place in the series
		stage: z.number().int().min(0).optional(),
		// What it is about; the home page groups posts by this
		topic: z.string(),
		// The day a post was last changed, shown beside the publish date
		updated: z.coerce.date().optional(),
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

// Cybug: bug reports, each written to the same frame (symptom, steps, cause, fix)
const bugs = defineCollection({
	loader: glob({ base: './src/content/bugs', pattern: '**/[^_]*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// One or two sentences for the list card
		excerpt: z.string(),
		pubDate: z.coerce.date(),
		updated: z.coerce.date().optional(),
		// open: 미해결, workaround: 우회, fixed: 해결됨
		status: z.enum(['open', 'workaround', 'fixed']),
		// The tool or service the bug is in
		target: z.string(),
		// Where it happened: OS, versions, machine
		environment: z.string(),
	}),
});

export const collections = { posts, bugs };
