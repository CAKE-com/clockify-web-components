// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: "https://resources.developer.clockify.me",
	base: "/validation-widget/latest/docs/",
	integrations: [
		starlight({
			title: 'Clockify custom elements',
      social: [
        { icon: 'gitlab', label: 'GitLab', href: 'https://git.coingdevelopment.com/marketplace/clockify-web-components' },
      ],
			favicon: '/favicon.ico',
			sidebar: [
				{
					label: 'Special custom elements',
					autogenerate: { directory: 'clockify-custom-elements' },
				},
        { slug: 'custom-styles' },

			],
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://resources.developer.clockify.me/validation-widget/latest/style.css',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://resources.developer.clockify.me/validation-widget/latest/styles/shoelace/shoelace-clockify.css',
					},
				},
				{
					tag: 'script',
					attrs: {
						type: 'module',
						src: "https://resources.developer.clockify.me/validation-widget/latest/web-components.js",
					},
				},
			],
			customCss: [
				'./src/styles/custom.css',
			],
		}),
	],
});
