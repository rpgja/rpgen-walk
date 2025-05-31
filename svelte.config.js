import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: null,
		}),
		paths: {
			base: process.env.GITHUB_PAGES ? "/rpg-walk" : "",
		},
	},
};

export default config;
