import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		alias: {

			// this will match a directory and its contents
			// (`my-directory/x` resolves to `path/to/my-directory/x`)
			'@ufukk/*': '../../packages/*',

			// an alias ending /* will only match
			// the contents of a directory, not the directory itself
			'my-directory/*': 'path/to/my-directory/*'
		},
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter()
	}
};

export default config;
