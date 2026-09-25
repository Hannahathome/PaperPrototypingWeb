// @ts-check
import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tools from './src/data/tools.json' with { type: 'json' };

const REPO_URL = 'https://github.com/Hannahathome/PaperPrototypingWeb';

/**
 * Sidebar links to the tool pages of one category, in tools.json order.
 * @param {'maker' | 'visualisation'} category
 */
function toolLinks(category) {
	return tools
		.filter((tool) => tool.category === category)
		.map((tool) => ({ label: tool.name, slug: `tools/${tool.id}` }));
}

/**
 * One sidebar group per tool that has at least one tutorial. Tools without
 * tutorials are left out so the sidebar shows no empty groups. Files starting
 * with "_" (such as the template) are not published, so they don't count.
 */
function tutorialGroups() {
	return tools
		.filter((tool) => {
			const dir = `./src/content/docs/tutorials/${tool.id}`;
			return (
				existsSync(dir) &&
				readdirSync(dir).some((file) => /\.mdx?$/.test(file) && !file.startsWith('_'))
			);
		})
		.map((tool) => ({
			label: tool.name,
			items: [{ autogenerate: { directory: `tutorials/${tool.id}` } }],
		}));
}

// https://astro.build/config
export default defineConfig({
	site: 'https://hannahathome.github.io',
	base: '/PaperPrototypingWeb',
	integrations: [
		starlight({
			title: 'Paper Prototyping',
			description:
				'Tutorials and browser versions of the PaperPrototyping tools for designing and cutting paper prototypes.',
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			editLink: { baseUrl: `${REPO_URL}/edit/main/` },
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{ label: 'Home', link: '/' },
				{ label: 'Maker tools', items: toolLinks('maker') },
				{ label: 'Visualisation tools', items: toolLinks('visualisation') },
				{
					label: 'Tutorials',
					items: [{ label: 'All tutorials', slug: 'tutorials' }, ...tutorialGroups()],
				},
				{ label: 'Contributing', items: [{ autogenerate: { directory: 'contributing' } }] },
			],
		}),
	],
});
