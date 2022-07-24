import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import {createConfig} from "./@blitzjs/sveltekit/createConfig.js"

const config = createConfig({
	preprocess: preprocess(),
	kit: {
		adapter: adapter(),

		methodOverride: {
			allowed: ["PATCH", "DELETE"]
		},
		vite: {
			define: {
				'process.env': process.env
			},
			optimizeDeps: {
				
				exclude: ["node-mocks-http"]
			}
		}
	}
})


export default config;
